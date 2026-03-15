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
  limit,
  startAfter,
  increment,
  DocumentSnapshot,
  runTransaction,
  QueryConstraint,
} from "firebase/firestore";
import { Trade, DailyJournal, DropdownLibrary, DEFAULT_LIBRARY, SharedTrade, SharedTradePrivacy, TradeComment, UserRole, UserProfile, RATE_LIMITS, TradeReport } from "./types";
import { uploadToDrive, deleteFromDrive, isGDriveUrl, extractFileId } from "./gdrive";

// Strip undefined values — Firestore rejects undefined fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ==================== RATE LIMITING ====================

const rateLimitBuckets: Record<string, number[]> = {};

function checkRateLimit(action: keyof typeof RATE_LIMITS, userId: string): void {
  const key = `${action}:${userId}`;
  const config = RATE_LIMITS[action];
  const now = Date.now();
  if (!rateLimitBuckets[key]) rateLimitBuckets[key] = [];
  // Clean old entries
  rateLimitBuckets[key] = rateLimitBuckets[key].filter((t) => now - t < config.windowMs);
  if (rateLimitBuckets[key].length >= config.max) {
    throw new Error("Bạn thao tác quá nhanh. Vui lòng chờ một chút.");
  }
  rateLimitBuckets[key].push(now);
}

// Admin UID list (hardcoded super-admin fallback)
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

// Ensure user document exists with profile info
export async function ensureUserDoc(uid: string, profile?: { displayName?: string; email?: string; photoURL?: string }): Promise<void> {
  try {
    const userDocRef = doc(db, "users", uid);
    const snapshot = await getDoc(userDocRef);
    if (!snapshot.exists()) {
      await setDoc(userDocRef, {
        role: "user" as UserRole,
        banned: false,
        createdAt: Date.now(),
        ...stripUndefined(profile || {}),
      });
    } else {
      // Update profile info if provided
      if (profile) {
        await updateDoc(userDocRef, stripUndefined(profile));
      }
    }
  } catch {
    // Non-critical — don't block the app
  }
}

// ==================== USER ROLES ====================

export async function getUserRole(uid: string): Promise<UserRole> {
  // Hardcoded admin always gets admin role
  if (ADMIN_UIDS.includes(uid)) return "admin";
  try {
    const snapshot = await getDoc(doc(db, "users", uid));
    if (snapshot.exists()) {
      return (snapshot.data().role as UserRole) || "user";
    }
  } catch {
    // fall through
  }
  return "user";
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function setUserBanned(uid: string, banned: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { banned });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snapshot = await getDoc(doc(db, "users", uid));
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        role: data.role || "user",
        banned: data.banned || false,
        createdAt: data.createdAt || 0,
      };
    }
  } catch {
    // fall through
  }
  return null;
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
    // Update aggregate stats (fire-and-forget)
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
    // Update aggregate stats if result/pnl/status changed (fire-and-forget)
    if (trade.result !== undefined || trade.pnl !== undefined || trade.status !== undefined) {
      updateUserTradeStats(uid).catch(() => {});
    }
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
    // Update aggregate stats (fire-and-forget)
    updateUserTradeStats(uid).catch(() => {});
  } catch (error) {
    console.error("Lỗi xoá lệnh:", error);
    throw new Error("Không thể xoá lệnh. Vui lòng thử lại.");
  }
}

// Recalculate and store aggregate trade stats on user document
async function updateUserTradeStats(uid: string): Promise<void> {
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
  privacy: SharedTradePrivacy,
  isPublic: boolean = false
): Promise<string> {
  checkRateLimit("share", ownerUid);
  const token = generateShareToken();
  const { id, ...tradeData } = trade;
  let ownerRole: UserRole = "user";
  try {
    ownerRole = await getUserRole(ownerUid);
  } catch (e) {
    console.warn("shareTrade: getUserRole failed, using 'user'", e);
  }
  const sharedTrade: SharedTrade = {
    trade: stripUndefined(tradeData),
    ownerUid,
    ownerDisplayName,
    ownerPhotoURL,
    privacy,
    createdAt: Date.now(),
    public: isPublic,
    likes: 0,
    commentCount: 0,
    ownerRole,
  };
  const dataToWrite = stripUndefined(sharedTrade);
  await setDoc(doc(db, "shared_trades", token), dataToWrite);
  return token;
}

export async function getSharedTrade(token: string): Promise<SharedTrade | null> {
  const snapshot = await getDoc(doc(db, "shared_trades", token));
  if (!snapshot.exists()) return null;
  return snapshot.data() as SharedTrade;
}

export async function updateSharedTrade(
  token: string,
  trade: Trade,
  ownerUid: string,
  privacy: SharedTradePrivacy
): Promise<void> {
  // Save current version to history before updating
  const existing = await getSharedTrade(token);
  if (!existing) throw new Error("Bài chia sẻ không tồn tại");
  if (existing.ownerUid !== ownerUid) throw new Error("Không có quyền cập nhật");

  const batch = writeBatch(db);

  // Archive old version
  const historyRef = doc(collection(db, "shared_trades", token, "history"));
  batch.set(historyRef, stripUndefined({
    trade: existing.trade,
    privacy: existing.privacy,
    archivedAt: Date.now(),
  }));

  // Update shared trade with new data
  const { id, ...tradeData } = trade;
  batch.update(doc(db, "shared_trades", token), stripUndefined({
    trade: stripUndefined(tradeData),
    privacy,
    updatedAt: Date.now(),
  }));

  await batch.commit();
}

export interface CommunityStats {
  likes: number;
  commentCount: number;
}

export async function getCommunityStatsForTrades(tokens: string[]): Promise<Record<string, CommunityStats>> {
  if (tokens.length === 0) return {};
  const result: Record<string, CommunityStats> = {};
  // Firestore getDoc in parallel (max 10 at a time to avoid throttling)
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 10) {
    chunks.push(tokens.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    const snapshots = await Promise.all(
      chunk.map((token) => getDoc(doc(db, "shared_trades", token)))
    );
    snapshots.forEach((snap, i) => {
      if (snap.exists()) {
        const data = snap.data() as SharedTrade;
        result[chunk[i]] = { likes: data.likes || 0, commentCount: data.commentCount || 0 };
      }
    });
  }
  return result;
}

// Get all shared trades for a user and return mapping: tradeCreatedAt -> { token, likes, commentCount }
export async function getUserSharedTradesMap(uid: string): Promise<Record<number, CommunityStats & { token: string }>> {
  const q = query(
    collection(db, "shared_trades"),
    where("ownerUid", "==", uid),
    where("public", "==", true)
  );
  const snapshot = await getDocs(q);
  const result: Record<number, CommunityStats & { token: string }> = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as SharedTrade;
    const tradeCreatedAt = data.trade.createdAt;
    if (tradeCreatedAt) {
      result[tradeCreatedAt] = {
        token: docSnap.id,
        likes: data.likes || 0,
        commentCount: data.commentCount || 0,
      };
    }
  });
  return result;
}

// ==================== COMMUNITY ====================

export interface CommunityPost {
  id: string; // document ID (token)
  data: SharedTrade;
}

export type CommunitySortMode = "newest" | "topLikes" | "topComments";

export interface CommunityFeedResult {
  posts: CommunityPost[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function getCommunityFeed(
  pageSize: number = 20,
  lastDocument?: DocumentSnapshot | null,
  sortMode: CommunitySortMode = "newest"
): Promise<CommunityFeedResult> {
  const orderField = sortMode === "topLikes" ? "likes" : sortMode === "topComments" ? "commentCount" : "createdAt";

  const constraints: QueryConstraint[] = [
    where("public", "==", true),
    orderBy(orderField, "desc"),
    ...(lastDocument ? [startAfter(lastDocument)] : []),
    limit(pageSize + 1),
  ];

  const q = query(collection(db, "shared_trades"), ...constraints);
  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  return {
    posts: docs.map((d) => ({ id: d.id, data: d.data() as SharedTrade })),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getUserPublicTrades(ownerUid: string): Promise<CommunityPost[]> {
  const q = query(
    collection(db, "shared_trades"),
    where("public", "==", true),
    where("ownerUid", "==", ownerUid),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, data: d.data() as SharedTrade }));
}

export async function toggleLike(token: string, userId: string): Promise<boolean> {
  checkRateLimit("like", userId);
  const likeRef = doc(db, "shared_trades", token, "likes", userId);
  const tradeRef = doc(db, "shared_trades", token);

  return runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef);
    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(tradeRef, { likes: increment(-1) });
      return false; // unliked
    } else {
      transaction.set(likeRef, { createdAt: Date.now() });
      transaction.update(tradeRef, { likes: increment(1) });
      return true; // liked
    }
  });
}

export async function hasUserLiked(token: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, "shared_trades", token, "likes", userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

// Batch check: which posts has the user liked? Returns set of liked token IDs.
export async function batchCheckLikes(userId: string, tokens: string[]): Promise<Set<string>> {
  if (tokens.length === 0) return new Set();
  const liked = new Set<string>();
  // Check 10 at a time to avoid throttling
  for (let i = 0; i < tokens.length; i += 10) {
    const chunk = tokens.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map((token) => getDoc(doc(db, "shared_trades", token, "likes", userId)))
    );
    results.forEach((snap, idx) => {
      if (snap.exists()) liked.add(chunk[idx]);
    });
  }
  return liked;
}

export async function getComments(token: string): Promise<TradeComment[]> {
  const q = query(
    collection(db, "shared_trades", token, "comments"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TradeComment));
}

export async function addComment(
  token: string,
  userId: string,
  displayName: string,
  photoURL: string | undefined,
  text: string
): Promise<TradeComment> {
  checkRateLimit("comment", userId);
  if (!text.trim() || text.length > 500) throw new Error("Bình luận không hợp lệ");
  const commentData = stripUndefined({
    userId,
    displayName,
    photoURL,
    text,
    createdAt: Date.now(),
  });
  const docRef = await addDoc(collection(db, "shared_trades", token, "comments"), commentData);
  // Increment comment count
  await updateDoc(doc(db, "shared_trades", token), { commentCount: increment(1) });
  return { id: docRef.id, ...commentData } as TradeComment;
}

export async function deleteComment(token: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, "shared_trades", token, "comments", commentId));
  await updateDoc(doc(db, "shared_trades", token), { commentCount: increment(-1) });
}

export async function reportPost(token: string, userId: string, reason: string): Promise<void> {
  checkRateLimit("report", userId);
  if (!reason.trim() || reason.length > 500) throw new Error("Lý do không hợp lệ");
  const reportRef = doc(db, "shared_trades", token, "reports", userId);
  // Check if already reported (avoid double-counting)
  const existing = await getDoc(reportRef);
  await setDoc(reportRef, stripUndefined({ userId, reason: reason.trim(), createdAt: Date.now() }));
  if (!existing.exists()) {
    await updateDoc(doc(db, "shared_trades", token), { reportCount: increment(1) });
  }
}

// ==================== FOLLOW SYSTEM ====================

export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  batch.set(doc(db, "users", currentUid, "following", targetUid), { createdAt: now });
  batch.set(doc(db, "users", targetUid, "followers", currentUid), { createdAt: now });
  await batch.commit();
  // Invalidate suggested users cache
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem(`suggested_users_${currentUid}`); } catch { /* ignore */ }
  }
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", currentUid, "following", targetUid));
  batch.delete(doc(db, "users", targetUid, "followers", currentUid));
  await batch.commit();
  // Invalidate suggested users cache
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem(`suggested_users_${currentUid}`); } catch { /* ignore */ }
  }
}

export async function isFollowing(currentUid: string, targetUid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", currentUid, "following", targetUid));
  return snap.exists();
}

export interface FollowedUser {
  uid: string;
  createdAt: number;
}

export async function getFollowingList(uid: string): Promise<FollowedUser[]> {
  const snapshot = await getDocs(collection(db, "users", uid, "following"));
  return snapshot.docs.map((d) => ({ uid: d.id, createdAt: (d.data().createdAt as number) || 0 }));
}

export async function getFollowersList(uid: string): Promise<FollowedUser[]> {
  const snapshot = await getDocs(collection(db, "users", uid, "followers"));
  return snapshot.docs.map((d) => ({ uid: d.id, createdAt: (d.data().createdAt as number) || 0 }));
}

export async function getFollowCounts(uid: string): Promise<{ following: number; followers: number }> {
  const [followingSnap, followersSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "following")),
    getDocs(collection(db, "users", uid, "followers")),
  ]);
  return { following: followingSnap.size, followers: followersSnap.size };
}

export async function getCommunityFeedFollowing(
  currentUid: string,
  pageSize: number = 20,
  lastDocument?: DocumentSnapshot | null
): Promise<CommunityFeedResult> {
  // Get who the user follows
  const followingSnap = await getDocs(collection(db, "users", currentUid, "following"));
  const followingUids = followingSnap.docs.map((d) => d.id);
  if (followingUids.length === 0) return { posts: [], lastDoc: null, hasMore: false };

  // Firestore "in" supports max 30 values
  const chunks: string[][] = [];
  for (let i = 0; i < followingUids.length; i += 30) {
    chunks.push(followingUids.slice(i, i + 30));
  }

  // Limit each chunk query to reduce total documents loaded
  const perChunkLimit = pageSize * 2;
  let allPosts: CommunityPost[] = [];
  for (const chunk of chunks) {
    const q = query(
      collection(db, "shared_trades"),
      where("public", "==", true),
      where("ownerUid", "in", chunk),
      orderBy("createdAt", "desc"),
      limit(perChunkLimit)
    );
    const snapshot = await getDocs(q);
    allPosts.push(...snapshot.docs.map((d) => ({ id: d.id, data: d.data() as SharedTrade })));
  }

  // Sort combined results and apply pagination
  allPosts.sort((a, b) => b.data.createdAt - a.data.createdAt);

  // Find start index based on lastDocument
  let startIdx = 0;
  if (lastDocument) {
    const lastId = lastDocument.id;
    const idx = allPosts.findIndex((p) => p.id === lastId);
    if (idx >= 0) startIdx = idx + 1;
  }

  const sliced = allPosts.slice(startIdx, startIdx + pageSize + 1);
  const hasMore = sliced.length > pageSize;
  const posts = hasMore ? sliced.slice(0, pageSize) : sliced;

  return {
    posts,
    lastDoc: null, // client-side pagination for following feed
    hasMore,
  };
}

// ==================== SUGGESTED USERS ====================

export interface SuggestedUser {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalLikes: number;
  postCount: number;
  role?: UserRole;
}

const SUGGESTED_USERS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getSuggestedUsers(
  currentUid: string,
  maxResults: number = 5
): Promise<SuggestedUser[]> {
  // Check sessionStorage cache first
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(`suggested_users_${currentUid}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < SUGGESTED_USERS_CACHE_TTL) return data;
      }
    } catch { /* ignore parse errors */ }
  }

  // Get who the user already follows
  const followingSnap = await getDocs(collection(db, "users", currentUid, "following"));
  const followingSet = new Set(followingSnap.docs.map((d) => d.id));

  // Get recent public posts, aggregate by owner
  const q = query(
    collection(db, "shared_trades"),
    where("public", "==", true),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  const snapshot = await getDocs(q);

  const userMap = new Map<string, SuggestedUser>();
  for (const d of snapshot.docs) {
    const data = d.data() as SharedTrade;
    if (data.ownerUid === currentUid || followingSet.has(data.ownerUid)) continue;
    const existing = userMap.get(data.ownerUid);
    if (existing) {
      existing.totalLikes += (data.likes || 0);
      existing.postCount += 1;
    } else {
      userMap.set(data.ownerUid, {
        uid: data.ownerUid,
        displayName: data.ownerDisplayName,
        photoURL: data.ownerPhotoURL,
        totalLikes: data.likes || 0,
        postCount: 1,
        role: data.ownerRole,
      });
    }
  }

  // Sort by total likes desc, then by post count
  const result = Array.from(userMap.values())
    .sort((a, b) => b.totalLikes - a.totalLikes || b.postCount - a.postCount)
    .slice(0, maxResults);

  // Cache result
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`suggested_users_${currentUid}`, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch { /* ignore quota errors */ }
  }

  return result;
}

// ==================== ADMIN: REPORTS MANAGEMENT ====================

export async function getAllReports(): Promise<TradeReport[]> {
  // Only fetch trades that have reports (using reportCount field)
  const sharedTradesSnap = await getDocs(
    query(collection(db, "shared_trades"), where("reportCount", ">", 0))
  );
  const allReports: TradeReport[] = [];
  // Batch fetch reports - process 10 at a time
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

export async function deleteSharedTrade(token: string): Promise<void> {
  // Delete subcollections first (likes, comments, reports)
  const subcollections = ["likes", "comments", "reports"];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, "shared_trades", token, sub));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
  }
  await deleteDoc(doc(db, "shared_trades", token));
}

export async function getAllComments(token: string): Promise<(TradeComment & { token: string })[]> {
  const q = query(
    collection(db, "shared_trades", token, "comments"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, token, ...d.data() } as TradeComment & { token: string }));
}
