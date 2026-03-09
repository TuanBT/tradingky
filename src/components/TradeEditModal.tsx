"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { updateTrade, getLibrary, getTrades, uploadChartImage, updateLibrary } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
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
  faPlay,
  faFlagCheckered,
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

interface TradeEditModalProps {
  tradeId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TradeEditModal({ tradeId, open, onClose, onSaved }: TradeEditModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<TradeForm | null>(null);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploading, setUploading] = useState(false);
  const tradeRef = useRef<Trade | null>(null);

  useEffect(() => {
    if (!open || !tradeId || !user) return;
    setLoading(true);
    setSaved(false);
    setSaving(false);

    Promise.all([getTrades(user.uid), getLibrary(user.uid)]).then(([trades, lib]) => {
      setLibrary(lib);
      const trade = trades.find((t) => t.id === tradeId);
      if (trade) {
        tradeRef.current = trade;
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
      setLoading(false);
    });
  }, [open, tradeId, user]);

  if (!form) return null;

  const updateForm = (updates: Partial<TradeForm>) => {
    setForm((prev) => prev ? { ...prev, ...updates } : prev);
  };

  const handleLibraryUpdate = (key: keyof DropdownLibrary, items: string[]) => {
    const updated = { ...library, [key]: items };
    setLibrary(updated);
    if (user) updateLibrary(user.uid, updated);
  };

  const handleSubmit = async () => {
    if (!form.pair || !form.platform || !form.emotion) {
      alert("Vui lòng điền đầy đủ: Cặp tiền, Sàn, và Tâm lý");
      return;
    }
    if (!user || !tradeRef.current) return;

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
      createdAt: tradeRef.current.createdAt || Date.now(),
    };

    await updateTrade(user.uid, tradeRef.current.id, tradeData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onSaved();
      onClose();
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Sửa lệnh: {form.pair}
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
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin cơ bản</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Ngày vào lệnh *</Label>
                    <Input type="date" value={form.date} onChange={(e) => updateForm({ date: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cặp tiền *</Label>
                    <EditableSelect value={form.pair} onValueChange={(v) => updateForm({ pair: v })} items={library.pairs} onItemsChange={(items) => handleLibraryUpdate("pairs", items)} placeholder="Chọn cặp tiền" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Sàn *</Label>
                    <EditableSelect value={form.platform} onValueChange={(v) => updateForm({ platform: v })} items={library.platforms} onItemsChange={(items) => handleLibraryUpdate("platforms", items)} placeholder="Chọn sàn" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Lợi nhuận ($)</Label>
                    <Input type="number" step="0.01" placeholder={form.status === "OPEN" ? "Chưa xác định" : "VD: 50.00"} value={form.pnl ?? ""} onChange={(e) => updateForm({ pnl: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" disabled={form.status === "OPEN"} />
                    {form.status === "OPEN" && <p className="text-xs text-muted-foreground mt-1">Đóng lệnh để nhập P&L</p>}
                  </div>
                </div>
                <div className={`grid grid-cols-1 ${form.status === "CLOSED" ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                  <div>
                    <Label className="text-sm font-medium">Loại lệnh *</Label>
                    <div className="mt-1 flex gap-2">
                      <Button type="button" variant={form.type === "BUY" ? "default" : "outline"} className={`flex-1 ${form.type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`} onClick={() => updateForm({ type: "BUY" })}>BUY</Button>
                      <Button type="button" variant={form.type === "SELL" ? "default" : "outline"} className={`flex-1 ${form.type === "SELL" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}`} onClick={() => updateForm({ type: "SELL" })}>SELL</Button>
                    </div>
                  </div>
                  {form.status === "CLOSED" && (
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
                  )}
                  <div>
                    <Label className="text-sm font-medium">Tâm lý *</Label>
                    <EditableSelect value={form.emotion} onValueChange={(v) => updateForm({ emotion: v })} items={library.emotions} onItemsChange={(items) => handleLibraryUpdate("emotions", items)} placeholder="Tâm lý lúc vào lệnh" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade Details */}
            <Card>
              <CardHeader><CardTitle className="text-base">Chi tiết lệnh</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Stop Loss</Label>
                    <Input placeholder="VD: 20 pips..." value={form.stopLoss} onChange={(e) => updateForm({ stopLoss: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Take Profit</Label>
                    <Input placeholder="VD: 40 pips..." value={form.takeProfit} onChange={(e) => updateForm({ takeProfit: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Lý do vào lệnh</Label>
                    <EditableSelect value={form.reason} onValueChange={(v) => updateForm({ reason: v })} items={library.reasons} onItemsChange={(items) => handleLibraryUpdate("reasons", items)} placeholder="Chọn lý do" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    <FontAwesomeIcon icon={faImage} className="mr-1" /> Ảnh chart
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input placeholder="Paste link ảnh..." value={form.chartImageUrl} onChange={(e) => updateForm({ chartImageUrl: e.target.value })} className="flex-1" />
                    <label>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        setUploading(true);
                        try { const url = await uploadChartImage(user.uid, file); updateForm({ chartImageUrl: url }); } catch { alert("Lỗi upload ảnh."); }
                        setUploading(false);
                        e.target.value = "";
                      }} />
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
                        {uploading ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> : <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />}
                      </span>
                    </label>
                  </div>
                  {form.chartImageUrl && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.chartImageUrl} alt="Chart" className="rounded-lg border max-h-48 w-full object-contain bg-muted" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Ghi chú lúc vào lệnh</Label>
                  <Textarea placeholder="Phân tích, nhận định..." value={form.note} onChange={(e) => updateForm({ note: e.target.value })} rows={3} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* Phase 2 - Exit Review */}
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
                      <Textarea placeholder="Đạt TP, chạm SL..." value={form.exitReason} onChange={(e) => updateForm({ exitReason: e.target.value })} rows={3} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Bài học / Kinh nghiệm</Label>
                      <Textarea placeholder="Điều gì làm tốt? Cần cải thiện?" value={form.lessonsLearned} onChange={(e) => updateForm({ lessonsLearned: e.target.value })} rows={3} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium"><FontAwesomeIcon icon={faImage} className="mr-1" /> Ảnh chart lúc đóng</Label>
                    <div className="mt-1 flex gap-2">
                      <Input placeholder="Paste link..." value={form.exitChartImageUrl} onChange={(e) => updateForm({ exitChartImageUrl: e.target.value })} className="flex-1" />
                      <label>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          setUploading(true);
                          try { const url = await uploadChartImage(user.uid, file); updateForm({ exitChartImageUrl: url }); } catch { alert("Lỗi upload."); }
                          setUploading(false);
                          e.target.value = "";
                        }} />
                        <span className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer">
                          <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                        </span>
                      </label>
                    </div>
                    {form.exitChartImageUrl && (
                      <div className="mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.exitChartImageUrl} alt="Exit chart" className="rounded-lg border max-h-48 w-full object-contain bg-muted" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Advanced */}
            <Card>
              <CardHeader>
                <button className="flex items-center justify-between w-full text-left" onClick={() => setShowAdvanced(!showAdvanced)}>
                  <CardTitle className="text-base">Thông tin nâng cao</CardTitle>
                  <FontAwesomeIcon icon={showAdvanced ? faChevronUp : faChevronDown} className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Giá vào</Label>
                      <Input type="number" step="any" value={form.entryPrice ?? ""} onChange={(e) => updateForm({ entryPrice: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Giá ra</Label>
                      <Input type="number" step="any" value={form.exitPrice ?? ""} onChange={(e) => updateForm({ exitPrice: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Lot / Quantity</Label>
                      <Input type="number" step="any" value={form.lotSize ?? ""} onChange={(e) => updateForm({ lotSize: e.target.value ? parseFloat(e.target.value) : undefined })} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Timeframe</Label>
                      <EditableSelect value={form.timeframe} onValueChange={(v) => updateForm({ timeframe: v })} items={library.timeframes} onItemsChange={(items) => handleLibraryUpdate("timeframes", items)} placeholder="Chọn TF" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Ngày đóng lệnh</Label>
                      <Input type="date" value={form.closeDate} onChange={(e) => updateForm({ closeDate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Strategy</Label>
                      <EditableSelect value={form.strategy} onValueChange={(v) => updateForm({ strategy: v })} items={library.strategies} onItemsChange={(items) => handleLibraryUpdate("strategies", items)} placeholder="Chọn strategy" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={saving || saved} size="lg">
                {saved ? (
                  <><FontAwesomeIcon icon={faCheck} className="mr-2 h-4 w-4" /> Đã lưu!</>
                ) : saving ? (
                  <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                ) : (
                  <><FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4" /> Cập nhật</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
