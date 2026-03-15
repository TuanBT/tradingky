import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { Trade } from "../types";
import { stripUndefined, userTradesCollection } from "./helpers";

export async function getTrades(uid: string): Promise<Trade[]> {
  try {
    const q = query(userTradesCollection(uid), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const trades = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
    return trades.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  } catch (error) {
    console.error("Lỗi tải danh sách lệnh:", error);
    throw new Error("Không thể tải danh sách lệnh. Vui lòng thử lại.");
  }
}

export async function getTradesByDateRange(uid: string, startDate: string, endDate: string): Promise<Trade[]> {
  try {
    const q = query(
      userTradesCollection(uid),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    const trades = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
    return trades.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  } catch (error) {
    console.error("Lỗi tải lệnh theo ngày:", error);
    throw new Error("Không thể tải lệnh theo khoảng ngày.");
  }
}

export async function addTrade(uid: string, trade: Omit<Trade, "id">): Promise<string> {
  try {
    const docRef = await addDoc(userTradesCollection(uid), stripUndefined(trade));
    updateUserTradeStats(uid).catch(() => {});
    return docRef.id;
  } catch (error) {
    console.error("Lỗi thêm lệnh:", error);
    throw new Error("Không thể lưu lệnh. Vui lòng thử lại.");
  }
}

export async function updateTrade(uid: string, id: string, trade: Partial<Trade>): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "trades", id);
    await updateDoc(docRef, stripUndefined(trade));
    if (trade.result !== undefined || trade.pnl !== undefined || trade.status !== undefined) {
      updateUserTradeStats(uid).catch(() => {});
    }
  } catch (error) {
    console.error("Lỗi cập nhật lệnh:", error);
    throw new Error("Không thể cập nhật lệnh. Vui lòng thử lại.");
  }
}

export async function deleteTrade(uid: string, id: string, googleAccessToken?: string): Promise<void> {
  // Import dynamically to avoid circular dependency
  const { deleteChartImage } = await import("./fileUpload");
  try {
    const docRef = doc(db, "users", uid, "trades", id);
    const tradeSnap = await getDoc(docRef);
    if (tradeSnap.exists()) {
      const data = tradeSnap.data();
      const imageUrls = [
        ...(data.chartImages || []),
        data.chartImageUrl,
        data.exitChartImageUrl,
      ].filter(Boolean);
      const uniqueUrls = [...new Set(imageUrls)];
      if (googleAccessToken && uniqueUrls.length > 0) {
        await Promise.all(uniqueUrls.map((url: string) => deleteChartImage(googleAccessToken, url))).catch((err) => {
          console.warn("Không thể xoá ảnh trên Drive, tiếp tục xoá lệnh:", err);
        });
      }
    }
    await deleteDoc(docRef);
    updateUserTradeStats(uid).catch(() => {});
  } catch (error) {
    console.error("Lỗi xoá lệnh:", error);
    throw new Error("Không thể xoá lệnh. Vui lòng thử lại.");
  }
}

// Recalculate and store aggregate trade stats on user document
export async function updateUserTradeStats(uid: string): Promise<void> {
  try {
    const tradesSnapshot = await getDocs(
      query(collection(db, "users", uid, "trades"), orderBy("date", "desc"))
    );
    const trades = tradesSnapshot.docs.map((d) => d.data() as Omit<Trade, "id">);
    const tradeCount = trades.length;
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const activeTrades = trades.filter((t) => t.result !== "CANCELLED");
    const wins = activeTrades.filter((t) => t.result === "WIN").length;
    const winRate = activeTrades.length > 0 ? (wins / activeTrades.length) * 100 : 0;
    const lastTradeDate = trades.length > 0 ? trades[0].date : null;
    await updateDoc(doc(db, "users", uid), stripUndefined({
      tradeStats: { tradeCount, totalPnl, winRate, lastTradeDate },
    }));
  } catch {
    // Non-critical — don't block the app
  }
}
