"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trade, DropdownLibrary, DEFAULT_LIBRARY } from "@/lib/types";
import { getTrades, deleteTrade, getLibrary } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  faFilter,
  faImage,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import { format, parseISO } from "date-fns";
import Link from "next/link";

export default function TradesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [library, setLibrary] = useState<DropdownLibrary>(DEFAULT_LIBRARY);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [filterPair, setFilterPair] = useState("all");
  const [search, setSearch] = useState("");

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

  const filteredTrades = trades.filter((t) => {
    if (filterPlatform !== "all" && t.platform !== filterPlatform) return false;
    if (filterResult !== "all" && t.result !== filterResult) return false;
    if (filterPair !== "all" && t.pair !== filterPair) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        t.pair.toLowerCase().includes(s) ||
        t.note?.toLowerCase().includes(s) ||
        t.reason?.toLowerCase().includes(s) ||
        t.emotion.toLowerCase().includes(s)
      );
    }
    return true;
  });

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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <FontAwesomeIcon
              icon={faFilter}
              className="text-muted-foreground h-4 w-4"
            />
            <Input
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Select value={filterPlatform} onValueChange={(v) => v && setFilterPlatform(v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sàn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả sàn</SelectItem>
                {library.platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPair} onValueChange={(v) => v && setFilterPair(v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Cặp tiền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả cặp</SelectItem>
                {library.pairs.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResult} onValueChange={(v) => v && setFilterResult(v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Kết quả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="WIN">Thắng</SelectItem>
                <SelectItem value="LOSS">Thua</SelectItem>
                <SelectItem value="BREAKEVEN">Hoà</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredTrades.length} lệnh
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Cặp tiền</TableHead>
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {trades.length === 0
                      ? "Chưa có lệnh nào. Bấm \"Thêm lệnh\" để bắt đầu!"
                      : "Không tìm thấy lệnh phù hợp"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/trades/${trade.id}`)}>
                    <TableCell className="font-medium">
                      {format(parseISO(trade.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold">{trade.pair}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trade.type === "BUY" ? "default" : "destructive"}
                      >
                        {trade.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{trade.emotion}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${
                          trade.result === "WIN"
                            ? "text-green-500"
                            : trade.result === "LOSS"
                            ? "text-red-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {trade.result === "WIN"
                          ? "Thắng"
                          : trade.result === "LOSS"
                          ? "Thua"
                          : "Hoà"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.pnl !== undefined ? (
                        <span
                          className={`font-mono ${
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {trade.chartImageUrl && (
                        <a
                          href={trade.chartImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={trade.chartImageUrl}
                            alt="Chart"
                            className="h-10 w-16 object-cover rounded border bg-muted hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                              el.insertAdjacentHTML('afterend', '<span class="text-blue-500"><svg class="h-4 w-4" viewBox="0 0 512 512"><path fill="currentColor" d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg></span>');
                            }}
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
                        <Link href={`/trades/new?edit=${trade.id}`}>
                          <Button variant="ghost" size="sm" title="Sửa">
                            <FontAwesomeIcon icon={faPenToSquare} className="h-4 w-4" />
                          </Button>
                        </Link>
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
    </div>
  );
}
