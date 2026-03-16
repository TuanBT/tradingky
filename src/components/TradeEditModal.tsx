"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY, ENTRY_EMOTIONS, EXIT_EMOTIONS, MAX_CHART_IMAGES, getTradeImages } from "@/lib/types";
import { addTrade, updateTrade, getLibrary, getTrades, uploadChartImage, deleteChartImage, updateLibrary } from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { ImageLightbox } from "@/components/ImageLightbox";
import { EmotionSelect } from "@/components/EmotionSelect";
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
  faLink,
  faPlay,
  faFlagCheckered,
  faXmark,
  faCloudArrowUp,
} from "@fortawesome/free-solid-svg-icons";

interface TradeForm {
  date: string;
  pair: string;
  platform: string;
  type: "BUY" | "SELL";
  emotion: string;
  exitEmotion: string;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "CANCELLED";
  status: "OPEN" | "CLOSED";
  pnl: number | undefined;
  stopLoss: string;
  takeProfit: string;
  chartImages: string[];
  note: string;
  entryPrice: number | undefined;
  exitPrice: number | undefined;
  lotSize: number | undefined;
  timeframe: string;
  closeDate: string;
  entryTime: string;
  closeTime: string;
  exitReason: string;
  lessonsLearned: string;
}

const AUTOSAVE_KEY = "tradingky_draft";
const PENDING_UPLOAD_KEY = "tradingky_pending_upload";

export interface PendingUploadState {
  tradeId: string | null;
  mode: "add" | "edit" | "close";
  form: TradeForm;
}

export function savePendingUpload(state: PendingUploadState) {
  try {
    sessionStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — ignore */ }
}

export function loadPendingUpload(): PendingUploadState | null {
  try {
    const data = sessionStorage.getItem(PENDING_UPLOAD_KEY);
    if (!data) return null;
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
    return JSON.parse(data);
  } catch { return null; }
}

const emptyForm: TradeForm = {
  date: "",
  pair: "",
  platform: "",
  type: "BUY",
  emotion: "",
  exitEmotion: "",
  result: "WIN",
  status: "OPEN",
  pnl: undefined,
  stopLoss: "",
  takeProfit: "",
  chartImages: [],
  note: "",
  entryPrice: undefined,
  exitPrice: undefined,
  lotSize: undefined,
  timeframe: "",
  closeDate: "",
  entryTime: "",
  closeTime: "",
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
  const { user, getGoogleAccessToken, hasGoogleToken, connectGoogleDrive } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<TradeForm | null>(null);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string>("");
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
      // Check for pending form state from GDrive redirect
      const pending = loadPendingUpload();
      if (pending && pending.mode === "add") {
        setForm(pending.form);
        setAutoSaveStatus("Đã khôi phục dữ liệu trước khi xác thực");
        setTimeout(() => setAutoSaveStatus(""), 3000);
      } else {
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
      }
      setShowAdvanced(true);
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
          // Check for pending form state from GDrive redirect
          const pending = loadPendingUpload();
          if (pending && pending.tradeId === tradeId) {
            setForm(pending.form);
            setAutoSaveStatus("Đã khôi phục dữ liệu trước khi xác thực");
            setTimeout(() => setAutoSaveStatus(""), 3000);
            setShowAdvanced(true);
          } else {
          const isClosing = mode === "close";
          setForm({
            date: trade.date,
            pair: trade.pair,
            platform: trade.platform || "",
            type: trade.type,
            emotion: trade.emotion,
            exitEmotion: trade.exitEmotion || "",
            result: trade.result,
            status: isClosing ? "CLOSED" : (trade.status || "CLOSED"),
            pnl: trade.pnl,
            stopLoss: trade.stopLoss || "",
            takeProfit: trade.takeProfit || "",
            chartImages: getTradeImages(trade),
            note: trade.note || "",
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            lotSize: trade.lotSize,
            timeframe: trade.timeframe || "",
            closeDate: isClosing && !trade.closeDate ? new Date().toISOString().split("T")[0] : (trade.closeDate || ""),
            entryTime: trade.entryTime || "",
            closeTime: isClosing && !trade.closeTime ? format(new Date(), "HH:mm") : (trade.closeTime || ""),
            exitReason: trade.exitReason || "",
            lessonsLearned: trade.lessonsLearned || "",
          });
          if (isClosing || trade.entryPrice || trade.exitPrice || trade.lotSize || trade.timeframe || trade.closeDate) {
            setShowAdvanced(true);
          }
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

  // Upload new image and append to array (max 4 images per trade)
  const handleUploadImage = async (file: File) => {
    if (!user || !form) return;
    if (form.chartImages.length >= MAX_CHART_IMAGES) {
      toast(`Tối đa ${MAX_CHART_IMAGES} ảnh mỗi lệnh`, "error");
      return;
    }
    savePendingUpload({ tradeId, mode: mode || "edit", form });
    setUploading(true);
    try {
      const accessToken = await getGoogleAccessToken();
      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
      const url = await uploadChartImage(accessToken, file);
      updateForm({ chartImages: [...form.chartImages, url] });
      toast("Đã upload ảnh", "success");
    } catch (err) {
      toast((err as Error).message || "Lỗi upload ảnh.", "error");
    }
    setUploading(false);
  };

  // Delete image at index and remove from array
  const handleRemoveImage = async (index: number) => {
    if (!form) return;
    const url = form.chartImages[index];
    if (url) {
      try {
        const accessToken = await getGoogleAccessToken();
        await deleteChartImage(accessToken, url);
      } catch {
        // Non-critical — still remove from array
      }
    }
    updateForm({ chartImages: form.chartImages.filter((_, i) => i !== index) });
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
      exitEmotion: form.exitEmotion || undefined,
      result: form.result,
      status: form.status,
      pnl: form.pnl,
      stopLoss: form.stopLoss || undefined,
      takeProfit: form.takeProfit || undefined,
      chartImages: form.chartImages.length > 0 ? form.chartImages : undefined,
      chartImageUrl: form.chartImages[0] || undefined,
      note: form.note || undefined,
      entryPrice: form.entryPrice,
      exitPrice: form.exitPrice,
      lotSize: form.lotSize,
      timeframe: form.timeframe || undefined,
      closeDate: form.closeDate || undefined,
      entryTime: form.entryTime || undefined,
      closeTime: form.closeTime || undefined,
      exitReason: form.exitReason || undefined,
      lessonsLearned: form.lessonsLearned || undefined,
      createdAt: isAddMode ? Date.now() : (tradeRef.current?.createdAt || Date.now()),
    };

    try {
      if (isAddMode) {
        await addTrade(user.uid, tradeData as Omit<Trade, "id">);
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
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

  const [connecting, setConnecting] = useState(false);

  const handleConnectDrive = async () => {
    if (form) savePendingUpload({ tradeId, mode: mode || "edit", form });
    setConnecting(true);
    try {
      await connectGoogleDrive();
      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
      toast("Đã kết nối Google Drive", "success");
    } catch {
      toast("Không thể kết nối Google Drive", "error");
    }
    setConnecting(false);
  };

  const renderImageUpload = () => {
    if (!form) return null;
    const hasImages = form.chartImages.length > 0;
    const canAddMore = form.chartImages.length < MAX_CHART_IMAGES;
    return (
      <div>
        <Label className="text-sm text-muted-foreground">
          <FontAwesomeIcon icon={faImage} className="mr-1" /> Ảnh chart ({form.chartImages.length}/{MAX_CHART_IMAGES}) {!hasImages && <span className="text-xs">(Ctrl+V paste ảnh vào bất kỳ đâu)</span>}
        </Label>
        {!hasGoogleToken && !hasImages ? (
          <div className="mt-1 space-y-2">
            <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input'); const url = input?.value.trim(); if (url && form.chartImages.length < MAX_CHART_IMAGES) { updateForm({ chartImages: [...form.chartImages, url] }); if (input) input.value = ''; toast('Đã thêm ảnh từ URL', 'success'); } }} className="flex gap-2">
              <div className="relative flex-1">
                <FontAwesomeIcon icon={faLink} className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input type="url" placeholder="Dán link ảnh (không cần Google Drive)" className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <button type="submit" className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-sm">Thêm</button>
            </form>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 border-t border-border" />
              <span>hoặc</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <button
              type="button"
              onClick={handleConnectDrive}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-blue-400/50 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm transition-colors cursor-pointer"
            >
              {connecting ? (
                <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faCloudArrowUp} className="h-4 w-4" />
              )}
              {connecting ? "Đang kết nối..." : "Kết nối Google Drive để upload ảnh"}
            </button>
          </div>
        ) : (
          <>
            {/* Image grid preview */}
            {hasImages && (
              <div className={`mt-2 grid gap-2 ${form.chartImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {form.chartImages.map((url, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getImageSrc(url)} alt={`Chart ${i + 1}`} loading="lazy" className="rounded-lg border w-full object-contain max-h-40 bg-muted cursor-pointer" onClick={() => { setLightboxSrc(getImageSrc(url)); }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100" title="Xoá ảnh">
                      <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Upload controls */}
            {canAddMore && (
              <div className="mt-2 flex gap-2">
                <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.querySelector('input'); const url = input?.value.trim(); if (url && form.chartImages.length < MAX_CHART_IMAGES) { updateForm({ chartImages: [...form.chartImages, url] }); if (input) input.value = ''; toast('Đã thêm ảnh từ URL', 'success'); } }} className="flex gap-2 flex-1">
                  <div className="relative flex-1">
                    <FontAwesomeIcon icon={faLink} className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="url" placeholder="Dán link ảnh (không cần Google Drive)" className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <button type="submit" className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-sm">Thêm</button>
                </form>
                <label>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user) return;
                    await handleUploadImage(file);
                    e.target.value = "";
                  }} />
                  <span className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer text-sm gap-2">
                    {uploading ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> : <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />}
                    Upload
                  </span>
                </label>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

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
          <div className="space-y-6 pt-2" onPaste={handlePasteImage}>

            {/* Close Trade Section - shown FIRST for close mode, AFTER basic for add/edit */}
            {isCloseMode && form.status === "CLOSED" && (
              <Card className="border-2 border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <FontAwesomeIcon icon={faFlagCheckered} className="h-4 w-4" />
                    Tổng kết sau đóng lệnh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium">Kết quả *</Label>
                      <div className="mt-1 flex gap-2">
                        {(["WIN", "LOSS", "BREAKEVEN", "CANCELLED"] as const).map((r) => (
                          <Button key={r} type="button" variant={form.result === r ? "default" : "outline"} className={`flex-1 min-h-[44px] sm:min-h-0 ${form.result === r ? r === "WIN" ? "bg-green-600 hover:bg-green-700 text-white" : r === "LOSS" ? "bg-red-600 hover:bg-red-700 text-white" : r === "CANCELLED" ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}`} onClick={() => updateForm({ result: r })}>
                            {r === "WIN" ? "Thắng" : r === "LOSS" ? "Thua" : r === "CANCELLED" ? "Hủy" : "Hoà"}
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
                      <div className="mt-1 flex gap-2">
                        <Input type="date" value={form.closeDate} onChange={(e) => updateForm({ closeDate: e.target.value })} className="flex-1" />
                        <Input type="time" value={form.closeTime} onChange={(e) => updateForm({ closeTime: e.target.value })} className="w-24" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Tâm lý lúc đóng lệnh</Label>
                    <EmotionSelect value={form.exitEmotion} onValueChange={(v) => updateForm({ exitEmotion: v })} options={EXIT_EMOTIONS} placeholder="Chọn tâm lý" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Lý do thoát lệnh</Label>
                      <Textarea placeholder="Đạt TP, chạm SL..." value={form.exitReason} onChange={(e) => updateForm({ exitReason: e.target.value })} rows={3} className="mt-1" maxLength={500} />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Bài học / Kinh nghiệm</Label>
                      <Textarea placeholder="Điều gì làm tốt? Cần cải thiện?" value={form.lessonsLearned} onChange={(e) => updateForm({ lessonsLearned: e.target.value })} rows={3} className="mt-1" maxLength={1000} />
                    </div>
                  </div>
                  {/* Image upload in close section */}
                  {renderImageUpload()}
                </CardContent>
              </Card>
            )}

            {/* Basic Info */}
            <Card className={isCloseMode ? "opacity-60" : ""}>
              <CardHeader><CardTitle className="text-base">{isCloseMode ? "Thông tin vào lệnh (đã nhập)" : "Thông tin cơ bản"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Cặp tiền *</Label>
                    <EditableSelect value={form.pair} onValueChange={(v) => updateForm({ pair: v })} items={library.pairs} onItemsChange={(items) => handleLibraryUpdate("pairs", items)} placeholder="Chọn cặp tiền" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Loại lệnh *</Label>
                    <div className="mt-1 flex gap-2">
                      <Button type="button" variant={form.type === "BUY" ? "default" : "outline"} className={`flex-1 min-h-[44px] sm:min-h-0 ${form.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} onClick={() => updateForm({ type: "BUY" })}>BUY</Button>
                      <Button type="button" variant={form.type === "SELL" ? "default" : "outline"} className={`flex-1 min-h-[44px] sm:min-h-0 ${form.type === "SELL" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}`} onClick={() => updateForm({ type: "SELL" })}>SELL</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ngày vào lệnh *</Label>
                    <div className="mt-1 flex gap-2">
                      <Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} className="flex-1" />
                      <Input type="time" value={form.entryTime} onChange={(e) => updateForm({ entryTime: e.target.value })} className="w-24" placeholder="Giờ" />
                    </div>
                  </div>
                </div>
                {/* Image upload - right after core info (hidden in close mode, shown in close section instead) */}
                {!isCloseMode && renderImageUpload()}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tâm lý vào lệnh *</Label>
                    <EmotionSelect value={form.emotion} onValueChange={(v) => updateForm({ emotion: v })} options={ENTRY_EMOTIONS} placeholder="Chọn tâm lý" />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Ghi chú lúc vào lệnh</Label>
                    <Textarea placeholder="Phân tích, nhận định..." value={form.note} onChange={(e) => updateForm({ note: e.target.value })} rows={2} className="mt-1" maxLength={2000} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Close Trade Section - shown AFTER basic info for add/edit modes */}
            {!isCloseMode && form.status === "CLOSED" && (
              <Card className="border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FontAwesomeIcon icon={faFlagCheckered} className="h-4 w-4 text-green-500" />
                    Tổng kết sau đóng lệnh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium">Kết quả *</Label>
                      <div className="mt-1 flex gap-2">
                        {(["WIN", "LOSS", "BREAKEVEN", "CANCELLED"] as const).map((r) => (
                          <Button key={r} type="button" variant={form.result === r ? "default" : "outline"} className={`flex-1 min-h-[44px] sm:min-h-0 ${form.result === r ? r === "WIN" ? "bg-green-600 hover:bg-green-700 text-white" : r === "LOSS" ? "bg-red-600 hover:bg-red-700 text-white" : r === "CANCELLED" ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}`} onClick={() => updateForm({ result: r })}>
                            {r === "WIN" ? "Thắng" : r === "LOSS" ? "Thua" : r === "CANCELLED" ? "Hủy" : "Hoà"}
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
                      <div className="mt-1 flex gap-2">
                        <Input type="date" value={form.closeDate} onChange={(e) => updateForm({ closeDate: e.target.value })} className="flex-1" />
                        <Input type="time" value={form.closeTime} onChange={(e) => updateForm({ closeTime: e.target.value })} className="w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Tâm lý lúc đóng lệnh</Label>
                      <EmotionSelect value={form.exitEmotion} onValueChange={(v) => updateForm({ exitEmotion: v })} options={EXIT_EMOTIONS} placeholder="Chọn tâm lý" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Lý do thoát lệnh</Label>
                      <Textarea placeholder="Đạt TP, chạm SL..." value={form.exitReason} onChange={(e) => updateForm({ exitReason: e.target.value })} rows={3} className="mt-1" maxLength={500} />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Bài học / Kinh nghiệm</Label>
                      <Textarea placeholder="Điều gì làm tốt? Cần cải thiện?" value={form.lessonsLearned} onChange={(e) => updateForm({ lessonsLearned: e.target.value })} rows={3} className="mt-1" maxLength={1000} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <Label className="text-sm text-muted-foreground">Timeframe</Label>
                      <EditableSelect value={form.timeframe} onValueChange={(v) => updateForm({ timeframe: v })} items={library.timeframes} onItemsChange={(items) => handleLibraryUpdate("timeframes", items)} placeholder="Chọn TF" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Lot / Quantity</Label>
                      <Input type="number" step="any" value={form.lotSize ?? ""} onChange={(e) => updateForm({ lotSize: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Sàn</Label>
                      <EditableSelect value={form.platform} onValueChange={(v) => updateForm({ platform: v })} items={library.platforms} onItemsChange={(items) => handleLibraryUpdate("platforms", items)} placeholder="Chọn sàn" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Stop Loss</Label>
                      <Input placeholder="VD: 20 pips..." value={form.stopLoss} onChange={(e) => updateForm({ stopLoss: e.target.value })} className="mt-1" maxLength={50} />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Take Profit</Label>
                      <Input placeholder="VD: 40 pips..." value={form.takeProfit} onChange={(e) => updateForm({ takeProfit: e.target.value })} className="mt-1" maxLength={50} />
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Giá vào</Label>
                      <Input type="number" step="any" value={form.entryPrice ?? ""} onChange={(e) => updateForm({ entryPrice: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
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

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </Dialog>
  );
}

// EmotionSelect extracted to @/components/EmotionSelect.tsx
