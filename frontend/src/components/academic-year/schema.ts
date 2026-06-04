import { z } from "zod";

export interface AcademicYear {
  _id: string;
  name: string;
  fromYear: string;
  toYear: string;
  isCurrent: boolean;
}

export const formSchema = z.object({
  name: z.string().min(1, "Name is required (e.g., 2024-2025)"),
  fromYear: z.date({ error: "Start date is required" }),
  toYear: z.date({ error: "End date is required" }),
  isCurrent: z.boolean(),
});

export type FormValues = z.infer<typeof formSchema>;
