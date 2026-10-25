// Bun on Render resolves this compiled .js route file before the .ts source.
// Re-export the canonical TypeScript router so both runtimes register the
// exact same endpoints (/events, /:id/windows/:index, /class/:classId/active-phase, ...).
export { default } from "./rotationSchedules.ts";
export * from "./rotationSchedules.ts";
