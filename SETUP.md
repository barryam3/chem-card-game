# Chemistry Card Game - Setup Instructions

## Overview
This is an online multiplayer chemistry card game built with React and Firebase. Players draft chemistry element cards and score points based on various chemistry-related criteria.

## Prerequisites
- Node.js (version 16 or higher)
- npm or yarn
- A Firebase project

## Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database

2. **Configure Firebase**
   - Update `src/firebase.ts` with your Firebase configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

3. **Set up Firestore Rules**
   - In Firebase Console, go to Firestore Database > Rules
   - Set rules to allow read/write access (for development):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:5173`

## How to Play

1. **Start a Game**
   - Enter your name
   - Click "Create Game" to start a new game
   - Share the Game ID with other players

2. **Join a Game**
   - Enter your name and the Game ID
   - Click "Join Game"

3. **Game Flow**
   - **Lobby**: Wait for players to join, host can start when ready
   - **Drafting**: Select cards from your hand to draft
   - **Scoring**: View final scores and results

## Game Rules

The game follows the rules defined in `RULES.md`:
- **Atomic Number**: Score points for consecutive atomic number sequences
- **Atomic Mass**: Compare total mass with neighbors
- **Atomic Symbol**: Spell 5-letter words for bonus points
- **Radioactivity**: Bonus/penalty for radioactive elements
- **Ionization**: Score for matching positive/negative ion pairs
- **Family**: Score based on element families

## Development

- **Build for Production**: `npm run build`
- **Preview Production Build**: `npm run preview`
- **Lint Code**: `npm run lint`

## Project Structure

```
src/
├── components/          # React components
│   ├── Card.tsx        # Element card component
│   ├── DraftingPhase.tsx
│   ├── GameSetup.tsx
│   ├── Lobby.tsx
│   └── ScoringPhase.tsx
├── data.ts             # Element data and types
├── firebase.ts         # Firebase configuration
├── firebaseService.ts  # Firebase operations
├── gameLogic.ts        # Game rules and scoring
├── types.ts           # TypeScript type definitions
└── App.tsx            # Main application component
```

## Notes

- The game uses real-time updates via Firebase Firestore
- Card images are stored in `src/assets/`
- The game supports 2-10 players
- All game logic runs client-side for simplicity
