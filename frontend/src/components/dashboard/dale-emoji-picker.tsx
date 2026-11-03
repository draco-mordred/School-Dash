"use client";
import { useState } from "react";

// PR M7 — lightweight emoji picker for the DALE chat input.
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","😂","🙂","😉","😊","😍","🤩","😘","😜","🤗","🤔","🤨","😐","😴","🥳","😢","😭","😤","😡","🤯","😱","🥺","😇"] },
  { label: "Gestures", emojis: ["👍","👎","👏","🙌","🤝","🙏","✌️","🤞","💪","👋","🫶","🤙","☝️","🖐️"] },
  { label: "School", emojis: ["📚","📝","✏️","📖","🎓","🏫","🔬","🩺","💊","🧠","🧪","📊","📝","⏰","📅"] },
  { label: "Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","✨","🌟","🔥","🎉"] },
];

export const DaleEmojiPicker = ({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) => {
  const [group, setGroup] = useState(0);
  return (
    <div className="absolute bottom-12 left-2 z-30 w-64 rounded-2xl border border-border bg-card shadow-2xl p-3 dale-pop-in">
      <div className="flex gap-1 mb-2">
        {EMOJI_GROUPS.map((g, i) => (
          <button key={g.label} onClick={() => setGroup(i)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${i === group ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
            {g.label}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-primary text-xs px-1">✕</button>
      </div>
      <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
        {EMOJI_GROUPS[group].emojis.map((e, i) => (
          <button key={e + i} onClick={() => onPick(e)} className="text-lg rounded-lg hover:bg-muted/70 transition p-1">{e}</button>
        ))}
      </div>
    </div>
  );
};
export default DaleEmojiPicker;
