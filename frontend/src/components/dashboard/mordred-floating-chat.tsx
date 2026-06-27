import React, { useState } from "react";
import { MordredChatPanel } from "./mordred-chat-panel";

export function MordredFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Expanded Chat Box Window */}
      {isOpen && (
        <div 
        id="mordredChatContainer" className="mb-4 w-80 md:w-96 shadow-2xl rounded-xl border border-slate-200 overflow-hidden bg-white animate-in slide-in-from-bottom-5 duration-200">
          <div id="mordredChatHeader" className="bg-slate-900 text-white p-3 flex justify-between items-center">
            <span className="font-bold text-sm tracking-wide">Chat with MORDRED</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              ✕ Collapse
            </button>
          </div>
          <MordredChatPanel />
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="mordredFloatingBtn"
        className="bg-slate-950 text-white p-4 rounded-full shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center border border-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
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
