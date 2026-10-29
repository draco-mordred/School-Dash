// Build version stamp — shows which PR / commit / build time the deployed
// bundle came from, centered at the bottom of every page. The value is
// baked in at build time by vite.config.ts (define.__BUILD_VERSION__) from
// Vercel build env vars, so it changes only when a new bundle is built.
declare const __BUILD_VERSION__: string;

export default function BuildVersion() {
  const version =
    typeof __BUILD_VERSION__ === "string" ? __BUILD_VERSION__ : "local dev build";

  return (
    <div
      aria-label="Build version"
      className="pointer-events-none fixed bottom-0 left-1/2 z-30 -translate-x-1/2 select-none px-2 py-0.5 text-[10px] leading-tight text-muted-foreground/60"
      title="Deployed bundle: PR · commit · build date · build time"
    >
      {version}
    </div>
  );
}
