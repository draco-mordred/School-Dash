import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

// PR M2 — Direct Messages hook: conversations, thread, send, moderation
// self-view, appeal, and the chat-enabled toggle (admin transparency opt-in).

export interface DmConversation {
  partnerId: string;
  partnerName: string;
  partnerEmail?: string;
  partnerRole: string;
  lastMessage: string;
  lastAt: string;
}

export interface DmThreadMessage {
  _id: string;
  fromMe: boolean;
  text: string;
  verdict: string;
  at: string;
}

export interface DmModerationCase {
  _id: string;
  kind: string;
  rules: string[];
  status: string;
  penalty?: { level?: number; label?: string; suspensionUntil?: string | null } | null;
  appeal?: { text?: string; submittedAt?: string } | null;
  createdAt: string;
}

export interface DmModerationStatus {
  frozen: boolean;
  frozenCaseId: string | null;
  suspended: boolean;
  suspensionUntil: string | null;
  softStrikesInWindow: number;
  cases: DmModerationCase[];
}

export type DmSendStatus =
  | "delivered"
  | "soft_flagged"
  | "blocked"
  | "unavailable"
  | "frozen"
  | "suspended";

export interface DmSendResult {
  status: DmSendStatus;
  recipientName?: string;
  rules?: string[];
  penalty?: { level: number; label: string; suspensionUntil?: string | null } | null;
  caseId?: string;
  caution?: string;
  message?: string;
}

export function useDirectMessages() {
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [thread, setThread] = useState<DmThreadMessage[]>([]);
  const [activePartner, setActivePartner] = useState<DmConversation | null>(null);
  const [moderation, setModeration] = useState<DmModerationStatus | null>(null);
  const [chatEnabled, setChatEnabledState] = useState<boolean>(true);
  const [transparencyNote, setTransparencyNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await api.get("/dm/conversations");
      setConversations(res.data?.conversations ?? []);
    } catch (err) {
      console.error("DM conversations failed", err);
    }
  }, []);

  const refreshModeration = useCallback(async () => {
    try {
      const res = await api.get("/dm/moderation/me");
      setModeration(res.data ?? null);
    } catch (err) {
      console.error("DM moderation status failed", err);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
    refreshModeration();
    api
      .get("/dm/chat-enabled")
      .then((res) => setChatEnabledState(Boolean(res.data?.chatEnabled)))
      .catch(() => {});
  }, [refreshConversations, refreshModeration]);

  const openThread = useCallback(async (conversation: DmConversation) => {
    setActivePartner(conversation);
    setLoading(true);
    try {
      const res = await api.get(`/dm/thread/${conversation.partnerId}`);
      setThread(res.data?.messages ?? []);
    } catch (err) {
      console.error("DM thread failed", err);
      setThread([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendDm = useCallback(
    async (toEmail: string, message: string): Promise<DmSendResult | null> => {
      if (!toEmail.trim() || !message.trim()) return null;
      try {
        const res = await api.post("/dm/send", { to: toEmail.trim(), message });
        const result: DmSendResult = res.data ?? { status: "unavailable", message: "Unable to send." };
        // A flag/block/freeze changes moderation state and the conversation list.
        refreshConversations();
        refreshModeration();
        if (activePartner) openThread(activePartner);
        return result;
      } catch (err: any) {
        return {
          status: "unavailable",
          message: err?.response?.data?.message || "Unable to send the message.",
        };
      }
    },
    [activePartner, refreshConversations, refreshModeration, openThread]
  );

  const submitAppeal = useCallback(
    async (caseId: string, text: string): Promise<{ ok: boolean; message: string }> => {
      try {
        await api.post("/dm/moderation/appeal", { caseId, text });
        refreshModeration();
        return { ok: true, message: "Appeal submitted. An administrator will review it." };
      } catch (err: any) {
        return { ok: false, message: err?.response?.data?.message || "Unable to submit the appeal." };
      }
    },
    [refreshModeration]
  );

  const toggleChatEnabled = useCallback(async (enabled: boolean) => {
    setChatEnabledState(enabled);
    try {
      const res = await api.put("/dm/chat-enabled", { enabled });
      setTransparencyNote(res.data?.transparencyNote ?? null);
    } catch (err) {
      setChatEnabledState(!enabled);
      console.error("DM chat toggle failed", err);
    }
  }, []);

  const closeThread = useCallback(() => {
    setActivePartner(null);
    setThread([]);
  }, []);

  return {
    conversations,
    thread,
    activePartner,
    moderation,
    chatEnabled,
    transparencyNote,
    loading,
    refreshConversations,
    refreshModeration,
    openThread,
    sendDm,
    submitAppeal,
    toggleChatEnabled,
    closeThread,
  };
}
