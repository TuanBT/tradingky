import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, increment, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { Trade, UserRole, DEFAULT_LIBRARY, SharedTrade, TradeReport, TradeComment } from "../types";
import { stripUndefined, ADMIN_UIDS, userLibraryDocRef } from "./helpers";

export interface UserInfo {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role: UserRole;
  banned: boolean;
  tradeCount: number;
  totalPnl: number;
  winRate: number;
  lastTradeDate: string | null;
}

export async function getRegisteredUsers(): Promise<UserInfo[]> {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));

    return usersSnapshot.docs.map((userDoc) => {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const role: UserRole = ADMIN_UIDS.includes(uid) ? "admin" : (userData.role || "user");
      const banned = userData.banned || false;
      const stats = userData.tradeStats || {};
      return {
        uid,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        role,
        banned,
        tradeCount: stats.tradeCount || 0,
        totalPnl: stats.totalPnl || 0,
        winRate: stats.winRate || 0,
        lastTradeDate: stats.lastTradeDate || null,
      } as UserInfo;
    });
  } catch (error) {
    console.error("Lỗi tải danh sách users:", error);
    throw new Error("Không thể tải danh sách users.");
  }
}

export async function resetUserTrades(uid: string): Promise<number> {
  try {
    const tradesSnapshot = await getDocs(collection(db, "users", uid, "trades"));
    const batch = writeBatch(db);
    tradesSnapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return tradesSnapshot.size;
  } catch (error) {
    console.error("Lỗi reset trades:", error);
    throw new Error("Không thể reset trades.");
  }
}

export async function resetUserJournals(uid: string): Promise<number> {
  try {
    const journalSnapshot = await getDocs(collection(db, "users", uid, "dailyJournal"));
    const batch = writeBatch(db);
    journalSnapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return journalSnapshot.size;
  } catch (error) {
    console.error("Lỗi reset journals:", error);
    throw new Error("Không thể reset journals.");
  }
}

export async function resetUserAll(uid: string): Promise<{ trades: number; journals: number }> {
  const trades = await resetUserTrades(uid);
  const journals = await resetUserJournals(uid);
  await setDoc(userLibraryDocRef(uid), DEFAULT_LIBRARY);
  return { trades, journals };
}

export async function createSmokeTestTrades(uid: string): Promise<number> {
  const now = Date.now();
  const chartImage = "https://s3.tradingview.com/z/ZGl2xWym_mid.webp?v=1770419069";

  const testTrades: Omit<Trade, "id">[] = [
    {
      date: "2026-03-10", pair: "XAUUSD", platform: "Exness", type: "BUY",
      emotion: "😎 Tự tin", result: "WIN", status: "CLOSED", pnl: 125.50,
      stopLoss: "20 pips", takeProfit: "60 pips", chartImageUrl: chartImage,
      note: "[Smoke Test] Breakout mạnh qua resistance 2045, volume tăng đột biến.",
      entryPrice: 2045.30, lotSize: 0.5, timeframe: "H1",
      closeDate: "2026-03-10", entryTime: "09:30", closeTime: "14:15",
      exitReason: "Chạm TP đặt trước, đạt 3R target",
      lessonsLearned: "Breakout + volume = xác suất cao.",
      starred: true, createdAt: now - 3600000,
    },
    {
      date: "2026-03-09", pair: "BTCUSDT", platform: "Binance", type: "SELL",
      emotion: "😱 FOMO", result: "LOSS", status: "CLOSED", pnl: -87.25,
      stopLoss: "500 points", takeProfit: "1500 points", chartImageUrl: chartImage,
      note: "[Smoke Test] Short theo divergence nhưng trend vẫn mạnh.",
      entryPrice: 68500, lotSize: 0.01, timeframe: "H4",
      closeDate: "2026-03-09", entryTime: "22:10", closeTime: "08:45",
      exitReason: "SL hit - không chờ confirmation",
      lessonsLearned: "Không nên FOMO vào khi giá đã chạy xa.",
      starred: false, createdAt: now - 86400000,
    },
    {
      date: "2026-03-10", pair: "EURUSD", type: "BUY",
      emotion: "🧘 Bình tĩnh", result: "WIN", status: "OPEN",
      note: "[Smoke Test] Mua theo trend D1, chờ pullback xong.",
      entryTime: "10:00", starred: false, createdAt: now - 1800000,
    },
    {
      date: "2026-03-08", pair: "GBPUSD", platform: "Exness", type: "SELL",
      emotion: "🤔 Không chắc chắn", result: "BREAKEVEN", status: "CLOSED", pnl: 0,
      stopLoss: "30 pips", takeProfit: "90 pips", chartImageUrl: chartImage,
      entryPrice: 1.2650, lotSize: 0.3, timeframe: "M15",
      closeDate: "2026-03-08", entryTime: "15:30", closeTime: "16:45",
      exitReason: "Dời SL về break even, bị hit",
      note: "[Smoke Test] BE - không lời không lỗ.",
      starred: true, createdAt: now - 172800000,
    },
    {
      date: "2026-03-10", pair: "SOLUSDT", platform: "Binance", type: "BUY",
      emotion: "🤑 Tham lam", result: "WIN", status: "OPEN",
      stopLoss: "5%", takeProfit: "15%", entryPrice: 142.50, lotSize: 10,
      timeframe: "D1", note: "[Smoke Test] Swing trade, SOL momentum mạnh.",
      entryTime: "08:00", starred: true, createdAt: now - 900000,
    },
    {
      date: "2026-03-07", pair: "USDJPY", type: "BUY",
      emotion: "😤 Nóng vội", result: "WIN", status: "CLOSED", pnl: 45.00,
      timeframe: "M5", closeDate: "2026-03-07", entryTime: "07:15", closeTime: "07:45",
      note: "[Smoke Test] Scalp nhanh.",
      lessonsLearned: "Scalp nhanh căng thẳng, không nên lặp lại.",
      starred: false, createdAt: now - 259200000,
    },
    {
      date: "2026-03-09", pair: "XAUUSD", platform: "Exness", type: "SELL",
      emotion: "😡 Revenge trade", result: "LOSS", status: "CLOSED", pnl: -200.00,
      stopLoss: "50 pips", chartImageUrl: chartImage,
      note: "[Smoke Test] Revenge trade, vào lệnh không có setup.",
      entryPrice: 2055.00, lotSize: 1.0, timeframe: "M15",
      closeDate: "2026-03-09", entryTime: "16:00", closeTime: "16:30",
      exitReason: "SL hit ngay lập tức",
      lessonsLearned: "Revenge trade = tự huỷ tài khoản.",
      starred: false, createdAt: now - 80000000,
    },
    {
      date: "2026-03-06", pair: "ETHUSDT", type: "BUY",
      emotion: "😎 Tự tin", result: "WIN", status: "CLOSED", pnl: 310.75,
      takeProfit: "10%", entryPrice: 3200, lotSize: 0.5, timeframe: "H4",
      closeDate: "2026-03-08", entryTime: "20:00", closeTime: "10:30",
      note: "[Smoke Test] Swing trade 2 ngày, ETH breakout channel.",
      exitReason: "Đạt target 10%",
      lessonsLearned: "Swing trade cần kiên nhẫn, RR rất tốt.",
      starred: false, createdAt: now - 345600000,
    },
  ];

  try {
    for (const trade of testTrades) {
      await addDoc(collection(db, "users", uid, "trades"), stripUndefined(trade));
    }
    return testTrades.length;
  } catch (error) {
    console.error("Lỗi tạo smoke test trades:", error);
    throw new Error("Không thể tạo test trades.");
  }
}

// ==================== ADMIN: REPORTS MANAGEMENT ====================

export async function getAllReports(): Promise<TradeReport[]> {
  const sharedTradesSnap = await getDocs(
    query(collection(db, "shared_trades"), where("reportCount", ">", 0))
  );
  const allReports: TradeReport[] = [];
  const docs = sharedTradesSnap.docs;
  for (let i = 0; i < docs.length; i += 10) {
    const chunk = docs.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map(async (tradeDoc) => {
        const reportsSnap = await getDocs(collection(db, "shared_trades", tradeDoc.id, "reports"));
        const tradeData = tradeDoc.data() as SharedTrade;
        return reportsSnap.docs.map((r) => ({
          id: r.id,
          token: tradeDoc.id,
          userId: r.data().userId,
          reason: r.data().reason,
          createdAt: r.data().createdAt || 0,
          tradeOwnerName: tradeData.ownerDisplayName,
          tradePair: tradeData.trade.pair,
        }));
      })
    );
    allReports.push(...results.flat());
  }
  return allReports.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteReport(token: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, "shared_trades", token, "reports", userId));
  await updateDoc(doc(db, "shared_trades", token), { reportCount: increment(-1) });
}
