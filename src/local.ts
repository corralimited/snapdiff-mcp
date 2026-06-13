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

export async function captureAndUpload(
  pageUrl: string,
  options: LocalCaptureOptions,
  baseUrl: string,
  apiKey: string,
  selectorsToMeasure?: Array<{ selector?: string; bbox?: [number, number, number, number]; label?: string }>,
): Promise<{ upload: UploadResult; measuredRegions?: MeasuredRegion[] }> {
  const playwright = await import('playwright').catch(() => {
    throw new Error(
      'Playwright is required for localhost screenshots. ' +
        'Run: npm install playwright && npx playwright install chromium',
    );
  });

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: options.width ?? 1280, height: 800 },
      colorScheme: options.dark_mode ? 'dark' : 'light',
    });
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
      measuredRegions = [];
      for (const region of selectorsToMeasure) {
        if (region.bbox) {
          // Already has a bbox — pass through unchanged.
          measuredRegions.push({ bbox: region.bbox, label: region.label, selector: region.selector });
          continue;
        }
        if (!region.selector) continue;
        try {
          const rect = await page.locator(region.selector).first().boundingBox();
          if (rect) {
            measuredRegions.push({
              selector: region.selector,
              label: region.label,
              bbox: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
            });
          }
        } catch {
          // Selector didn't match — omit so the server can surface it as unresolved.
        }
      }
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
    await browser.close();
  }
}
