import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, query, where, orderBy, limit, writeBatch } from "firebase/firestore";
import { SharedTrade, UserRole } from "../types";

export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  batch.set(doc(db, "users", currentUid, "following", targetUid), { createdAt: now });
  batch.set(doc(db, "users", targetUid, "followers", currentUid), { createdAt: now });
  await batch.commit();
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem(`suggested_users_${currentUid}`); } catch { /* ignore */ }
  }
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", currentUid, "following", targetUid));
  batch.delete(doc(db, "users", targetUid, "followers", currentUid));
  await batch.commit();
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
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(`suggested_users_${currentUid}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < SUGGESTED_USERS_CACHE_TTL) return data;
      }
    } catch { /* ignore parse errors */ }
  }

  const followingSnap = await getDocs(collection(db, "users", currentUid, "following"));
  const followingSet = new Set(followingSnap.docs.map((d) => d.id));

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

  const result = Array.from(userMap.values())
    .sort((a, b) => b.totalLikes - a.totalLikes || b.postCount - a.postCount)
    .slice(0, maxResults);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`suggested_users_${currentUid}`, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch { /* ignore quota errors */ }
  }

  return result;
}
