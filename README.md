# math-leaderboard

Mobile-friendly 1-minute math game with customizable game configurations, multi-user support, and per-game leaderboards.

Live on GitHub Pages: **https://kssilveira.github.io/math-leaderboard/**

## Features

- **Multi-User Support**:
  - Generates a random username saved in `localStorage`, editable anytime in the header.
  - Add (`+ User`), switch, and delete (`✕`) users so multiple people can play on the same device.
  - Users are shared across all game configurations and leaderboards.
- **Multiple Game Configurations**:
  - Default game: `+ − (0..10, 0..10, 0..20)`.
  - Create new game configurations (`+ Game`), switch between them, or delete (`✕`) them.
  - Configurations are immutable after creation so leaderboards remain valid.
  - Choose which operators to include out of `+`, `−`, `×`, and `÷`.
  - Set integer `min` and `max` constraints on each of the 3 numbers in the equation (with division restricted to exact integers).
- **1-Minute Math Game**:
  - Randomly hides one of the 3 numbers in the equation (`a op b = c`).
  - On-screen mobile keypad formatted with 3 digits per row (plus physical keyboard support).
  - Right answers automatically advance to the next question.
  - Wrong answers stay visible and are automatically erased when a new answer starts being typed.
  - Score is `total right - total wrong` in the 1-minute window (ending a game early also saves the current score).
- **Leaderboards**:
  - Each game configuration has its own separate leaderboard.
  - Shows the Top 10 users and the rank and best score of the current user.

## Running Locally

```bash
python3 -m http.server 8000 --bind ::
```

## Cloud Leaderboard Setup (Optional)

By default, leaderboards use `localStorage` so the app works out of the box. To share scores across devices on GitHub Pages, configure `CLOUD_CONFIG` at the top of [`app.js`](app.js):

### Option A: Firebase Realtime Database
1. Create a Firebase project and enable **Realtime Database**.
2. Set `CLOUD_CONFIG.firebaseDbUrl` in `app.js` to your database URL (e.g. `https://your-project-default-rtdb.firebaseio.com`).

### Option B: Supabase
1. Create a Supabase table `leaderboard` with columns: `configId` (`text`), `userId` (`text`), `username` (`text`), `score` (`int4`), `updatedAt` (`int8`), with primary key `(configId, userId)`.
2. Set `CLOUD_CONFIG.supabaseUrl` and `CLOUD_CONFIG.supabaseAnonKey` in `app.js`.
