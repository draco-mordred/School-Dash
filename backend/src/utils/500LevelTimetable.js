// Bun on Render resolves this compiled .js before the .ts source.
// Re-export the canonical TypeScript module so both runtimes share the
// same exports and the API surface never drifts.
export * from "./500LevelTimetable.ts";
