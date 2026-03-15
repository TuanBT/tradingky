import { useMemo } from "react";
import { Trade } from "@/lib/types";
import { parseISO, format, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { vi } from "date-fns/locale";

export function useStatisticsData(filteredTrades: Trade[], allTrades: Trade[]) {
  const stats = useMemo(() => {
    const wins = filteredTrades.filter((t) => t.result === "WIN");
    const losses = filteredTrades.filter((t) => t.result === "LOSS");
    const totalPnl = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const activeTrades = filteredTrades.filter((t) => t.result !== "CANCELLED");
    const winRate = activeTrades.length > 0 ? (wins.length / activeTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

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

    const best = filteredTrades.reduce((b, t) => ((t.pnl || 0) > (b.pnl || 0) ? t : b), filteredTrades[0]);
    const worst = filteredTrades.reduce((w, t) => ((t.pnl || 0) < (w.pnl || 0) ? t : w), filteredTrades[0]);

    return {
      total: filteredTrades.length,
      wins: wins.length,
      losses: losses.length,
      breakeven: filteredTrades.filter((t) => t.result === "BREAKEVEN").length,
      cancelled: filteredTrades.filter((t) => t.result === "CANCELLED").length,
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

  const resultPieData = useMemo(
    () => [
      { name: "Thắng", value: stats.wins, fill: "#22c55e" },
      { name: "Thua", value: stats.losses, fill: "#ef4444" },
      { name: "Hoà", value: stats.breakeven, fill: "#eab308" },
      { name: "Hủy", value: stats.cancelled, fill: "#6b7280" },
    ],
    [stats]
  );

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

  const platformStats = useMemo(() => {
    const map = new Map<string, { total: number; wins: number; pnl: number }>();
    for (const t of filteredTrades) {
      const platform = t.platform || "Không rõ";
      const curr = map.get(platform) || { total: 0, wins: 0, pnl: 0 };
      curr.total++;
      if (t.result === "WIN") curr.wins++;
      curr.pnl += t.pnl || 0;
      map.set(platform, curr);
    }
    return Array.from(map.entries()).map(([platform, data]) => ({
      platform,
      ...data,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    }));
  }, [filteredTrades]);

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

  const monthlyComparison = useMemo(() => {
    if (allTrades.length === 0) return [];
    const sorted = [...allTrades].sort((a, b) => a.date.localeCompare(b.date));
    const start = parseISO(sorted[0].date);
    const end = parseISO(sorted[sorted.length - 1].date);
    const months = eachMonthOfInterval({ start, end });

    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const monthTrades = allTrades.filter((t) => {
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
  }, [allTrades]);

  return {
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
  };
}
