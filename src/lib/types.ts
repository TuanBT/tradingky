export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  platform: string;
  type: "BUY" | "SELL";
  emotion: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  status: "OPEN" | "CLOSED"; // Lệnh đang chạy hay đã đóng
  pnl?: number;
  stopLoss?: string;
  takeProfit?: string;
  reason?: string;
  chartImageUrl?: string;
  note?: string;
  tags?: string[];
  // Nâng cao
  entryPrice?: number;
  exitPrice?: number;
  lotSize?: number;
  timeframe?: string;
  closeDate?: string;
  strategy?: string;
  // Phase 2 (đóng lệnh)
  exitReason?: string; // Lý do thoát lệnh
  lessonsLearned?: string; // Bài học rút ra
  exitChartImageUrl?: string; // Ảnh chart lúc đóng lệnh
  createdAt: number;
}

export interface DailyJournal {
  id: string;
  date: string; // YYYY-MM-DD
  mood: string;
  marketCondition?: string;
  lessonsLearned?: string;
  note?: string;
  createdAt: number;
}

export interface DropdownLibrary {
  pairs: string[];
  emotions: string[];
  reasons: string[];
  strategies: string[];
  platforms: string[];
  timeframes: string[];
  tags: string[];
}

export const DEFAULT_LIBRARY: DropdownLibrary = {
  pairs: ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "ETHUSDT", "SOLUSDT"],
  emotions: ["Tự tin", "Bình tĩnh", "FOMO", "Sợ hãi", "Tham lam", "Nóng vội", "Revenge trade", "Không chắc chắn"],
  reasons: ["Breakout", "Pullback", "Support/Resistance", "Trendline", "Supply/Demand", "News", "Cảm tính", "Pattern (nến)"],
  strategies: ["Scalping", "Day trade", "Swing", "Position"],
  platforms: ["Exness", "Binance"],
  timeframes: ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"],
  tags: ["Scalping", "Swing", "Breakout", "Reversal", "Trend following", "Counter-trend", "News trading"],
};
