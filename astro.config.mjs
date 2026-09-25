import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://coppertrace.co.uk',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()]
});
