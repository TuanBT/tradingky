// Smoke test: create diverse trades to test all UI states
// Run: npx tsx src/scripts/smoke-test.ts <USER_UID>

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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

const chartImage = "https://s3.tradingview.com/z/ZGl2xWym_mid.webp?v=1770419069";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: npx tsx src/scripts/smoke-test.ts <USER_UID>");
  process.exit(1);
}

const trades = [
  // 1. Full info, CLOSED WIN, starred, with time
  {
    date: "2026-03-10",
    pair: "XAUUSD",
    platform: "Exness",
    type: "BUY",
    emotion: "😎 Tự tin",
    result: "WIN",
    status: "CLOSED",
    pnl: 125.50,
    stopLoss: "20 pips",
    takeProfit: "60 pips",
    chartImageUrl: chartImage,
    note: "Breakout mạnh qua resistance 2045, volume tăng đột biến. Entry sau pullback về retest.",
    entryPrice: 2045.30,
    lotSize: 0.5,
    timeframe: "H1",
    closeDate: "2026-03-10",
    entryTime: "09:30",
    closeTime: "14:15",
    exitReason: "Chạm TP đặt trước, đạt 3R target",
    lessonsLearned: "Breakout + volume = xác suất cao. Kiên nhẫn chờ confirmation là chìa khoá.",
    starred: true,
    createdAt: Date.now() - 3600000,
  },
  // 2. CLOSED LOSS, full info
  {
    date: "2026-03-09",
    pair: "BTCUSDT",
    platform: "Binance",
    type: "SELL",
    emotion: "😱 FOMO",
    result: "LOSS",
    status: "CLOSED",
    pnl: -87.25,
    stopLoss: "500 points",
    takeProfit: "1500 points",
    chartImageUrl: chartImage,
    note: "Short theo divergence nhưng trend vẫn mạnh. Entry quá vội.",
    entryPrice: 68500,
    lotSize: 0.01,
    timeframe: "H4",
    closeDate: "2026-03-09",
    entryTime: "22:10",
    closeTime: "08:45",
    exitReason: "SL hit - không chờ confirmation",
    lessonsLearned: "Không nên FOMO vào khi giá đã chạy xa. Cần chờ nến confirm.",
    starred: false,
    createdAt: Date.now() - 86400000,
  },
  // 3. OPEN trade, minimal info (no advanced fields)
  {
    date: "2026-03-10",
    pair: "EURUSD",
    type: "BUY",
    emotion: "🧘 Bình tĩnh",
    result: "WIN",
    status: "OPEN",
    note: "Mua theo trend D1, chờ pullback xong.",
    entryTime: "10:00",
    starred: false,
    createdAt: Date.now() - 1800000,
  },
  // 4. CLOSED BREAKEVEN, starred
  {
    date: "2026-03-08",
    pair: "GBPUSD",
    platform: "Exness",
    type: "SELL",
    emotion: "🤔 Không chắc chắn",
    result: "BREAKEVEN",
    status: "CLOSED",
    pnl: 0,
    stopLoss: "30 pips",
    takeProfit: "90 pips",
    chartImageUrl: chartImage,
    entryPrice: 1.2650,
    lotSize: 0.3,
    timeframe: "M15",
    closeDate: "2026-03-08",
    entryTime: "15:30",
    closeTime: "16:45",
    exitReason: "Dời SL về break even, bị hit khi giá oscillate",
    starred: true,
    createdAt: Date.now() - 172800000,
  },
  // 5. OPEN trade with advanced info, starred
  {
    date: "2026-03-10",
    pair: "SOLUSDT",
    platform: "Binance",
    type: "BUY",
    emotion: "🤑 Tham lam",
    result: "WIN",
    status: "OPEN",
    stopLoss: "5%",
    takeProfit: "15%",
    entryPrice: 142.50,
    lotSize: 10,
    timeframe: "D1",
    note: "Swing trade theo trend lên. SOL có momentum mạnh.",
    entryTime: "08:00",
    starred: true,
    createdAt: Date.now() - 900000,
  },
  // 6. CLOSED WIN, no image, no note, minimal
  {
    date: "2026-03-07",
    pair: "USDJPY",
    type: "BUY",
    emotion: "😤 Nóng vội",
    result: "WIN",
    status: "CLOSED",
    pnl: 45.00,
    timeframe: "M5",
    closeDate: "2026-03-07",
    entryTime: "07:15",
    closeTime: "07:45",
    lessonsLearned: "Scalp nhanh được lợi nhuận nhưng rất căng thẳng, không nên lặp lại.",
    createdAt: Date.now() - 259200000,
  },
  // 7. CLOSED LOSS, revenge trade
  {
    date: "2026-03-09",
    pair: "XAUUSD",
    platform: "Exness",
    type: "SELL",
    emotion: "😡 Revenge trade",
    result: "LOSS",
    status: "CLOSED",
    pnl: -200.00,
    stopLoss: "50 pips",
    chartImageUrl: chartImage,
    note: "Revenge trade sau khi thua lệnh trước. Vào lệnh không có setup, chỉ vì muốn gỡ.",
    entryPrice: 2055.00,
    lotSize: 1.0,
    timeframe: "M15",
    closeDate: "2026-03-09",
    entryTime: "16:00",
    closeTime: "16:30",
    exitReason: "SL hit ngay lập tức",
    lessonsLearned: "Revenge trade = tự huỷ tài khoản. DỪNG lại sau khi thua, nghỉ ít nhất 1 giờ.",
    starred: false,
    createdAt: Date.now() - 80000000,
  },
  // 8. CLOSED WIN, different day, no platform
  {
    date: "2026-03-06",
    pair: "ETHUSDT",
    type: "BUY",
    emotion: "💪 Kiên nhẫn",
    result: "WIN",
    status: "CLOSED",
    pnl: 310.75,
    takeProfit: "10%",
    entryPrice: 3200,
    lotSize: 0.5,
    timeframe: "H4",
    closeDate: "2026-03-08",
    entryTime: "20:00",
    closeTime: "10:30",
    note: "Swing trade 2 ngày, giữ lệnh qua đêm. ETH breakout channel.",
    exitReason: "Đạt target 10%",
    lessonsLearned: "Swing trade cần kiên nhẫn, nhưng RR rất tốt khi chọn đúng điểm vào.",
    starred: false,
    createdAt: Date.now() - 345600000,
  },
];

async function seed() {
  const col = collection(db, "users", uid, "trades");
  let count = 0;
  for (const trade of trades) {
    await addDoc(col, trade);
    count++;
    console.log(`[${count}/${trades.length}] ${trade.pair} ${trade.type} ${trade.status} ${trade.result}`);
  }
  console.log(`\nDone! Created ${count} smoke-test trades for uid: ${uid}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
