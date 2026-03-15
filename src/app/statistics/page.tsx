"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Trade } from "@/lib/types";
import { getTrades } from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useStatisticsData } from "@/hooks/useStatisticsData";
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
  faListOl,
  faPercent,
  faDollarSign,
  faScaleBalanced,
  faArrowUp,
  faArrowDown,
  faFire,
  faSnowflake,
  faExchange,
  faCoins,
  faClock,
  faChartBar,
  faCalendarAlt,
  faBuildingColumns,
} from "@fortawesome/free-solid-svg-icons";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfDay,
  subMonths,
} from "date-fns";
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

  const {
    stats,
    resultPieData,
    pnlByPair,
    emotionStats,
    weeklyPnl,
    drawdownData,
    platformStats,
    streakStats,
    timeframeStats,
    monthlyComparison,
  } = useStatisticsData(filteredTrades, trades);

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
          <CardContent className="py-16 text-center">
            <FontAwesomeIcon icon={faChartPie} className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có dữ liệu để thống kê</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Thử chọn khoảng thời gian khác hoặc thêm lệnh mới
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatCard label="Tổng lệnh" value={stats.total.toString()} icon={faListOl} />
            <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? "green" : "red"} icon={faPercent} />
            <StatCard label="Tổng P&L" value={`$${stats.totalPnl.toFixed(2)}`} color={stats.totalPnl >= 0 ? "green" : "red"} icon={faDollarSign} />
            <StatCard label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)} color={stats.profitFactor >= 1 ? "green" : "red"} icon={faScaleBalanced} />
            <StatCard label="Avg Win" value={`$${stats.avgWin.toFixed(2)}`} color="green" icon={faArrowUp} />
            <StatCard label="Max Drawdown" value={`-$${stats.maxDrawdown.toFixed(2)}`} color="red" icon={faArrowDown} />
          </div>

          {/* Streak + R:R Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Win Streak (max)" value={streakStats.maxWinStreak.toString()} color="green" icon={faFire} />
            <StatCard label="Loss Streak (max)" value={streakStats.maxLossStreak.toString()} color="red" icon={faSnowflake} />
            <StatCard label="Avg R:R" value={stats.avgRR.toFixed(2)} color={stats.avgRR >= 1 ? "green" : "red"} icon={faExchange} />
            <StatCard label="Avg Loss" value={`$${stats.avgLoss.toFixed(2)}`} color="red" icon={faCoins} />
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
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faChartBar} className="mr-2 text-muted-foreground" />
                  P&L theo tuần</CardTitle>
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
              <CardTitle className="text-base">
                <FontAwesomeIcon icon={faChartBar} className="mr-2 text-muted-foreground" />
                Equity & Drawdown</CardTitle>
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
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-muted-foreground" />
                  So sánh Performance theo tháng</CardTitle>
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
                        ${m.pnl.toFixed(2)}
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
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faCoins} className="mr-2 text-muted-foreground" />
                  P&L theo cặp tiền</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                  <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faBuildingColumns} className="mr-2 text-muted-foreground" />
                  {p.platform}</CardTitle>
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

          {/* Timeframe Analysis */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <FontAwesomeIcon icon={faClock} className="mr-2 text-muted-foreground" />
                  Theo Timeframe
                </CardTitle>
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
  icon,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
  icon?: typeof faTrophy;
}) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        {icon && <FontAwesomeIcon icon={icon} className={`h-4 w-4 mb-1.5 ${color === "green" ? "text-green-500/60" : color === "red" ? "text-red-500/60" : "text-muted-foreground/50"}`} />}
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
