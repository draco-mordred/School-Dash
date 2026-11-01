// Shim: the real schema lives in classes.ts. This stale .js twin was
// missing fields (even cloudStorage) — the same bug class PR A (#58)
// fixed for the exam module. Re-export the TypeScript model so both
// module resolutions agree.
const model = require("./classes.ts");
export default model.default ?? model;
