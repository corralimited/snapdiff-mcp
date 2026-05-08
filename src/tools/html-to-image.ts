import { z } from 'zod';

export const name = 'snapdiff_html_to_image';

export const description =
  'Render HTML/CSS directly to an image. Use this to generate social cards, OG images, email headers, or any visual from code without needing a hosted URL.';

export const inputSchema = {
  html: z.string().describe('The HTML to render'),
  css: z.string().optional().describe('CSS to apply'),
  width: z.number().optional().describe('Viewport width. Default 1200'),
  height: z.number().optional().describe('Viewport height. Default 630 (OG image standard)'),
} as const;

export type Input = z.infer<z.ZodObject<typeof inputSchema>>;
