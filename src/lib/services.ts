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
} from "firebase/firestore";
import { Trade, DailyJournal, DropdownLibrary, DEFAULT_LIBRARY } from "./types";

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
