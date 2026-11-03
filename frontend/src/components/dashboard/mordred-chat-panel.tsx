import { useEffect, useRef, useState } from "react";
import "../../styles/dale-chat.css";
import { useMordred } from "../../hooks/useMordred";
import { useAuth } from "../../hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DmPanel } from "../dm/DmPanel";
import { DaleEmojiPicker } from "./dale-emoji-picker";
import { quickRepliesForRole, WELCOME_FOR_ROLE } from "../../utils/daleQuickReplies";
import {
  animationsEnabled, setAnimationsEnabled, glassEnabled, setGlassEnabled,
  DALE_ACCENTS, getAccent, setAccent,
} from "../../utils/daleSettings";

// PR M7 — chat UI overhaul: iPhone glassmorphism, per-message animations,
// emoji picker, pulsating quick replies after EVERY AI response, and a
// settings customizer (animations, glass effect, accent color).
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
  const [tab, setTab] = useState<"dale" | "dms" | "settings">("dale");
  const [showSettings, setShowSettings] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [glass, setGlass] = useState(true);
  const [accent, setAccentState] = useState(DALE_ACCENTS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnimations(animationsEnabled());
    setGlass(glassEnabled());
    try { setAccentState(getAccent()); } catch {}
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, tab]);

  const handleSend = (text?: string) => {
    const body = (text ?? input).trim();
    if (!body) return;
    sendMessage(body, user?.department || "General");
    setInput("");
    setShowEmoji(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const quickReplies = quickRepliesForRole(user?.role);
  // M7: quick replies show after EVERY AI reply (and on empty chat)
  const showQuickReplies =
    tab === "dale" && !loading &&
    (messages.length === 0 || messages[messages.length - 1]?.sender === "mordred_ai" || messages[messages.length - 1]?.sender === "system");

  const glassCls = glass ? "dale-glass" : "bg-card";

  return (
    <div className={`flex flex-col h-full font-sans overflow-hidden ${glassCls}`}
      style={{ ["--dale-accent-rgb" as any]: accent.rgb }}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-border ${glass ? "dale-glass-header" : "bg-muted/40"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
              style={{ backgroundColor: accent.color, color: "#fff" }}>
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
          <button onClick={() => setTab("dale")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition ${tab === "dale" ? "text-white" : "text-muted-foreground hover:text-primary"}`}
            style={tab === "dale" ? { backgroundColor: accent.color } : {}}>AI Chat</button>
          <button onClick={() => setTab("dms")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition ${tab === "dms" ? "text-white" : "text-muted-foreground hover:text-primary"}`}
            style={tab === "dms" ? { backgroundColor: accent.color } : {}}>DMs</button>
          <div className="relative">
            <button onClick={() => setTab(tab === "settings" ? "dale" : "settings")} title="Chat settings" className={tab === "settings" ? "p-1.5 rounded-full text-primary hover:text-primary hover:bg-muted/60 transition" : "p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/60 transition"}
              className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/60 transition">⚙</button>
            {showSettings && (
              <div className={`absolute right-0 top-9 z-20 w-60 rounded-xl border border-border shadow-xl p-3 text-xs space-y-3 dale-pop-in ${glass ? "dale-glass" : "bg-card"}`}>
                <p className="font-bold text-[11px] uppercase tracking-wide text-muted-foreground">Chatbot settings</p>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span>Animations &amp; expressions</span>
                  <input type="checkbox" checked={animations} className="accent-primary"
                    onChange={(e) => { setAnimations(e.target.checked); setAnimationsEnabled(e.target.checked); }} />
                </label>
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span>Glassmorphism effect</span>
                  <input type="checkbox" checked={glass} className="accent-primary"
                    onChange={(e) => { setGlass(e.target.checked); setGlassEnabled(e.target.checked); }} />
                </label>
                <div>
                  <p className="font-semibold mb-1.5">Accent color</p>
                  <div className="flex gap-2">
                    {DALE_ACCENTS.map((a) => (
                      <button key={a.color} title={a.name} onClick={() => { setAccent(a.color); setAccentState(a); }}
                        className={`w-5 h-5 rounded-full border-2 transition ${accent.color === a.color ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: a.color }} />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Chat history stays while the app is open; unsaved messages auto-clear after 12h. Use 💾 Keep Message to persist a message for up to 30 days.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {tab === "settings" ? (
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm">
          <p className="font-bold text-base">Chat Settings</p>
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>Animations &amp; expressions</span>
              <input type="checkbox" checked={animations} className="accent-primary"
                onChange={(e) => { setAnimations(e.target.checked); setAnimationsEnabled(e.target.checked); }} />
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span>Glassmorphism effect</span>
              <input type="checkbox" checked={glass} className="accent-primary"
                onChange={(e) => { setGlass(e.target.checked); setGlassEnabled(e.target.checked); }} />
            </label>
          </div>
          <div>
            <p className="font-semibold mb-2">Accent color</p>
            <div className="flex gap-2">
              {DALE_ACCENTS.map((a) => (
                <button key={a.color} title={a.name} onClick={() => { setAccent(a.color); setAccentState(a); }}
                  className={`w-6 h-6 rounded-full border-2 transition ${accent.color === a.color ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: a.color }} />
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">Chat persistence</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your conversation stays while the app is open and closing the panel only hides it. Unsaved
              messages auto-clear after 12 hours; use 💾 Keep Message to keep one for up to 30 days.
            </p>
          </div>
          <button onClick={() => setTab("dale")} className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition"
            style={{ backgroundColor: accent.color }}>← Back to chat</button>
        </div>
      ) : tab === "dms" ? (
        <DmPanel expanded={expanded} onSwitchToDale={() => { setTab("dale"); onSwitchToDale?.(); }} />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className={`flex justify-start ${animations ? "dale-msg-left" : ""}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5"
                  style={{ backgroundColor: accent.color, color: "#fff" }}>D</div>
                <div className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed text-foreground rounded-2xl rounded-bl-sm max-w-[75%] ${glass ? "dale-glass-bubble" : "bg-muted"}`}>
                  {WELCOME_FOR_ROLE(user?.name, user?.role)}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender === "student";
              const isSystem = msg.sender === "system";
              return (
                <div key={msg._id}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"} ${animations ? (isUser ? "dale-msg-right" : "dale-msg-left") : ""}`}>
                  {!isUser && !isSystem && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5"
                      style={{ backgroundColor: accent.color, color: "#fff" }}>D</div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                      isSystem ? "bg-destructive/10 text-destructive rounded-xl text-xs"
                      : isUser ? "text-white rounded-2xl rounded-tr-sm"
                      : glass ? "dale-glass-bubble text-foreground rounded-2xl rounded-bl-sm" : "bg-muted text-foreground rounded-2xl rounded-bl-sm"}`}
                      style={isUser ? { backgroundColor: accent.color } : {}}>
                      {msg.text}
                    </div>
                    {!isUser && !isSystem && (
                      <button onClick={() => saveMessage(msg._id)} disabled={msg.is_saved}
                        className={`text-[11px] mt-1 font-semibold px-1 py-0.5 rounded transition ${msg.is_saved ? "text-emerald-600 font-bold" : "text-muted-foreground hover:text-primary hover:bg-muted/50"}`}>
                        {msg.is_saved ? "🔒 Saved to Cloud" : "💾 Keep Message"}
                      </button>
                    )}
                  </div>
                  {isUser && (
                    <div className="ml-2 shrink-0 self-end">
                      <Avatar className="h-7 w-7">
                        {user?.profileImage ? <AvatarImage src={user.profileImage} alt={user?.name ?? "User"} />
                          : <AvatarFallback className="text-[10px] font-bold">{getInitials(user?.name)}</AvatarFallback>}
                      </Avatar>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start items-end">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0"
                  style={{ backgroundColor: accent.color, color: "#fff" }}>D</div>
                {animations ? (
                  <div className={`px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5 ${glass ? "dale-glass-bubble" : "bg-muted"}`}>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-muted rounded-2xl rounded-bl-sm shadow-sm text-xs text-muted-foreground">DALE is typing…</div>
                )}
              </div>
            )}
          </div>

          {/* Quick replies — pulsating, shown after every AI response */}
          {showQuickReplies && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-border/50">
              {quickReplies.map((qr, i) => (
                <button key={qr.label} onClick={() => handleSend(qr.prompt)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold hover:opacity-90 transition ${animations ? "dale-chip-pulse" : ""}`}
                  style={{ border: `1px solid ${accent.color}66`, color: accent.color, backgroundColor: `${accent.color}14`, animationDelay: `${i * 120}ms` }}>
                  {qr.label}
                </button>
              ))}
            </div>
          )}

          {/* Input bar with emoji picker */}
          <div className="relative p-3 border-t border-border flex gap-2 items-center">
            {showEmoji && (
              <DaleEmojiPicker onPick={(e) => setInput((v) => v + e)} onClose={() => setShowEmoji(false)} />
            )}
            <button onClick={() => setShowEmoji((s) => !s)} title="Emoji"
              className={`p-2 rounded-full text-lg transition ${showEmoji ? "bg-muted/70" : "hover:bg-muted/50"}`}>😊</button>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message DALE… (@email to send a DM)"
              className="flex-1 px-4 py-2 bg-muted/10 border-none rounded-full text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition" />
            <button onClick={() => handleSend()} disabled={!input.trim() || loading}
              className="font-semibold text-sm px-3 py-1.5 rounded-full transition disabled:opacity-50"
              style={{ backgroundColor: accent.color, color: "#fff" }}
              title="Send">➤</button>
          </div>
        </>
      )}
    </div>
  );
}
