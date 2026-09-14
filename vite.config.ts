import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

// GitHub Pages serves project sites from /<repo>/. Set BASE_PATH=/mobilisation-minister/
// in the deploy workflow; local dev and custom domains use '/'.
const base = process.env.BASE_PATH ?? '/';

// Link previews (LinkedIn, Slack, iMessage) need an absolute URL for the image,
// which a base path cannot give. The deploy workflow sets SITE_URL to the Pages
// URL; anything else gets the GitHub Pages address of this repository.
const siteUrl = process.env.SITE_URL ?? 'https://paul-at-certes.github.io/mobilisation-simulator/';

export default defineConfig({
  base,
  plugins: [
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    },
    {
      // Dev only. The `?card=og` route draws the link-preview cards in the
      // browser, where the typefaces are, and sends each PNG here to be saved:
      // the page's own og:image, and the 1280×640 card GitHub shows for the
      // repository, which is uploaded by hand under Settings, Social preview.
      // Regenerate both after any change to the card.
      name: 'og-image-writer',
      apply: 'serve',
      configureServer(server) {
        const targets: Record<string, string> = { 'og-image.png': 'public/og-image.png', 'social-preview.png': 'docs/social-preview.png' };
        server.ws.on('og:save', (data: { name: string; png: string }) => {
          const target = targets[data.name];
          if (!target) return;
          writeFileSync(resolve(__dirname, target), Buffer.from(data.png, 'base64'));
          server.config.logger.info(`${target} written`);
        });
      },
    },
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        methodology: resolve(__dirname, 'methodology.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
