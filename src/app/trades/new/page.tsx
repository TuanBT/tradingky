"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { addTrade, updateTrade, getLibrary, getTrades } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFloppyDisk,
  faImage,
  faCheck,
  faSpinner,
  faChevronDown,
  faChevronUp,
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
}

const emptyForm: TradeForm = {
  date: "",
  pair: "",
  platform: "",
  type: "BUY",
  emotion: "",
  result: "WIN",
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

  const handleSubmit = async () => {
    if (!form.pair || !form.platform || !form.emotion) {
      alert("Vui lòng điền đầy đủ: Cặp tiền, Sàn, và Tâm lý");
      return;
    }

    setSaving(true);
    const tradeData = {
      date: form.date,
      pair: form.pair,
      platform: form.platform,
      type: form.type,
      emotion: form.emotion,
      result: form.result,
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
      createdAt: editTrade?.createdAt || Date.now(),
    };

    if (editTrade) {
      await updateTrade(user!.uid, editTrade.id, tradeData);
    } else {
      await addTrade(user!.uid, tradeData);
      localStorage.removeItem(AUTOSAVE_KEY);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push("/trades");
    }, 800);
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
          <Link href="/trades">
            <Button variant="ghost" size="icon">
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {editTrade ? "Sửa lệnh" : "Thêm lệnh mới"}
            </h1>
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
                  <Select
                    value={form.pair}
                    onValueChange={(v) => v && updateForm({ pair: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Chọn cặp tiền" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.pairs.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Sàn *</Label>
                  <Select
                    value={form.platform}
                    onValueChange={(v) => v && updateForm({ platform: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Chọn sàn" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.platforms.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lợi nhuận ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="VD: 50.00 hoặc -20.00"
                    value={form.pnl ?? ""}
                    onChange={(e) =>
                      updateForm({
                        pnl: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div>
                  <Label className="text-sm font-medium">Tâm lý *</Label>
                  <Select
                    value={form.emotion}
                    onValueChange={(v) => v && updateForm({ emotion: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Tâm lý lúc vào lệnh" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.emotions.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    value={form.reason}
                    onValueChange={(v) => v && updateForm({ reason: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Chọn lý do" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.reasons.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  <FontAwesomeIcon icon={faImage} className="mr-1" />
                  Link ảnh chart
                </Label>
                <Input
                  placeholder="https://www.tradingview.com/x/..."
                  value={form.chartImageUrl}
                  onChange={(e) => updateForm({ chartImageUrl: e.target.value })}
                  className="mt-1"
                />
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
                <Label className="text-sm font-medium">Ghi chú</Label>
                <Textarea
                  placeholder="Ghi chú thêm về lệnh, bài học rút ra..."
                  value={form.note}
                  onChange={(e) => updateForm({ note: e.target.value })}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

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
                    <Select
                      value={form.timeframe}
                      onValueChange={(v) => v && updateForm({ timeframe: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn TF" />
                      </SelectTrigger>
                      <SelectContent>
                        {library.timeframes.map((tf) => (
                          <SelectItem key={tf} value={tf}>
                            {tf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select
                      value={form.strategy}
                      onValueChange={(v) => v && updateForm({ strategy: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Chọn strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        {library.strategies.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <div className="flex items-center gap-2">
                <Badge
                  className={form.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}
                >
                  {form.type}
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
                {form.pnl !== undefined && (
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
                    <span className="text-xs text-muted-foreground">Ghi chú:</span>
                    <p className="text-sm mt-1">{form.note}</p>
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
