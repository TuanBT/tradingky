// Script to seed Firebase with test data
// Run: npx tsx src/scripts/seed.ts

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqynva_B43HZvcNW0DBAaNLAOgb4CrQ6w",
  authDomain: "tradingky-tuan.firebaseapp.com",
  databaseURL: "https://tradingky-tuan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tradingky-tuan",
  storageBucket: "tradingky-tuan.firebasestorage.app",
  messagingSenderId: "917755843505",
  appId: "1:917755843505:web:ab9928af2ee9d5b4a42390",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const trades = [
  { date: "2026-03-03", pair: "XAUUSD", platform: "Exness", type: "BUY", emotion: "Tự tin", result: "WIN", pnl: 85.50, reason: "Breakout", stopLoss: "Dưới support 2900", takeProfit: "Resistance 2950", note: "Breakout vùng tích lũy 4H", createdAt: Date.now() },
  { date: "2026-03-03", pair: "BTCUSDT", platform: "Binance", type: "SELL", emotion: "Bình tĩnh", result: "WIN", pnl: 42.00, reason: "Trendline", stopLoss: "Trên trendline", takeProfit: "Support gần nhất", note: "Short theo trendline giảm", createdAt: Date.now() },
  { date: "2026-03-04", pair: "EURUSD", platform: "Exness", type: "BUY", emotion: "FOMO", result: "LOSS", pnl: -35.00, reason: "Cảm tính", stopLoss: "20 pips", takeProfit: "40 pips", note: "Vào lệnh vì FOMO, không có setup rõ ràng", createdAt: Date.now() },
  { date: "2026-03-04", pair: "XAUUSD", platform: "Exness", type: "SELL", emotion: "Tự tin", result: "WIN", pnl: 120.00, reason: "Supply/Demand", stopLoss: "Trên supply zone", takeProfit: "Demand zone H4", note: "Sell từ supply zone D1", createdAt: Date.now() },
  { date: "2026-03-05", pair: "ETHUSDT", platform: "Binance", type: "BUY", emotion: "Tham lam", result: "LOSS", pnl: -65.00, reason: "Breakout", stopLoss: "Dưới nến breakout", takeProfit: "2x risk", note: "Tham lam tăng lot, bị quét SL", createdAt: Date.now() },
  { date: "2026-03-05", pair: "GBPUSD", platform: "Exness", type: "BUY", emotion: "Bình tĩnh", result: "WIN", pnl: 28.00, reason: "Pullback", stopLoss: "Dưới swing low", takeProfit: "Swing high trước", note: "Pullback về EMA50 H1", createdAt: Date.now() },
  { date: "2026-03-06", pair: "XAUUSD", platform: "Exness", type: "BUY", emotion: "Sợ hãi", result: "BREAKEVEN", pnl: 0, reason: "Support/Resistance", stopLoss: "Dưới support", takeProfit: "Resistance", note: "Dời SL về entry sớm quá", createdAt: Date.now() },
  { date: "2026-03-06", pair: "BTCUSDT", platform: "Binance", type: "BUY", emotion: "Tự tin", result: "WIN", pnl: 95.00, reason: "Pattern (nến)", stopLoss: "Dưới nến engulfing", takeProfit: "3x risk", note: "Bullish engulfing D1", createdAt: Date.now() },
  { date: "2026-03-07", pair: "XAUUSD", platform: "Exness", type: "SELL", emotion: "Nóng vội", result: "LOSS", pnl: -50.00, reason: "Cảm tính", note: "Vào lệnh nóng vội không chờ confirm", createdAt: Date.now() },
  { date: "2026-03-07", pair: "SOLUSDT", platform: "Binance", type: "BUY", emotion: "Bình tĩnh", result: "WIN", pnl: 33.00, reason: "Trendline", stopLoss: "Dưới trendline tăng", takeProfit: "Kém cản gần", note: "Bounce trên trendline tăng", createdAt: Date.now() },
  { date: "2026-03-08", pair: "XAUUSD", platform: "Exness", type: "BUY", emotion: "Tự tin", result: "WIN", pnl: 75.00, reason: "Breakout", stopLoss: "Dưới breakout zone", takeProfit: "ATH", note: "Breakout ATH", createdAt: Date.now() },
  { date: "2026-03-08", pair: "EURUSD", platform: "Exness", type: "SELL", emotion: "Revenge trade", result: "LOSS", pnl: -40.00, reason: "Cảm tính", note: "Revenge trade sau lệnh trước, sai hoàn toàn", createdAt: Date.now() },
  { date: "2026-03-09", pair: "BTCUSDT", platform: "Binance", type: "BUY", emotion: "Tự tin", result: "WIN", pnl: 55.00, reason: "Support/Resistance", stopLoss: "Dưới support", takeProfit: "Resistance", note: "Bounce trên support mạnh", createdAt: Date.now() },
  { date: "2026-03-09", pair: "XAUUSD", platform: "Exness", type: "BUY", emotion: "Bình tĩnh", result: "WIN", pnl: 62.00, reason: "Pullback", stopLoss: "Dưới pullback zone", takeProfit: "Đỉnh cũ", note: "Pullback về FVG H4", createdAt: Date.now() },
];

const defaultLibrary = {
  pairs: ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "ETHUSDT", "SOLUSDT"],
  emotions: ["Tự tin", "Bình tĩnh", "FOMO", "Sợ hãi", "Tham lam", "Nóng vội", "Revenge trade", "Không chắc chắn"],
  reasons: ["Breakout", "Pullback", "Support/Resistance", "Trendline", "Supply/Demand", "News", "Cảm tính", "Pattern (nến)"],
  strategies: ["Scalping", "Day trade", "Swing", "Position"],
  platforms: ["Exness", "Binance"],
  timeframes: ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"],
  tags: ["Scalping", "Swing", "Breakout", "Reversal", "Trend following", "Counter-trend", "News trading"],
};

async function seed() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("❌ Usage: npx tsx src/scripts/seed.ts <USER_UID>");
    console.error("   Get your UID from Firebase Console > Authentication > Users");
    process.exit(1);
  }

  console.log(`🌱 Seeding database for user: ${uid}...`);

  // Seed library under user path
  console.log("📚 Setting up dropdown library...");
  await setDoc(doc(db, "users", uid, "settings", "dropdownLibrary"), defaultLibrary);
  console.log("✅ Library created");

  // Seed trades under user path
  console.log("📝 Adding trades...");
  for (const trade of trades) {
    await addDoc(collection(db, "users", uid, "trades"), trade);
    console.log(`  ✅ ${trade.date} ${trade.pair} ${trade.type} ${trade.result} $${trade.pnl}`);
  }

  console.log(`\n🎉 Done! Added ${trades.length} trades for user ${uid}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
