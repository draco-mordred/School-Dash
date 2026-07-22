import { test, expect } from "vitest";
import { calculateExpandedCardPosition } from "./courseCardPositioning";

test("courseCardPositioning computes correct position", () => {
  const result = calculateExpandedCardPosition({
    rect: { left: 120, top: 200, width: 260, height: 220 },
    pointer: { x: 220, y: 310 },
    container: { left: 24, top: 24, width: 900, height: 700 },
    targetWidth: 520,
    targetHeight: 440,
  });

  expect(result.left).toBe(24);
  expect(result.top).toBe(90);
  expect(result.width).toBe(520);
  expect(result.height).toBe(440);
});
