import { useState } from "react";
import { MordredChatPanel } from "./mordred-chat-panel";

export function MordredFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const openChat = () => {
    setShowPanel(true);
    setIsClosing(false);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsClosing(true);
    setIsOpen(false);
  };

  const handleAnimationEnd = () => {
    if (isClosing) {
      setShowPanel(false);
      setIsClosing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Expanded Chat Box Window */}
      {showPanel && (
        <div
          id="mordredChatContainer"
          onTransitionEnd={handleAnimationEnd}
          className={`mb-4 w-80 md:w-96 shadow-2xl rounded-xl border border-border overflow-hidden bg-card transform transition-all duration-200 ease-out mordred-panel-transition ${
            isOpen && !isClosing
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <div id="mordredChatHeader" className="bg-primary text-primary-foreground p-3 flex justify-between items-center">
            <span className="font-bold text-sm tracking-wide">Chat with MORDRED</span>
            <button
              onClick={closeChat}
              className="text-muted-foreground hover:text-primary-foreground text-xs px-2 py-1 rounded hover:bg-primary/10 transition"
            >
              ✕ Collapse
            </button>
          </div>
          <MordredChatPanel />
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        onClick={() => {
          if (!isOpen) {
            openChat();
          } else {
            closeChat();
          }
        }}
        id="mordredFloatingBtn"
        className="bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center border border-border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30"
      >
        {isOpen ? (
          <span className="text-xs font-semibold px-1">Close System</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-sm font-bold tracking-wider">Chat</span>
          </div>
        )}
      </button>
    </div>
  );
}
