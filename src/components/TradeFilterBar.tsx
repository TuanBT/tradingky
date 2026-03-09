"use client";

import { useMemo, useState } from "react";
import { DropdownLibrary, Trade } from "@/lib/types";
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
import { faFilter, faRotateLeft, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

const resultLabels: Record<string, string> = {
  all: "Tất cả",
  WIN: "Thắng",
  LOSS: "Thua",
  BREAKEVEN: "Hoà",
};

const statusLabels: Record<string, string> = {
  all: "Tất cả",
  OPEN: "🔵 Đang chạy",
  CLOSED: "✅ Đã đóng",
};

const dateRangeLabels: Record<string, string> = {
  all: "Tất cả",
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

  const hasActiveFilters = filters.search !== "" || filters.platform !== "all" || filters.pair !== "all" || filters.result !== "all" || filters.status !== "all" || filters.dateRange !== "all";

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
            <SelectItem value="OPEN">🔵 Đang chạy</SelectItem>
            <SelectItem value="CLOSED">✅ Đã đóng</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.result} onValueChange={(v) => v && setFilter("result", v)}>
          <SelectTrigger className="h-8 text-xs w-auto">
            <span>{resultLabels[filters.result] || filters.result}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="WIN">Thắng</SelectItem>
            <SelectItem value="LOSS">Thua</SelectItem>
            <SelectItem value="BREAKEVEN">Hoà</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Collapsible on mobile (default collapsed)
  const [collapsed, setCollapsed] = useState(true);

  const activeFilterCount = [
    filters.search !== "",
    filters.platform !== "all",
    filters.pair !== "all",
    filters.result !== "all",
    filters.status !== "all",
    filters.dateRange !== "all",
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 w-full sm:cursor-default"
        >
          <FontAwesomeIcon icon={faFilter} className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 sm:hidden">
              {activeFilterCount}
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={(e) => { e.stopPropagation(); resetFilters(); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" />
              Xoá bộ lọc
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {totalCount} lệnh
          </span>
          <FontAwesomeIcon
            icon={collapsed ? faChevronDown : faChevronUp}
            className="h-3 w-3 text-muted-foreground sm:hidden"
          />
        </button>
        <div className={`${collapsed ? "hidden sm:grid" : "grid"} grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3`}>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tìm kiếm</label>
            <Input
              placeholder="Tìm..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sàn giao dịch</label>
            <Select value={filters.platform} onValueChange={(v) => v && setFilter("platform", v)}>
              <SelectTrigger>
                <span>{filters.platform === "all" ? "Tất cả" : filters.platform}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {library.platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cặp tiền</label>
            <Select value={filters.pair} onValueChange={(v) => v && setFilter("pair", v)}>
              <SelectTrigger>
                <span>{filters.pair === "all" ? "Tất cả" : filters.pair}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {library.pairs.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kết quả</label>
            <Select value={filters.result} onValueChange={(v) => v && setFilter("result", v)}>
              <SelectTrigger>
                <span>{resultLabels[filters.result] || filters.result}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="WIN">Thắng</SelectItem>
                <SelectItem value="LOSS">Thua</SelectItem>
                <SelectItem value="BREAKEVEN">Hoà</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Trạng thái</label>
            <Select value={filters.status} onValueChange={(v) => v && setFilter("status", v)}>
              <SelectTrigger>
                <span>{statusLabels[filters.status] || filters.status}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="OPEN">🔵 Đang chạy</SelectItem>
                <SelectItem value="CLOSED">✅ Đã đóng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Thời gian</label>
            <Select value={filters.dateRange} onValueChange={(v) => v && setFilter("dateRange", v)}>
              <SelectTrigger>
                <span>{dateRangeLabels[filters.dateRange] || (filters.dateRange.startsWith("year-") ? `Năm ${filters.dateRange.slice(5)}` : filters.dateRange)}</span>
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
