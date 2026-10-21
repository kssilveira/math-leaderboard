# math-leaderboard

Mobile-friendly 1-minute math game (`+` and `-` with single-digit numbers and non-negative totals) with a global leaderboard.

## Features

- **Multi-User Support**: Random username generated and saved in `localStorage`, editable anytime in the header. Add, switch, and delete users so multiple people can play on the same device. Users are shared across all game configurations and leaderboards.
- **Multiple Game Configurations**:
  - Add, switch, and delete game configurations (configurations are immutable after creation so leaderboards remain valid).
  - Choose which operators to include out of `+`, `−`, `×`, and `÷`.
  - Set integer `min` and `max` constraints on each of the 3 numbers in the equation (with division restricted to exact integers).
  - Each game configuration has its own separate leaderboard.
- **1-Minute Math Game**:
  - Single-digit addition (`a + b = c`) and subtraction (`a - b = c` with `c >= 0`).
  - Randomly hides one of the 3 numbers in the equation.
  - On-screen mobile keypad with 3 digits per row.
  - Correct answers automatically advance to the next question.
  - Wrong answers stay visible and are automatically erased as soon as a new answer starts being typed.
  - Score is `total right - total wrong` over the 60-second window.
- **Global Leaderboard**: Displays the Top 10 users and the current user's global rank and best score.

## Cloud Leaderboard Setup (GitHub Pages)

By default, the leaderboard falls back to `localStorage` so it works out of the box. To share scores globally on GitHub Pages, set `CLOUD_CONFIG` at the top of [`app.js`](app.js):

### Option A: Firebase Realtime Database
1. Create a Firebase project and enable **Realtime Database**.
2. Set `CLOUD_CONFIG.firebaseDbUrl` in `app.js` to your database URL (e.g. `https://your-project-default-rtdb.firebaseio.com`).

### Option B: Supabase
1. Create a Supabase table `leaderboard` with columns: `userId` (`text`, primary key), `username` (`text`), `score` (`int4`), `updatedAt` (`int8`).
2. Set `CLOUD_CONFIG.supabaseUrl` and `CLOUD_CONFIG.supabaseAnonKey` in `app.js`.
