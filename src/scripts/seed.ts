// Script to seed Firebase with test data
// Run: npx tsx src/scripts/seed.ts <USER_UID>

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";

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

const pairs = ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "ETHUSDT", "SOLUSDT", "AUDUSD"];
const platforms = ["Exness", "Binance", "XM"];
const emotions = ["😎 Tự tin", "🧘 Bình tĩnh", "😱 FOMO", "😨 Sợ hãi", "🤑 Tham lam", "😤 Nóng vội", "😡 Revenge trade", "🤔 Không chắc chắn", "🤩 Hào hứng", "💪 Kiên nhẫn"];
const exitReasons = [
  "Chạm TP đặt trước", "Trailing stop hit", "Manual close khi thấy divergence",
  "SL hit", "Break even sau khi dời SL", "Chạm resistance, close 80%",
  "Volume giảm, momentum yếu", "News bất ngờ, close tay", "Đạt 3R target",
  "Sợ mất lợi nhuận nên close sớm", "Cuối ngày close hết", "Retest thất bại",
];
const lessons = [
  "Kiên nhẫn chờ confirmation là chìa khoá", "Không nên FOMO vào khi giá đã chạy xa",
  "Quản lý vốn quan trọng hơn phân tích", "Revenge trade = tự huỷ tài khoản",
  "Nên có checklist trước mỗi lệnh", "Setup breakout + volume = xác suất cao",
  "Pullback về EMA50 trong trend có RR tốt", "Luôn kiểm tra trend H4 trước khi vào H1",
  "Trailing stop giúp tối đa lợi nhuận", "News event làm tăng volatility - cần SL rộng hơn",
  "Sợ hãi dời SL sớm = mất cơ hội", "Đừng bao giờ tăng lot size vì tự tin thắng",
  "Chờ nến confirm trước khi vào - tránh fake breakout", "Trade London session cho GBP hiệu quả nhất",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPnl(result: string): number {
  if (result === "WIN") return +(Math.random() * 180 + 10).toFixed(2);
  if (result === "LOSS") return +(-Math.random() * 120 - 5).toFixed(2);
  return 0;
}

function generateTrades() {
  const trades: Record<string, unknown>[] = [];
  
  // Generate trades from Jan 2024 to Mar 2026 (~26 months)
  const startDate = new Date("2024-01-02");
  const endDate = new Date("2026-03-09");
  
  // ~3-5 trades per week = roughly 12-20 per month
  const current = new Date(startDate);
  let id = 0;
  
  while (current <= endDate) {
    // Decide how many trades this day (0-3)
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend: rarely trade
      if (Math.random() > 0.15) { current.setDate(current.getDate() + 1); continue; }
    }
    
    const tradesThisDay = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : 3;
    
    for (let i = 0; i < tradesThisDay; i++) {
      id++;
      const dateStr = current.toISOString().split("T")[0];
      const pair = pick(pairs);
      const platform = pair.includes("USD") && !pair.includes("USDT") ? pick(["Exness", "XM"]) : "Binance";
      const type = Math.random() > 0.45 ? "BUY" as const : "SELL" as const;
      const emotion = pick(emotions);
      
      // Result distribution: ~55% WIN, ~30% LOSS, ~15% BREAKEVEN
      const rng = Math.random();
      const result = rng < 0.55 ? "WIN" as const : rng < 0.85 ? "LOSS" as const : "BREAKEVEN" as const;
      const pnl = randomPnl(result);
      
      const trade: Record<string, unknown> = {
        date: dateStr,
        pair,
        platform,
        type,
        emotion,
        result,
        pnl,
        status: "CLOSED" as const,
        createdAt: current.getTime() + i * 3600000,
      };
      
      // Add prices for ~70% of trades
      if (Math.random() < 0.7) {
        if (pair === "XAUUSD") {
          const base = 1900 + Math.random() * 1100;
          trade.entryPrice = +base.toFixed(2);
          trade.exitPrice = +(base + (result === "WIN" ? Math.random() * 50 : -Math.random() * 30) * (type === "BUY" ? 1 : -1)).toFixed(2);
          trade.lotSize = +(Math.random() * 0.5 + 0.1).toFixed(2);
        } else if (pair === "BTCUSDT") {
          const base = 25000 + Math.random() * 70000;
          trade.entryPrice = +base.toFixed(0);
          trade.exitPrice = +(base + (result === "WIN" ? Math.random() * 3000 : -Math.random() * 2000) * (type === "BUY" ? 1 : -1)).toFixed(0);
          trade.lotSize = +(Math.random() * 0.02 + 0.001).toFixed(3);
        } else if (pair === "ETHUSDT" || pair === "SOLUSDT") {
          const base = pair === "ETHUSDT" ? 1500 + Math.random() * 2500 : 20 + Math.random() * 230;
          trade.entryPrice = +base.toFixed(2);
          trade.exitPrice = +(base + (result === "WIN" ? Math.random() * 100 : -Math.random() * 60) * (type === "BUY" ? 1 : -1)).toFixed(2);
          trade.lotSize = +(Math.random() * 0.5 + 0.01).toFixed(3);
        } else {
          const base = pair === "USDJPY" ? 140 + Math.random() * 20 : 1.0 + Math.random() * 0.5;
          trade.entryPrice = +base.toFixed(pair === "USDJPY" ? 3 : 5);
          trade.exitPrice = +(base + (result === "WIN" ? 0.001 + Math.random() * 0.01 : -(0.001 + Math.random() * 0.008)) * (type === "BUY" ? 1 : -1)).toFixed(pair === "USDJPY" ? 3 : 5);
          trade.lotSize = +(Math.random() * 0.5 + 0.1).toFixed(2);
        }
        trade.stopLoss = "Theo setup";
        trade.takeProfit = "Theo setup";
      }
      
      // Add note for ~80% of trades
      if (Math.random() < 0.8) {
        trade.note = `${emotion === "FOMO" ? "Vào hơi vội, cần cải thiện." : emotion === "Revenge trade" ? "Đang nóng sau lệnh thua trước." : "Setup nhìn OK theo kế hoạch."}`;
      }
      
      // Add exit review for ~60% of closed trades
      if (Math.random() < 0.6) {
        trade.exitReason = pick(exitReasons);
        if (Math.random() < 0.5) {
          trade.lessonsLearned = pick(lessons);
        }
      }
      
      trades.push(trade);
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  // Add 5 OPEN trades at the end (most recent)
  const openTrades = [
    {
      date: "2026-03-09", pair: "XAUUSD", platform: "Exness", type: "BUY" as const,
      emotion: "😎 Tự tin", result: "WIN" as const, pnl: 0, status: "OPEN" as const,
      stopLoss: "2920", takeProfit: "2980",
      entryPrice: 2935, lotSize: 0.3,
      note: "Break ra khỏi accumulation 2920-2935, entry khi retest thành công.",
      createdAt: Date.now() - 3600000,
    },
    {
      date: "2026-03-09", pair: "BTCUSDT", platform: "Binance", type: "SELL" as const,
      emotion: "🧘 Bình tĩnh", result: "WIN" as const, pnl: 0, status: "OPEN" as const,
      stopLoss: "69500", takeProfit: "66000", entryPrice: 68800, lotSize: 0.005,
      note: "RSI divergence bearish rõ khi test resistance 69000.",
      createdAt: Date.now() - 1800000,
    },
    {
      date: "2026-03-09", pair: "GBPUSD", platform: "Exness", type: "BUY" as const,
      emotion: "🤔 Không chắc chắn", result: "WIN" as const, pnl: 0, status: "OPEN" as const,
      stopLoss: "1.2650", takeProfit: "1.2780", entryPrice: 1.2700, lotSize: 0.2,
      note: "Bounce trên support 1.2650, NFP sắp ra - SL chặt.",
      createdAt: Date.now() - 900000,
    },
    {
      date: "2026-03-09", pair: "ETHUSDT", platform: "Binance", type: "BUY" as const,
      emotion: "🤩 Hào hứng", result: "WIN" as const, pnl: 0, status: "OPEN" as const,
      stopLoss: "3400", takeProfit: "3700", entryPrice: 3520, lotSize: 0.1,
      note: "ETH break trendline giảm kéo dài 2 tháng, volume spike.",
      createdAt: Date.now() - 600000,
    },
    {
      date: "2026-03-09", pair: "USDJPY", platform: "XM", type: "SELL" as const,
      emotion: "🧘 Bình tĩnh", result: "WIN" as const, pnl: 0, status: "OPEN" as const,
      stopLoss: "152.500", takeProfit: "149.000", entryPrice: 151.200, lotSize: 0.3,
      note: "Double top rõ ràng trên H4, BOJ có thể can thiệp.",
      createdAt: Date.now() - 300000,
    },
  ];
  
  trades.push(...openTrades);
  return trades;
}

const defaultLibrary = {
  pairs: ["XAUUSD", "BTCUSDT", "EURUSD", "GBPUSD", "USDJPY", "ETHUSDT", "SOLUSDT", "AUDUSD"],
  emotions: ["😎 Tự tin", "🧘 Bình tĩnh", "😱 FOMO", "😨 Sợ hãi", "🤑 Tham lam", "😤 Nóng vội", "😡 Revenge trade", "🤔 Không chắc chắn", "🤩 Hào hứng", "💪 Kiên nhẫn"],
  platforms: ["Exness", "Binance", "XM"],
  timeframes: ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"],
};

async function seed() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("❌ Usage: npx tsx src/scripts/seed.ts <USER_UID>");
    console.error("   Get your UID from Firebase Console > Authentication > Users");
    process.exit(1);
  }

  console.log(`🌱 Seeding database for user: ${uid}...`);

  // Delete old trades first
  console.log("🗑️  Deleting old trades...");
  const oldTrades = await getDocs(collection(db, "users", uid, "trades"));
  let deleteCount = 0;
  for (const d of oldTrades.docs) {
    await deleteDoc(d.ref);
    deleteCount++;
  }
  console.log(`  ✅ Deleted ${deleteCount} old trades`);

  // Seed library under user path
  console.log("📚 Setting up dropdown library...");
  await setDoc(doc(db, "users", uid, "settings", "dropdownLibrary"), defaultLibrary);
  console.log("✅ Library created");

  // Generate and seed trades
  const trades = generateTrades();
  console.log(`📝 Adding ${trades.length} trades...`);
  let batch = 0;
  for (const trade of trades) {
    await addDoc(collection(db, "users", uid, "trades"), trade);
    batch++;
    if (batch % 50 === 0) console.log(`  ⏳ ${batch}/${trades.length}...`);
  }

  console.log(`\n🎉 Done! Added ${trades.length} trades for user ${uid}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
