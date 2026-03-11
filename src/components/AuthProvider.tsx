"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, GoogleAuthProvider } from "firebase/auth";
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
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("gdrive_token");
  });
  const [tokenExpiry, setTokenExpiry] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const saved = sessionStorage.getItem("gdrive_token_expiry");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Persist token to sessionStorage
  const saveToken = (token: string, expiry: number) => {
    setGoogleAccessToken(token);
    setTokenExpiry(expiry);
    sessionStorage.setItem("gdrive_token", token);
    sessionStorage.setItem("gdrive_token_expiry", expiry.toString());
  };

  const clearToken = () => {
    setGoogleAccessToken(null);
    setTokenExpiry(0);
    sessionStorage.removeItem("gdrive_token");
    sessionStorage.removeItem("gdrive_token_expiry");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        ensureUserDoc(user.uid, {
          displayName: user.displayName || undefined,
          email: user.email || undefined,
          photoURL: user.photoURL || undefined,
        });
      } else {
        clearToken();
      }
    });
    // Check for redirect result (from signInWithRedirect fallback)
    getRedirectResult(auth).then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          saveToken(credential.accessToken, Date.now() + 50 * 60 * 1000);
        }
      }
    }).catch(() => {
      // Redirect result not available, this is normal
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        saveToken(credential.accessToken, Date.now() + 50 * 60 * 1000);
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
      }
    }
  };

  const getGoogleAccessToken = useCallback(async (): Promise<string> => {
    // Return cached token if still valid
    if (googleAccessToken && Date.now() < tokenExpiry) {
      return googleAccessToken;
    }
    // Re-authenticate to get a fresh token
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error("Không thể lấy Google access token. Vui lòng đăng nhập lại.");
      }
      saveToken(credential.accessToken, Date.now() + 50 * 60 * 1000);
      return credential.accessToken;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth, googleProvider);
        throw new Error("Đang chuyển hướng để xác thực...");
      }
      throw error;
    }
  }, [googleAccessToken, tokenExpiry]);

  const connectGoogleDrive = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        saveToken(credential.accessToken, Date.now() + 50 * 60 * 1000);
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
        // Fallback to redirect on mobile when popup is blocked
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw error;
      }
    }
  }, []);

  const hasGoogleToken = !!(googleAccessToken && Date.now() < tokenExpiry);

  const logout = async () => {
    clearToken();
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, getGoogleAccessToken, hasGoogleToken, connectGoogleDrive }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
