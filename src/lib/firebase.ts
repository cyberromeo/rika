import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCkuExDptljH-kIN555APSeaRboZw06Vaw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'medx-e9acd.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'medx-e9acd',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'medx-e9acd.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '300960747898',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:300960747898:web:6af7f2e3c4a31ef7a946c3',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
