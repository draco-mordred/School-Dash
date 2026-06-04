import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Award,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { exam, Submission } from "@/types";
import ExamRadio from "@/components/lms/ExamRadio";

const Exam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [exam, setExam] = useState<exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Student Answers State: { [questionId]: "Selected Option" }
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  const totalPoints = submission && exam ? exam.questions.length : 0;
  const percentage =
    submission && totalPoints > 0
      ? Math.round((submission.score / totalPoints) * 100)
      : 0;

  // handle fetch exam details
  const fetch = async () => {
    setLoading(true);
    await api
      .get(`/exams/${id}`)
      .then((res) => {
        setExam(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load exam");
        navigate("/lms/exams");
        setLoading(false);
      });
    setLoading(true);
    if (isStudent) {
      await api
        .get(`/exams/${id}/result`)
        .then((res) => {
          setLoading(false);
          setSubmission(res.data);
        })
        .catch(() => {
          setLoading(false);
          setSubmission(null);
        });
    }
  };

  useEffect(() => {
    if (id) fetch();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    navigate("/lms/exams");
    return;
  }

  if (!exam.isActive && !isTeacher) {
    navigate("/lms/exams");
    return;
  }

  if (!exam.isActive && !isTeacher) {
    navigate("/lms/exams");
    return;
  }

  const isExpired = exam.isActive && new Date() > new Date(exam.dueDate);
  if ((!exam.isActive || isExpired) && !isTeacher) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <Clock className="h-12 w-12 text-accent-foreground" />
        <h2 className="text-xl font-bold">Exam Unavailable</h2>
        <p className="text-muted-foreground">
          This exam is currently closed or has expired.
        </p>
        <Button onClick={() => navigate("/lms/quizzes")}>Back to List</Button>
      </div>
    );
  }

  const handleTeacherDelete = async () => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.delete(`/exams/${id}`); // Ensure delete route exists
      toast.success("Exam deleted");
      navigate("/lms/quizzes");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleStudentSubmit = async () => {
    if (!exam) return;

    // Validate if all questions answered (Optional)
    if (Object.keys(answers).length < exam.questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      // Transform answers map to array for backend
      const payload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        answer: ans,
      }));

      const { data } = await api.post(`/exams/${id}/submit`, {
        answers: payload,
      });
      toast.success(`Exam submitted! Score: ${data.score}`);
      navigate("/lms/exams");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const { data } = await api.patch(`/exams/${id}/status`);
      toast.success(data.message);
      fetch(); // Refresh the list to update the UI
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{exam.title}</h1>
          <Badge variant={exam.isActive ? "default" : "secondary"}>
            {exam.isActive ? "Active" : "Draft"}
          </Badge>
        </div>
        <div className="flex gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {exam.duration} Minutes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Due:{" "}
            {new Date(exam.dueDate).toLocaleDateString()}
          </div>
        </div>
      </div>
      {/* to test logout and sign in as student */}
      {/* Teacher Control: Toggle Status */}
      {isTeacher && (
        <>
          <Separator />
          <div className="bg-card p-4 rounded-lg flex items-center justify-between border">
            <div className="text-lg font-semibold">Teacher Controls</div>
            <div className="flex gap-2 ml-2">
              <Button onClick={() => navigate("/lms/exams")}>
                Back to List
              </Button>
              <Button
                variant={exam.isActive ? "destructive" : "default"}
                onClick={handleToggleStatus}
              >
                {exam.isActive ? "Unpublish Exam" : "Publish Exam"}
              </Button>
              <Button variant="destructive" onClick={handleTeacherDelete}>
                Delete Exam
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Student Results Section currently false */}
      {isStudent && submission && (
        <>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold">Exam Results</h1>
                <p className="text-muted-foreground">You scored</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-primary">
                  {submission.score}
                </span>
                <span className="text-2xl text-muted-foreground">
                  / {totalPoints}
                </span>
              </div>
              <Badge
                variant={percentage >= 50 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {percentage}%
              </Badge>
            </CardContent>
          </Card>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/lms/quizzes")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quizzes
            </Button>
            <h2 className="text-xl font-semibold ml-auto">Review Answers</h2>
          </div>
        </>
      )}

      {/* questions list */}
      <div className="space-y-6">
        {exam.questions.map((q, index) => (
          <Card key={q._id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex gap-2">
                <span className="text-muted-foreground">{index + 1}.</span>
                {q.questionText}
                <span className="ml-auto text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded">
                  {q.points} pts
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTeacher ? (
                // TEACHER VIEW: List options, highlight correct one
                <ul className="space-y-2">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={`p-3 rounded-md border flex items-center gap-2 ${
                        opt === q.correctAnswer
                          ? "bg-primary font-medium"
                          : "bg-black/20 dark:bg-black/70"
                      }`}
                    >
                      {opt === q.correctAnswer && (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {opt}
                    </li>
                  ))}
                </ul>
              ) : (
                // STUDENT VIEW: Radio Group
                <ExamRadio
                  answers={answers}
                  question={q}
                  setAnswers={setAnswers}
                  submission={submission}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Footer Actions */}
      <div className="flex justify-end gap-4 pt-4">
        {isStudent && !submission && (
          <Button
            size="lg"
            className="w-full md:w-auto min-w-50"
            onClick={handleStudentSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Submit Exam"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
// show the result since I'm an admin
export default Exam;
