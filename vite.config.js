import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const cameraHeaders = {
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
};

// VS Code dev tunnels can redirect same-origin static files to their GitHub
// auth page. The browser fetches the web manifest without tunnel credentials,
// which produces a CORS error in the console. The manifest is only needed in a
// production build, so drop the link while Vite is serving in dev.
const stripManifestInDev = {
  name: 'nutrifit-strip-manifest-in-dev',
  transformIndexHtml(html, ctx) {
    if (!ctx.server) return html;
    return html.replace(/\s*<link\b[^>]*\brel=["']manifest["'][^>]*>/i, '');
  },
};

export default defineConfig({
  plugins: [vue(), stripManifestInDev],
  server: {
    host: '0.0.0.0',
    port: 5173,
    headers: cameraHeaders,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    headers: cameraHeaders,
  },
});
