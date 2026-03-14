export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  platform?: string;
  type: "BUY" | "SELL";
  emotion: string;
  result: "WIN" | "LOSS" | "BREAKEVEN" | "CANCELLED";
  status: "OPEN" | "CLOSED"; // Lệnh đang chạy hay đã đóng
  pnl?: number;
  stopLoss?: string;
  takeProfit?: string;
  chartImageUrl?: string;
  note?: string;
  // Nâng cao
  entryPrice?: number;
  exitPrice?: number;
  lotSize?: number;
  timeframe?: string;
  closeDate?: string;
  entryTime?: string; // HH:mm
  closeTime?: string; // HH:mm
  // Phase 2 (đóng lệnh)
  exitReason?: string;
  lessonsLearned?: string;
  exitChartImageUrl?: string;
  starred?: boolean;
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
  platforms: string[];
  timeframes: string[];
}

export const DEFAULT_LIBRARY: DropdownLibrary = {
  pairs: ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "ETHUSDT", "SOLUSDT"],
  emotions: ["😎 Tự tin", "🧘 Bình tĩnh", "😱 FOMO", "😨 Sợ hãi", "🤑 Tham lam", "😤 Nóng vội", "😡 Revenge trade", "🤔 Không chắc chắn"],
  platforms: ["Exness", "Binance"],
  timeframes: ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"],
};

export const EMOTION_EMOJIS = ["😎", "😌", "😤", "😰", "🤑", "💪", "🔥", "❄️", "😡", "🤔", "😱", "🧘", "🎯", "😨", "🥶", "😵‍💫"];

// ==================== USER ROLES ====================

export type UserRole = "admin" | "mod" | "user";

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role: UserRole;
  banned: boolean;
  createdAt: number;
}

// ==================== SHARED TRADES ====================

export interface SharedTradePrivacy {
  hidePnl: boolean;
  hideLotSize: boolean;
  hideEntryExitPrice: boolean;
}

export interface SharedTrade {
  trade: Omit<Trade, "id">;
  ownerUid: string;
  ownerDisplayName: string;
  ownerPhotoURL?: string;
  privacy: SharedTradePrivacy;
  createdAt: number;
  // Community fields (optional, added when publishing to community)
  public?: boolean;
  likes?: number;
  commentCount?: number;
  ownerRole?: UserRole;
}

export interface TradeComment {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: number;
}
