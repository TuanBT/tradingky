import { db } from "../firebase";
import { collection, doc } from "firebase/firestore";
import { RATE_LIMITS } from "../types";

// Strip undefined values — Firestore rejects undefined fields
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

// ==================== RATE LIMITING ====================

const rateLimitBuckets: Record<string, number[]> = {};

export function checkRateLimit(action: keyof typeof RATE_LIMITS, userId: string): void {
  const key = `${action}:${userId}`;
  const config = RATE_LIMITS[action];
  const now = Date.now();
  if (!rateLimitBuckets[key]) rateLimitBuckets[key] = [];
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
export function userTradesCollection(uid: string) {
  return collection(db, "users", uid, "trades");
}

export function userJournalCollection(uid: string) {
  return collection(db, "users", uid, "dailyJournal");
}

export function userLibraryDocRef(uid: string) {
  return doc(db, "users", uid, "settings", "dropdownLibrary");
}
