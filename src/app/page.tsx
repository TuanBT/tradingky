"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Trade } from "@/lib/types";
import { getTrades } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDollarSign,
  faTrophy,
  faSkullCrossbones,
  faPercent,
  faArrowTrendUp,
  faArrowTrendDown,
  faFire,
} from "@fortawesome/free-solid-svg-icons";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";

function getDateRange(period: "today" | "week" | "month") {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  if (period === "today") return { start: today, end: today };
  if (period === "week") {
    return {
      start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

function filterByPeriod(trades: Trade[], period: "today" | "week" | "month") {
  const { start, end } = getDateRange(period);
  return trades.filter((t) => t.date >= start && t.date <= end);
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const data = await getTrades(user.uid);
      setTrades(data);
    } catch (err) {
      setError((err as Error).message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const todayTrades = useMemo(() => filterByPeriod(trades, "today"), [trades]);
  const weekTrades = useMemo(() => filterByPeriod(trades, "week"), [trades]);
  const monthTrades = useMemo(() => filterByPeriod(trades, "month"), [trades]);

  const calcStats = (list: Trade[]) => {
    const wins = list.filter((t) => t.result === "WIN").length;
    const losses = list.filter((t) => t.result === "LOSS").length;
    const totalPnl = list.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = list.length > 0 ? (wins / list.length) * 100 : 0;
    return { wins, losses, totalPnl, winRate, total: list.length };
  };

  const todayStats = useMemo(() => calcStats(todayTrades), [todayTrades]);
  const weekStats = useMemo(() => calcStats(weekTrades), [weekTrades]);
  const monthStats = useMemo(() => calcStats(monthTrades), [monthTrades]);

  // Equity curve (cumulative P&L)
  const equityCurve = useMemo(() => {
    const sorted = [...monthTrades].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const data: { date: string; pnl: number }[] = [];
    for (const t of sorted) {
      cumulative += t.pnl || 0;
      data.push({ date: t.date, pnl: cumulative });
    }
    return data;
  }, [monthTrades]);

  // Daily P&L for week
  const weeklyDaily = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of weekTrades) {
      map.set(t.date, (map.get(t.date) || 0) + (t.pnl || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({
        date: format(parseISO(date), "EEE dd/MM", { locale: vi }),
        pnl,
      }));
  }, [weekTrades]);

  // Recent trades
  const recentTrades = useMemo(() => trades.slice(0, 5), [trades]);

  // Streak
  const streak = useMemo(() => {
    if (trades.length === 0) return { type: "none" as const, count: 0 };
    const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
    const firstResult = sorted[0].result;
    if (firstResult === "BREAKEVEN") return { type: "none" as const, count: 0 };
    let count = 0;
    for (const t of sorted) {
      if (t.result === firstResult) count++;
      else break;
    }
    return { type: firstResult as "WIN" | "LOSS", count };
  }, [trades]);

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
        <Button onClick={loadTrades}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })}
          </p>
        </div>
        {streak.count > 1 && (
          <Badge
            variant={streak.type === "WIN" ? "default" : "destructive"}
            className="text-sm px-3 py-1"
          >
            <FontAwesomeIcon icon={faFire} className="mr-1" />
            {streak.type === "WIN" ? "Thắng" : "Thua"} {streak.count} lệnh liên tiếp
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="P&L Hôm nay"
          value={`$${todayStats.totalPnl.toFixed(2)}`}
          subtitle={`${todayStats.total} lệnh`}
          icon={faDollarSign}
          trend={todayStats.totalPnl >= 0 ? "up" : "down"}
        />
        <StatsCard
          title="P&L Tuần này"
          value={`$${weekStats.totalPnl.toFixed(2)}`}
          subtitle={`${weekStats.wins}W / ${weekStats.losses}L`}
          icon={weekStats.totalPnl >= 0 ? faArrowTrendUp : faArrowTrendDown}
          trend={weekStats.totalPnl >= 0 ? "up" : "down"}
        />
        <StatsCard
          title="Win Rate (Tháng)"
          value={`${monthStats.winRate.toFixed(1)}%`}
          subtitle={`${monthStats.wins}W / ${monthStats.losses}L / ${monthStats.total} lệnh`}
          icon={faPercent}
          trend={monthStats.winRate >= 50 ? "up" : "down"}
        />
        <StatsCard
          title="P&L Tháng"
          value={`$${monthStats.totalPnl.toFixed(2)}`}
          subtitle={`${monthStats.total} lệnh`}
          icon={monthStats.totalPnl >= 0 ? faTrophy : faSkullCrossbones}
          trend={monthStats.totalPnl >= 0 ? "up" : "down"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">P&L theo ngày (Tuần này)</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyDaily.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "P&L"]}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {weeklyDaily.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-16">
                Chưa có dữ liệu tuần này
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equity Curve (Tháng này)</CardTitle>
          </CardHeader>
          <CardContent>
            {equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => format(parseISO(v), "dd/MM")}
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Equity"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-16">
                Chưa có dữ liệu tháng này
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lệnh gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrades.length > 0 ? (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
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
                    <Badge variant="outline">{trade.emotion}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(trade.date), "dd/MM")}
                    </span>
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
                        className={`font-mono text-sm ${
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
            <p className="text-muted-foreground text-center py-8">
              Chưa có lệnh nào. Hãy thêm lệnh đầu tiên!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof faDollarSign;
  trend: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                trend === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div
            className={`p-3 rounded-full ${
              trend === "up" ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            <FontAwesomeIcon
              icon={icon}
              className={`w-5 h-5 ${
                trend === "up" ? "text-green-500" : "text-red-500"
              }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
