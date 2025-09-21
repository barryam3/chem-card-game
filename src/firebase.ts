import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Development Firebase configuration (demo project for emulator)
const devFirebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-chem-card-game",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id",
};

// Production Firebase configuration
const prodFirebaseConfig = {
  apiKey: "AIzaSyAxeBAxKalFCIl6Buut5y5eG7Kee47mENs",
  authDomain: "chem-card-game.firebaseapp.com",
  projectId: "chem-card-game",
  storageBucket: "chem-card-game.firebasestorage.app",
  messagingSenderId: "484362725443",
  appId: "1:484362725443:web:3274afc3c009e271b8ccf6",
  measurementId: "G-099MXETX8X",
};

// Use appropriate config based on environment
const firebaseConfig = import.meta.env.DEV
  ? devFirebaseConfig
  : prodFirebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Connect to emulator in development
if (import.meta.env.DEV) {
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch (error) {
    console.warn(
      "⚠️ Could not connect to Firestore emulator:",
      error instanceof Error ? error.message : String(error)
    );
    console.warn("Make sure to run: npm run dev:emulator");
  }
}

export default app;
