import { useState } from "react";
import { Trash2, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { exam } from "@/types";

interface ExamQuestionManagerProps {
  exam: exam;
  onQuestionsUpdate: () => void;
}

export const ExamQuestionManager = ({
  exam,
  onQuestionsUpdate,
}: ExamQuestionManagerProps) => {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    "Medium"
  );
  const [count, setCount] = useState("3");

  const handleGenerateQuestions = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    try {
      setIsGenerating(true);
      await api.post(`/exams/${exam._id}/generate-questions`, {
        topic,
        difficulty,
        count: parseInt(count),
        subjectId: exam.subject._id,
      });

      toast.success("Questions generated successfully!");
      setIsGenerateOpen(false);
      setTopic("");
      setCount("3");
      onQuestionsUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestionId) return;

    try {
      setIsDeleting(true);
      await api.delete(`/exams/${exam._id}/questions/${selectedQuestionId}`);
      toast.success("Question deleted successfully");
      setIsDeleteOpen(false);
      setSelectedQuestionId(null);
      onQuestionsUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete question");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Questions</h2>
            <p className="text-sm text-muted-foreground">
              Total: {exam.questions.length} questions
            </p>
          </div>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate More Questions
          </Button>
        </div>

        <div className="space-y-4">
          {exam.questions.map((question, index) => (
            <Card key={question._id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-medium flex gap-3 flex-1">
                    <span className="text-muted-foreground text-base">{index + 1}.</span>
                    <span className="flex-1 break-words">{question.questionText}</span>
                  </CardTitle>
                  <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded whitespace-nowrap ml-2">
                    {question.points} pts
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Options:</Label>
                  <ul className="space-y-2 mt-2">
                    {question.options.map((option, i) => (
                      <li
                        key={i}
                        className={`p-2 rounded text-sm border ${
                          option === question.correctAnswer
                            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 font-medium text-green-900 dark:text-green-100"
                            : "bg-muted border-border text-foreground"
                        }`}
                      >
                        {option === question.correctAnswer && (
                          <span className="mr-2">✓</span>
                        )}
                        {option}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedQuestionId(question._id);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Generate Questions Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Generate Questions
            </DialogTitle>
            <DialogDescription>
              Add more questions to "{exam.title}" from the {exam.subject.name}{" "}
              subject
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g., Photosynthesis, World War 2"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={(val: any) => setDifficulty(val)}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="count">Number of Questions</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsGenerateOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Question</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this question? This action cannot be
            undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
