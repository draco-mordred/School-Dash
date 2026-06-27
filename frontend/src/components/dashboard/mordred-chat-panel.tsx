import { useState } from "react";
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




  // return (
  //   // <div id="mordredChatBox" className="flex flex-col h-[500px] border rounded-lg bg-white shadow-sm">
  //   <div className="flex flex-col h-[450px] bg-white font-sans">
  //     {/* <div className="p-4 border-b bg-slate-50 font-bold">⚔️ M.O.R.D.R.E.D. Director</div> */}
  //     {/* <div className="flex-1 p-4 overflow-y-auto space-y-4"> */}
  //           {/* Scrollable Conversation Stream Area */}
  //     <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">

  //       {messages.map((msg) => (
          
  //         <div key={msg._id} className={`flex flex-col max-w-[75%] ${msg.sender === "student" ? "ml-auto items-end" : "mr-auto items-start"}`}>
  //           <div className={`p-3 rounded-lg ${msg.sender === "student" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
  //             {msg.text}
  //           </div>
  //           {msg.sender === "mordred_ai" && (
  //             <button id={`saveBtn`}
  //               onClick={() => saveMessage(msg._id)}
  //               disabled={msg.is_saved}
  //               className={`text-xs mt-1 font-semibold ${msg.is_saved ? "text-green-600" : "text-slate-500 hover:text-blue-600"}`}
  //             >
  //               {msg.is_saved ? "🔒 Saved to Profile" : "💾 Save Transcript"}
  //             </button>
  //           )}
  //         </div>
  //       ))}
  //       {loading && <div className="text-xs text-slate-400 animate-pulse">MORDRED is evaluating...</div>}
  //     </div>
  //     <div className="p-3 border-t flex gap-2">
  //       <input 
  //         value={input} 
  //         onChange={(e) => setInput(e.target.value)}
  //         placeholder="State your query to MORDRED..." 
  //         className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
  //       />
  //       <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700">
  //         Send
  //       </button>
  //     </div>
  //   </div>
  // );

  return (
    <div className="flex flex-col h-[450px] bg-background font-sans">
      {/* Scrollable Conversation Stream Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/50">
        {messages.map((msg) => {
          const isUser = msg.sender === "student";
          return (
            <div key={msg._id} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
              {/* Profile Initial Indicator Avatar for MORDRED */}
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold mr-2 shadow-sm shrink-0 self-end mb-5">
                  M
                </div>
              )}
              
              <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                {/* Messenger Style Rounded Bubbles */}
                <div 
                  className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed ${
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
          placeholder="message MORDRED..." 
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
    </div>
  );
}
