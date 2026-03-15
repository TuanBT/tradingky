"use client";

import { useMemo } from "react";
import { DropdownLibrary, Trade, ENTRY_EMOTIONS } from "@/lib/types";
import { useTradeFilters } from "./TradeFilterContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faRotateLeft, faPlay, faFlagCheckered, faStar } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarOutline } from "@fortawesome/free-regular-svg-icons";

const statusLabels: Record<string, React.ReactNode> = {
  all: "Trạng thái",
  OPEN: <><FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3 text-blue-500" />Đang chạy</>,
  CLOSED: <><FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3 text-green-500" />Đã đóng</>,
};

const dateRangeLabels: Record<string, string> = {
  all: "Thời gian",
  today: "Hôm nay",
  "this-week": "Tuần này",
  "this-month": "Tháng này",
  "this-year": "Năm nay",
};

interface TradeFilterBarProps {
  library: DropdownLibrary;
  totalCount: number;
  compact?: boolean;
  trades?: Trade[];
}

export function TradeFilterBar({ library, totalCount, compact, trades }: TradeFilterBarProps) {
  const { filters, setFilter, resetFilters } = useTradeFilters();

  const hasActiveFilters = filters.search !== "" || filters.emotion !== "all" || filters.status !== "all" || filters.dateRange !== "all" || filters.starred !== "all";

  // Build emotion options from fixed list + existing trade emotions
  const emotionOptions = useMemo(() => {
    const values = new Set(ENTRY_EMOTIONS.map((e) => e.value));
    if (trades) {
      for (const t of trades) {
        if (t.emotion) values.add(t.emotion);
      }
    }
    return Array.from(values);
  }, [trades]);

  // Build year options from trades data
  const yearOptions = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    for (const t of trades) {
      const y = t.date.substring(0, 4);
      if (y !== currentYear) years.add(y);
    }
    return Array.from(years).sort().reverse();
  }, [trades]);

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        <Select value={filters.status} onValueChange={(v) => v && setFilter("status", v)}>
          <SelectTrigger className="h-8 text-xs w-auto">
            <span>{statusLabels[filters.status] || filters.status}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="OPEN"><FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3 text-blue-500" />Đang chạy</SelectItem>
            <SelectItem value="CLOSED"><FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3 text-green-500" />Đã đóng</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.emotion} onValueChange={(v) => v && setFilter("emotion", v)}>
          <SelectTrigger className="h-8 text-xs w-auto">
            <span>{filters.emotion === "all" ? "Tâm lý" : filters.emotion}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {emotionOptions.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Collapsible no longer needed with only 4 filters

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <FontAwesomeIcon icon={faFilter} className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-sm font-medium">Bộ lọc</span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" />
              Xoá
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {totalCount} lệnh
          </span>
          <button
            onClick={() => setFilter("starred", filters.starred === "starred" ? "all" : "starred")}
            className={`ml-1 p-1 rounded transition-colors cursor-pointer ${filters.starred === "starred" ? "text-yellow-500" : "text-muted-foreground/40 hover:text-yellow-400"}`}
            title={filters.starred === "starred" ? "Hiện tất cả" : "Chỉ hiện đã đánh dấu"}
          >
            <FontAwesomeIcon icon={filters.starred === "starred" ? faStar : faStarOutline} className="h-4 w-4" />
          </button>
        </div>

        {/* Filters - single row on desktop, 2 rows on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Tìm cặp tiền, ghi chú, tâm lý..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="h-9 sm:flex-1"
          />
          <div className="flex gap-2">
            <Select value={filters.emotion} onValueChange={(v) => v && setFilter("emotion", v)}>
              <SelectTrigger className="h-9 w-full sm:w-[130px]">
                <span className="truncate">{filters.emotion === "all" ? "Tâm lý" : filters.emotion}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {emotionOptions.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => v && setFilter("status", v)}>
              <SelectTrigger className="h-9 w-full sm:w-[140px]">
                <span className="truncate">{statusLabels[filters.status] || filters.status}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="OPEN"><FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3 text-blue-500" />Đang chạy</SelectItem>
                <SelectItem value="CLOSED"><FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3 text-green-500" />Đã đóng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.dateRange} onValueChange={(v) => v && setFilter("dateRange", v)}>
              <SelectTrigger className="h-9 w-full sm:w-[130px]">
                <span className="truncate">{dateRangeLabels[filters.dateRange] || (filters.dateRange.startsWith("year-") ? `Năm ${filters.dateRange.slice(5)}` : filters.dateRange)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="this-week">Tuần này</SelectItem>
                <SelectItem value="this-month">Tháng này</SelectItem>
                <SelectItem value="this-year">Năm nay</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={`year-${y}`}>
                    Năm {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
