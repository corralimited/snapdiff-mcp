import { z } from 'zod';

export const name = 'snapdiff_capture_screenshot';

export const description =
  'Take a screenshot of a web page. Use this when you need to see what a webpage looks like right now — to inspect layout, verify rendering, or capture a baseline for later comparison.';

export const inputSchema = {
  url: z.string().describe('The full URL to screenshot'),
  full_page: z.boolean().optional().describe('Capture the entire scrollable page. Default false'),
  dark_mode: z.boolean().optional().describe('Force dark color scheme. Default false'),
  selector: z.string().optional().describe('CSS selector to capture only a specific element'),
  width: z.number().optional().describe('Viewport width in pixels. Default 1280'),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
