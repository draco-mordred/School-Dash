export type UserRole = "admin" | "teacher" | "student" | "parent" | "unit_consultant" | "unit_resident";

export interface pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface user {
  _id: string;
  name: string;
  email: string;
  idNumber?: string;
  role: UserRole;
  profileImage?: string;
  studentClass?: Class;
  studentClasses?: Class | string;
  teacherSubjects?: courses[];
  teacherSubject?: courses[] | string[];
  parentStudents?: user[] | string[];
  // Academic status tags for teachers/lecturers
  academicStatus?: "professor" | "associate professor" | "lecturer i" | "lecturer ii" | "assistant lecturer" | "resident" | null;
  // Department role tags for teachers/lecturers
  departmentRole?: "head of department" | "dean of faculty" | "exam officer" | null;
}

export interface academicYear {
  _id: string;
  name: string; // "2024-2025"
  fromYear: Date; // "2024-09-01"
  toYear: Date; // "2025-06-30"
  isCurrent: boolean; // true/false
}

export interface Class {
  _id: string;
  name: string; // e.g., "Grade 10"
  academicYear: academicYear; // Link to "2024-2025"
  classTeacher: user; // The main teacher in charge
  subjects: courses[]; // List of subjects taught in this class
  courses?: courses[]; // Backward-compatible alias for backend class course references
  students: user[]; // List of students enrolled
  capacity: number; // Max students allowed (optional)
}

export interface courses {
  _id: string;
  name: string; // "Mathematics"
  code: string; // "MATH101"
  lecturer?: { _id: string; name: string; email?: string }[]; // Teachers taking this course
  isActive: boolean; // Indicates if the subject is currently active
}

export interface question {
  _id: string;
  questionText: string;
  type: string;
  options: string[]; // Array of strings e.g. ["A", "B", "C", "D"]
  correctAnswer: string; // Hidden from students in default queries
  points: number;
}

export interface exam {
  _id: string;
  title: string;
  subject: courses;
  class: Class;
  teacher: user;
  duration: number; // in minutes
  questions: question[];
  dueDate: Date;
  isActive: boolean;
}

export interface Submission {
  _id: string;
  score: number;
  exam: exam; // The populated exam with answers
  answers: { questionId: string; answer: string }[];
}

export interface period {
  _id: string;
  subject?: { _id: string; name: string; code: string } | null;
  lecturer?: { _id: string; name: string; email?: string } | null;
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "08:45"
  isClinical?: boolean;
}

export interface schedule {
  day: string; // "Monday", "Tuesday", etc.
  periods: period[];
}

export type NotificationType = "info" | "warning" | "success" | "error" | "attendance" | "timetable" | "system";

export interface Notification {
  _id: string;
  userId: string;
  role: UserRole;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
