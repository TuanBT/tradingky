import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, limit, startAfter, DocumentSnapshot, QueryConstraint } from "firebase/firestore";
import { Trade, SharedTrade, SharedTradePrivacy, UserRole } from "../types";
import { stripUndefined, checkRateLimit } from "./helpers";
import { getUserRole } from "./users";

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
  const existing = await getSharedTrade(token);
  if (!existing) throw new Error("Bài chia sẻ không tồn tại");
  if (existing.ownerUid !== ownerUid) throw new Error("Không có quyền cập nhật");

  const { writeBatch } = await import("firebase/firestore");
  const batch = writeBatch(db);

  const historyRef = doc(collection(db, "shared_trades", token, "history"));
  batch.set(historyRef, stripUndefined({
    trade: existing.trade,
    privacy: existing.privacy,
    archivedAt: Date.now(),
  }));

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

export async function deleteSharedTrade(token: string): Promise<void> {
  const { writeBatch } = await import("firebase/firestore");
  const subcollections = ["likes", "comments", "reports"];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, "shared_trades", token, sub));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
  }
  await deleteDoc(doc(db, "shared_trades", token));
}

// ==================== COMMUNITY FEED ====================

export interface CommunityPost {
  id: string;
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

export async function getCommunityFeedFollowing(
  currentUid: string,
  pageSize: number = 20,
  lastDocument?: DocumentSnapshot | null
): Promise<CommunityFeedResult> {
  const followingSnap = await getDocs(collection(db, "users", currentUid, "following"));
  const followingUids = followingSnap.docs.map((d) => d.id);
  if (followingUids.length === 0) return { posts: [], lastDoc: null, hasMore: false };

  const chunks: string[][] = [];
  for (let i = 0; i < followingUids.length; i += 30) {
    chunks.push(followingUids.slice(i, i + 30));
  }

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

  allPosts.sort((a, b) => b.data.createdAt - a.data.createdAt);

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
    lastDoc: null,
    hasMore,
  };
}
