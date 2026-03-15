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
  chartImages?: string[];
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
  exitEmotion?: string;
  exitReason?: string;
  lessonsLearned?: string;
  exitChartImageUrl?: string;
  starred?: boolean;
  shareToken?: string;
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
  emotions: [],
  platforms: ["Exness", "Binance"],
  timeframes: ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"],
};

export const EMOTION_EMOJIS = ["😎", "😌", "😤", "😰", "🤑", "💪", "🔥", "❄️", "😡", "🤔", "😱", "🧘", "🎯", "😨", "🥶", "😵‍💫"];

export interface EmotionOption {
  value: string;
  description: string;
}

export const ENTRY_EMOTIONS: EmotionOption[] = [
  { value: "😌 Bình tĩnh", description: "Tâm lý ổn định. Vào lệnh theo đúng kế hoạch đã chuẩn bị." },
  { value: "😎 Tự tin", description: "Tin tưởng vào phân tích và hệ thống giao dịch. Setup rõ ràng nên quyết định dứt khoát." },
  { value: "🧘 Kiên nhẫn", description: "Chờ đúng điểm vào lệnh theo kế hoạch. Không bị cuốn theo biến động ngắn hạn." },
  { value: "🤩 Hưng phấn", description: "Phấn khích khi thấy cơ hội giao dịch. Thường xuất hiện sau chuỗi lệnh thắng." },
  { value: "😤 FOMO", description: "Thấy giá chạy mạnh nên vội vàng vào lệnh. Không chờ đúng điểm vào theo kế hoạch." },
  { value: "😰 Sợ thua lỗ", description: "Lo lắng về khả năng mất tiền. Có thể vào lệnh muộn hoặc vào lệnh xa điểm đẹp." },
  { value: "😡 Muốn gỡ lỗ", description: "Vừa thua lệnh trước đó. Vào lệnh với mong muốn lấy lại số tiền đã mất." },
  { value: "🤑 Tham lợi nhuận", description: "Muốn kiếm nhiều hơn kế hoạch. Có thể tăng khối lượng giao dịch." },
  { value: "🤔 Do dự", description: "Setup có nhưng vẫn chưa thật sự chắc chắn. Quyết định vào lệnh trong trạng thái phân vân." },
  { value: "😐 Giao dịch theo cảm tính", description: "Không có lý do kỹ thuật rõ ràng. Vào lệnh chỉ dựa vào cảm giác thị trường." },
  { value: "😪 Mệt mỏi", description: "Tinh thần không tỉnh táo khi giao dịch. Có thể ảnh hưởng đến chất lượng quyết định." },
];

export const EXIT_EMOTIONS: EmotionOption[] = [
  { value: "😌 Bình tĩnh", description: "Đóng lệnh theo đúng kế hoạch TP hoặc SL." },
  { value: "😃 Hài lòng", description: "Kết quả đúng kỳ vọng. Tuân thủ tốt kế hoạch giao dịch." },
  { value: "😞 Tiếc nuối", description: "Sau khi đóng lệnh thì giá tiếp tục chạy đúng hướng." },
  { value: "😰 Sợ mất lợi nhuận", description: "Thấy lợi nhuận đang có nên đóng lệnh sớm. Không giữ được lệnh theo kế hoạch ban đầu." },
  { value: "🤑 Tham lợi nhuận", description: "Không chốt lời theo kế hoạch vì muốn lợi nhuận lớn hơn." },
  { value: "😡 Bực bội", description: "Thị trường đi ngược kỳ vọng. Cảm xúc tiêu cực khi phải đóng lệnh lỗ." },
  { value: "😓 Áp lực", description: "Theo dõi lệnh quá lâu khiến tâm lý căng thẳng. Đóng lệnh để giảm áp lực." },
  { value: "😕 Hoài nghi", description: "Không còn tin tưởng vào phân tích ban đầu. Quyết định đóng lệnh vì thiếu tự tin." },
  { value: "😐 Đóng theo cảm tính", description: "Không có lý do kỹ thuật rõ ràng. Quyết định dựa trên cảm giác." },
  { value: "😪 Mệt mỏi", description: "Không muốn tiếp tục theo dõi lệnh. Đóng lệnh để kết thúc giao dịch." },
];

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

export const MAX_CHART_IMAGES = 4;

/** Get all chart images from a trade, handling both old (chartImageUrl/exitChartImageUrl) and new (chartImages[]) formats */
export function getTradeImages(trade: Pick<Trade, 'chartImages' | 'chartImageUrl' | 'exitChartImageUrl'>): string[] {
  if (trade.chartImages && trade.chartImages.length > 0) {
    return trade.chartImages;
  }
  return [trade.chartImageUrl, trade.exitChartImageUrl].filter(Boolean) as string[];
}

export interface TradeComment {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  text: string;
  createdAt: number;
}

// ==================== CHARACTER LIMITS ====================

export const CHAR_LIMITS = {
  pair: 20,
  platform: 30,
  emotion: 40,
  timeframe: 10,
  stopLoss: 50,
  takeProfit: 50,
  note: 2000,
  exitReason: 500,
  lessonsLearned: 1000,
  comment: 500,
  reportReason: 500,
  settingItem: 50,
} as const;

// ==================== RATE LIMITING ====================

export const RATE_LIMITS = {
  comment: { max: 10, windowMs: 60_000 },    // 10 comments per minute
  like: { max: 30, windowMs: 60_000 },        // 30 likes per minute
  share: { max: 5, windowMs: 60_000 },        // 5 shares per minute
  report: { max: 3, windowMs: 300_000 },      // 3 reports per 5 minutes
} as const;

// ==================== REPORT ====================

export interface TradeReport {
  id: string;
  token: string;
  userId: string;
  reason: string;
  createdAt: number;
  // Populated fields
  tradeOwnerName?: string;
  tradePair?: string;
}
