import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "chem-card-game.firebaseapp.com",
  projectId: "chem-card-game",
  storageBucket: "chem-card-game.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to emulator in development
if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔥 Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator already connected or not available');
  }
}

export default app;
