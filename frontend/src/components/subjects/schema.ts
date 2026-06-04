import { z } from "zod";

// Matches your Mongoose Schema
export interface SubjectData {
  _id: string;
  name: string;
  code: string;
  teacher: string[] | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Zod Schema for Form
export const subjectFormSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(2, "Name must be at least 2 chars"),
  code: z
    .string({ error: "Code is required" })
    .min(2, "Code is required")
    .toUpperCase(), // Force Uppercase for consistency
  teacher: z.array(z.string()).optional(), // ID or "unassigned"
  isActive: z.boolean().optional().default(true),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
