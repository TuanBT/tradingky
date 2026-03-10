"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { addTrade, updateTrade, getLibrary, getTrades, uploadChartImage, deleteChartImage, updateLibrary } from "@/lib/services";
import { getImageSrc, getImageLink } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { format } from "date-fns";
import { useToast } from "@/components/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EditableSelect from "@/components/EditableSelect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk,
  faImage,
  faCheck,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faUpload,
  faPaste,
  faPlay,
  faFlagCheckered,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

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
  chartImageUrl: string;
  note: string;
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  lotSize: number | undefined;
  timeframe: string;
  closeDate: string;
  exitReason: string;
  lessonsLearned: string;
}

const AUTOSAVE_KEY = "tradingky_draft";

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
  chartImageUrl: "",
  note: "",
  entryPrice: undefined,
  exitPrice: undefined,
  lotSize: undefined,
  timeframe: "",
  closeDate: "",
  exitReason: "",
  lessonsLearned: "",
};

interface TradeEditModalProps {
  tradeId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode?: "add" | "edit" | "close";
}

export function TradeEditModal({ tradeId, open, onClose, onSaved, mode = "edit" }: TradeEditModalProps) {
  const { user, getGoogleAccessToken } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<TradeForm | null>(null);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const tradeRef = useRef<Trade | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAddMode = mode === "add";

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    setSaved(false);
    setSaving(false);
    setAutoSaveStatus("");

    if (isAddMode) {
      tradeRef.current = null;
      const draft = localStorage.getItem(AUTOSAVE_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd"), ...parsed });
          setAutoSaveStatus("Đã khôi phục bản nháp");
        } catch {
          setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
        }
      } else {
        setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
      }
      setShowAdvanced(false);
      setLoading(false);
      getLibrary(user.uid).then((lib) => setLibrary(lib));
    } else {
      if (!tradeId) return;
      setLoading(true);
      Promise.all([getTrades(user.uid), getLibrary(user.uid)]).then(([trades, lib]) => {
        setLibrary(lib);
        const trade = trades.find((t) => t.id === tradeId);
        if (trade) {
          tradeRef.current = trade;
          const isClosing = mode === "close";
          setForm({
            date: trade.date,
            pair: trade.pair,
            platform: trade.platform || "",
            type: trade.type,
            emotion: trade.emotion,
            result: trade.result,
            status: isClosing ? "CLOSED" : (trade.status || "CLOSED"),
            pnl: trade.pnl,
            stopLoss: trade.stopLoss || "",
            takeProfit: trade.takeProfit || "",
            chartImageUrl: trade.chartImageUrl || "",
            note: trade.note || "",
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            lotSize: trade.lotSize,
            timeframe: trade.timeframe || "",
            closeDate: isClosing && !trade.closeDate ? new Date().toISOString().split("T")[0] : (trade.closeDate || ""),
            exitReason: trade.exitReason || "",
            lessonsLearned: trade.lessonsLearned || "",
          });
          if (isClosing || trade.entryPrice || trade.exitPrice || trade.lotSize || trade.timeframe || trade.closeDate) {
            setShowAdvanced(true);
          }
        }
        setLoading(false);
      });
    }
  }, [open, tradeId, user, mode, isAddMode]);

  const updateForm = (updates: Partial<TradeForm>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const newForm = { ...prev, ...updates };
      if (isAddMode) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(newForm));
          setAutoSaveStatus("Đã lưu nháp");
          setTimeout(() => setAutoSaveStatus(""), 2000);
        }, 1000);
      }
      return newForm;
    });
  };

  const handleClearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
    setAutoSaveStatus("Đã xoá bản nháp");
    setTimeout(() => setAutoSaveStatus(""), 2000);
  };

  const handleLibraryUpdate = (key: keyof DropdownLibrary, items: string[]) => {
    const updated = { ...library, [key]: items };
    setLibrary(updated);
    if (user) updateLibrary(user.uid, updated);
  };

  // Upload new image and delete old one (ensure 1 image per trade)
  const handleUploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const accessToken = await getGoogleAccessToken();
      // Delete old image from Drive/VPS before uploading new one
      if (form?.chartImageUrl) {
        await deleteChartImage(accessToken, form.chartImageUrl);
      }
      const url = await uploadChartImage(accessToken, file);
      updateForm({ chartImageUrl: url });
      toast("Đã upload ảnh", "success");
    } catch (err) {
      toast((err as Error).message || "Lỗi upload ảnh.", "error");
    }
    setUploading(false);
  };

  // Delete image from Drive/VPS and clear form
  const handleRemoveImage = async () => {
    if (form?.chartImageUrl) {
      try {
        const accessToken = await getGoogleAccessToken();
        await deleteChartImage(accessToken, form.chartImageUrl);
      } catch {
        // Non-critical — still clear the URL
      }
    }
    updateForm({ chartImageUrl: "" });
  };

  const handlePasteImage = async (e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e instanceof ClipboardEvent ? e.clipboardData : e.clipboardData)?.items;
    if (!items || !user) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        await handleUploadImage(file);
        return;
      }
    }
  };

  const handleSubmit = async () => {
    if (!form) return;
    if (isAddMode && !form.date) {
      toast("Ngày vào lệnh là bắt buộc", "error");
      return;
    }
    if (!form.pair || !form.emotion) {
      toast("Vui lòng điền đầy đủ: Cặp tiền và Tâm lý", "error");
      return;
    }
    if (!user) return;
    if (!isAddMode && !tradeRef.current) return;

    setSaving(true);
    const tradeData = {
      date: form.date,
      pair: form.pair,
      platform: form.platform || undefined,
      type: form.type,
      emotion: form.emotion,
      result: form.result,
      status: form.status,
      pnl: form.pnl,
      stopLoss: form.stopLoss || undefined,
      takeProfit: form.takeProfit || undefined,
      chartImageUrl: form.chartImageUrl || undefined,
      note: form.note || undefined,
      entryPrice: form.entryPrice,
      exitPrice: form.exitPrice,
      lotSize: form.lotSize,
      timeframe: form.timeframe || undefined,
      closeDate: form.closeDate || undefined,
      exitReason: form.exitReason || undefined,
      lessonsLearned: form.lessonsLearned || undefined,
      createdAt: isAddMode ? Date.now() : (tradeRef.current?.createdAt || Date.now()),
    };

    try {
      if (isAddMode) {
        await addTrade(user.uid, tradeData as Omit<Trade, "id">);
        localStorage.removeItem(AUTOSAVE_KEY);
      } else {
        await updateTrade(user.uid, tradeRef.current!.id, tradeData);
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 600);
    } catch (error) {
      setSaving(false);
      toast((error as Error).message || "Lỗi khi lưu lệnh.", "error");
    }
  };

  const isCloseMode = mode === "close";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isAddMode ? "Thêm lệnh mới" : isCloseMode ? `Đóng lệnh: ${form?.pair}` : `Sửa lệnh: ${form?.pair}`}
            {form && (
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
            )}
            {isAddMode && autoSaveStatus && (
              <span className="text-xs text-muted-foreground font-normal">{autoSaveStatus}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading || !form ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">

            {/* Add mode: Toggle between open/closed trade */}
            {isAddMode && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.status === "OPEN" ? "default" : "outline"}
                  className={form.status === "OPEN" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                  onClick={() => updateForm({ status: "OPEN", pnl: undefined, result: "WIN", closeDate: "", exitReason: "", lessonsLearned: "" })}
                >
                  <FontAwesomeIcon icon={faPlay} className="mr-1.5 h-3 w-3" />
                  Ghi lệnh đang mở
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.status === "CLOSED" ? "default" : "outline"}
                  className={form.status === "CLOSED" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                  onClick={() => updateForm({ status: "CLOSED" })}
                >
                  <FontAwesomeIcon icon={faFlagCheckered} className="mr-1.5 h-3 w-3" />
                  Ghi lệnh đã đóng
                </Button>
              </div>
            )}

            {/* Close Trade Section - shown for any CLOSED status */}
            {form.status === "CLOSED" && (
              <Card className={isCloseMode ? "border-2 border-amber-500/50 bg-amber-500/5" : "border-green-500/30"}>
                <CardHeader>
                  <CardTitle className={`text-base flex items-center gap-2 ${isCloseMode ? "text-amber-600 dark:text-amber-400" : ""}`}>
                    <FontAwesomeIcon icon={faFlagCheckered} className={`h-4 w-4 ${isCloseMode ? "" : "text-green-500"}`} />
                    Tổng kết sau đóng lệnh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Kết quả *</Label>
                      <div className="mt-1 flex gap-2">
                        {(["WIN", "LOSS", "BREAKEVEN"] as const).map((r) => (
                          <Button key={r} type="button" variant={form.result === r ? "default" : "outline"} className={`flex-1 ${form.result === r ? r === "WIN" ? "bg-green-600 hover:bg-green-700 text-white" : r === "LOSS" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}`} onClick={() => updateForm({ result: r })}>
                            {r === "WIN" ? "Thắng" : r === "LOSS" ? "Thua" : "Hoà"}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Lợi nhuận ($) *</Label>
                      <Input type="number" step="0.01" placeholder="VD: 50.00" value={form.pnl ?? ""} onChange={(e) => updateForm({ pnl: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Ngày đóng lệnh</Label>
                      <Input type="date" value={form.closeDate} onChange={(e) => updateForm({ closeDate: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Lý do thoát lệnh</Label>
                      <Textarea placeholder="Đạt TP, chạm SL..." value={form.exitReason} onChange={(e) => updateForm({ exitReason: e.target.value })} rows={3} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Bài học / Kinh nghiệm</Label>
                      <Textarea placeholder="Điều gì làm tốt? Cần cải thiện?" value={form.lessonsLearned} onChange={(e) => updateForm({ lessonsLearned: e.target.value })} rows={3} className="mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Basic Info */}
            <Card className={isCloseMode ? "opacity-60" : ""}>
              <CardHeader><CardTitle className="text-base">{isCloseMode ? "Thông tin vào lệnh (đã nhập)" : "Thông tin cơ bản"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Ngày vào lệnh *</Label>
                    <Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cặp tiền *</Label>
                    <EditableSelect value={form.pair} onValueChange={(v) => updateForm({ pair: v })} items={library.pairs} onItemsChange={(items) => handleLibraryUpdate("pairs", items)} placeholder="Chọn cặp tiền" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Loại lệnh *</Label>
                    <div className="mt-1 flex gap-2">
                      <Button type="button" variant={form.type === "BUY" ? "default" : "outline"} className={`flex-1 ${form.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} onClick={() => updateForm({ type: "BUY" })}>BUY</Button>
                      <Button type="button" variant={form.type === "SELL" ? "default" : "outline"} className={`flex-1 ${form.type === "SELL" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}`} onClick={() => updateForm({ type: "SELL" })}>SELL</Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tâm lý *</Label>
                    <EditableSelect value={form.emotion} onValueChange={(v) => updateForm({ emotion: v })} items={library.emotions} onItemsChange={(items) => handleLibraryUpdate("emotions", items)} placeholder="Tâm lý lúc vào lệnh" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Ghi chú lúc vào lệnh</Label>
                    <Textarea placeholder="Phân tích, nhận định..." value={form.note} onChange={(e) => updateForm({ note: e.target.value })} rows={2} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    <FontAwesomeIcon icon={faImage} className="mr-1" /> Ảnh chart
                  </Label>
                  <div className="mt-1 flex gap-2" onPaste={handlePasteImage}>
                    <Input placeholder="Paste ảnh từ clipboard hoặc link..." value={form.chartImageUrl} onChange={(e) => updateForm({ chartImageUrl: e.target.value })} className="flex-1" />
                    <button type="button" onClick={async () => { try { const items = await navigator.clipboard.read(); for (const item of items) { const imageType = item.types.find(t => t.startsWith('image/')); if (imageType) { const blob = await item.getType(imageType); const file = new File([blob], `paste-${Date.now()}.png`, { type: imageType }); await handleUploadImage(file); return; } } toast("Clipboard không có ảnh", "error"); } catch { toast("Không thể đọc clipboard. Hãy dùng Ctrl+V.", "error"); } }} className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer" title="Paste ảnh từ clipboard">
                      <FontAwesomeIcon icon={faPaste} className="h-4 w-4" />
                    </button>
                    <label>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        await handleUploadImage(file);
                        e.target.value = "";
                      }} />
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
                        {uploading ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> : <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />}
                      </span>
                    </label>
                  </div>
                  {form.chartImageUrl && (
                    <div className="mt-2 relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={getImageSrc(form.chartImageUrl)} alt="Chart" className="rounded-lg border max-h-48 w-full object-contain bg-muted" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => handleRemoveImage()} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors" title="Xoá ảnh">
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 ring-foreground/5">
              <CardHeader>
                <button className="flex items-center justify-between w-full text-left" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <CardTitle className="text-base text-muted-foreground">Thông tin nâng cao</CardTitle>
                  <FontAwesomeIcon icon={showAdvanced ? faChevronUp : faChevronDown} className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Sàn</Label>
                      <EditableSelect value={form.platform} onValueChange={(v) => updateForm({ platform: v })} items={library.platforms} onItemsChange={(items) => handleLibraryUpdate("platforms", items)} placeholder="Chọn sàn" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Stop Loss</Label>
                      <Input placeholder="VD: 20 pips..." value={form.stopLoss} onChange={(e) => updateForm({ stopLoss: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Take Profit</Label>
                      <Input placeholder="VD: 40 pips..." value={form.takeProfit} onChange={(e) => updateForm({ takeProfit: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Giá vào</Label>
                      <Input type="number" step="any" value={form.entryPrice ?? ""} onChange={(e) => updateForm({ entryPrice: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Giá ra</Label>
                      <Input type="number" step="any" value={form.exitPrice ?? ""} onChange={(e) => updateForm({ exitPrice: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Lot / Quantity</Label>
                      <Input type="number" step="any" value={form.lotSize ?? ""} onChange={(e) => updateForm({ lotSize: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Timeframe</Label>
                      <EditableSelect value={form.timeframe} onValueChange={(v) => updateForm({ timeframe: v })} items={library.timeframes} onItemsChange={(items) => handleLibraryUpdate("timeframes", items)} placeholder="Chọn TF" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-2">
              {isAddMode && (
                <Button variant="ghost" size="sm" onClick={handleClearDraft}>
                  Xoá nháp
                </Button>
              )}
              <Button onClick={handleSubmit} disabled={saving || saved} size="lg">
                {saved ? (
                  <><FontAwesomeIcon icon={faCheck} className="mr-2 h-4 w-4" /> Đã lưu!</>
                ) : saving ? (
                  <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                ) : (
                  <><FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" /> {isAddMode ? "Lưu lệnh" : "Cập nhật"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
