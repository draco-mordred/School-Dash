import { useState } from "react";
import { useDirectMessages, DmSendResult } from "../../hooks/useDirectMessages";

// PR M2 — Direct Messages panel (DM tab of the DALE chat):
// conversations, thread, composer, moderation banner + appeal,
// and the chat-enabled toggle (admins opt into transparency).

const fmtDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

export function DmPanel() {
  const {
    conversations,
    thread,
    activePartner,
    moderation,
    chatEnabled,
    transparencyNote,
    loading,
    openThread,
    sendDm,
    submitAppeal,
    toggleChatEnabled,
    closeThread,
  } = useDirectMessages();

  const [showComposer, setShowComposer] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sendResult, setSendResult] = useState<DmSendResult | null>(null);
  const [appealCaseId, setAppealCaseId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState("");
  const [appealMsg, setAppealMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const frozen = Boolean(moderation?.frozen);
  const suspended = Boolean(moderation?.suspended);
  const canSend = !frozen && !suspended;

  const handleSend = async () => {
    if (!toEmail.trim() || !message.trim() || sending) return;
    setSending(true);
    const result = await sendDm(toEmail, message);
    setSending(false);
    if (result) {
      setSendResult(result);
      if (result.status === "delivered" || result.status === "soft_flagged") {
        setMessage("");
        setShowComposer(false);
        setToEmail("");
      }
    }
  };

  const handleAppeal = async () => {
    if (!appealCaseId || !appealText.trim()) return;
    const res = await submitAppeal(appealCaseId, appealText);
    setAppealMsg(res.message);
    if (res.ok) {
      setAppealCaseId(null);
      setAppealText("");
    }
  };

  return (
    <div className="flex flex-col h-[450px] bg-background font-sans text-sm">
      {/* Moderation status banner (frozen / suspended) */}
      {frozen && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs border-b border-border">
          <span className="font-bold">Chat frozen.</span> A message was blocked and your chat is
          frozen pending admin review. You can read but not send.
          {!appealCaseId && moderation?.frozenCaseId && (
            <button
              onClick={() => setAppealCaseId(moderation.frozenCaseId as string)}
              className="ml-2 underline font-semibold"
            >
              Submit an appeal
            </button>
          )}
        </div>
      )}
      {suspended && !frozen && (
        <div className="px-3 py-2 bg-amber-500/10 text-amber-600 text-xs border-b border-border">
          <span className="font-bold">Chat suspended</span>
          {moderation?.suspensionUntil ? ` until ${fmtDate(moderation.suspensionUntil)}` : ""}. You
          can read but not send.
        </div>
      )}
      {(frozen || suspended) && appealCaseId && (
        <div className="px-3 py-2 bg-muted/60 border-b border-border">
          <p className="text-xs font-semibold mb-1">Written appeal (one per case)</p>
          <textarea
            value={appealText}
            onChange={(e) => setAppealText(e.target.value)}
            rows={2}
            placeholder="Explain why this decision should be reviewed…"
            className="w-full px-2 py-1 border rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleAppeal}
              disabled={!appealText.trim()}
              className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              Submit appeal
            </button>
            <button
              onClick={() => setAppealCaseId(null)}
              className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-primary"
            >
              Cancel
            </button>
          </div>
          {appealMsg && <p className="text-[11px] mt-1 text-muted-foreground">{appealMsg}</p>}
        </div>
      )}

      {/* Thread view */}
      {activePartner ? (
        <>
          <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <button
              onClick={closeThread}
              className="text-xs text-muted-foreground hover:text-primary font-semibold"
            >
              ← Back
            </button>
            <span className="font-bold truncate">
              {activePartner.partnerName}
              {activePartner.partnerRole ? (
                <span className="text-[10px] text-muted-foreground ml-1 uppercase">
                  {activePartner.partnerRole}
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
            {loading && <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>}
            {!loading && thread.length === 0 && (
              <p className="text-xs text-muted-foreground">No messages yet.</p>
            )}
            {thread.map((msg) => (
              <div key={msg._id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                    msg.fromMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  } ${msg.verdict === "soft_flagged" ? "ring-1 ring-amber-400" : ""}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          {/* Reply composer (uses the partner email from the conversation) */}
          <div className="p-3 border-t border-border bg-background flex gap-2 items-center">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={!canSend}
              placeholder={
                canSend ? `Reply to ${activePartner.partnerName}…` : "Chat is unavailable"
              }
              className="flex-1 px-4 py-2 bg-muted/10 border-none rounded-full text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border disabled:opacity-50"
            />
            <button
              onClick={async () => {
                if (!activePartner.partnerEmail) return;
                setSending(true);
                const result = await sendDm(activePartner.partnerEmail, message);
                setSending(false);
                if (result) {
                  setSendResult(result);
                  if (result.status === "delivered" || result.status === "soft_flagged") {
                    setMessage("");
                  }
                }
              }}
              disabled={!canSend || !message.trim() || sending || !activePartner.partnerEmail}
              className="font-semibold text-sm px-3 py-1.5 rounded-md transition text-primary hover:bg-primary/10 disabled:text-muted-foreground"
            >
              Send
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 bg-muted/30">
            {conversations.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground px-2 py-4">
                No conversations yet. Start a new message below, or mention someone with
                <span className="font-mono"> @email</span> in your DALE chat.
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.partnerId}
                onClick={() => openThread(conv)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 transition"
              >
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-semibold truncate">{conv.partnerName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {fmtDate(conv.lastAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </button>
            ))}
          </div>

          {/* New message composer */}
          <div className="p-3 border-t border-border bg-background">
            {showComposer ? (
              <div className="space-y-2">
                <input
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="recipient@email.com"
                  className="w-full px-3 py-1.5 bg-muted/10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-border"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Your message… (moderated automatically)"
                  className="w-full px-3 py-2 bg-muted/10 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-border"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={!toEmail.trim() || !message.trim() || sending || !canSend}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowComposer(true)}
                disabled={!canSend}
                className="w-full py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
              >
                ✉ New message
              </button>
            )}
          </div>
        </>
      )}

      {/* Send-result feedback */}
      {sendResult && (
        <div
          className={`px-3 py-2 text-xs border-t border-border ${
            sendResult.status === "delivered"
              ? "bg-emerald-500/10 text-emerald-600"
              : sendResult.status === "soft_flagged"
                ? "bg-amber-500/10 text-amber-600"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {sendResult.status === "delivered" && (
            <>Delivered to {sendResult.recipientName ?? "the user"}.</>
          )}
          {sendResult.status === "soft_flagged" && <>⚠ Flagged but delivered. {sendResult.caution}</>}
          {sendResult.status === "blocked" && <>⛔ Blocked, not delivered. {sendResult.caution}</>}
          {sendResult.status === "unavailable" && <>{sendResult.message ?? "User not available."}</>}
          {sendResult.status === "frozen" && <>Your chat is frozen pending admin review.</>}
          {sendResult.status === "suspended" && <>Your chat is suspended.</>}
          <button onClick={() => setSendResult(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Chat availability toggle + admin transparency note */}
      <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={chatEnabled}
            onChange={(e) => toggleChatEnabled(e.target.checked)}
            className="accent-primary"
          />
          Allow DMs to me
        </label>
        {(moderation?.softStrikesInWindow ?? 0) > 0 && (
          <span className="text-[10px] text-amber-600">
            {moderation?.softStrikesInWindow} flag{moderation!.softStrikesInWindow === 1 ? "" : "s"} in 30d
          </span>
        )}
      </div>
      {transparencyNote && (
        <p className="px-3 py-1.5 text-[10px] bg-primary/10 text-primary border-t border-border">
          {transparencyNote}
        </p>
      )}
    </div>
  );
}
