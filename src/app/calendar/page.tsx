"use client";

import { useEffect, useState, useMemo } from "react";
import { Trade } from "@/lib/types";
import { getTrades } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getTrades(user.uid)
      .then(setTrades)
      .finally(() => setLoading(false));
  }, [user]);

  // Group trades by date with P&L
  const dailyData = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: Trade[]; wins: number; losses: number }>();
    for (const t of trades) {
      const curr = map.get(t.date) || { pnl: 0, trades: [], wins: 0, losses: 0 };
      curr.pnl += t.pnl || 0;
      curr.trades.push(t);
      if (t.result === "WIN") curr.wins++;
      if (t.result === "LOSS") curr.losses++;
      map.set(t.date, curr);
    }
    return map;
  }, [trades]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Pad start to Monday (weekStartsOn: 1)
    let startPad = getDay(monthStart) - 1;
    if (startPad < 0) startPad = 6;

    return { days, startPad };
  }, [currentMonth]);

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Monthly summary
  const monthSummary = useMemo(() => {
    const monthStr = format(currentMonth, "yyyy-MM");
    let totalPnl = 0;
    let totalTrades = 0;
    let wins = 0;
    let greenDays = 0;
    let redDays = 0;

    dailyData.forEach((data, date) => {
      if (date.startsWith(monthStr)) {
        totalPnl += data.pnl;
        totalTrades += data.trades.length;
        wins += data.wins;
        if (data.pnl > 0) greenDays++;
        else if (data.pnl < 0) redDays++;
      }
    });

    return { totalPnl, totalTrades, wins, greenDays, redDays };
  }, [currentMonth, dailyData]);

  const selectedTrades = useMemo(() => {
    if (!selectedDate) return [];
    return dailyData.get(selectedDate)?.trades || [];
  }, [selectedDate, dailyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lịch giao dịch</h1>

      {/* Month navigation + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: vi })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {monthSummary.totalTrades} lệnh
          </span>
          <span className="text-green-500">{monthSummary.greenDays} ngày xanh</span>
          <span className="text-red-500">{monthSummary.redDays} ngày đỏ</span>
          <span
            className={`font-mono font-semibold ${
              monthSummary.totalPnl >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {monthSummary.totalPnl >= 0 ? "+" : ""}${monthSummary.totalPnl.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding for days before month start */}
            {Array.from({ length: calendarDays.startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="h-24" />
            ))}

            {calendarDays.days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const data = dailyData.get(dateStr);
              const hasTrades = !!data;
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={cn(
                    "h-24 p-2 rounded-lg border text-left transition-colors flex flex-col",
                    isToday(day) && "ring-2 ring-primary",
                    isSelected && "border-primary bg-primary/5",
                    !isSelected && "border-border hover:border-muted-foreground/50",
                    hasTrades && data.pnl > 0 && "bg-green-500/10",
                    hasTrades && data.pnl < 0 && "bg-red-500/10",
                    hasTrades && data.pnl === 0 && "bg-yellow-500/10"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hasTrades && (
                    <div className="mt-auto space-y-0.5">
                      <span
                        className={cn(
                          "text-xs font-mono font-semibold block",
                          data.pnl > 0 && "text-green-500",
                          data.pnl < 0 && "text-red-500",
                          data.pnl === 0 && "text-yellow-500"
                        )}
                      >
                        {data.pnl >= 0 ? "+" : ""}${data.pnl.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {data.trades.length} lệnh • {data.wins}W/{data.losses}L
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected date trades */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Chi tiết ngày {format(parseISO(selectedDate), "dd/MM/yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTrades.length > 0 ? (
              <div className="space-y-3">
                {selectedTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={trade.type === "BUY" ? "default" : "destructive"}
                        className="w-12 justify-center"
                      >
                        {trade.type}
                      </Badge>
                      <div>
                        <span className="font-medium">{trade.pair}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          {trade.platform}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{trade.emotion}</Badge>
                      {trade.reason && (
                        <Badge variant="outline">{trade.reason}</Badge>
                      )}
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
                      {trade.pnl !== undefined && (
                        <span
                          className={`font-mono ${
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Không có lệnh nào trong ngày này
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
