import React, { useState } from "react";
import { useMordred } from "../../hooks/useMordred";
import { useAuth } from "../../hooks/useAuth"; // Assuming this yields your user context

export function MordredChatPanel() {
  const { user } = useAuth();
  const { messages, loading, sendMessage, saveMessage } = useMordred();
  const [input, setInput] = useState("");

  const handleSend = () => {
    sendMessage(input, user?.department || "General");
    setInput("");
  };

  return (
    <div id="mordredChatBox" className="flex flex-col h-[500px] border rounded-lg bg-white shadow-sm">
      {/* <div className="p-4 border-b bg-slate-50 font-bold">⚔️ M.O.R.D.R.E.D. Director</div> */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex flex-col max-w-[75%] ${msg.sender === "student" ? "ml-auto items-end" : "mr-auto items-start"}`}>
            <div className={`p-3 rounded-lg ${msg.sender === "student" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {msg.text}
            </div>
            {msg.sender === "mordred_ai" && (
              <button id={`saveBtn`}
                onClick={() => saveMessage(msg._id)}
                disabled={msg.is_saved}
                className={`text-xs mt-1 font-semibold ${msg.is_saved ? "text-green-600" : "text-slate-500 hover:text-blue-600"}`}
              >
                {msg.is_saved ? "🔒 Saved to Profile" : "💾 Save Transcript"}
              </button>
            )}
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400 animate-pulse">MORDRED is evaluating...</div>}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="State your query to MORDRED..." 
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700">
          Send
        </button>
      </div>
    </div>
  );
}
