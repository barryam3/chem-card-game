import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration - Production
const firebaseConfig = {
  apiKey: "AIzaSyAxeBAxKalFCIl6Buut5y5eG7Kee47mENs",
  authDomain: "chem-card-game.firebaseapp.com",
  projectId: "chem-card-game",
  storageBucket: "chem-card-game.firebasestorage.app",
  messagingSenderId: "484362725443",
  appId: "1:484362725443:web:3274afc3c009e271b8ccf6",
  measurementId: "G-099MXETX8X"
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
