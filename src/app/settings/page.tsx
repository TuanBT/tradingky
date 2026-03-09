"use client";

import { useEffect, useState, useCallback } from "react";
import { DropdownLibrary, DEFAULT_LIBRARY, Trade } from "@/lib/types";
import { getLibrary, updateLibrary, getTrades, addTrade } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faXmark,
  faFloppyDisk,
  faRotateLeft,
  faCoins,
  faFaceSmile,
  faLightbulb,
  faChessKnight,
  faBuildingColumns,
  faClock,
  faTags,
  faFileExport,
  faFileImport,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";

type LibraryKey = keyof DropdownLibrary;

const SECTIONS: { key: LibraryKey; label: string; icon: typeof faCoins; emojis: string[] }[] = [
  { key: "pairs", label: "Cặp tiền", icon: faCoins, emojis: ["🥇", "₿", "💰", "💎", "🪙", "💵", "💶", "💷", "🇺🇸", "🇪🇺", "🇬🇧", "🇯🇵", "🇦🇺"] },
  { key: "emotions", label: "Tâm lý", icon: faFaceSmile, emojis: ["😎", "😌", "😤", "😰", "🤑", "💪", "🔥", "❄️", "😡", "🤔", "😱", "🧘", "🎯"] },
  { key: "reasons", label: "Lý do vào lệnh", icon: faLightbulb, emojis: ["🚀", "📊", "📈", "📉", "🎯", "💡", "🔄", "⚡", "🏗️", "🕯️", "📐", "🔔", "📰"] },
  { key: "strategies", label: "Strategy", icon: faChessKnight, emojis: ["⚡", "🎯", "🏄", "🏃", "🐢", "🦅", "♟️", "🎲", "🧠", "📏"] },
  { key: "platforms", label: "Sàn giao dịch", icon: faBuildingColumns, emojis: ["🏦", "💹", "🌐", "📱", "💻", "🔗"] },
  { key: "timeframes", label: "Timeframe", icon: faClock, emojis: ["⏱️", "⏰", "🕐", "📅", "📆", "🗓️"] },
  { key: "tags", label: "Tags", icon: faTags, emojis: ["🏷️", "🔖", "⭐", "📌", "🔥", "💎", "🎉", "⚠️", "✅", "❌"] },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [importStatus, setImportStatus] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<Record<string, string>>({});
  const [showEmojis, setShowEmojis] = useState<Record<string, boolean>>({});

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getLibrary(user.uid);
    setLibrary(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleAddItem = (key: LibraryKey) => {
    const rawValue = newItems[key]?.trim();
    if (!rawValue) return;
    const emoji = selectedEmoji[key] || "";
    const value = emoji ? `${emoji} ${rawValue}` : rawValue;
    if (library[key].includes(value)) return;
    setLibrary({
      ...library,
      [key]: [...library[key], value],
    });
    setNewItems({ ...newItems, [key]: "" });
    setSelectedEmoji({ ...selectedEmoji, [key]: "" });
    setShowEmojis({ ...showEmojis, [key]: false });
  };

  const handleRemoveItem = (key: LibraryKey, item: string) => {
    setLibrary({
      ...library,
      [key]: library[key].filter((i) => i !== item),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    if (!user) return;
    await updateLibrary(user.uid, library);
    setSaving(false);
  };

  const handleReset = () => {
    if (!confirm("Reset về giá trị mặc định? Bạn sẽ mất các thay đổi!")) return;
    setLibrary(DEFAULT_LIBRARY);
  };

  const handleExportJSON = async () => {
    if (!user) return;
    const trades = await getTrades(user.uid);
    const exportData = {
      exportedAt: new Date().toISOString(),
      trades: trades.map(({ id, ...rest }) => rest),
      library,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradingky-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    if (!user) return;
    const trades = await getTrades(user.uid);
    const headers = ["date", "pair", "platform", "type", "emotion", "result", "pnl", "stopLoss", "takeProfit", "reason", "chartImageUrl", "note", "entryPrice", "exitPrice", "lotSize", "timeframe", "closeDate", "strategy", "tags"];
    const csvRows = [headers.join(",")];
    for (const t of trades) {
      const row = headers.map((h) => {
        const val = t[h as keyof Trade];
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) return `"${val.join(";")}"`;
        if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      });
      csvRows.push(row.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradingky-trades-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.trades || !Array.isArray(data.trades)) {
        setImportStatus("Lỗi: File không hợp lệ (thiếu trades)");
        return;
      }
      if (!confirm(`Import ${data.trades.length} trades? Dữ liệu mới sẽ được THÊM VÀO (không ghi đè).`)) {
        e.target.value = "";
        return;
      }
      let count = 0;
      for (const trade of data.trades) {
        await addTrade(user.uid, { ...trade, createdAt: trade.createdAt || Date.now() });
        count++;
      }
      if (data.library) {
        await updateLibrary(user.uid, data.library);
        setLibrary(data.library);
      }
      setImportStatus(`Đã import ${count} trades thành công!`);
      setTimeout(() => setImportStatus(""), 4000);
    } catch {
      setImportStatus("Lỗi: Không thể đọc file JSON");
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cài đặt</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý thư viện dropdown dùng trong form nhập lệnh
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <FontAwesomeIcon icon={faRotateLeft} className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SECTIONS.map((section) => (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FontAwesomeIcon icon={section.icon} className="h-4 w-4 text-muted-foreground" />
                {section.label}
                <Badge variant="secondary" className="ml-auto">
                  {library[section.key].length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {library[section.key].map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="pl-3 pr-1 py-1 flex items-center gap-1"
                  >
                    {item}
                    <button
                      onClick={() => handleRemoveItem(section.key, item)}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                    >
                      <FontAwesomeIcon icon={faXmark} className="h-3 w-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    {selectedEmoji[section.key] && (
                      <span className="flex items-center text-lg px-2 border rounded bg-muted">
                        {selectedEmoji[section.key]}
                      </span>
                    )}
                    <Input
                      placeholder={`Thêm ${section.label.toLowerCase()}...`}
                      value={newItems[section.key] || ""}
                      onChange={(e) =>
                        setNewItems({ ...newItems, [section.key]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddItem(section.key);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowEmojis({ ...showEmojis, [section.key]: !showEmojis[section.key] })}
                      title="Chọn icon"
                      className="shrink-0"
                    >
                      😀
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleAddItem(section.key)}
                      className="shrink-0"
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                    </Button>
                  </div>
                  {showEmojis[section.key] && (
                    <div className="flex flex-wrap gap-1 p-2 rounded-lg border bg-muted/50">
                      {section.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          className={`text-lg p-1 rounded hover:bg-accent transition-colors ${selectedEmoji[section.key] === emoji ? "bg-primary/20 ring-1 ring-primary" : ""}`}
                          onClick={() => setSelectedEmoji({ ...selectedEmoji, [section.key]: selectedEmoji[section.key] === emoji ? "" : emoji })}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export / Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sao lưu & Khôi phục</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Export JSON (trades + library)</p>
              <Button variant="outline" className="w-full" onClick={handleExportJSON}>
                <FontAwesomeIcon icon={faFileExport} className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Export CSV (chỉ trades)</p>
              <Button variant="outline" className="w-full" onClick={handleExportCSV}>
                <FontAwesomeIcon icon={faFileExport} className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Import từ file JSON backup</p>
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <span className="inline-flex items-center justify-center w-full h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
                  <FontAwesomeIcon icon={faFileImport} className="mr-2 h-4 w-4" />
                  Import JSON
                </span>
              </label>
              {importStatus && (
                <p className={`text-xs ${importStatus.startsWith("Lỗi") ? "text-red-500" : "text-green-500"}`}>
                  {!importStatus.startsWith("Lỗi") && <FontAwesomeIcon icon={faCheck} className="mr-1" />}
                  {importStatus}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
