import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCkuExDptljH-kIN555APSeaRboZw06Vaw',
  authDomain: 'medx-e9acd.firebaseapp.com',
  projectId: 'medx-e9acd',
  storageBucket: 'medx-e9acd.firebasestorage.app',
  messagingSenderId: '300960747898',
  appId: '1:300960747898:web:6af7f2e3c4a31ef7a946c3',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
