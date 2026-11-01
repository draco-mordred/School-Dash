import { describe, expect, test } from "bun:test";
import { scoreSubmission } from "../src/utils/examScoring";

const exam = {
  questions: [
    { _id: "q1", correctAnswer: "A", points: 2 },
    { _id: "q2", correctAnswer: "B" },
    { _id: "q3", correctAnswer: null },
  ],
} as any;

describe("scoreSubmission", () => {
  test("awards points for correct answers only", () => {
    const { score, totalPoints } = scoreSubmission(exam, [
      { questionId: "q1", answer: "A" },
      { questionId: "q2", answer: "C" },
    ]);
    expect(score).toBe(2);
    expect(totalPoints).toBe(4); // 2 + 1 + 1
  });

  test("matches question ids via String() comparison (ObjectId-safe)", () => {
    const { score } = scoreSubmission(exam, [
      { questionId: { toString: () => "q2" } as any, answer: "B" },
    ]);
    expect(score).toBe(1);
  });

  test("skips questions with null correctAnswer", () => {
    const { score } = scoreSubmission(exam, [{ questionId: "q3", answer: "x" }]);
    expect(score).toBe(0);
  });

  test("handles missing/empty answers safely", () => {
    expect(scoreSubmission(exam, []).score).toBe(0);
    expect(scoreSubmission(exam, undefined).totalPoints).toBe(4);
    expect(scoreSubmission({ questions: null } as any, []).totalPoints).toBe(0);
  });

  test("never awards points when the student answer is undefined", () => {
    const { score } = scoreSubmission(exam, [{ questionId: "q1" }]);
    expect(score).toBe(0);
  });
});
