import { z } from "zod";

// Zod Schema for the Form (sending IDs to backend)
export const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  capacity: z.coerce.number().positive("Capacity must be greater than 0"),
  academicYear: z.string().min(1, "Academic year is required"),
  classTeacher: z.string().optional(),
  subjectIds: z.array(z.string()),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;
