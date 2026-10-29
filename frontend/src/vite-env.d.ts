/// <reference types="vite/client" />

// Baked in at BUILD time by the `define` block in vite.config.ts:
// "PR 55 · 83814aa · 29/10/26 · 14:32" (PR number, commit sha,
// build date and time). Declared here so TypeScript knows the global;
// vite replaces the identifier with a string literal in the bundle.
declare const __BUILD_VERSION__: string;
