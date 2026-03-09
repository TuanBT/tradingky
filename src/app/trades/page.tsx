"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { getTrades, deleteTrade, getLibrary } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useTradeFilters } from "@/components/TradeFilterContext";
import { TradeFilterBar } from "@/components/TradeFilterBar";
import { Card, CardContent } from "@/components/ui/card";
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
  faEye,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO, isToday, isThisWeek, isThisMonth, isThisYear } from "date-fns";
import Link from "next/link";
import { TradeEditModal } from "@/components/TradeEditModal";

export default function TradesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { filters } = useTradeFilters();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tradesData, libraryData] = await Promise.all([
      getTrades(user.uid),
      getLibrary(user.uid),
    ]);
    setTrades(tradesData);
    setLibrary(libraryData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filters.platform !== "all" && t.platform !== filters.platform) return false;
      if (filters.result !== "all" && t.result !== filters.result) return false;
      if (filters.pair !== "all" && t.pair !== filters.pair) return false;
      const status = t.status || "CLOSED";
      if (filters.status !== "all" && status !== filters.status) return false;
      if (filters.dateRange !== "all") {
        const date = parseISO(t.date);
        if (filters.dateRange === "today" && !isToday(date)) return false;
        if (filters.dateRange === "this-week" && !isThisWeek(date, { weekStartsOn: 1 })) return false;
        if (filters.dateRange === "this-month" && !isThisMonth(date)) return false;
        if (filters.dateRange === "this-year" && !isThisYear(date)) return false;
        if (filters.dateRange.startsWith("year-") && t.date.substring(0, 4) !== filters.dateRange.slice(5)) return false;
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          t.pair.toLowerCase().includes(s) ||
          t.note?.toLowerCase().includes(s) ||
          t.reason?.toLowerCase().includes(s) ||
          t.emotion.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [trades, filters]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize);
  const paginatedTrades = filteredTrades.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá lệnh này?")) return;
    if (!user) return;
    await deleteTrade(user.uid, id);
    await loadData();
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
        <h1 className="text-2xl font-bold">Quản lý lệnh</h1>
        <Link href="/trades/new">
          <Button>
            <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
            Thêm lệnh
          </Button>
        </Link>
      </div>

      <TradeFilterBar library={library} totalCount={filteredTrades.length} trades={trades} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Cặp tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Sàn</TableHead>
                <TableHead>Loại</TableHead>
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
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {trades.length === 0
                      ? "Chưa có lệnh nào. Bấm \"Thêm lệnh\" để bắt đầu!"
                      : "Không tìm thấy lệnh phù hợp"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTrades.map((trade) => (
                  <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/trades/${trade.id}`)}>
                    <TableCell className="font-medium">
                      {format(parseISO(trade.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold">{trade.pair}</TableCell>
                    <TableCell>
                      {(trade.status || "CLOSED") === "OPEN" ? (
                        <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">🔵 Đang chạy</Badge>
                      ) : (
                        <Badge className="bg-green-500/15 text-green-500 border-green-500/30">✅ Đã đóng</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.type === "BUY" ? "default" : "destructive"}>
                        {trade.type}
                      </Badge>
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
                        <a href={trade.chartImageUrl} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={trade.chartImageUrl}
                            alt="Chart"
                            className="h-10 w-16 object-cover rounded border bg-muted hover:opacity-80 transition-opacity"
                          />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Link href={`/trades/${trade.id}`}>
                          <Button variant="ghost" size="sm" title="Xem nhật ký">
                            <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" title="Sửa" onClick={() => setEditTradeId(trade.id)}>
                          <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(trade.id)}
                          title="Xoá"
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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

      <TradeEditModal
        tradeId={editTradeId}
        open={!!editTradeId}
        onClose={() => setEditTradeId(null)}
        onSaved={loadData}
      />
    </div>
  );
}
