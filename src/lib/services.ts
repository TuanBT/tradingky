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
import { Trade, DailyJournal, DropdownLibrary, DEFAULT_LIBRARY, SharedTrade, SharedTradePrivacy } from "./types";
import { uploadToDrive, deleteFromDrive, isGDriveUrl, extractFileId } from "./gdrive";

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

export async function deleteTrade(uid: string, id: string, googleAccessToken: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid, "trades", id);
    // Read trade data to get image URLs before deleting
    const tradeSnap = await getDoc(docRef);
    if (tradeSnap.exists()) {
      const data = tradeSnap.data();
      const imageUrls = [data.chartImageUrl, data.exitChartImageUrl].filter(Boolean);
      await Promise.all(imageUrls.map((url: string) => deleteChartImage(googleAccessToken, url)));
    }
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

export async function uploadChartImage(accessToken: string, file: File): Promise<string> {
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
    const result = await uploadToDrive(accessToken, file);
    return result.url; // "gdrive:{fileId}"
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    throw new Error((error as Error).message || "Không thể upload ảnh. Vui lòng thử lại.");
  }
}

export async function deleteChartImage(accessToken: string, imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  try {
    if (isGDriveUrl(imageUrl)) {
      const fileId = extractFileId(imageUrl);
      await deleteFromDrive(accessToken, fileId);
    }
  } catch (err) {
    console.error("Lỗi xoá ảnh:", imageUrl, err);
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
      try {
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
      } catch {
        return { uid, tradeCount: 0, totalPnl: 0, winRate: 0, lastTradeDate: null } as UserInfo;
      }
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
  const chartImage = "https://s3.tradingview.com/z/ZGl2xWym_mid.webp?v=1770419069";

  const testTrades: Omit<Trade, "id">[] = [
    // 1. Full info, CLOSED WIN, starred, with time
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
    // 2. CLOSED LOSS, full info
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
    // 3. OPEN trade, minimal info
    {
      date: "2026-03-10", pair: "EURUSD", type: "BUY",
      emotion: "🧘 Bình tĩnh", result: "WIN", status: "OPEN",
      note: "[Smoke Test] Mua theo trend D1, chờ pullback xong.",
      entryTime: "10:00", starred: false, createdAt: now - 1800000,
    },
    // 4. CLOSED BREAKEVEN, starred
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
    // 5. OPEN trade with advanced info, starred
    {
      date: "2026-03-10", pair: "SOLUSDT", platform: "Binance", type: "BUY",
      emotion: "🤑 Tham lam", result: "WIN", status: "OPEN",
      stopLoss: "5%", takeProfit: "15%", entryPrice: 142.50, lotSize: 10,
      timeframe: "D1", note: "[Smoke Test] Swing trade, SOL momentum mạnh.",
      entryTime: "08:00", starred: true, createdAt: now - 900000,
    },
    // 6. CLOSED WIN, no image, minimal
    {
      date: "2026-03-07", pair: "USDJPY", type: "BUY",
      emotion: "😤 Nóng vội", result: "WIN", status: "CLOSED", pnl: 45.00,
      timeframe: "M5", closeDate: "2026-03-07", entryTime: "07:15", closeTime: "07:45",
      note: "[Smoke Test] Scalp nhanh.",
      lessonsLearned: "Scalp nhanh căng thẳng, không nên lặp lại.",
      starred: false, createdAt: now - 259200000,
    },
    // 7. CLOSED LOSS, revenge trade
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
    // 8. CLOSED WIN, multi-day swing
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

// ==================== SHARED TRADES ====================

function generateShareToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
}

export async function shareTrade(
  trade: Trade,
  ownerUid: string,
  ownerDisplayName: string,
  ownerPhotoURL: string | undefined,
  privacy: SharedTradePrivacy
): Promise<string> {
  const token = generateShareToken();
  const { id, ...tradeData } = trade;
  const sharedTrade: SharedTrade = {
    trade: stripUndefined(tradeData),
    ownerUid,
    ownerDisplayName,
    ownerPhotoURL,
    privacy,
    createdAt: Date.now(),
  };
  await setDoc(doc(db, "shared_trades", token), stripUndefined(sharedTrade));
  return token;
}

export async function getSharedTrade(token: string): Promise<SharedTrade | null> {
  const snapshot = await getDoc(doc(db, "shared_trades", token));
  if (!snapshot.exists()) return null;
  return snapshot.data() as SharedTrade;
}
