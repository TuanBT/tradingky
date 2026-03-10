"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { ensureUserDoc } from "@/lib/services";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Get a valid Google OAuth access token (re-authenticates if expired) */
  getGoogleAccessToken: () => Promise<string>;
  /** Whether a Google Drive access token is currently available */
  hasGoogleToken: boolean;
  /** Prompt user to connect Google Drive (must be called from direct user click) */
  connectGoogleDrive: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  getGoogleAccessToken: async () => "",
  hasGoogleToken: false,
  connectGoogleDrive: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        ensureUserDoc(user.uid);
      } else {
        setGoogleAccessToken(null);
        setTokenExpiry(0);
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setGoogleAccessToken(credential.accessToken);
      // Google tokens expire in ~3600s; set expiry at 50 minutes to be safe
      setTokenExpiry(Date.now() + 50 * 60 * 1000);
    }
  };

  const getGoogleAccessToken = useCallback(async (): Promise<string> => {
    // Return cached token if still valid
    if (googleAccessToken && Date.now() < tokenExpiry) {
      return googleAccessToken;
    }
    // Re-authenticate to get a fresh token
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Không thể lấy Google access token. Vui lòng đăng nhập lại.");
    }
    setGoogleAccessToken(credential.accessToken);
    setTokenExpiry(Date.now() + 50 * 60 * 1000);
    return credential.accessToken;
  }, [googleAccessToken, tokenExpiry]);

  const connectGoogleDrive = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setGoogleAccessToken(credential.accessToken);
      setTokenExpiry(Date.now() + 50 * 60 * 1000);
    }
  }, []);

  const hasGoogleToken = !!(googleAccessToken && Date.now() < tokenExpiry);

  const logout = async () => {
    setGoogleAccessToken(null);
    setTokenExpiry(0);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, getGoogleAccessToken, hasGoogleToken, connectGoogleDrive }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
