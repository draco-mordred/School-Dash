import { build } from 'vite';
import path from 'path';

async function bundleBackend() {
  await build({
    root: path.resolve('src'),
    base: './',
    build: {
      ssr: true,
      lib: {
        entry: path.resolve('src/index.ts'),
        formats: ['es'],
        fileName: () => 'index.js'
      },
      outDir: path.resolve('dist'),
      emptyOutDir: true,
      minify: false
    }
  });
}

bundleBackend().catch((err) => {
  console.error('Backend compilation failed:', err);
  process.exit(1);
});
