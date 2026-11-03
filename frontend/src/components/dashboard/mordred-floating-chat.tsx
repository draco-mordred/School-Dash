import { useState } from "react";
import { MordredChatPanel } from "./mordred-chat-panel";
import { animationsEnabled } from "../../utils/daleSettings";

// PR M7 — animated popup entry/exit for the floating chat (spring pop-in on
// open, pop-out on close), on top of the M3 expand/overlay modes.
export function MordredFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [animations] = useState(animationsEnabled());

  const openChat = () => { setShowPanel(true); setIsClosing(false); setIsOpen(true); };
  const closeChat = () => { setIsClosing(true); setIsOpen(false); setExpanded(false); };

  const handleAnimationEnd = () => {
    if (isClosing) { setShowPanel(false); setIsClosing(false); }
  };

  const animCls = animations ? (isClosing ? "dale-pop-out" : "dale-pop-in") : "";

  const panelBody = (
    <div id="mordredChatContainer" onAnimationEnd={handleAnimationEnd}
      className={`${expanded ? "w-full h-full md:w-[min(1000px,92vw)] md:h-[85vh]" : "mb-4 w-80 md:w-96 h-[520px]"} rounded-xl border border-border overflow-hidden bg-card shadow-2xl ${animCls}`}>
      <div className="bg-primary text-primary-foreground px-3 py-2 flex justify-between items-center">
        <span className="font-bold text-sm tracking-wide">Chat with DALE</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded((e) => !e)} title={expanded ? "Restore" : "Expand"}
            className="text-xs px-2 py-1 rounded hover:bg-primary/10 transition">{expanded ? "⤡ Restore" : "⤢ Expand"}</button>
          <button onClick={closeChat} className="text-xs px-2 py-1 rounded hover:bg-primary/10 transition">✕ Collapse</button>
        </div>
      </div>
      <div className="h-[calc(100%-41px)]">
        <MordredChatPanel expanded={expanded} />
      </div>
    </div>
  );

  return (
    <>
      {showPanel && expanded && <div className="fixed inset-0 z-40 bg-black/40" onClick={closeChat} />}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans ${expanded ? "pointer-events-none" : ""}`}>
        {showPanel && !expanded && panelBody}
        <button onClick={() => (isOpen ? closeChat() : openChat())} id="mordredFloatingBtn"
          className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center border border-border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30">
          {isOpen ? <span className="text-xs font-semibold px-1">Close System</span> : (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${animations ? "animate-pulse" : ""}`}></span>
              <span className="text-sm font-bold tracking-wider">Chat</span>
            </div>
          )}
        </button>
      </div>
      {showPanel && expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 pointer-events-auto">{panelBody}</div>
      )}
    </>
  );
}
