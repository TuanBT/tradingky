"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { addTrade, updateTrade, getLibrary, getTrades, uploadChartImage, updateLibrary } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EditableSelect from "@/components/EditableSelect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFloppyDisk,
  faImage,
  faCheck,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faUpload,
  faPlay,
  faFlagCheckered,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import Link from "next/link";

const AUTOSAVE_KEY = "tradingky_draft";

interface TradeForm {
  date: string;
  pair: string;
  platform: string;
  type: "BUY" | "SELL";
  emotion: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  status: "OPEN" | "CLOSED";
  pnl: number | undefined;
  stopLoss: string;
  takeProfit: string;
  reason: string;
  chartImageUrl: string;
  note: string;
  tags: string[];
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  lotSize: number | undefined;
  timeframe: string;
  closeDate: string;
  strategy: string;
  exitReason: string;
  lessonsLearned: string;
  exitChartImageUrl: string;
}

const emptyForm: TradeForm = {
  date: "",
  pair: "",
  platform: "",
  type: "BUY",
  emotion: "",
  result: "WIN",
  status: "OPEN",
  pnl: undefined,
  stopLoss: "",
  takeProfit: "",
  reason: "",
  chartImageUrl: "",
  note: "",
  tags: [],
  entryPrice: undefined,
  exitPrice: undefined,
  lotSize: undefined,
  timeframe: "",
  closeDate: "",
  strategy: "",
  exitReason: "",
  lessonsLearned: "",
  exitChartImageUrl: "",
};

export default function TradeFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <TradeFormContent />
    </Suspense>
  );
}

function TradeFormContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [form, setForm] = useState<TradeForm>({
    ...emptyForm,
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);

  // Load library and draft/edit data
  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const libraryData = await getLibrary(user.uid);
      setLibrary(libraryData);

      if (editId) {
        // Load trade for editing
        const trades = await getTrades(user.uid);
        const trade = trades.find((t) => t.id === editId);
        if (trade) {
          setEditTrade(trade);
          setForm({
            date: trade.date,
            pair: trade.pair,
            platform: trade.platform,
            type: trade.type,
            emotion: trade.emotion,
            result: trade.result,
            status: trade.status || "CLOSED",
            pnl: trade.pnl,
            stopLoss: trade.stopLoss || "",
            takeProfit: trade.takeProfit || "",
            reason: trade.reason || "",
            chartImageUrl: trade.chartImageUrl || "",
            note: trade.note || "",
            tags: trade.tags || [],
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            lotSize: trade.lotSize,
            timeframe: trade.timeframe || "",
            closeDate: trade.closeDate || "",
            strategy: trade.strategy || "",
            exitReason: trade.exitReason || "",
            lessonsLearned: trade.lessonsLearned || "",
            exitChartImageUrl: trade.exitChartImageUrl || "",
          });
          if (trade.entryPrice || trade.exitPrice || trade.lotSize || trade.timeframe || trade.closeDate || trade.strategy) {
            setShowAdvanced(true);
          }
        }
      } else {
        // Load draft from localStorage
        const draft = localStorage.getItem(AUTOSAVE_KEY);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd"), ...parsed });
            setAutoSaveStatus("Đã khôi phục bản nháp");
          } catch {}
        }
      }
      setLoading(false);
    }
    load();
  }, [editId, user]);

  // Auto-save to localStorage (debounced)
  const autoSave = useCallback(
    (formData: TradeForm) => {
      if (editId) return; // Don't auto-save when editing
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
        setAutoSaveStatus("Đã lưu nháp");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      }, 1000);
    },
    [editId]
  );

  const updateForm = (updates: Partial<TradeForm>) => {
    const newForm = { ...form, ...updates };
    setForm(newForm);
    autoSave(newForm);
  };

  const handleLibraryUpdate = (key: keyof DropdownLibrary, items: string[]) => {
    const updated = { ...library, [key]: items };
    setLibrary(updated);
    if (user) updateLibrary(user.uid, updated);
  };

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const [formErrors, setFormErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!form.date) errors.push("Ngày vào lệnh là bắt buộc");
    if (!form.pair) errors.push("Cặp tiền là bắt buộc");
    if (!form.platform) errors.push("Sàn là bắt buộc");
    if (!form.emotion) errors.push("Tâm lý là bắt buộc");
    if (form.status === "CLOSED" && form.pnl !== undefined && form.result === "WIN" && form.pnl < 0) {
      errors.push("Kết quả Thắng nhưng P&L âm — kiểm tra lại");
    }
    if (form.status === "CLOSED" && form.pnl !== undefined && form.result === "LOSS" && form.pnl > 0) {
      errors.push("Kết quả Thua nhưng P&L dương — kiểm tra lại");
    }
    if (form.closeDate && form.date && form.closeDate < form.date) {
      errors.push("Ngày đóng lệnh không thể trước ngày vào lệnh");
    }
    if (form.entryPrice !== undefined && form.entryPrice <= 0) {
      errors.push("Giá vào phải lớn hơn 0");
    }
    if (form.exitPrice !== undefined && form.exitPrice <= 0) {
      errors.push("Giá ra phải lớn hơn 0");
    }
    if (form.lotSize !== undefined && form.lotSize <= 0) {
      errors.push("Lot size phải lớn hơn 0");
    }
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);

    setSaving(true);
    const tradeData = {
      date: form.date,
      pair: form.pair,
      platform: form.platform,
      type: form.type,
      emotion: form.emotion,
      result: form.result,
      status: form.status,
      pnl: form.pnl,
      stopLoss: form.stopLoss || undefined,
      takeProfit: form.takeProfit || undefined,
      reason: form.reason || undefined,
      chartImageUrl: form.chartImageUrl || undefined,
      note: form.note || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
      entryPrice: form.entryPrice,
      exitPrice: form.exitPrice,
      lotSize: form.lotSize,
      timeframe: form.timeframe || undefined,
      closeDate: form.closeDate || undefined,
      strategy: form.strategy || undefined,
      exitReason: form.exitReason || undefined,
      lessonsLearned: form.lessonsLearned || undefined,
      exitChartImageUrl: form.exitChartImageUrl || undefined,
      createdAt: editTrade?.createdAt || Date.now(),
    };

    try {
      if (editTrade) {
        await updateTrade(user!.uid, editTrade.id, tradeData);
      } else {
        await addTrade(user!.uid, tradeData);
        localStorage.removeItem(AUTOSAVE_KEY);
      }

      setSaving(false);
      setSaved(true);
      setTimeout(() => {
        router.back();
      }, 800);
    } catch (error) {
      setSaving(false);
      setFormErrors([(error as Error).message || "Lỗi khi lưu lệnh. Vui lòng thử lại."]);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
    setAutoSaveStatus("Đã xoá bản nháp");
    setTimeout(() => setAutoSaveStatus(""), 2000);
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {editTrade ? "Sửa lệnh" : "Thêm lệnh mới"}
              </h1>
              <Badge
                className={form.status === "OPEN"
                  ? "bg-blue-600 text-white cursor-pointer"
                  : "bg-gray-600 text-white cursor-pointer"
                }
                onClick={() => updateForm({ status: form.status === "OPEN" ? "CLOSED" : "OPEN" })}
              >
                <FontAwesomeIcon icon={form.status === "OPEN" ? faPlay : faFlagCheckered} className="mr-1 h-3 w-3" />
                {form.status === "OPEN" ? "Đang chạy" : "Đã đóng"}
              </Badge>
            </div>
            {autoSaveStatus && (
              <p className="text-xs text-muted-foreground">{autoSaveStatus}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editTrade && (
            <Button variant="ghost" size="sm" onClick={handleClearDraft}>
              Xoá nháp
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving || saved} size="lg">
            {saved ? (
              <>
                <FontAwesomeIcon icon={faCheck} className="mr-2 h-4 w-4" />
                Đã lưu!
              </>
            ) : saving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" />
                {editTrade ? "Cập nhật" : "Lưu lệnh"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {formErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="font-medium text-red-500 text-sm mb-1">Vui lòng sửa lại:</p>
          <ul className="list-disc list-inside text-sm text-red-400 space-y-0.5">
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Form */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left column - Main info (3/4 width on desktop) */}
        <div className="xl:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Ngày vào lệnh *</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateForm({ date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cặp tiền *</Label>
                  <EditableSelect
                    value={form.pair}
                    onValueChange={(v) => updateForm({ pair: v })}
                    items={library.pairs}
                    onItemsChange={(items) => handleLibraryUpdate("pairs", items)}
                    placeholder="Chọn cặp tiền"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Sàn *</Label>
                  <EditableSelect
                    value={form.platform}
                    onValueChange={(v) => updateForm({ platform: v })}
                    items={library.platforms}
                    onItemsChange={(items) => handleLibraryUpdate("platforms", items)}
                    placeholder="Chọn sàn"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Lợi nhuận ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={form.status === "OPEN" ? "Chưa xác định" : "VD: 50.00 hoặc -20.00"}
                    value={form.pnl ?? ""}
                    onChange={(e) =>
                      updateForm({
                        pnl: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="mt-1"
                    disabled={form.status === "OPEN"}
                  />
                  {form.status === "OPEN" && (
                    <p className="text-xs text-muted-foreground mt-1">Đóng lệnh để nhập P&L</p>
                  )}
                </div>
              </div>

              <div className={`grid grid-cols-1 ${form.status === "CLOSED" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                <div>
                  <Label className="text-sm font-medium">Loại lệnh *</Label>
                  <div className="mt-1 flex gap-2">
                    <Button
                      type="button"
                      variant={form.type === "BUY" ? "default" : "outline"}
                      className={`flex-1 ${form.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                      onClick={() => updateForm({ type: "BUY" })}
                    >
                      BUY (Mua)
                    </Button>
                    <Button
                      type="button"
                      variant={form.type === "SELL" ? "default" : "outline"}
                      className={`flex-1 ${form.type === "SELL" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}`}
                      onClick={() => updateForm({ type: "SELL" })}
                    >
                      SELL (Bán)
                    </Button>
                  </div>
                </div>
                {form.status === "CLOSED" && (
                  <div>
                    <Label className="text-sm font-medium">Kết quả *</Label>
                    <div className="mt-1 flex gap-2">
                      {(["WIN", "LOSS", "BREAKEVEN"] as const).map((r) => (
                        <Button
                          key={r}
                          type="button"
                          variant={form.result === r ? "default" : "outline"}
                          className={`flex-1 ${
                            form.result === r
                              ? r === "WIN"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : r === "LOSS"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-yellow-600 hover:bg-yellow-700 text-white"
                              : ""
                          }`}
                          onClick={() => updateForm({ result: r })}
                        >
                          {r === "WIN" ? "Thắng" : r === "LOSS" ? "Thua" : "Hoà"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Tâm lý *</Label>
                  <EditableSelect
                    value={form.emotion}
                    onValueChange={(v) => updateForm({ emotion: v })}
                    items={library.emotions}
                    onItemsChange={(items) => handleLibraryUpdate("emotions", items)}
                    placeholder="Tâm lý lúc vào lệnh"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chi tiết lệnh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Stop Loss</Label>
                  <Input
                    placeholder="VD: Dưới support 2900, 20 pips..."
                    value={form.stopLoss}
                    onChange={(e) => updateForm({ stopLoss: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Take Profit</Label>
                  <Input
                    placeholder="VD: Resistance 2950, 40 pips..."
                    value={form.takeProfit}
                    onChange={(e) => updateForm({ takeProfit: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Lý do vào lệnh</Label>
                  <EditableSelect
                    value={form.reason}
                    onValueChange={(v) => updateForm({ reason: v })}
                    items={library.reasons}
                    onItemsChange={(items) => handleLibraryUpdate("reasons", items)}
                    placeholder="Chọn lý do"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  <FontAwesomeIcon icon={faImage} className="mr-1" />
                  Ảnh chart
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    placeholder="Paste link ảnh hoặc upload bên dưới..."
                    value={form.chartImageUrl}
                    onChange={(e) => updateForm({ chartImageUrl: e.target.value })}
                    className="flex-1"
                  />
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        setUploading(true);
                        try {
                          const url = await uploadChartImage(user.uid, file);
                          updateForm({ chartImageUrl: url });
                        } catch (err) {
                          setFormErrors([(err as Error).message || "Lỗi upload ảnh."]);
                        }
                        setUploading(false);
                        e.target.value = "";
                      }}
                    />
                    <span className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
                      {uploading ? (
                        <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                      )}
                    </span>
                  </label>
                </div>
                {uploading && (
                  <p className="text-xs text-muted-foreground mt-1">Đang upload ảnh...</p>
                )}
                {form.chartImageUrl && (
                  <div className="mt-2">
                    <a
                      href={form.chartImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.chartImageUrl}
                        alt="Chart preview"
                        className="rounded-lg border max-h-64 w-full object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <span className="hidden text-sm text-blue-500 hover:underline">
                        Xem ảnh ↗ (không load được preview)
                      </span>
                    </a>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Ghi chú lúc vào lệnh</Label>
                <Textarea
                  placeholder="Phân tích, nhận định, lý do chi tiết..."
                  value={form.note}
                  onChange={(e) => updateForm({ note: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Phase 2 - Đóng lệnh */}
          {form.status === "CLOSED" && (
            <Card className="border-green-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FontAwesomeIcon icon={faFlagCheckered} className="h-4 w-4 text-green-500" />
                  Tổng kết sau đóng lệnh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Lý do thoát lệnh</Label>
                    <Textarea
                      placeholder="Đạt TP, chạm SL, thoát sớm vì..."
                      value={form.exitReason}
                      onChange={(e) => updateForm({ exitReason: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bài học / Kinh nghiệm</Label>
                    <Textarea
                      placeholder="Điều gì làm tốt? Cần cải thiện gì? Lần sau sẽ..."
                      value={form.lessonsLearned}
                      onChange={(e) => updateForm({ lessonsLearned: e.target.value })}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    <FontAwesomeIcon icon={faImage} className="mr-1" />
                    Ảnh chart lúc đóng lệnh
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      placeholder="Paste link hoặc upload..."
                      value={form.exitChartImageUrl}
                      onChange={(e) => updateForm({ exitChartImageUrl: e.target.value })}
                      className="flex-1"
                    />
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          setUploading(true);
                          try {
                            const url = await uploadChartImage(user.uid, file);
                            updateForm({ exitChartImageUrl: url });
                          } catch (err) {
                            setFormErrors([(err as Error).message || "Lỗi upload ảnh."]);
                          }
                          setUploading(false);
                          e.target.value = "";
                        }}
                      />
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                      </span>
                    </label>
                  </div>
                  {form.exitChartImageUrl && (
                    <div className="mt-2">
                      <a href={form.exitChartImageUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.exitChartImageUrl}
                          alt="Exit chart"
                          className="rounded-lg border max-h-48 w-full object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced */}
          <Card>
            <CardHeader>
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <CardTitle className="text-base">Thông tin nâng cao</CardTitle>
                <FontAwesomeIcon
                  icon={showAdvanced ? faChevronUp : faChevronDown}
                  className="h-4 w-4 text-muted-foreground"
                />
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Giá vào</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.entryPrice ?? ""}
                      onChange={(e) =>
                        updateForm({
                          entryPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Giá ra</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.exitPrice ?? ""}
                      onChange={(e) =>
                        updateForm({
                          exitPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Lot / Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.lotSize ?? ""}
                      onChange={(e) =>
                        updateForm({
                          lotSize: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Timeframe</Label>
                    <EditableSelect
                      value={form.timeframe}
                      onValueChange={(v) => updateForm({ timeframe: v })}
                      items={library.timeframes}
                      onItemsChange={(items) => handleLibraryUpdate("timeframes", items)}
                      placeholder="Chọn TF"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ngày đóng lệnh</Label>
                    <Input
                      type="date"
                      value={form.closeDate}
                      onChange={(e) => updateForm({ closeDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Strategy</Label>
                    <EditableSelect
                      value={form.strategy}
                      onValueChange={(v) => updateForm({ strategy: v })}
                      items={library.strategies}
                      onItemsChange={(items) => handleLibraryUpdate("strategies", items)}
                      placeholder="Chọn strategy"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right column - Preview (1/4 width on desktop) */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Xem trước</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={form.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}
                >
                  {form.type}
                </Badge>
                <Badge
                  className={form.status === "OPEN" ? "bg-blue-600 text-white" : "bg-gray-600 text-white"}
                >
                  {form.status === "OPEN" ? "🔵 Đang chạy" : "✅ Đã đóng"}
                </Badge>
                <span className="font-semibold text-lg">
                  {form.pair || "---"}
                </span>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngày</span>
                  <span>{form.date || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sàn</span>
                  <span>{form.platform || "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tâm lý</span>
                  <Badge variant="secondary">{form.emotion || "---"}</Badge>
                </div>
                {form.status === "CLOSED" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kết quả</span>
                    <span
                      className={`font-semibold ${
                        form.result === "WIN"
                          ? "text-green-500"
                          : form.result === "LOSS"
                          ? "text-red-500"
                          : "text-yellow-500"
                      }`}
                    >
                      {form.result === "WIN"
                        ? "Thắng"
                        : form.result === "LOSS"
                        ? "Thua"
                        : "Hoà"}
                    </span>
                  </div>
                )}
                {form.pnl !== undefined && form.status === "CLOSED" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P&L</span>
                    <span
                      className={`font-mono font-semibold ${
                        form.pnl >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {form.pnl >= 0 ? "+" : ""}${form.pnl.toFixed(2)}
                    </span>
                  </div>
                )}
                {form.reason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lý do</span>
                    <span>{form.reason}</span>
                  </div>
                )}
                {form.stopLoss && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SL</span>
                    <span className="text-right max-w-[60%]">{form.stopLoss}</span>
                  </div>
                )}
                {form.takeProfit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TP</span>
                    <span className="text-right max-w-[60%]">{form.takeProfit}</span>
                  </div>
                )}
              </div>

              {form.chartImageUrl && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Ảnh chart:</span>
                    <a href={form.chartImageUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.chartImageUrl}
                        alt="Chart"
                        className="mt-1 rounded border w-full object-contain max-h-32 bg-muted cursor-pointer hover:opacity-90"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </a>
                  </div>
                </>
              )}

              {form.note && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs text-muted-foreground">Ghi chú vào lệnh:</span>
                    <p className="text-sm mt-1">{form.note}</p>
                  </div>
                </>
              )}

              {form.status === "CLOSED" && (form.exitReason || form.lessonsLearned) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-green-500">📝 Tổng kết:</span>
                    {form.exitReason && (
                      <div>
                        <span className="text-xs text-muted-foreground">Lý do thoát:</span>
                        <p className="text-sm">{form.exitReason}</p>
                      </div>
                    )}
                    {form.lessonsLearned && (
                      <div>
                        <span className="text-xs text-muted-foreground">Bài học:</span>
                        <p className="text-sm">{form.lessonsLearned}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
