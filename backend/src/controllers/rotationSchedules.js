// Bun on Render resolves this compiled .js controller before the .ts source.
// Re-export the canonical TypeScript controller so both runtimes share the
// same handlers and the API surface never drifts.
export * from "./rotationSchedules.ts";
