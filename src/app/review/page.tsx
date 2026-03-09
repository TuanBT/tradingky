"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { getTrades, getLibrary } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useTradeFilters } from "@/components/TradeFilterContext";
import { TradeFilterBar } from "@/components/TradeFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPenToSquare,
  faCalendarDays,
  faChartLine,
  faBuildingColumns,
  faArrowTrendUp,
  faArrowTrendDown,
  faBullseye,
  faShieldHalved,
  faLightbulb,
  faClock,
  faLayerGroup,
  faTags,
  faImage,
  faNoteSticky,
  faFaceSmile,
  faDollarSign,
  faPlay,
  faFlagCheckered,
  faGraduationCap,
  faArrowRightFromBracket,
  faList,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";
import { filterTrades } from "@/lib/filters";
import { vi } from "date-fns/locale";
import { TradeEditModal } from "@/components/TradeEditModal";
import Link from "next/link";

export default function ReviewPage() {
  const { user } = useAuth();
  const { filters } = useTradeFilters();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showList, setShowList] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [listPage, setListPage] = useState(1);
  const listPageSize = 10;
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const [tradesData, libraryData] = await Promise.all([
        getTrades(user.uid),
        getLibrary(user.uid),
      ]);
      setAllTrades(tradesData);
      setLibrary(libraryData);
    } catch (err) {
      setError((err as Error).message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTrades = useMemo(() => {
    return filterTrades(allTrades, filters);
  }, [allTrades, filters]);

  // Reset index when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setListPage(1);
  }, [filters]);

  // Auto-sync mini-list page when currentIndex changes
  useEffect(() => {
    const targetPage = Math.floor(currentIndex / listPageSize) + 1;
    setListPage(targetPage);
  }, [currentIndex]);

  // Scroll to active item in mini-list
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex, listPage]);

  const trade = filteredTrades[currentIndex] || null;
  const total = filteredTrades.length;

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, total]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadData}>Thử lại</Button>
      </div>
    );
  }

  // Mobile list view
  if (showList) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Chọn lệnh để xem lại</h1>
          <Button variant="outline" size="sm" onClick={() => setShowList(false)}>
            Đóng
          </Button>
        </div>
        <div className="space-y-2">
          {filteredTrades.map((t, i) => {
            const s = t.status || "CLOSED";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { setCurrentIndex(i); setShowList(false); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${i === currentIndex ? "bg-accent border-primary" : "hover:bg-accent/50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${s === "OPEN" ? "text-blue-500" : "text-green-500"}`}>
                      {s === "OPEN" ? "🔵" : "✅"}
                    </span>
                    <span className="font-semibold text-sm">{t.pair}</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {t.type}
                    </Badge>
                  </div>
                  {t.pnl !== undefined && s === "CLOSED" && (
                    <span className={`text-sm font-mono ${t.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(t.date), "dd/MM/yyyy")} · {t.platform} · {t.emotion}
                </div>
              </button>
            );
          })}
          {filteredTrades.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Không có lệnh nào phù hợp filter.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shared filter bar */}
      <TradeFilterBar library={library} totalCount={filteredTrades.length} trades={allTrades} />

      <div className="flex gap-6">
      {/* Desktop mini-list (left sidebar) */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-6 space-y-3">
          <button
            className="w-full flex items-center justify-between px-1 cursor-pointer"
            onClick={() => setListCollapsed(!listCollapsed)}
          >
            <h2 className="text-sm font-semibold text-muted-foreground">
              <FontAwesomeIcon icon={faList} className="mr-2 h-3 w-3" />
              Danh sách ({total})
            </h2>
            <FontAwesomeIcon
              icon={listCollapsed ? faChevronDown : faChevronUp}
              className="h-3 w-3 text-muted-foreground"
            />
          </button>
          {!listCollapsed && (
            <>
              <div className="space-y-1 max-h-[70vh] overflow-auto">
                {filteredTrades
                  .slice((listPage - 1) * listPageSize, listPage * listPageSize)
                  .map((t) => {
                    const s = t.status || "CLOSED";
                    const globalIndex = filteredTrades.indexOf(t);
                    const isActive = globalIndex === currentIndex;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        ref={isActive ? activeItemRef : undefined}
                        onClick={() => setCurrentIndex(globalIndex)}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors ${isActive ? "bg-accent font-medium" : "hover:bg-accent/50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{s === "OPEN" ? "🔵" : "✅"}</span>
                            <span className="font-medium">{t.pair}</span>
                            <span className="text-xs text-muted-foreground">{t.type}</span>
                          </div>
                          {t.pnl !== undefined && s === "CLOSED" && (
                            <span className={`text-xs font-mono ${t.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(t.date), "dd/MM")} · {t.emotion}
                        </div>
                      </button>
                    );
                  })}
                {total === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Không có lệnh nào.</p>
                )}
              </div>
              {/* Mini-list pagination */}
              {total > listPageSize && (
                <div className="flex items-center justify-between px-1 text-xs">
                  <span className="text-muted-foreground">
                    {(listPage - 1) * listPageSize + 1}-{Math.min(listPage * listPageSize, total)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setListPage((p) => Math.max(1, p - 1))}
                      disabled={listPage === 1}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                    </Button>
                    <span className="text-muted-foreground self-center">
                      {listPage}/{Math.ceil(total / listPageSize)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setListPage((p) => Math.min(Math.ceil(total / listPageSize), p + 1))}
                      disabled={listPage >= Math.ceil(total / listPageSize)}
                    >
                      <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main detail area */}
      <div className="flex-1 min-w-0">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {/* Mobile list toggle */}
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowList(true)}>
              <FontAwesomeIcon icon={faList} className="mr-2 h-3.5 w-3.5" />
              Danh sách
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} disabled={currentIndex === 0}>
              <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums min-w-[4rem] text-center">
              {total > 0 ? `${currentIndex + 1} / ${total}` : "0 / 0"}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} disabled={currentIndex >= total - 1}>
              <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
            </Button>
          </div>

          {trade && (
            <Button variant="outline" size="sm" onClick={() => setEditTradeId(trade.id)}>
              <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-3.5 w-3.5" />
              {(trade.status || "CLOSED") === "OPEN" ? "Đóng lệnh" : "Sửa"}
            </Button>
          )}
        </div>

        {/* Trade detail */}
        {trade ? (
          <TradeDetail trade={trade} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <p className="text-muted-foreground">Không có lệnh nào để xem lại.</p>
            <Link href="/trades/new">
              <Button>Thêm lệnh mới</Button>
            </Link>
          </div>
        )}
      </div>
    </div>

      <TradeEditModal
        tradeId={editTradeId}
        open={!!editTradeId}
        onClose={() => setEditTradeId(null)}
        onSaved={loadData}
      />
    </div>
  );
}

function TradeDetail({ trade }: { trade: Trade }) {
  const tradeStatus = trade.status || "CLOSED";
  const isOpen = tradeStatus === "OPEN";
  const resultLabel = trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : "Hoà";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : "text-yellow-500";
  const resultBg = trade.result === "WIN" ? "bg-green-500/10 border-green-500/20" : trade.result === "LOSS" ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/10 border-yellow-500/20";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{trade.pair}</h1>
          <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}>
            {trade.type}
          </Badge>
          {isOpen ? (
            <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">
              <FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3" />
              Đang chạy
            </Badge>
          ) : (
            <Badge className="bg-green-500/15 text-green-500 border-green-500/30">
              <FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3" />
              Đã đóng
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
        </p>
      </div>

      {/* Result Banner */}
      {!isOpen && (
        <div className={`rounded-lg border p-4 ${resultBg}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${resultColor}`}>{resultLabel}</span>
              <Badge variant="outline">{trade.platform}</Badge>
            </div>
            {trade.pnl !== undefined && (
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">P&L</span>
                <span className={`text-3xl font-mono font-bold ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="rounded-lg border p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faPlay} className="h-5 w-5 text-blue-500 animate-pulse" />
            <span className="text-lg font-semibold text-blue-500">Lệnh đang chạy - chưa có kết quả</span>
            <Badge variant="outline">{trade.platform}</Badge>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin lệnh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={faCalendarDays} label="Ngày vào" value={format(parseISO(trade.date), "dd/MM/yyyy")} />
            {trade.closeDate && (
              <InfoRow icon={faCalendarDays} label="Ngày đóng" value={format(parseISO(trade.closeDate), "dd/MM/yyyy")} />
            )}
            <InfoRow icon={faBuildingColumns} label="Sàn" value={trade.platform} />
            <InfoRow icon={faFaceSmile} label="Tâm lý" value={trade.emotion} />
            {trade.reason && <InfoRow icon={faLightbulb} label="Lý do vào lệnh" value={trade.reason} />}
            {trade.strategy && <InfoRow icon={faChartLine} label="Strategy" value={trade.strategy} />}
            {trade.timeframe && <InfoRow icon={faClock} label="Timeframe" value={trade.timeframe} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giá & Quản lý vốn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trade.entryPrice !== undefined && (
              <InfoRow icon={faArrowTrendUp} label="Giá vào" value={trade.entryPrice.toString()} mono />
            )}
            {trade.exitPrice !== undefined && (
              <InfoRow icon={faArrowTrendDown} label="Giá ra" value={trade.exitPrice.toString()} mono />
            )}
            {trade.stopLoss && <InfoRow icon={faShieldHalved} label="Stop Loss" value={trade.stopLoss} />}
            {trade.takeProfit && <InfoRow icon={faBullseye} label="Take Profit" value={trade.takeProfit} />}
            {trade.lotSize !== undefined && (
              <InfoRow icon={faLayerGroup} label="Lot / Qty" value={trade.lotSize.toString()} mono />
            )}
            {trade.pnl !== undefined && (
              <InfoRow
                icon={faDollarSign}
                label="P&L"
                value={`${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`}
                mono
                valueColor={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}
              />
            )}
            {!trade.entryPrice && !trade.exitPrice && !trade.stopLoss && !trade.takeProfit && !trade.lotSize && trade.pnl === undefined && (
              <p className="text-sm text-muted-foreground">Chưa có thông tin giá.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {trade.tags && trade.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faTags} className="mr-2 h-4 w-4" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trade.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trade.chartImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faImage} className="mr-2 h-4 w-4" />
              Ảnh chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a href={trade.chartImageUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trade.chartImageUrl}
                alt="Chart"
                className="rounded-lg border w-full object-contain max-h-[500px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          </CardContent>
        </Card>
      )}

      {trade.note && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faNoteSticky} className="mr-2 h-4 w-4" />
              Ghi chú lúc vào lệnh
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.note}</p>
          </CardContent>
        </Card>
      )}

      {!isOpen && (trade.exitReason || trade.lessonsLearned || trade.exitChartImageUrl) && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-base text-green-500">
              <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-4 w-4" />
              Tổng kết sau đóng lệnh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trade.exitReason && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-3.5 w-3.5" />
                  <span className="text-sm">Lý do thoát lệnh</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.exitReason}</p>
              </div>
            )}
            {trade.lessonsLearned && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5" />
                  <span className="text-sm">Bài học & Kinh nghiệm</span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{trade.lessonsLearned}</p>
              </div>
            )}
            {trade.exitChartImageUrl && (
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <FontAwesomeIcon icon={faImage} className="h-3.5 w-3.5" />
                  <span className="text-sm">Ảnh chart lúc đóng</span>
                </div>
                <a href={trade.exitChartImageUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trade.exitChartImageUrl}
                    alt="Exit Chart"
                    className="rounded-lg border w-full object-contain max-h-[500px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
  valueColor,
}: {
  icon: typeof faCalendarDays;
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""} ${valueColor || ""}`}>
        {value}
      </span>
    </div>
  );
}
