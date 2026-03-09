"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Trade } from "@/lib/types";
import { getTrades } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faSkullCrossbones,
  faChartPie,
  faBrain,
} from "@fortawesome/free-solid-svg-icons";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  subMonths,
  eachWeekOfInterval,
  eachMonthOfInterval,
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
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function StatisticsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

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

  const filteredTrades = useMemo(() => {
    if (period === "all") return trades;
    const now = new Date();

    if (period === "today") {
      const today = format(startOfDay(now), "yyyy-MM-dd");
      return trades.filter((t) => t.date === today);
    }
    if (period === "week") {
      const start = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const end = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      return trades.filter((t) => t.date >= start && t.date <= end);
    }
    if (period === "custom") {
      return trades.filter((t) => {
        if (customFrom && t.date < customFrom) return false;
        if (customTo && t.date > customTo) return false;
        return true;
      });
    }

    const months = period === "month" ? 1 : 3;
    const start = format(startOfMonth(subMonths(now, months - 1)), "yyyy-MM-dd");
    return trades.filter((t) => t.date >= start);
  }, [trades, period, customFrom, customTo]);

  // Basic stats
  const stats = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.result === "WIN");
    const losses = filteredTrades.filter((t) => t.result === "LOSS");
    const totalPnl = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = filteredTrades.length > 0 ? (wins.length / filteredTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Max drawdown
    let peak = 0;
    let maxDD = 0;
    let cumPnl = 0;
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    for (const t of sorted) {
      cumPnl += t.pnl || 0;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDD) maxDD = dd;
    }

    // Best/worst trade
    const best = filteredTrades.reduce((b, t) => ((t.pnl || 0) > (b.pnl || 0) ? t : b), filteredTrades[0]);
    const worst = filteredTrades.reduce((w, t) => ((t.pnl || 0) < (w.pnl || 0) ? t : w), filteredTrades[0]);

    return {
      total: filteredTrades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: filteredTrades.filter((t) => t.result === "BREAKEVEN").length,
      totalPnl,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      avgRR,
      maxDrawdown: maxDD,
      best,
      worst,
    };
  }, [filteredTrades]);

  // Win/Loss pie chart
  const resultPieData = useMemo(
    () => [
      { name: "Thắng", value: stats.wins, fill: "#22c55e" },
      { name: "Thua", value: stats.losses, fill: "#ef4444" },
      { name: "Hoà", value: stats.breakeven, fill: "#eab308" },
    ],
    [stats]
  );

  // P&L by pair
  const pnlByPair = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number }>();
    for (const t of filteredTrades) {
      const curr = map.get(t.pair) || { pnl: 0, count: 0, wins: 0 };
      curr.pnl += t.pnl || 0;
      curr.count++;
      if (t.result === "WIN") curr.wins++;
      map.set(t.pair, curr);
    }
    return Array.from(map.entries())
      .map(([pair, data]) => ({ pair, ...data, winRate: (data.wins / data.count) * 100 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Emotion analysis
  const emotionStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      const curr = map.get(t.emotion) || { total: 0, wins: 0, pnl: 0 };
      curr.total++;
      if (t.result === "WIN") curr.wins++;
      curr.pnl += t.pnl || 0;
      map.set(t.emotion, curr);
    }
    return Array.from(map.entries())
      .map(([emotion, data]) => ({
        emotion,
        ...data,
        winRate: (data.wins / data.total) * 100,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTrades]);

  // Weekly P&L
  const weeklyPnl = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    const start = parseISO(sorted[0].date);
    const end = parseISO(sorted[sorted.length - 1].date);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekTrades = filteredTrades.filter((t) => {
        const d = parseISO(t.date);
        return d >= weekStart && d <= weekEnd;
      });
      const pnl = weekTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      return {
        week: format(weekStart, "dd/MM"),
        pnl,
        trades: weekTrades.length,
      };
    });
  }, [filteredTrades]);

  // Drawdown chart
  const drawdownData = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    let peak = 0;
    let cumPnl = 0;
    return sorted.map((t) => {
      cumPnl += t.pnl || 0;
      if (cumPnl > peak) peak = cumPnl;
      return {
        date: t.date,
        equity: cumPnl,
        drawdown: -(peak - cumPnl),
      };
    });
  }, [filteredTrades]);

  // Platform stats
  const platformStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      const curr = map.get(t.platform) || { total: 0, wins: 0, pnl: 0 };
      curr.total++;
      if (t.result === "WIN") curr.wins++;
      curr.pnl += t.pnl || 0;
      map.set(t.platform, curr);
    }
    return Array.from(map.entries()).map(([platform, data]) => ({
      platform,
      ...data,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    }));
  }, [filteredTrades]);

  // Streak analysis
  const streakStats = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => a.date.localeCompare(b.date));
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    for (const t of sorted) {
      if (t.result === "WIN") {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if (t.result === "LOSS") {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }
    }
    return { maxWinStreak, maxLossStreak, currentWinStreak, currentLossStreak };
  }, [filteredTrades]);

  // Win rate by timeframe
  const timeframeStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      const tf = t.timeframe || "N/A";
      const curr = map.get(tf) || { total: 0, wins: 0, pnl: 0 };
      curr.total++;
      if (t.result === "WIN") curr.wins++;
      curr.pnl += t.pnl || 0;
      map.set(tf, curr);
    }
    return Array.from(map.entries())
      .map(([timeframe, data]) => ({
        timeframe,
        ...data,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTrades]);

  // Strategy stats
  const strategyStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      const s = t.strategy || "N/A";
      const curr = map.get(s) || { total: 0, wins: 0, pnl: 0 };
      curr.total++;
      if (t.result === "WIN") curr.wins++;
      curr.pnl += t.pnl || 0;
      map.set(s, curr);
    }
    return Array.from(map.entries())
      .map(([strategy, data]) => ({
        strategy,
        ...data,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTrades]);

  // Monthly performance comparison (uses ALL trades, not filtered)
  const monthlyComparison = useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    const start = parseISO(sorted[0].date);
    const end = parseISO(sorted[sorted.length - 1].date);
    const months = eachMonthOfInterval({ start, end });

    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const monthTrades = trades.filter((t) => {
        const d = parseISO(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const pnl = monthTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      const wins = monthTrades.filter((t) => t.result === "WIN").length;
      const winRate = monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0;
      return {
        month: format(monthStart, "MM/yyyy"),
        monthShort: format(monthStart, "MMM", { locale: vi }),
        pnl,
        trades: monthTrades.length,
        wins,
        winRate,
      };
    });
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Thống kê</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => v && setPeriod(v)}>
            <SelectTrigger className="w-44">
              <span>{{ today: "Hôm nay", week: "Tuần này", month: "Tháng này", "3months": "3 tháng", all: "Tất cả", custom: "Tuỳ chọn..." }[period] || period}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="3months">3 tháng</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="custom">Tuỳ chọn...</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Từ</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Đến</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Chưa có dữ liệu để thống kê
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard label="Tổng lệnh" value={stats.total.toString()} />
            <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? "green" : "red"} />
            <StatCard label="Tổng P&L" value={`$${stats.totalPnl.toFixed(2)}`} color={stats.totalPnl >= 0 ? "green" : "red"} />
            <StatCard label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} color={stats.profitFactor >= 1 ? "green" : "red"} />
            <StatCard label="Avg Win" value={`$${stats.avgWin.toFixed(2)}`} color="green" />
            <StatCard label="Max Drawdown" value={`-$${stats.maxDrawdown.toFixed(2)}`} color="red" />
          </div>

          {/* Streak + R:R Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="🔥 Win Streak (max)" value={streakStats.maxWinStreak.toString()} color="green" />
            <StatCard label="❄️ Loss Streak (max)" value={streakStats.maxLossStreak.toString()} color="red" />
            <StatCard label="Avg R:R" value={stats.avgRR.toFixed(2)} color={stats.avgRR >= 1 ? "green" : "red"} />
            <StatCard label="Avg Loss" value={`$${stats.avgLoss.toFixed(2)}`} color="red" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faChartPie} className="mr-2" />
                  Kết quả lệnh
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={resultPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {resultPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">P&L theo tuần</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyPnl}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value, name) => [
                        name === "pnl" ? `$${Number(value).toFixed(2)}` : value,
                        name === "pnl" ? "P&L" : "Lệnh",
                      ]}
                    />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {weeklyPnl.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Drawdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Equity & Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={drawdownData}>
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
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      name === "equity" ? "Equity" : "Drawdown",
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Equity" />
                  <Line type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} dot={false} name="Drawdown" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Performance Comparison */}
          {monthlyComparison.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">So sánh Performance theo tháng</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="pnl" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="wr" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value, name) => {
                        if (name === "P&L") return [`$${Number(value).toFixed(2)}`, name];
                        if (name === "Win Rate") return [`${Number(value).toFixed(1)}%`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="pnl" dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {monthlyComparison.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                    <Line yAxisId="wr" type="monotone" dataKey="winRate" name="Win Rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {monthlyComparison.map((m) => (
                    <div key={m.month} className="text-center p-2 rounded bg-muted/50">
                      <div className="font-medium">{m.month}</div>
                      <div className={`font-mono font-bold ${m.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {m.pnl >= 0 ? "+" : ""}${m.pnl.toFixed(0)}
                      </div>
                      <div className="text-muted-foreground">{m.trades} lệnh · {m.winRate.toFixed(0)}% WR</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* P&L by Pair */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">P&L theo cặp tiền</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pnlByPair.map((item) => (
                    <div
                      key={item.pair}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <span className="font-semibold">{item.pair}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({item.count} lệnh, WR: {item.winRate.toFixed(0)}%)
                        </span>
                      </div>
                      <span
                        className={`font-mono font-semibold ${
                          item.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emotion Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faBrain} className="mr-2" />
                  Phân tích tâm lý
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emotionStats.map((item) => (
                    <div
                      key={item.emotion}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.emotion}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.total} lệnh
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          WR:{" "}
                          <span
                            className={
                              item.winRate >= 50
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {item.winRate.toFixed(0)}%
                          </span>
                        </span>
                        <span
                          className={`font-mono text-sm ${
                            item.pnl >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Stats + Best/Worst */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {platformStats.map((p) => (
              <Card key={p.platform}>
                <CardHeader>
                  <CardTitle className="text-base">{p.platform}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lệnh</span>
                      <span>{p.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className={p.winRate >= 50 ? "text-green-500" : "text-red-500"}>
                        {p.winRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={`font-mono ${p.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {stats.best && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-500">
                    <FontAwesomeIcon icon={faTrophy} className="mr-2" />
                    Lệnh tốt nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cặp</span>
                      <span className="font-semibold">{stats.best.pair}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày</span>
                      <span>{stats.best.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className="font-mono text-green-500">
                        +${(stats.best.pnl || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.worst && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-500">
                    <FontAwesomeIcon icon={faSkullCrossbones} className="mr-2" />
                    Lệnh tệ nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cặp</span>
                      <span className="font-semibold">{stats.worst.pair}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngày</span>
                      <span>{stats.worst.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className="font-mono text-red-500">
                        ${(stats.worst.pnl || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timeframe & Strategy Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">⏱️ Theo Timeframe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeframeStats.map((tf) => (
                    <div
                      key={tf.timeframe}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium w-16">{tf.timeframe}</span>
                      <div className="flex-1 mx-3">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tf.winRate >= 50 ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(tf.winRate, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-muted-foreground">
                        {tf.winRate.toFixed(0)}% ({tf.total})
                      </span>
                      <span
                        className={`w-24 text-right font-mono ${
                          tf.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {tf.pnl >= 0 ? "+" : ""}${tf.pnl.toFixed(0)}
                      </span>
                    </div>
                  ))}
                  {timeframeStats.length === 0 && (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu timeframe</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">♟️ Theo Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategyStats.map((s) => (
                    <div
                      key={s.strategy}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium w-24 truncate">{s.strategy}</span>
                      <div className="flex-1 mx-3">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.winRate >= 50 ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(s.winRate, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-muted-foreground">
                        {s.winRate.toFixed(0)}% ({s.total})
                      </span>
                      <span
                        className={`w-24 text-right font-mono ${
                          s.pnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}
                      </span>
                    </div>
                  ))}
                  {strategyStats.length === 0 && (
                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu strategy</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-bold mt-1 ${
            color === "green"
              ? "text-green-500"
              : color === "red"
              ? "text-red-500"
              : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
