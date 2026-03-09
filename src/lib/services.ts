import { db } from "./firebase";
import { storage } from "./firebase";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Trade, DailyJournal, DropdownLibrary, DEFAULT_LIBRARY } from "./types";

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

// ==================== TRADES ====================

export async function getTrades(uid: string): Promise<Trade[]> {
  const q = query(userTradesCollection(uid), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
}

export async function getTradesByDateRange(uid: string, startDate: string, endDate: string): Promise<Trade[]> {
  const q = query(
    userTradesCollection(uid),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
}

export async function addTrade(uid: string, trade: Omit<Trade, "id">): Promise<string> {
  const docRef = await addDoc(userTradesCollection(uid), trade);
  return docRef.id;
}

export async function updateTrade(uid: string, id: string, trade: Partial<Trade>): Promise<void> {
  const docRef = doc(db, "users", uid, "trades", id);
  await updateDoc(docRef, trade);
}

export async function deleteTrade(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "trades", id);
  await deleteDoc(docRef);
}

// ==================== DAILY JOURNAL ====================

export async function getJournals(uid: string): Promise<DailyJournal[]> {
  const q = query(userJournalCollection(uid), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DailyJournal));
}

export async function addJournal(uid: string, journal: Omit<DailyJournal, "id">): Promise<string> {
  const docRef = await addDoc(userJournalCollection(uid), journal);
  return docRef.id;
}

export async function updateJournal(uid: string, id: string, journal: Partial<DailyJournal>): Promise<void> {
  const docRef = doc(db, "users", uid, "dailyJournal", id);
  await updateDoc(docRef, journal);
}

export async function deleteJournal(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "dailyJournal", id);
  await deleteDoc(docRef);
}

// ==================== DROPDOWN LIBRARY ====================

export async function getLibrary(uid: string): Promise<DropdownLibrary> {
  const snapshot = await getDoc(userLibraryDocRef(uid));
  if (snapshot.exists()) {
    return snapshot.data() as DropdownLibrary;
  }
  // Initialize with defaults
  await setDoc(userLibraryDocRef(uid), DEFAULT_LIBRARY);
  return DEFAULT_LIBRARY;
}

export async function updateLibrary(uid: string, library: DropdownLibrary): Promise<void> {
  await setDoc(userLibraryDocRef(uid), library);
}

// ==================== FILE UPLOAD ====================

export async function uploadChartImage(uid: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const filename = `${Date.now()}.${ext}`;
  const storageRef = ref(storage, `users/${uid}/charts/${filename}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
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
  const usersSnapshot = await getDocs(collection(db, "users"));
  const users: UserInfo[] = [];

  for (const userDoc of usersSnapshot.docs) {
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

    users.push({ uid, tradeCount, totalPnl, winRate, lastTradeDate });
  }

  return users;
}

export async function resetUserTrades(uid: string): Promise<number> {
  const tradesSnapshot = await getDocs(collection(db, "users", uid, "trades"));
  const batch = writeBatch(db);
  tradesSnapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return tradesSnapshot.size;
}

export async function resetUserJournals(uid: string): Promise<number> {
  const journalSnapshot = await getDocs(collection(db, "users", uid, "dailyJournal"));
  const batch = writeBatch(db);
  journalSnapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return journalSnapshot.size;
}

export async function resetUserAll(uid: string): Promise<{ trades: number; journals: number }> {
  const trades = await resetUserTrades(uid);
  const journals = await resetUserJournals(uid);
  // Reset library to default
  await setDoc(userLibraryDocRef(uid), DEFAULT_LIBRARY);
  return { trades, journals };
}

export async function createSmokeTestTrades(uid: string): Promise<number> {
  const now = Date.now();
  const today = new Date();
  const testTrades: Omit<Trade, "id">[] = [];

  const pairs = ["XAUUSD", "BTCUSDT", "EURUSD"];
  const platforms = ["Exness", "Binance"];
  const emotions = ["Tự tin", "Bình tĩnh", "FOMO"];
  const reasons = ["Breakout", "Pullback", "Support/Resistance"];
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
      reason: reasons[i % reasons.length],
      note: `[Smoke Test] Lệnh test #${i + 1} - tạo tự động`,
      tags: ["smoke-test"],
      createdAt: now - i * 60000,
    });
  }

  for (const trade of testTrades) {
    await addDoc(collection(db, "users", uid, "trades"), trade);
  }

  return testTrades.length;
}
