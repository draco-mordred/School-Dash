import assert from "node:assert/strict";
import { calculateExpandedCardPosition } from "./courseCardPositioning";

const result = calculateExpandedCardPosition({
  rect: { left: 120, top: 200, width: 260, height: 220 },
  pointer: { x: 220, y: 310 },
  container: { left: 24, top: 24, width: 900, height: 700 },
  targetWidth: 520,
  targetHeight: 440,
});

assert.equal(result.left, 24);
assert.equal(result.top, 90);
assert.equal(result.width, 520);
assert.equal(result.height, 440);
console.log("courseCardPositioning test passed", result);
