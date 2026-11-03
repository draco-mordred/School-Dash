import { useState } from "react";
import { api } from "@/lib/api";

export interface Message {
  _id: string;
  sender: "student" | "mordred_ai" | "system";
  text: string;
  is_saved: boolean;
}

const CHAT_TIMEOUT_MS = 60000;

// PR M3 — CRITICAL FIX: the previous implementation used a raw fetch() to
// /api/mordred/chat/handle WITHOUT the Authorization header. The route is
// protect-ed, so every message silently failed with a 401 and no reply was
// ever shown. This hook now uses the shared `api` axios client (adds the
// Bearer token + correct base URL), surfaces failures as visible system
// bubbles, and extends the timeout to 60s for provider-chain latency.
export function useMordred() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string, department: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { _id: String(Date.now()), sender: "student", text, is_saved: false };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post("/mordred/chat/handle", {
        message: text,
        studentContext: { department },
      }, { timeout: CHAT_TIMEOUT_MS });

      const data = res.data ?? {};
      const validatedText =
        data.text ||
        data.reply ||
        "DALE could not generate a response for that. Please try rephrasing your message.";

      const aiMsg: Message = {
        _id: data._id || String(Date.now() + 1),
        sender: "mordred_ai",
        text: validatedText,
        is_saved: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("DALE chat error", err);
      const status = err?.response?.status;
      const errMsg =
        status === 401
          ? "Your session expired. Please log in again to chat with DALE."
          : err?.code === "ECONNABORTED"
            ? "DALE is taking longer than usual to respond. Please try again in a moment."
            : "DALE is having trouble responding right now. Please try again.";
      setMessages((prev) => [
        ...prev,
        { _id: `sys-${Date.now()}`, sender: "system", text: errMsg, is_saved: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (messageId: string) => {
    const token = `TOK_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    try {
      const res = await api.post("/mordred/save-message", { messageId, uniqueToken: token });
      if (res.status === 200) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, is_saved: true } : m)));
      } else {
        console.error("MORDRED save error", res.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetChat = () => setMessages([]);

  return { messages, loading, sendMessage, saveMessage, resetChat };
}
