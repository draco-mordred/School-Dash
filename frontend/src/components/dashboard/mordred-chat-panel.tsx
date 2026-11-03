import { useEffect, useRef, useState } from "react";
import { useMordred } from "../../hooks/useMordred";
import { useAuth } from "../../hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DmPanel } from "../dm/DmPanel"; // PR M2 — Direct Messages tab
import { quickRepliesForRole, WELCOME_FOR_ROLE } from "../../utils/daleQuickReplies";
import { animationsEnabled, setAnimationsEnabled } from "../../utils/daleSettings";

// PR M3 — modern chatbot UI revamp:
//   • standard layout (bot icon top-left w/ online status, options top-right,
//     input bottom-center, send bottom-right)
//   • role-themed via the app's CSS variable tokens (bg-primary/muted/card —
//     the data-theme attribute colors the panel per user role)
//   • welcome message + role-based quick-reply chips
//   • animated typing bubble (three bouncing dots) while DALE responds
//   • visible error bubbles instead of silent failures (pairs with the
//     useMordred auth fix)
//   • in-chat settings: disable animations & expressions

export function MordredChatPanel({
  expanded = false,
  onSwitchToDale,
}: {
  expanded?: boolean;
  onSwitchToDale?: () => void;
}) {
  const { user } = useAuth();
  const { messages, loading, sendMessage, saveMessage } = useMordred();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"dale" | "dms">("dale");
  const [showSettings, setShowSettings] = useState(false);
  const [animations, setAnimations] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAnimations(animationsEnabled()), []);

  // Keep the latest message in view.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, tab]);

  const handleSend = (text?: string) => {
    const body = (text ?? input).trim();
    if (!body) return;
    sendMessage(body, user?.department || "General");
    setInput("");
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const quickReplies = quickRepliesForRole(user?.role);
  const showQuickReplies = tab === "dale" && !loading && (messages.length === 0 || messages[messages.length - 1]?.sender === "mordred_ai");

  return (
    <div className="flex flex-col h-full bg-card font-sans overflow-hidden">
      {/* ── Header: bot identity (left) + options (right) ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div
              className={`w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm ${animations ? "animate-pulse" : ""}`}
            >
              D
            </div>
            {animations && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-card animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">DALE</p>
            <p className="text-[10px] text-emerald-500 leading-tight">● Online — AI steward</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTab("dale")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition ${
              tab === "dale" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setTab("dms")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition ${
              tab === "dms" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
            }`}
          >
            DMs
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSettings((s) => !s)}
              title="Chat settings"
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/60 transition"
            >
              ⚙
            </button>
            {showSettings && (
              <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-border bg-card shadow-xl p-3 text-xs space-y-2">
                <p className="font-bold text-[11px] uppercase tracking-wide text-muted-foreground">
                  Chatbot settings
                </p>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span>Animations &amp; expressions</span>
                  <input
                    type="checkbox"
                    checked={animations}
                    className="accent-primary"
                    onChange={(e) => {
                      setAnimations(e.target.checked);
                      setAnimationsEnabled(e.target.checked);
                    }}
                  />
                </label>
                <p className="text-[10px] text-muted-foreground">
                  Turn off to disable the pulsing avatar, typing dots and other motion effects.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {tab === "dms" ? (
        <DmPanel expanded={expanded} onSwitchToDale={() => { setTab("dale"); onSwitchToDale?.(); }} />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/30">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5">D</div>
                <div className="px-4 py-2.5 shadow-sm text-sm leading-relaxed bg-muted text-foreground rounded-2xl rounded-bl-sm max-w-[75%]">
                  {WELCOME_FOR_ROLE(user?.name, user?.role)}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === "student";
              const isSystem = msg.sender === "system";
              return (
                <div key={msg._id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && !isSystem && (
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5">D</div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                        isSystem
                          ? "bg-destructive/10 text-destructive rounded-xl text-xs"
                          : isUser
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {!isUser && !isSystem && (
                      <button
                        onClick={() => saveMessage(msg._id)}
                        disabled={msg.is_saved}
                        className={`text-[11px] mt-1 font-semibold px-1 py-0.5 rounded transition ${
                          msg.is_saved
                            ? "text-emerald-600 font-bold"
                            : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                        }`}
                      >
                        {msg.is_saved ? "🔒 Saved to Cloud" : "💾 Keep Message"}
                      </button>
                    )}
                  </div>
                  {isUser && (
                    <div className="ml-2 shrink-0 self-end">
                      <Avatar className="h-7 w-7">
                        {user?.profileImage ? (
                          <AvatarImage src={user.profileImage} alt={user?.name ?? "User"} />
                        ) : (
                          <AvatarFallback className="text-[10px] font-bold">{getInitials(user?.name)}</AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Animated typing bubble */}
            {loading && (
              <div className="flex justify-start items-end">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0">D</div>
                {animations ? (
                  <div className="px-4 py-3 bg-muted rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-muted rounded-2xl rounded-bl-sm shadow-sm text-xs text-muted-foreground">
                    DALE is typing…
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick replies (role-based) */}
          {showQuickReplies && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5 bg-muted/30 border-t border-border/50">
              {quickReplies.map((qr) => (
                <button
                  key={qr.label}
                  onClick={() => handleSend(qr.prompt)}
                  className="px-2.5 py-1 rounded-full border border-primary/40 text-primary text-[11px] font-semibold hover:bg-primary/10 transition"
                >
                  {qr.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Input bar: input center, send right ── */}
          <div className="p-3 border-t border-border bg-card flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message DALE… (@email to send a DM)"
              className="flex-1 px-4 py-2 bg-muted/10 border-none rounded-full text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`font-semibold text-sm px-3 py-1.5 rounded-full transition ${
                input.trim() && !loading
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground"
              }`}
              title="Send"
            >
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  );
}
