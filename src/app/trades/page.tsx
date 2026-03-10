"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { getTrades, deleteTrade, getLibrary } from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { useTradeFilters } from "@/components/TradeFilterContext";
import { TradeFilterBar } from "@/components/TradeFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faPenToSquare,
  faTrash,
  faChevronLeft,
  faChevronRight,
  faTableList,
  faMagnifyingGlass,
  faCalendarDays,
  faBuildingColumns,
  faArrowTrendUp,
  faArrowTrendDown,
  faBullseye,
  faShieldHalved,
  faClock,
  faLayerGroup,
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
import { vi } from "date-fns/locale";
import { TradeEditModal } from "@/components/TradeEditModal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";
import { filterTrades } from "@/lib/filters";

type ViewMode = "list" | "detail";

export default function TradesPage() {
  const { user, getGoogleAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { filters } = useTradeFilters();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeModalId, setTradeModalId] = useState<string | null>(null);
  const [tradeModalMode, setTradeModalMode] = useState<"add" | "edit" | "close">("edit");
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string>("");
  const { toast } = useToast();

  // View mode: list or detail
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const v = searchParams.get("view");
    return v === "detail" ? "detail" : "list";
  });

  // List view pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Detail view state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMobileList, setShowMobileList] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [listPage, setListPage] = useState(1);
  const listPageSize = 10;
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [tradesData, libraryData] = await Promise.all([
        getTrades(user.uid),
        getLibrary(user.uid),
      ]);
      setTrades(tradesData);
      setLibrary(libraryData);
    } catch (err) {
      setError((err as Error).message || "Không thể tải dữ liệu");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTrades = useMemo(() => {
    const filtered = filterTrades(trades, filters);
    // Pin OPEN trades at the top
    return filtered.sort((a, b) => {
      const aOpen = (a.status || "CLOSED") === "OPEN" ? 0 : 1;
      const bOpen = (b.status || "CLOSED") === "OPEN" ? 0 : 1;
      return aOpen - bOpen;
    });
  }, [trades, filters]);

  // List pagination
  const totalPages = Math.ceil(filteredTrades.length / pageSize);
  const paginatedTrades = filteredTrades.slice((page - 1) * pageSize, page * pageSize);

  // Detail navigation
  const total = filteredTrades.length;
  const currentTrade = filteredTrades[currentIndex] || null;

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }, [currentIndex, total]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    setCurrentIndex(0);
    setListPage(1);
  }, [filters]);

  // Auto-sync mini-list page when detail index changes
  useEffect(() => {
    const targetPage = Math.floor(currentIndex / listPageSize) + 1;
    setListPage(targetPage);
  }, [currentIndex]);

  // Scroll to active item
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [currentIndex, listPage]);

  // Keyboard navigation in detail mode
  useEffect(() => {
    if (viewMode !== "detail") return;
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewMode, goNext, goPrev]);

  // Update URL when view mode changes
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "detail") {
      params.set("view", "detail");
    } else {
      params.delete("view");
    }
    router.replace(`/trades?${params.toString()}`, { scroll: false });
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const accessToken = await getGoogleAccessToken();
      await deleteTrade(user.uid, id, accessToken);
      toast("Đã xoá lệnh", "success");
      await loadData();
    } catch (error) {
      toast((error as Error).message || "Lỗi khi xoá lệnh", "error");
    }
  };

  const openAdd = () => {
    setTradeModalId(null);
    setTradeModalMode("add");
    setTradeModalOpen(true);
  };

  const openEdit = (tradeId: string, mode: "edit" | "close" = "edit") => {
    setTradeModalId(tradeId);
    setTradeModalMode(mode);
    setTradeModalOpen(true);
  };

  const closeModal = () => {
    setTradeModalOpen(false);
    setTradeModalId(null);
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Quản lý lệnh</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => switchView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <FontAwesomeIcon icon={faTableList} className="h-3.5 w-3.5" />
              Bảng
            </button>
            <button
              onClick={() => switchView("detail")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "detail"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5" />
              Chi tiết
            </button>
          </div>
          <Button onClick={openAdd}>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Thêm lệnh
          </Button>
        </div>
      </div>

      <TradeFilterBar library={library} totalCount={filteredTrades.length} trades={trades} />

      {/* ===== LIST VIEW ===== */}
      {viewMode === "list" && (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[750px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Cặp tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tâm lý</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead>Ảnh</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {trades.length === 0
                          ? "Chưa có lệnh nào. Bấm \"Thêm lệnh\" để bắt đầu!"
                          : "Không tìm thấy lệnh phù hợp"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTrades.map((trade) => {
                      const tradeStatus = trade.status || "CLOSED";
                      const isOpen = tradeStatus === "OPEN";
                      return (
                        <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/trades/${trade.id}`)}>
                          <TableCell className="font-medium">
                            {format(parseISO(trade.date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className="mr-1.5">{trade.pair}</span>
                            <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white text-[10px] px-1.5 py-0" : "bg-orange-600 text-white text-[10px] px-1.5 py-0"}>
                              {trade.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isOpen ? (
                              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">🔵 Đang chạy</Badge>
                            ) : (
                              <Badge className="bg-green-500/15 text-green-500 border-green-500/30">✅ Đã đóng</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{trade.emotion}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : "text-yellow-500"
                            }`}>
                              {trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : "Hoà"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {trade.pnl !== undefined ? (
                              <span className={`font-mono ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {trade.chartImageUrl && (
                              <button type="button" onClick={() => setLightboxSrc(getImageSrc(trade.chartImageUrl!))} className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getImageSrc(trade.chartImageUrl)}
                                  alt="Chart"
                                  className="h-12 w-20 lg:h-14 lg:w-24 object-cover rounded border bg-muted hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {isOpen && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-h-[44px] sm:min-h-0 text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700"
                                  onClick={() => openEdit(trade.id, "close")}
                                >
                                  <FontAwesomeIcon icon={faFlagCheckered} className="mr-1.5 h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Đóng lệnh</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                title="Sửa"
                                onClick={() => openEdit(trade.id, "edit")}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                onClick={() => setDeleteTradeId(trade.id)}
                                title="Xoá"
                              >
                                <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Hiển thị {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredTrades.length)} / {filteredTrades.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3 mr-1" />
                  Trước
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`ellipsis-${i}`} className="text-muted-foreground px-1">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  Sau
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== DETAIL VIEW ===== */}
      {viewMode === "detail" && (
        <>
          {/* Mobile list view */}
          {showMobileList ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Chọn lệnh để xem lại</h2>
                <Button variant="outline" size="sm" onClick={() => setShowMobileList(false)}>
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
                      onClick={() => { setCurrentIndex(i); setShowMobileList(false); }}
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
                        {format(parseISO(t.date), "dd/MM/yyyy")}{t.platform ? ` · ${t.platform}` : ""} · {t.emotion}
                      </div>
                    </button>
                  );
                })}
                {filteredTrades.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Không có lệnh nào phù hợp filter.</p>
                )}
              </div>
            </div>
          ) : (
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
                    <Button variant="outline" size="sm" className="lg:hidden min-h-[44px] sm:min-h-0" onClick={() => setShowMobileList(true)}>
                      <FontAwesomeIcon icon={faList} className="mr-2 h-3.5 w-3.5" />
                      Danh sách
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={goPrev} disabled={currentIndex === 0}>
                      <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums min-w-[4rem] text-center">
                      {total > 0 ? `${currentIndex + 1} / ${total}` : "0 / 0"}
                    </span>
                    <Button variant="outline" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={goNext} disabled={currentIndex >= total - 1}>
                      <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Desktop action buttons */}
                  {currentTrade && (() => {
                    const isOpenTrade = (currentTrade.status || "CLOSED") === "OPEN";
                    return (
                    <div className="hidden sm:flex items-center gap-2">
                      {isOpenTrade && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700"
                          onClick={() => openEdit(currentTrade.id, "close")}
                        >
                          <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-3.5 w-3.5" />
                          Đóng lệnh
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(currentTrade.id, "edit")}
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTradeId(currentTrade.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-2 h-3.5 w-3.5" />
                        Xoá
                      </Button>
                    </div>
                    );
                  })()}
                </div>

                {/* Trade detail */}
                {currentTrade ? (
                  <div className="pb-16 sm:pb-0">
                    <TradeDetail trade={currentTrade} onImageClick={(src) => setLightboxSrc(src)} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <p className="text-muted-foreground">Không có lệnh nào để xem lại.</p>
                    <Button onClick={openAdd}>Thêm lệnh mới</Button>
                  </div>
                )}

                {/* Mobile sticky bottom action bar */}
                {currentTrade && (() => {
                  const isOpenTrade = (currentTrade.status || "CLOSED") === "OPEN";
                  return (
                  <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3 flex gap-2">
                    {isOpenTrade && (
                      <Button
                        variant="outline"
                        className="flex-1 min-h-[44px] text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700"
                        onClick={() => openEdit(currentTrade.id, "close")}
                      >
                        <FontAwesomeIcon icon={faFlagCheckered} className="mr-2 h-4 w-4" />
                        Đóng lệnh
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                      onClick={() => openEdit(currentTrade.id, "edit")}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-4 w-4" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[44px] text-destructive hover:text-destructive"
                      onClick={() => setDeleteTradeId(currentTrade.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} className="mr-2 h-4 w-4" />
                      Xoá
                    </Button>
                  </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}

      <TradeEditModal
        tradeId={tradeModalId}
        open={tradeModalOpen}
        onClose={closeModal}
        onSaved={loadData}
        mode={tradeModalMode}
      />

      <ConfirmDialog
        open={!!deleteTradeId}
        onClose={() => setDeleteTradeId(null)}
        onConfirm={() => { if (deleteTradeId) handleDelete(deleteTradeId); }}
        title="Xoá lệnh"
        message="Bạn có chắc muốn xoá lệnh này? Hành động không thể hoàn tác."
        confirmText="Xoá"
        variant="danger"
      />

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </div>
  );
}

/* ===== DETAIL VIEW COMPONENTS ===== */

function TradeDetail({ trade, onImageClick }: { trade: Trade; onImageClick: (src: string) => void }) {
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
          <h2 className="text-2xl font-bold">{trade.pair}</h2>
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
              {trade.platform && <Badge variant="outline">{trade.platform}</Badge>}
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
            {trade.platform && <Badge variant="outline">{trade.platform}</Badge>}
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
            {trade.platform && <InfoRow icon={faBuildingColumns} label="Sàn" value={trade.platform} />}
            <InfoRow icon={faFaceSmile} label="Tâm lý" value={trade.emotion} />
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

      {trade.chartImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <FontAwesomeIcon icon={faImage} className="mr-2 h-4 w-4" />
              Ảnh chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button type="button" onClick={() => onImageClick(getImageSrc(trade.chartImageUrl!))}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageSrc(trade.chartImageUrl)}
                alt="Chart"
                className="rounded-lg border w-full object-contain max-h-[500px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              />
            </button>
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

      {!isOpen && (trade.exitReason || trade.lessonsLearned) && (
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
