import { db } from "../firebase";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, increment, runTransaction } from "firebase/firestore";
import { TradeComment } from "../types";
import { stripUndefined, checkRateLimit } from "./helpers";

export async function toggleLike(token: string, userId: string): Promise<boolean> {
  checkRateLimit("like", userId);
  const likeRef = doc(db, "shared_trades", token, "likes", userId);
  const tradeRef = doc(db, "shared_trades", token);

  return runTransaction(db, async (transaction) => {
    const likeSnap = await transaction.get(likeRef);
    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(tradeRef, { likes: increment(-1) });
      return false;
    } else {
      transaction.set(likeRef, { createdAt: Date.now() });
      transaction.update(tradeRef, { likes: increment(1) });
      return true;
    }
  });
}

export async function hasUserLiked(token: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, "shared_trades", token, "likes", userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export async function batchCheckLikes(userId: string, tokens: string[]): Promise<Set<string>> {
  if (tokens.length === 0) return new Set();
  const liked = new Set<string>();
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
  await updateDoc(doc(db, "shared_trades", token), { commentCount: increment(1) });
  return { id: docRef.id, ...commentData } as TradeComment;
}

export async function deleteComment(token: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, "shared_trades", token, "comments", commentId));
  await updateDoc(doc(db, "shared_trades", token), { commentCount: increment(-1) });
}

export async function getAllComments(token: string): Promise<(TradeComment & { token: string })[]> {
  const q = query(
    collection(db, "shared_trades", token, "comments"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, token, ...d.data() } as TradeComment & { token: string }));
}

export async function reportPost(token: string, userId: string, reason: string): Promise<void> {
  checkRateLimit("report", userId);
  if (!reason.trim() || reason.length > 500) throw new Error("Lý do không hợp lệ");
  const reportRef = doc(db, "shared_trades", token, "reports", userId);
  const { setDoc } = await import("firebase/firestore");
  const existing = await getDoc(reportRef);
  await setDoc(reportRef, stripUndefined({ userId, reason: reason.trim(), createdAt: Date.now() }));
  if (!existing.exists()) {
    await updateDoc(doc(db, "shared_trades", token), { reportCount: increment(1) });
  }
}
