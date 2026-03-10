import { Trade } from "@/lib/types";
import { parseISO, isToday, isThisWeek, isThisMonth, isThisYear } from "date-fns";
import type { TradeFilters } from "@/components/TradeFilterContext";

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((t) => {
    if (filters.platform !== "all" && t.platform !== filters.platform) return false;
    if (filters.result !== "all" && t.result !== filters.result) return false;
    if (filters.pair !== "all" && t.pair !== filters.pair) return false;
    if (filters.emotion !== "all" && t.emotion !== filters.emotion) return false;
    if (filters.starred === "starred" && !t.starred) return false;
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
        t.emotion.toLowerCase().includes(s)
      );
    }
    return true;
  });
}
