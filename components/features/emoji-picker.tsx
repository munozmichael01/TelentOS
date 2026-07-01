"use client";

import { useEffect, useRef, useState } from "react";

const CATS = [
  {
    icon: "😊", label: "Expresiones",
    emojis: ["😊","😃","🥳","🤩","😎","🙌","👏","🤝","💪","🫡","🙏","❤️","💚","💛","🧡","💜","🔥","✨","⭐","🌟","💫","🎉","🎊","😄"],
  },
  {
    icon: "💼", label: "Trabajo",
    emojis: ["💼","📊","📈","💻","🖥️","📱","🔑","🗂️","📋","📌","🏆","🎯","💡","🔧","⚙️","🚀","📝","✅","📣","💬","🏅","🥇","📐","🧑‍💻"],
  },
  {
    icon: "🌱", label: "Naturaleza",
    emojis: ["🌱","🌿","🌲","🌳","🌻","🌊","☀️","🌍","🌈","🍃","🔬","🧬","🌾","🦋","🐝","🌙","⚡","🏔️","🌺","🌸","🍀","🌵","🌴","🌞"],
  },
  {
    icon: "🎯", label: "Actividades",
    emojis: ["🎯","🏅","🥇","🎪","🎨","🎭","🎮","🎬","⚽","🏋️","🏊","🚴","🎸","🎵","🧘","🏃","🥊","🎾","🎲","♟️","🧩","🏄","🤿","🛹"],
  },
  {
    icon: "💡", label: "Objetos",
    emojis: ["💡","📚","🔑","🎁","💎","📸","🏗️","🔭","🏛️","🛡️","🧪","🔮","🧲","🎙️","🖊️","🔐","📡","🛸","⚗️","🧰","📦","🔩","🏺","🗺️"],
  },
  {
    icon: "👥", label: "Personas",
    emojis: ["👥","🤝","👩‍💻","👨‍💻","🧑‍🎓","👩‍🔬","👨‍🏫","🦸","🧑‍🏭","👩‍🍳","👨‍⚕️","🧑‍💼","👩‍🎨","🧙","🥷","🦄","🦊","🐼","🦁","🐺","🦅","🐬","🦈","🦋"],
  },
];

export function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeCat, setActiveCat] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        zIndex: 200,
        top: "calc(100% + 6px)",
        left: 0,
        background: "#FCFAF6",
        border: "2px solid #1A1A17",
        borderRadius: "14px",
        boxShadow: "4px 4px 0 #1A1A17",
        width: "238px",
        overflow: "hidden",
      }}
    >
      {/* Category tabs */}
      <div style={{ display: "flex", background: "#F4F0E8", borderBottom: "1px solid #E7E1D4" }}>
        {CATS.map((cat, i) => (
          <button
            key={i}
            type="button"
            title={cat.label}
            onClick={() => setActiveCat(i)}
            style={{
              flex: 1, padding: "7px 0", border: "none", cursor: "pointer",
              fontSize: "13px", lineHeight: 1,
              background: activeCat === i ? "#FCFAF6" : "transparent",
              borderBottom: activeCat === i ? "2px solid #1A1A17" : "2px solid transparent",
              marginBottom: "-1px",
              transition: "background .1s",
            }}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div
        style={{
          padding: "6px",
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
          maxHeight: "156px",
          overflowY: "auto",
        }}
      >
        {CATS[activeCat].emojis.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(emoji)}
            style={{
              padding: "5px 2px",
              border: "none",
              background: "none",
              fontSize: "17px",
              cursor: "pointer",
              borderRadius: "6px",
              lineHeight: 1.2,
              transition: "background .08s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#F4F0E8"; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "none"; }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
