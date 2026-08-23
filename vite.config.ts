import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // envDir '.': vite ya corre desde la raiz del proyecto.
  const env = loadEnv(mode, '.');
  // Ruta base configurable por variable de entorno (Coolify / subcarpeta).
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    build: {
      target: 'es2022',
      // El logo (22 KB) se incrusta como dataURL en vez de salir como archivo:
      // los PDF se arman sin red y no dependen de una descarga aparte.
      assetsInlineLimit: 32 * 1024,
      rollupOptions: {
        output: {
          // jsPDF arrastra canvg, html2canvas y dompurify con imports ESTATICOS.
          // Se agrupan aparte para cachearlos como una unidad, pero entran al
          // precache igual: si faltan, el grafo de modulos no instancia y la app
          // no abre sin conexion.
          manualChunks: {
            pdf: ['jspdf', 'jspdf-autotable'],
          },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.png'],
        workbox: {
          // Precache de todo el app shell: la app abre completa sin conexion.
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: base + 'index.html',
          cleanupOutdatedCaches: true,
        },
        manifest: {
          id: base,
          name: 'Cotizadora Grupo Fenix',
          short_name: 'Cotizadora',
          description: 'Cotizaciones de mano de obra electrica y listas de materiales, sin conexion.',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0f0f0f',
          theme_color: '#0f0f0f',
          lang: 'es-SV',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  };
});
