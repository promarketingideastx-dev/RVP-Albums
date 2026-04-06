import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD1qoUrabmSQ-Uhc7TV4wE-eFxrkBTSKAg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rvp-albums-saas.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rvp-albums-saas",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rvp-albums-saas.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "54014594294",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:54014594294:web:cff957abb8de8aa2cef0d7"
};

// Singleton pattern to avoid re-initializing during Hot Reloading in Next.js
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
