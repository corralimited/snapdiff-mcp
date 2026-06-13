export function isLocalUrl(urlStr: string): boolean {
  try {
    const { hostname } = new URL(urlStr);
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) return true;
    const parts = hostname.split('.').map(Number);
    if (parts.length === 4 && !parts.some(Number.isNaN)) {
      if (parts[0] === 10) return true;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      if (parts[0] === 192 && parts[1] === 168) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface LocalCaptureOptions {
  full_page?: boolean;
  width?: number;
  selector?: string;
  dark_mode?: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface MeasuredRegion {
  selector?: string;
  bbox: [number, number, number, number];
  label?: string;
}

type SelectorSpec = { selector?: string; bbox?: [number, number, number, number]; label?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function captureWithBrowser(
  browser: any,
  pageUrl: string,
  options: LocalCaptureOptions,
  baseUrl: string,
  apiKey: string,
  selectorsToMeasure?: SelectorSpec[],
): Promise<{ upload: UploadResult; measuredRegions?: MeasuredRegion[] }> {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1280, height: 800 },
    colorScheme: options.dark_mode ? 'dark' : 'light',
  });
  try {
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    let png: Buffer;
    if (options.selector) {
      png = await page.locator(options.selector).first().screenshot({ type: 'png' });
    } else {
      png = await page.screenshot({ type: 'png', fullPage: options.full_page ?? false });
    }

    // Measure any selector-based intent regions while we have the page open.
    // This lets the server do geometry matching even when `after` is a
    // screenshot ID rather than a fetchable URL.
    let measuredRegions: MeasuredRegion[] | undefined;
    if (selectorsToMeasure?.length) {
      const bboxPassthrough = selectorsToMeasure
        .filter((r) => r.bbox)
        .map((r) => ({ bbox: r.bbox!, label: r.label, selector: r.selector }));

      const selectorBased = selectorsToMeasure.filter((r) => !r.bbox && r.selector);

      const measured = await Promise.all(
        selectorBased.map(async (region) => {
          try {
            const rect = await page.locator(region.selector!).first().boundingBox();
            if (rect) {
              return {
                selector: region.selector,
                label: region.label,
                bbox: [
                  Math.round(rect.x),
                  Math.round(rect.y),
                  Math.round(rect.width),
                  Math.round(rect.height),
                ] as [number, number, number, number],
              };
            }
          } catch {
            // Selector didn't match — omit so the server can surface it as unresolved.
          }
          return null;
        }),
      );

      measuredRegions = [
        ...bboxPassthrough,
        ...measured.filter((r): r is MeasuredRegion => r !== null),
      ];
    }

    const params = new URLSearchParams({ source_url: pageUrl });
    const res = await fetch(`${baseUrl}/screenshot/upload?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/png', 'X-API-Key': apiKey },
      body: png,
    });

    if (!res.ok) {
      throw new Error(`Screenshot upload failed ${res.status}: ${await res.text()}`);
    }
    const upload = (await res.json()) as UploadResult;
    return { upload, measuredRegions };
  } finally {
    await context.close();
  }
}

async function loadPlaywright() {
  return import('playwright').catch(() => {
    throw new Error(
      'Playwright is required for localhost screenshots. ' +
        'Run: npm install playwright && npx playwright install chromium',
    );
  });
}

export async function captureAndUpload(
  pageUrl: string,
  options: LocalCaptureOptions,
  baseUrl: string,
  apiKey: string,
  selectorsToMeasure?: SelectorSpec[],
): Promise<{ upload: UploadResult; measuredRegions?: MeasuredRegion[] }> {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    return await captureWithBrowser(browser, pageUrl, options, baseUrl, apiKey, selectorsToMeasure);
  } finally {
    await browser.close();
  }
}

export interface MultiCaptureSpec {
  pageUrl: string;
  options: LocalCaptureOptions;
  selectorsToMeasure?: SelectorSpec[];
}

/**
 * Capture multiple local URLs sharing a single browser instance.
 * All captures run in parallel on separate browser contexts.
 */
export async function captureMultipleAndUpload(
  specs: MultiCaptureSpec[],
  baseUrl: string,
  apiKey: string,
): Promise<Array<{ upload: UploadResult; measuredRegions?: MeasuredRegion[] }>> {
  if (specs.length === 0) return [];
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    return await Promise.all(
      specs.map((spec) =>
        captureWithBrowser(browser, spec.pageUrl, spec.options, baseUrl, apiKey, spec.selectorsToMeasure),
      ),
    );
  } finally {
    await browser.close();
  }
}
