// PR M3 — Role-based quick replies for the DALE chat.
// Each role gets suggested prompts matched to its MORDRED tool registry.

export interface QuickReply {
  label: string;
  prompt: string;
}

const COMMON: QuickReply[] = [
  { label: "What can you do?", prompt: "What can you help me with?" },
];

const STUDENT: QuickReply[] = [
  { label: "📊 My attendance", prompt: "Show me my attendance summary." },
  { label: "🎓 My results & GPA", prompt: "What are my results and GPA?" },
  { label: "⚠️ My risk snapshot", prompt: "Show me my academic risk snapshot." },
  { label: "📝 Upcoming exams", prompt: "What exams do I have coming up?" },
  { label: "🚩 Report a problem", prompt: "I want to report a problem to a staff member." },
];

const STAFF: QuickReply[] = [
  { label: "📊 Class risk overview", prompt: "Show me the risk overview for my class." },
  { label: "🧩 Check exam overlap", prompt: "I want to check whether a proposed exam time overlaps another exam." },
  { label: "🚩 Flag a student", prompt: "I need to flag a student for attention." },
];

const ADMIN: QuickReply[] = [
  { label: "📊 Class risk overview", prompt: "Show me the risk overview for a class." },
  { label: "📣 Send a system alert", prompt: "I want to send a system alert to users." },
  { label: "✅ Release course results", prompt: "I want to release the results for a course." },
];

export const quickRepliesForRole = (role?: string): QuickReply[] => {
  switch (String(role ?? "").toLowerCase()) {
    case "admin":
      return [...ADMIN, ...COMMON];
    case "teacher":
    case "unitconsultant":
    case "unitresident":
      return [...STAFF, ...COMMON];
    case "parent":
      return [{ label: "Ward's progress", prompt: "How is my ward doing?" }, ...COMMON];
    case "student":
    default:
      return [...STUDENT, ...COMMON];
  }
};

export const WELCOME_FOR_ROLE = (name?: string, role?: string): string => {
  const who = name ? `Hi ${name.split(" ")[0]}` : "Hi there";
  switch (String(role ?? "").toLowerCase()) {
    case "admin":
      return `${who}! I'm DALE, your AI steward. I can pull class risk overviews, release course results, or send system alerts. What would you like to do?`;
    case "teacher":
    case "unitconsultant":
    case "unitresident":
      return `${who}! I'm DALE. I can show class risk overviews, check exam overlaps, or flag students for attention. How can I help?`;
    case "parent":
      return `${who}! I'm DALE. Ask me about your ward's academic progress.`;
    default:
      return `${who}! I'm DALE, your AI study steward. I can check your attendance, results, risk snapshot, or upcoming exams — or route a problem to staff. What do you need?`;
  }
};
