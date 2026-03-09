import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBqynva_B43HZvcNW0DBAaNLAOgb4CrQ6w",
  authDomain: "tradingky-tuan.firebaseapp.com",
  databaseURL: "https://tradingky-tuan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tradingky-tuan",
  storageBucket: "tradingky-tuan.firebasestorage.app",
  messagingSenderId: "917755843505",
  appId: "1:917755843505:web:ab9928af2ee9d5b4a42390"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
