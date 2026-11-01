/**
 * Pure exam scoring helpers shared by student submission grading and admin regrades.
 * Deliberately free of DB/model imports so it can be unit-tested directly.
 */
export interface ScoredAnswer {
  questionId: string | { toString(): string };
  answer?: string;
}

export interface ScoredQuestion {
  _id: string | { toString(): string };
  correctAnswer?: string | null;
  points?: number | null;
}

export interface ScoredExam {
  questions?: ScoredQuestion[] | null;
}

const idString = (v: unknown): string => (v == null ? "" : String(v));

export const scoreSubmission = (
  exam: ScoredExam,
  answers: ScoredAnswer[] | null | undefined
): { score: number; totalPoints: number } => {
  let score = 0;
  let totalPoints = 0;
  const answerList = Array.isArray(answers) ? answers : [];

  for (const question of exam.questions ?? []) {
    const points =
      typeof question.points === "number" && question.points > 0
        ? question.points
        : 1;
    totalPoints += points;

    const studentAns = answerList.find(
      (a) => idString(a?.questionId) === idString(question._id)
    );
    if (
      studentAns &&
      question.correctAnswer != null &&
      studentAns.answer === question.correctAnswer
    ) {
      score += points;
    }
  }

  return { score, totalPoints };
};
