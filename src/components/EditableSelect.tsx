"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPenToSquare,
  faTrash,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

interface EditableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
}

export default function EditableSelect({
  value,
  onValueChange,
  items,
  onItemsChange,
  placeholder = "Chọn...",
}: EditableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [isOpen]);

  useEffect(() => {
    updatePosition();
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setEditingIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    const updated = [...items, trimmed];
    onItemsChange(updated);
    onValueChange(trimmed);
    setNewItem("");
    setIsOpen(false);
  };

  const handleDelete = (index: number) => {
    const deleted = items[index];
    const updated = items.filter((_, i) => i !== index);
    onItemsChange(updated);
    if (value === deleted) onValueChange("");
  };

  const handleEditStart = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index]);
  };

  const handleEditSave = (index: number) => {
    const trimmed = editValue.trim();
    if (!trimmed || (trimmed !== items[index] && items.includes(trimmed))) {
      setEditingIndex(null);
      return;
    }
    const oldValue = items[index];
    const updated = [...items];
    updated[index] = trimmed;
    onItemsChange(updated);
    if (value === oldValue) onValueChange(trimmed);
    setEditingIndex(null);
  };

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-md border bg-popover shadow-lg max-h-64 overflow-auto"
    >
      {/* Add new */}
      <div className="flex gap-1 p-2 border-b sticky top-0 bg-popover">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          placeholder="Thêm mới..."
          className="h-8 text-sm"
        />
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={handleAdd} disabled={!newItem.trim()}>
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground text-center">Chưa có mục nào</div>
      ) : (
        items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-2 py-1 group/item">
            {editingIndex === i ? (
              <>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleEditSave(i); } if (e.key === "Escape") setEditingIndex(null); }}
                  className="h-7 text-sm flex-1"
                  autoFocus
                />
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditSave(i)}>
                  <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-green-500" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingIndex(null)}>
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`flex-1 text-left px-2 py-1 rounded text-sm hover:bg-accent ${value === item ? "bg-accent font-medium" : ""}`}
                  onClick={() => { onValueChange(item); setIsOpen(false); }}
                >
                  {item}
                </button>
                <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button type="button" className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); handleEditStart(i); }}>
                    <FontAwesomeIcon icon={faPenToSquare} className="h-2.5 w-2.5 text-muted-foreground" />
                  </button>
                  <button type="button" className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); handleDelete(i); }}>
                    <FontAwesomeIcon icon={faTrash} className="h-2.5 w-2.5 text-destructive" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={triggerRef} className="relative mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <svg className="h-4 w-4 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdown}
    </div>
  );
}
