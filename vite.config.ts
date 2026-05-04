import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      ViteImageOptimizer({
        test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
        exclude: undefined,
        include: undefined,
        includePublic: true,
        logStats: true,
        ansiColors: true,
        svg: {
          multipass: true,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  cleanupNumericValues: false,
                  removeViewBox: false, // https://github.com/svg/svgo/issues/1128
                },
              },
            },
            'sortAttrs',
            {
              name: 'addAttributesToSVGElement',
              params: {
                attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
              },
            },
          ],
        },
        png: {
          // https://sharp.pixelplumbing.com/api-output#png
          quality: 80,
        },
        jpeg: {
          // https://sharp.pixelplumbing.com/api-output#jpeg
          quality: 80,
        },
        jpg: {
          // https://sharp.pixelplumbing.com/api-output#jpeg
          quality: 80,
        },
        webp: {
          // https://sharp.pixelplumbing.com/api-output#webp
          lossless: true,
        },
        avif: {
          // https://sharp.pixelplumbing.com/api-output#avif
          lossless: true,
        },
        cache: false,
        cacheLocation: undefined,
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'motion', 'lucide-react'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          },
        },
      },
      chunkSizeWarningLimit: 2000,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
