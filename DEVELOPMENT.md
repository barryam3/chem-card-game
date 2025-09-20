# Development Guide - Local Firebase Emulator

## Overview
This project is set up to use Firebase Emulator Suite for local development, allowing you to develop and test the multiplayer chemistry card game without needing a real Firebase project or internet connection.

## Quick Start

### Option 1: Run Everything Together (Recommended)
```bash
npm run dev
```
This will start both the Firebase emulator and the React development server simultaneously.

### Option 2: Run Separately
```bash
# Terminal 1: Start Firebase emulator
npm run dev:emulator

# Terminal 2: Start React dev server
npm run dev:app
```

## What's Running

### Firebase Emulator
- **Firestore Emulator**: `http://localhost:8080`
- **Emulator UI**: `http://localhost:4000` (when emulator is running)
- **Project ID**: `chem-card-game`

### React Development Server
- **App**: `http://localhost:5173` (or 5174 if 5173 is taken)

## Emulator UI Features

The Firebase Emulator UI provides:
- **Data Viewer**: Browse and edit Firestore collections
- **Real-time Updates**: See data changes as they happen
- **Collection Management**: Add, edit, delete documents
- **Query Testing**: Test Firestore queries

## Development Workflow

1. **Start Development Environment**
   ```bash
   npm run dev
   ```

2. **Open Multiple Browser Tabs**
   - `http://localhost:5173` (or 5174) - Your React app
   - `http://localhost:4001` - Firebase Emulator UI

3. **Test Multiplayer Features**
   - Create a game in one tab
   - Join the same game in another tab
   - Watch real-time updates in both the app and emulator UI

4. **Debug Data**
   - Use the Emulator UI to inspect game state
   - Manually edit documents to test edge cases
   - Clear data between tests

## Emulator Data Persistence

By default, emulator data is stored in memory and cleared when you restart. To persist data between sessions:

1. **Add to firebase.json**:
   ```json
   {
     "emulators": {
       "firestore": {
         "port": 8080,
         "host": "localhost"
       },
       "ui": {
         "enabled": true
       },
       "singleProjectMode": true
     }
   }
   ```

2. **Start with data export**:
   ```bash
   firebase emulators:start --only firestore --import=./emulator-data --export-on-exit
   ```

## Testing Scenarios

### Basic Game Flow
1. Create a game → Check `lobbies` collection
2. Join game → Verify player added to lobby
3. Start game → Check `games` collection, lobby removed
4. Draft cards → Watch real-time updates
5. View scoring → Check final game state

### Edge Cases
- Multiple players joining simultaneously
- Network disconnections
- Invalid game IDs
- Malformed data

## Troubleshooting

### Emulator Won't Start
```bash
# Check if ports are available
lsof -i :8080
lsof -i :4000

# Kill processes if needed
kill -9 <PID>
```

### Connection Issues
- Ensure emulator is running before starting React app
- Check browser console for connection errors
- Verify project ID matches in firebase.json

### Data Not Persisting
- Emulator data is in-memory by default
- Use `--import` and `--export-on-exit` flags for persistence
- Check emulator logs for errors

## Production Deployment

When ready for production:

1. **Update firebase.ts** to use real Firebase project
2. **Set up Firebase project** with proper security rules
3. **Deploy to hosting** (Firebase Hosting, Vercel, etc.)

## Useful Commands

```bash
# Start emulator only
firebase emulators:start --only firestore

# Start with UI
firebase emulators:start --only firestore --ui

# Start with data import/export
firebase emulators:start --only firestore --import=./data --export-on-exit

# Clear all emulator data
firebase emulators:exec --only firestore "echo 'Data cleared'"

# View emulator logs
firebase emulators:start --only firestore --debug
```

## Security Rules (Development)

For development, you can use permissive rules:
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

**⚠️ Never use these rules in production!**
