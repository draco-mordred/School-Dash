import { useState } from "react";
import { useMordred } from "../../hooks/useMordred";
import { useAuth } from "../../hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DmPanel } from "../dm/DmPanel"; // PR M2 — Direct Messages tab

export function MordredChatPanel() {
  const { user } = useAuth();
  const { messages, loading, sendMessage, saveMessage } = useMordred();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"dale" | "dms">("dale"); // PR M2 — DALE | DMs tabs

  const handleSend = () => {
    sendMessage(input, user?.department || "General");
    setInput("");
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-[450px] bg-background font-sans">
      {/* PR M2 — tab switcher: DALE assistant vs Direct Messages */}
      <div className="flex border-b border-border bg-muted/30">
        <button
          onClick={() => setTab("dale")}
          className={`flex-1 py-2 text-xs font-bold tracking-wide transition ${
            tab === "dale" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          DALE
        </button>
        <button
          onClick={() => setTab("dms")}
          className={`flex-1 py-2 text-xs font-bold tracking-wide transition ${
            tab === "dms" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-primary"
          }`}
        >
          DMs
        </button>
      </div>

      {tab === "dms" ? (
        <DmPanel />
      ) : (
        <>
          {/* Scrollable Conversation Stream Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/50">
            {messages.map((msg) => {
              const isUser = msg.sender === "student";
              return (
                <div key={msg._id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                  {/* Profile Initial Indicator Avatar for DALE */}
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5">
                      D
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                    {/* Messenger Style Rounded Bubbles */}
                    <div
                      id="chatBubbles" className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed ${
                          isUser
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm font-normal"
                          : "bg-muted text-foreground rounded-2xl rounded-bl-sm font-normal"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Action Controls for AI Transcripts */}
                    {!isUser && (
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
                          <AvatarFallback className="text-[10px] font-bold">
                            {getInitials(user?.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 pl-9 mordred-loading-dots">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
              </div>
            )}
          </div>

          {/* Modern Low-Profile Input Bar Frame */}
          <div className="p-3 border-t border-border bg-background flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="message DALE... (@email to send a DM)"
              className="flex-1 px-4 py-2 bg-muted/10 border-none rounded-full text-sm placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`font-semibold text-sm px-3 py-1.5 rounded-md transition ${
                input.trim() ? "text-primary hover:bg-primary/10" : "text-muted-foreground"
              }`}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
