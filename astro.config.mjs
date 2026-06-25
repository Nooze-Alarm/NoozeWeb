import { defineConfig } from 'astro/config';

// Static multi-page site. `format: 'file'` keeps the existing flat URLs
// (e.g. /features.html) so links, canonicals and the sitemap stay unchanged.
export default defineConfig({
    site: 'https://noozealarm.com',
    build: { format: 'file' },
});
