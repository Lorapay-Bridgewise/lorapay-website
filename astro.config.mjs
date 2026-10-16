// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site's public address (for the sitemap, canonical links and share previews).
// Set SITE_URL on your host if it isn't https://lorapay.io.
const site = process.env.SITE_URL || 'https://lorapay.io';

export default defineConfig({
  site,
  output: 'static', // plain HTML, CSS and JS, served by Vercel
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'never' },
  integrations: [sitemap()],
  // Never inline scripts or assets: the Content-Security-Policy (vercel.json) only
  // allows scripts served as files from this site.
  vite: { build: { assetsInlineLimit: 0 } },
});
