import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DropdownLibrary, DEFAULT_LIBRARY } from "../types";
import { userLibraryDocRef } from "./helpers";

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
