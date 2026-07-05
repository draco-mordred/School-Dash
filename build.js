import { build } from 'vite';
import path from 'path';

async function bundleBackend() {
  await build({
    // Direct path down to the backend subdirectory
    root: path.resolve('backend/src'),
    base: './',
    build: {
      ssr: true,
      lib: {
        entry: path.resolve('backend/src/index.ts'),
        formats: ['es'],
        fileName: () => 'index.js'
      },
      outDir: path.resolve('backend/dist'),
      emptyOutDir: true,
      minify: false
    }
  });
}

bundleBackend().catch((err) => {
  console.error('Backend compilation failed:', err);
  process.exit(1);
});
