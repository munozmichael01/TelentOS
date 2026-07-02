"use client";

import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const TIME_SLOTS = buildSlots();

interface TimeFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const TimeField = React.forwardRef<HTMLSelectElement, TimeFieldProps>(
  ({ value, onChange, placeholder = "Hora", disabled, className, style }, ref) => {
    return (
      <div style={{ position: "relative", display: "inline-block", width: "100%" }} className={cn(className)}>
        <Clock
          size={14}
          color="#79746B"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", zIndex: 1 }}
        />
        <select
          ref={ref}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          style={{
            width: "100%", appearance: "none", paddingLeft: 34, paddingRight: 32,
            paddingTop: 10, paddingBottom: 10,
            fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 13.5,
            color: value ? "#1A1A17" : "#79746B",
            background: "#F4F0E8", border: "1.5px solid #E7E1D4", borderRadius: 11,
            outline: "none", cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1, transition: "border-color .12s, box-shadow .12s",
            ...style,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0E5C4A"; e.currentTarget.style.boxShadow = "0 0 0 3px #DCEFE4"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E7E1D4"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <option value="" disabled>{placeholder}</option>
          {TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
        <svg
          style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          width="13" height="13" viewBox="0 0 24 24" fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="#79746B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  }
);
TimeField.displayName = "TimeField";
