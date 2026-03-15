import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { UserRole, UserProfile } from "../types";
import { stripUndefined, ADMIN_UIDS } from "./helpers";

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
      if (profile) {
        await updateDoc(userDocRef, stripUndefined(profile));
      }
    }
  } catch {
    // Non-critical — don't block the app
  }
}

export async function getUserRole(uid: string): Promise<UserRole> {
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
