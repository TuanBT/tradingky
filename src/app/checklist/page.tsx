"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faPlus,
  faXmark,
  faCheck,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Checklist {
  pre: ChecklistItem[];
  post: ChecklistItem[];
}

const DEFAULT_PRE: ChecklistItem[] = [
  { id: "p1", text: "Đã phân tích xu hướng (trend) trên TF lớn", checked: false },
  { id: "p2", text: "Đã xác định vùng hỗ trợ / kháng cự", checked: false },
  { id: "p3", text: "Đã có setup rõ ràng (confluence)", checked: false },
  { id: "p4", text: "Risk/Reward tối thiểu 1:2", checked: false },
  { id: "p5", text: "Đã đặt Stop Loss", checked: false },
  { id: "p6", text: "Position size phù hợp (≤ 1-2% tài khoản)", checked: false },
  { id: "p7", text: "Không có tin quan trọng sắp ra", checked: false },
  { id: "p8", text: "Tâm lý ổn định, không FOMO", checked: false },
];

const DEFAULT_POST: ChecklistItem[] = [
  { id: "q1", text: "Đã vào đúng setup hay không?", checked: false },
  { id: "q2", text: "Quản lý rủi ro có đúng kế hoạch?", checked: false },
  { id: "q3", text: "Có bị ảnh hưởng cảm xúc không?", checked: false },
  { id: "q4", text: "Bài học rút ra từ lệnh này?", checked: false },
  { id: "q5", text: "Có nên điều chỉnh cách giao dịch?", checked: false },
];

const STORAGE_KEY = "tradingky_checklist";
const CHECKLIST_TEMPLATE_KEY = "tradingky_checklist_template";

export default function ChecklistPage() {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<Checklist>({ pre: DEFAULT_PRE, post: DEFAULT_POST });
  const [newPreItem, setNewPreItem] = useState("");
  const [newPostItem, setNewPostItem] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const templateStr = localStorage.getItem(CHECKLIST_TEMPLATE_KEY);
    const savedStr = localStorage.getItem(STORAGE_KEY);
    if (templateStr) {
      const template = JSON.parse(templateStr) as Checklist;
      if (savedStr) {
        const saved = JSON.parse(savedStr) as Checklist;
        // merge: keep template items but restore check state
        const mergeChecks = (tmpl: ChecklistItem[], saved: ChecklistItem[]) =>
          tmpl.map((item) => ({
            ...item,
            checked: saved.find((s) => s.id === item.id)?.checked || false,
          }));
        setChecklist({
          pre: mergeChecks(template.pre, saved.pre),
          post: mergeChecks(template.post, saved.post),
        });
      } else {
        setChecklist(template);
      }
    } else if (savedStr) {
      setChecklist(JSON.parse(savedStr));
    }
  }, []);

  const save = useCallback((cl: Checklist) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cl));
    // Also save template (items without check state)
    const template: Checklist = {
      pre: cl.pre.map((i) => ({ ...i, checked: false })),
      post: cl.post.map((i) => ({ ...i, checked: false })),
    };
    localStorage.setItem(CHECKLIST_TEMPLATE_KEY, JSON.stringify(template));
  }, []);

  const toggleItem = (type: "pre" | "post", id: string) => {
    const updated = {
      ...checklist,
      [type]: checklist[type].map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    };
    setChecklist(updated);
    save(updated);
  };

  const addItem = (type: "pre" | "post") => {
    const text = type === "pre" ? newPreItem.trim() : newPostItem.trim();
    if (!text) return;
    const newItem: ChecklistItem = {
      id: `${type}-${Date.now()}`,
      text,
      checked: false,
    };
    const updated = {
      ...checklist,
      [type]: [...checklist[type], newItem],
    };
    setChecklist(updated);
    save(updated);
    if (type === "pre") setNewPreItem("");
    else setNewPostItem("");
  };

  const removeItem = (type: "pre" | "post", id: string) => {
    const updated = {
      ...checklist,
      [type]: checklist[type].filter((i) => i.id !== id),
    };
    setChecklist(updated);
    save(updated);
  };

  const resetChecks = () => {
    const updated: Checklist = {
      pre: checklist.pre.map((i) => ({ ...i, checked: false })),
      post: checklist.post.map((i) => ({ ...i, checked: false })),
    };
    setChecklist(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const preProgress = checklist.pre.length > 0
    ? Math.round((checklist.pre.filter((i) => i.checked).length / checklist.pre.length) * 100)
    : 0;
  const postProgress = checklist.post.length > 0
    ? Math.round((checklist.post.filter((i) => i.checked).length / checklist.post.length) * 100)
    : 0;

  const renderList = (type: "pre" | "post", items: ChecklistItem[]) => (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
            item.checked
              ? "bg-green-500/10 border-green-500/30"
              : "bg-background border-border hover:border-primary/30"
          }`}
          onClick={() => !editMode && toggleItem(type, item.id)}
        >
          <div
            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
              item.checked
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground"
            }`}
          >
            {item.checked && <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />}
          </div>
          <span
            className={`flex-1 text-sm ${
              item.checked ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.text}
          </span>
          {editMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeItem(type, item.id);
              }}
              className="text-red-500 hover:text-red-400 p-1"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FontAwesomeIcon icon={faListCheck} className="h-6 w-6 text-blue-500" />
            Checklist
          </h1>
          <p className="text-muted-foreground mt-1">Kiểm tra trước và sau mỗi lệnh</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetChecks}>
            <FontAwesomeIcon icon={faRotateLeft} className="mr-2 h-3 w-3" />
            Reset tích
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Xong" : "Sửa danh sách"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pre-Trade Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🎯 Trước khi vào lệnh</CardTitle>
              <span className={`text-sm font-mono ${preProgress === 100 ? "text-green-500" : "text-muted-foreground"}`}>
                {preProgress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${preProgress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderList("pre", checklist.pre)}
            {editMode && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Input
                    placeholder="Thêm mục kiểm tra..."
                    value={newPreItem}
                    onChange={(e) => setNewPreItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem("pre")}
                  />
                  <Button size="sm" onClick={() => addItem("pre")}>
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Post-Trade Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📝 Sau khi đóng lệnh</CardTitle>
              <span className={`text-sm font-mono ${postProgress === 100 ? "text-green-500" : "text-muted-foreground"}`}>
                {postProgress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${postProgress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderList("post", checklist.post)}
            {editMode && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Input
                    placeholder="Thêm mục kiểm tra..."
                    value={newPostItem}
                    onChange={(e) => setNewPostItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem("post")}
                  />
                  <Button size="sm" onClick={() => addItem("post")}>
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
