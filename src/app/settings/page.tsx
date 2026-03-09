"use client";

import { useEffect, useState, useCallback } from "react";
import { DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { getLibrary, updateLibrary } from "@/lib/services";
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
} from "@fortawesome/free-solid-svg-icons";

type LibraryKey = keyof DropdownLibrary;

const SECTIONS: { key: LibraryKey; label: string; icon: typeof faCoins }[] = [
  { key: "pairs", label: "Cặp tiền", icon: faCoins },
  { key: "emotions", label: "Tâm lý", icon: faFaceSmile },
  { key: "reasons", label: "Lý do vào lệnh", icon: faLightbulb },
  { key: "strategies", label: "Strategy", icon: faChessKnight },
  { key: "platforms", label: "Sàn giao dịch", icon: faBuildingColumns },
  { key: "timeframes", label: "Timeframe", icon: faClock },
  { key: "tags", label: "Tags", icon: faTags },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<string, string>>({});

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
    const value = newItems[key]?.trim();
    if (!value || library[key].includes(value)) return;
    setLibrary({
      ...library,
      [key]: [...library[key], value],
    });
    setNewItems({ ...newItems, [key]: "" });
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
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleAddItem(section.key)}
                >
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
