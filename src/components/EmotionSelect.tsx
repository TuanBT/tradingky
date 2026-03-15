"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { EmotionOption } from "@/lib/types";

export function EmotionSelect({ value, onValueChange, options, placeholder }: { value: string; onValueChange: (v: string) => void; options: EmotionOption[]; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="mt-1">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors"
      >
        <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
        <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && createPortal(
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }} className="max-h-60 overflow-auto rounded-md border bg-popover shadow-lg">
          {value && (
            <button
              type="button"
              onClick={() => { onValueChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors border-b"
            >
              Bỏ chọn
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onValueChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${value === opt.value ? "bg-accent font-medium" : ""}`}
            >
              <div className="text-sm">{opt.value}</div>
              <div className="text-xs text-muted-foreground">{opt.description}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
