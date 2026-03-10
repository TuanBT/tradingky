"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface TradeFilters {
  search: string;
  platform: string;
  pair: string;
  result: string;
  status: string;
  dateRange: string;
  emotion: string;
  starred: string;
}

interface TradeFilterContextType {
  filters: TradeFilters;
  setFilter: (key: keyof TradeFilters, value: string) => void;
  resetFilters: () => void;
}

const defaultFilters: TradeFilters = {
  search: "",
  platform: "all",
  pair: "all",
  result: "all",
  status: "all",
  dateRange: "all",
  emotion: "all",
  starred: "all",
};

const TradeFilterContext = createContext<TradeFilterContextType>({
  filters: defaultFilters,
  setFilter: () => {},
  resetFilters: () => {},
});

export function TradeFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);

  const setFilter = (key: keyof TradeFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(defaultFilters);

  return (
    <TradeFilterContext.Provider value={{ filters, setFilter, resetFilters }}>
      {children}
    </TradeFilterContext.Provider>
  );
}

export function useTradeFilters() {
  return useContext(TradeFilterContext);
}
