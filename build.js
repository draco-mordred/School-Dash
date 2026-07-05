const path = require('path');
const frontendRoot = path.resolve('frontend');
const viteEntry = require.resolve('vite', { paths: [frontendRoot] });
const { build } = require(viteEntry);

async function bundleBackend() {
  await build({
    root: path.resolve('backend'),
    base: './',
    build: {
      ssr: true,
      lib: {
        entry: path.resolve('backend/api/index.ts'),
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
