import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import type { Class, subject } from "@/types";

const schema = z.object({
  subject: z.string().min(1, "Subject is required"),
  class: z.string().min(1, "Class is required"),
  topic: z.string().min(3, "Topic is required"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  count: z.coerce.number().min(1).max(20),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ExamGenerator = ({ open, onOpenChange, onSuccess }: Props) => {
  const [subjects, setSubjects] = useState<subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      topic: "",
      difficulty: "Medium",
      count: 5,
    },
  });

  // Fetch Options
  useEffect(() => {
    if (open) {
      Promise.all([api.get("/subjects"), api.get("/classes")]).then(
        ([subRes, clsRes]) => {
          setSubjects(subRes.data.subjects);
          setClasses(clsRes.data.classes);
        }
      );
    }
  }, [open]);

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Trigger AI Generation (Inngest)
      await api.post("/exams/generate", {
        ...values,
        title: `${values.topic} Quiz`, // Auto-generate title
      });

      toast.success("AI is generating the exam! Check back in a moment.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to start generation");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Generate AI Quiz
          </DialogTitle>
          <DialogDescription>
            Describe the topic, and AI will create questions for you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="subject"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Subject</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                name="class"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Class</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <Controller
              name="topic"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Topic / Concept</FieldLabel>
                  <Input
                    placeholder="e.g. Photosynthesis, WW2, Algebra"
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="difficulty"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Difficulty</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                name="count"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Question Count</FieldLabel>
                    <Input type="number" {...field} />
                  </Field>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Questions
                </>
              )}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};
// let try again
export default ExamGenerator;
