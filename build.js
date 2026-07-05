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

// Cross-platform file operations: ensure api folder exists and copy bundle
const fs = require('fs');
const outSrc = path.resolve('backend/dist/index.js');
const outDestDir = path.resolve('api');
const outDest = path.resolve(outDestDir, 'index.js');

try {
  if (fs.existsSync(outSrc)) {
    fs.mkdirSync(outDestDir, { recursive: true });
    fs.copyFileSync(outSrc, outDest);
    console.log(`Copied backend bundle to ${outDest}`);
  } else {
    console.warn(`Expected backend bundle not found at ${outSrc}`);
  }
} catch (err) {
  console.error('Failed to copy backend bundle:', err);
  process.exit(1);
}
