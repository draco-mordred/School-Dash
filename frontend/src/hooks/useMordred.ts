import { useState } from "react";

export interface Message {
  _id: string;
  sender: "student" | "mordred_ai";
  text: string;
  is_saved: boolean;
}

export function useMordred() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string, department: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { _id: String(Date.now()), sender: "student", text, is_saved: false };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/mordred/chat/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, studentContext: { department } }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("MORDRED chat error", res.status, errorBody);
        throw new Error(`MORDRED chat failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("⚔️ MORDRED Payload Raw Data:", data);
      const validatedText = data.text || data.reply || "MORDRED Engine warning: Communication stream returned an empty response cluster.";

      const aiMsg: Message = {
        _id: data._id || String(Date.now() + 1),
        sender: "mordred_ai",
        text: validatedText,
        is_saved: false,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (messageId: string) => {
    const token = `TOK_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    try {
      const res = await fetch("/api/mordred/save-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, uniqueToken: token }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => m._id === messageId ? { ...m, is_saved: true } : m));
      } else {
        const errorBody = await res.text();
        console.error("MORDRED save error", res.status, errorBody);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return { messages, loading, sendMessage, saveMessage };
}