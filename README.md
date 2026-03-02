# SuperTasks

A supercharged Google Tasks desktop app with calendar integration, habit tracking, focus timer, and AI-powered planning.

## Features

- **Google Tasks sync** — Full two-way sync with Google Tasks
- **Google Calendar integration** — View and manage calendar events alongside tasks
- **Google Drive backup** — App data stored in Drive's appdata folder
- **Habit tracking** — Build and maintain daily habits
- **Focus timer** — Pomodoro-style timer for deep work
- **Quick capture** — Global hotkey to add tasks from anywhere
- **AI planning** — Intelligent task planning via Anthropic, Google Gemini, and OpenAI
- **Mood tracker** — Track mood and energy levels over time
- **Time tracking** — Log time spent on tasks
- **Offline support** — Works without an internet connection
- **System tray** — Runs quietly in your system tray

## Tech Stack

- **Electron** — Desktop app framework
- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** (electron-vite) — Build tooling
- **googleapis** — Google API client

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

## Environment Setup

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

These values are baked into the build at compile time via `electron.vite.config.ts`.

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project
2. **Enable APIs** — Navigate to "APIs & Services > Library" and enable:
   - Google Tasks API
   - Google Calendar API
   - Google Drive API
3. **Configure OAuth consent screen** — Go to "APIs & Services > OAuth consent screen":
   - Choose "External" user type (or "Internal" for Workspace)
   - Add the scopes listed in [Google API Scopes](#google-api-scopes) below
   - Add your Google account as a test user
4. **Create OAuth credentials** — Go to "APIs & Services > Credentials":
   - Click "Create Credentials > OAuth client ID"
   - Application type: **Desktop app**
   - Download the JSON and copy the Client ID and Client Secret into your `.env` file
5. **Redirect URI** — The app uses a local callback server at:
   ```
   http://localhost:52836/callback
   ```

## Google API Scopes

The app requests the following OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/tasks` | Full access to Google Tasks (read, create, update, delete) |
| `https://www.googleapis.com/auth/calendar.events` | Read and write Google Calendar events |
| `https://www.googleapis.com/auth/drive.appdata` | App-specific storage in Google Drive (for backups/sync) |

## Installation & Running

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

## Building for Distribution

```bash
# Build the app (no packaging)
npm run build

# Windows — NSIS installer
npm run dist:installer

# Windows — Portable executable
npm run dist:portable

# Windows — Default
npm run dist

# Linux
npm run dist:linux
```
