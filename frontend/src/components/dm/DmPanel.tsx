import { useEffect, useRef, useState } from "react";
import { useDirectMessages, DmSendResult, DmConversation } from "../../hooks/useDirectMessages";
import { getPinnedPartnerIds, togglePinPartner } from "../../utils/daleSettings";

// PR M3 — DM panel: conversation list + thread + composer + moderation
// banners/appeal (PR M2) now with h-full layout, a pinned DALE/AI row at the
// top of the contacts list, pinnable contacts (localStorage), and a
// two-pane contacts rail when the chat is expanded.

const fmtDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleString();
};

export function DmPanel({
  expanded = false,
  onSwitchToDale,
}: {
  expanded?: boolean;
  onSwitchToDale?: () => void;
}) {
  const {
    conversations,
    thread,
    activePartner,
    moderation,
    chatEnabled,
    transparencyNote,
    loading,
    openThread,
    typingFrom,
    emitTyping,
    setPinned,
    setPreserved,
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
  const [pins, setPins] = useState<string[]>(() => getPinnedPartnerIds());
  const threadEndRef = useRef<HTMLDivElement>(null);
  const partnerTyping = Boolean(
    activePartner && typingFrom.includes(activePartner.partnerId)
  );

  // Instant-feel: keep the thread pinned to the newest message/bubble.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length, partnerTyping]);

  const frozen = Boolean(moderation?.frozen);
  const suspended = Boolean(moderation?.suspended);
  const canSend = !frozen && !suspended;

  const sortedConversations: DmConversation[] = [...conversations].sort((a, b) => {
    const pa = pins.includes(a.partnerId) ? 1 : 0;
    const pb = pins.includes(b.partnerId) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.lastAt ?? 0).getTime() - new Date(a.lastAt ?? 0).getTime();
  });

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

  const handleReply = async () => {
    if (!activePartner?.partnerEmail || !message.trim() || sending) return;
    setSending(true);
    const result = await sendDm(activePartner.partnerEmail, message);
    setSending(false);
    if (result) {
      setSendResult(result);
      if (result.status === "delivered" || result.status === "soft_flagged") setMessage("");
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

  const contactsRail = (
    <div className="flex-1 min-w-0 overflow-y-auto px-2 py-2 space-y-1 bg-muted/30">
      {/* DALE / AI — always pinned at the top */}
      <button
        onClick={onSwitchToDale}
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 transition bg-primary/10"
      >
        <div className="flex justify-between items-center gap-2">
          <span className="font-semibold truncate flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">D</span>
            DALE (AI assistant)
          </span>
          <span title="Pinned">📌</span>
        </div>
        <p className="text-xs text-muted-foreground truncate pl-8">Ask me anything about your academics</p>
      </button>

      <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-3 pt-2">Direct messages</p>
      {sortedConversations.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-3">
          No conversations yet. Start a new message, or mention someone with <span className="font-mono">@email</span> in your DALE chat.
        </p>
      )}
      {sortedConversations.map((conv) => (
        <div key={conv.partnerId} className="flex items-center gap-1 group">
          <button
            onClick={() => openThread(conv)}
            className={`flex-1 min-w-0 text-left px-3 py-2 rounded-lg transition ${
              activePartner?.partnerId === conv.partnerId ? "bg-muted ring-1 ring-primary/40" : "hover:bg-muted/60"
            }`}
          >
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-semibold truncate">{conv.partnerName}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(conv.lastAt)}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
          </button>
          <button
            title={pins.includes(conv.partnerId) ? "Unpin" : "Pin"}
            onClick={() => setPins(togglePinPartner(conv.partnerId))}
            className={`p-1.5 rounded text-xs shrink-0 transition ${pins.includes(conv.partnerId) ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`}
          >
            📌
          </button>
        </div>
      ))}
    </div>
  );

  const threadView = activePartner ? (
    <>
      <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2">
        <button
          onClick={expanded ? undefined : closeThread}
          disabled={expanded}
          className={`text-xs font-semibold ${expanded ? "text-transparent" : "text-muted-foreground hover:text-primary"}`}
        >
          ← Back
        </button>
        <span className="font-bold truncate">
          {activePartner.partnerName}
          {activePartner.partnerRole ? (
            <span className="text-[10px] text-muted-foreground ml-1 uppercase">{activePartner.partnerRole}</span>
          ) : null}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
        {loading && <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>}
        {!loading && thread.length === 0 && <p className="text-xs text-muted-foreground">No messages yet.</p>}
        {thread.map((msg) => (
          <div key={msg._id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
            <div className="flex flex-col max-w-[80%] group/msg">
              <div
                className={`px-3 py-2 rounded-2xl ${
                  msg.fromMe
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                } ${msg.verdict === "soft_flagged" ? "ring-1 ring-amber-400" : ""} ${msg.pinned ? "ring-1 ring-primary/60" : ""}`}
              >
                {msg.text}
              </div>
              <div
                className={`flex items-center gap-1 mt-0.5 ${
                  msg.fromMe ? "justify-end" : "justify-start"
                }`}
              >
                <button
                  title={msg.pinned ? "Unpin message" : "Pin message"}
                  onClick={() => setPinned(msg._id, !msg.pinned)}
                  className={`text-[11px] px-1 rounded transition ${
                    msg.pinned ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                  }`}
                >
                  {msg.pinned ? "📌" : "📍"}
                </button>
                <button
                  title={
                    msg.preserved
                      ? "Saved — click to unsave (auto-clears after 7 days)"
                      : "Save message (keeps it past the 7-day auto-clear)"
                  }
                  onClick={() => setPreserved(msg._id, !msg.preserved)}
                  className={`text-[11px] px-1 rounded transition ${
                    msg.preserved ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                  }`}
                >
                  {msg.preserved ? "🔖" : "💾"}
                </button>
                {msg.fromMe && (
                  <span
                    title={
                      msg.readAt ? "Read" : msg.deliveredAt ? "Delivered" : "Sent"
                    }
                    className={`text-[10px] font-bold ml-1 ${
                      msg.readAt ? "text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {msg.readAt || msg.deliveredAt ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-muted text-foreground rounded-bl-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>
      <div className="p-3 border-t border-border bg-card flex gap-2 items-center">
        <input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (activePartner) emitTyping(activePartner.partnerId);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleReply()}
          disabled={!canSend}
          placeholder={canSend ? `Reply to ${activePartner.partnerName}…` : "Chat is unavailable"}
          className="flex-1 px-4 py-2 bg-muted/10 border-none rounded-full text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border disabled:opacity-50"
        />
        <button
          onClick={handleReply}
          disabled={!canSend || !message.trim() || sending || !activePartner.partnerEmail}
          className="font-semibold text-sm px-3 py-1.5 rounded-full transition text-primary hover:bg-primary/10 disabled:text-muted-foreground"
        >
          ➤
        </button>
      </div>
    </>
  ) : (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          {expanded
            ? "Select a conversation on the left, or start a new message below."
            : "No conversation selected. Pick one on the left, or start a new message below."}
        </p>
      </div>
      <div className="p-3 border-t border-border bg-card">
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
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
              <button
                onClick={() => setShowComposer(false)}
                className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-primary"
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
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-card font-sans text-sm">
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
          {moderation?.suspensionUntil ? ` until ${fmtDate(moderation.suspensionUntil)}` : ""}. You can
          read but not send.
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
            className="w-full px-2 py-1 border rounded-md text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Body: two-pane contacts rail when expanded, single pane otherwise */}
      {expanded ? (
        <div className="flex-1 min-h-0 flex">
          <div className="w-52 md:w-64 shrink-0 border-r border-border flex flex-col">
            {contactsRail}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">{threadView}</div>
        </div>
      ) : activePartner ? (
        <div className="flex-1 min-h-0 flex flex-col">{threadView}</div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {contactsRail}
          <div className="p-3 border-t border-border bg-card">
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
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-primary"
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
        </div>
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
          {sendResult.status === "delivered" && <>Delivered to {sendResult.recipientName ?? "the user"}.</>}
          {sendResult.status === "soft_flagged" && <>⚠ Flagged but delivered. {sendResult.caution}</>}
          {sendResult.status === "blocked" && <>⛔ Blocked, not delivered. {sendResult.caution}</>}
          {sendResult.status === "unavailable" && <>{sendResult.message ?? "User not available."}</>}
          {sendResult.status === "frozen" && <>Your chat is frozen pending admin review.</>}
          {sendResult.status === "suspended" && <>Your chat is suspended.</>}
          <button onClick={() => setSendResult(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Chat availability toggle + admin transparency note */}
      <div className="px-3 py-2 border-t border-border bg-muted/40 flex items-center justify-between gap-2 shrink-0">
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
            {moderation?.softStrikesInWindow} flag{(moderation?.softStrikesInWindow ?? 0) === 1 ? "" : "s"} in 30d
          </span>
        )}
      </div>
      {transparencyNote && (
        <p className="px-3 py-1.5 text-[10px] bg-primary/10 text-primary border-t border-border shrink-0">
          {transparencyNote}
        </p>
      )}
    </div>
  );
}
