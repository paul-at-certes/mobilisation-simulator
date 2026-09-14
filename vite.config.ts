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
      // Dev only. The `?card=og` route draws the link-preview card in the
      // browser, where the typefaces are, and sends the PNG here to be saved
      // as public/og-image.png. Regenerate it after any change to the card.
      name: 'og-image-writer',
      apply: 'serve',
      configureServer(server) {
        server.ws.on('og:save', (data: { png: string }) => {
          writeFileSync(resolve(__dirname, 'public/og-image.png'), Buffer.from(data.png, 'base64'));
          server.config.logger.info('public/og-image.png written');
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
