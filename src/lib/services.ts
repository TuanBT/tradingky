import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { Trade, DailyJournal, DropdownLibrary, DEFAULT_LIBRARY } from "./types";

// Strip undefined values — Firestore rejects undefined fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// Admin UID list
export const ADMIN_UIDS = ["KffhYOBycQggcxA6ROXbed43Nav1"];

export function isAdmin(uid: string): boolean {
  return ADMIN_UIDS.includes(uid);
}

// Helper to get user-scoped collection refs
function userTradesCollection(uid: string) {
  return collection(db, "users", uid, "trades");
}

function userJournalCollection(uid: string) {
  return collection(db, "users", uid, "dailyJournal");
}

function userLibraryDocRef(uid: string) {
  return doc(db, "users", uid, "settings", "dropdownLibrary");
}

// Ensure user document exists for admin listing
export async function ensureUserDoc(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, "users", uid);
    const snapshot = await getDoc(userDocRef);
    if (!snapshot.exists()) {
      await setDoc(userDocRef, { createdAt: Date.now() });
    }
  } catch {
    // Non-critical — don't block the app
  }
}

// ==================== TRADES ====================

export async function getTrades(uid: string): Promise<Trade[]> {
  try {
    const q = query(userTradesCollection(uid), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    const trades = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
    // Secondary sort by createdAt for same-day trades (millisecond precision)
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
  } catch (error) {
    console.error("Lỗi cập nhật lệnh:", error);
    throw new Error("Không thể cập nhật lệnh. Vui lòng thử lại.");
  }
}

export async function deleteTrade(uid: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "trades", id);
    // Delete the entire trade image folder on VPS (uid/tradeId/)
    await deleteTradeImageFolder(uid, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Lỗi xoá lệnh:", error);
    throw new Error("Không thể xoá lệnh. Vui lòng thử lại.");
  }
}

// ==================== DAILY JOURNAL ====================

export async function getJournals(uid: string): Promise<DailyJournal[]> {
  try {
    const q = query(userJournalCollection(uid), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DailyJournal));
  } catch (error) {
    console.error("Lỗi tải nhật ký:", error);
    throw new Error("Không thể tải nhật ký. Vui lòng thử lại.");
  }
}

export async function addJournal(uid: string, journal: Omit<DailyJournal, "id">): Promise<string> {
  try {
    const docRef = await addDoc(userJournalCollection(uid), stripUndefined(journal));
    return docRef.id;
  } catch (error) {
    console.error("Lỗi thêm nhật ký:", error);
    throw new Error("Không thể lưu nhật ký.");
  }
}

export async function updateJournal(uid: string, id: string, journal: Partial<DailyJournal>): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "dailyJournal", id);
    await updateDoc(docRef, stripUndefined(journal));
  } catch (error) {
    console.error("Lỗi cập nhật nhật ký:", error);
    throw new Error("Không thể cập nhật nhật ký.");
  }
}

export async function deleteJournal(uid: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "dailyJournal", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Lỗi xoá nhật ký:", error);
    throw new Error("Không thể xoá nhật ký.");
  }
}

// ==================== DROPDOWN LIBRARY ====================

export async function getLibrary(uid: string): Promise<DropdownLibrary> {
  try {
    const snapshot = await getDoc(userLibraryDocRef(uid));
    if (snapshot.exists()) {
      return snapshot.data() as DropdownLibrary;
    }
    await setDoc(userLibraryDocRef(uid), DEFAULT_LIBRARY);
    return DEFAULT_LIBRARY;
  } catch (error) {
    console.error("Lỗi tải dropdown library:", error);
    return DEFAULT_LIBRARY;
  }
}

export async function updateLibrary(uid: string, library: DropdownLibrary): Promise<void> {
  try {
    await setDoc(userLibraryDocRef(uid), library);
  } catch (error) {
    console.error("Lỗi cập nhật dropdown library:", error);
    throw new Error("Không thể lưu cài đặt dropdown.");
  }
}

// ==================== FILE UPLOAD ====================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

export async function uploadChartImage(uid: string, file: File, tradeId?: string): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("File quá lớn (tối đa 5MB).");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ file ảnh (JPG, PNG, WebP, GIF).");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error("Đuôi file không hợp lệ.");
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    const url = new URL(`/api/upload/${encodeURIComponent(uid)}`, window.location.origin);
    if (tradeId) {
      url.searchParams.set("tradeId", tradeId);
    }
    const res = await fetch(url.toString(), {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload thất bại" }));
      throw new Error(err.error || "Upload thất bại");
    }
    const data = await res.json();
    return data.url;
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    throw new Error((error as Error).message || "Không thể upload ảnh. Vui lòng thử lại.");
  }
}

export async function deleteChartImage(imageUrl: string): Promise<void> {
  // Only delete images hosted on our proxy (starts with /api/files/)
  if (!imageUrl || !imageUrl.startsWith("/api/files/")) return;
  try {
    const res = await fetch(imageUrl, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("Xoá ảnh thất bại:", imageUrl, res.status, data);
    }
  } catch (err) {
    // Non-critical — don't block the user
    console.error("Lỗi xoá ảnh:", imageUrl, err);
  }
}

// Delete entire trade image folder on VPS: /api/files/uid/tradeId (directory)
export async function deleteTradeImageFolder(uid: string, tradeId: string): Promise<void> {
  if (!uid || !tradeId) return;
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(uid)}/${encodeURIComponent(tradeId)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => ({}));
      console.warn("Xoá folder ảnh thất bại:", uid, tradeId, res.status, data);
    }
  } catch (err) {
    console.error("Lỗi xoá folder ảnh:", uid, tradeId, err);
  }
}

// ==================== ADMIN ====================

export interface UserInfo {
  uid: string;
  tradeCount: number;
  totalPnl: number;
  winRate: number;
  lastTradeDate: string | null;
}

export async function getRegisteredUsers(): Promise<UserInfo[]> {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));

    // Parallel fetch instead of sequential N+1
    const promises = usersSnapshot.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const tradesSnapshot = await getDocs(
        query(collection(db, "users", uid, "trades"), orderBy("date", "desc"))
      );
      const trades = tradesSnapshot.docs.map((d) => d.data() as Omit<Trade, "id">);
      const tradeCount = trades.length;
      const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = trades.filter((t) => t.result === "WIN").length;
      const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;
      const lastTradeDate = trades.length > 0 ? trades[0].date : null;
      return { uid, tradeCount, totalPnl, winRate, lastTradeDate } as UserInfo;
    });

    return Promise.all(promises);
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
  const today = new Date();
  const testTrades: Omit<Trade, "id">[] = [];

  const pairs = ["XAUUSD", "BTCUSDT", "EURUSD"];
  const platforms = ["Exness", "Binance"];
  const emotions = ["😎 Tự tin", "🧘 Bình tĩnh", "😱 FOMO"];
  const results: ("WIN" | "LOSS" | "BREAKEVEN")[] = ["WIN", "LOSS", "BREAKEVEN"];
  const types: ("BUY" | "SELL")[] = ["BUY", "SELL"];

  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const result = results[i % 3];
    const pnl = result === "WIN" ? Math.round(Math.random() * 200 + 10) : result === "LOSS" ? -Math.round(Math.random() * 100 + 5) : 0;

    testTrades.push({
      date: dateStr,
      pair: pairs[i % pairs.length],
      platform: platforms[i % platforms.length],
      type: types[i % types.length],
      emotion: emotions[i % emotions.length],
      result,
      pnl,
      status: "CLOSED" as const,
      note: `[Smoke Test] Lệnh test #${i + 1} - tạo tự động`,
      createdAt: now - i * 60000,
    });
  }

  try {
    for (const trade of testTrades) {
      await addDoc(collection(db, "users", uid, "trades"), trade);
    }
    return testTrades.length;
  } catch (error) {
    console.error("Lỗi tạo smoke test trades:", error);
    throw new Error("Không thể tạo test trades.");
  }
}
