"use client";

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import LoginPage from "./LoginPage";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <Sidebar />
      <main className="lg:ml-60 min-h-screen bg-background p-4 pt-16 lg:pt-6 lg:p-6">
        {children}
      </main>
    </>
  );
}
