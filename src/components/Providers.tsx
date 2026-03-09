"use client";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { TradeFilterProvider } from "./TradeFilterContext";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TradeFilterProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </TradeFilterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
