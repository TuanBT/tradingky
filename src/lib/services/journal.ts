import { db } from "../firebase";
import { doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { DailyJournal } from "../types";
import { stripUndefined, userJournalCollection } from "./helpers";

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
