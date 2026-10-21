# math-leaderboard

Mobile-friendly 1-minute math game with shared game configurations, multi-user support, and global leaderboards backed by Firebase Realtime Database.

Live on GitHub Pages: **https://kssilveira.github.io/math-leaderboard/**

## Features

- **Multi-User Support**:
  - Generates a random username saved in `localStorage`, editable anytime in the header.
  - Add (`+ User`), switch, and delete (`✕`) users so multiple people can play on the same device.
  - Users are shared across all game configurations and leaderboards.
- **Shared Game Configurations**:
  - Default game: `+ − (0..10, 0..10, 0..20)`.
  - Create new game configurations (`+ Game`) with any subset of operators (`+`, `−`, `×`, `÷`) and integer `min`/`max` constraints on each of the 3 numbers (with division restricted to exact integers).
  - Configurations are immutable after creation, shared globally across all users in Firebase, and sorted by the size of their leaderboards.
  - Creating a configuration that already exists automatically selects the existing one.
- **1-Minute Math Game**:
  - Randomly hides one of the 3 numbers in the equation (`a op b = c`).
  - On-screen mobile keypad formatted with 3 digits per row (plus physical keyboard support).
  - Right answers automatically advance to the next question.
  - Wrong answers stay visible and are automatically erased when a new answer starts being typed.
  - Score is `total right - total wrong` in the 1-minute window (ending a game early also saves the current score).
- **Global Leaderboards**:
  - Each game configuration has its own global leaderboard in Firebase Realtime Database.
  - Shows the Top 10 users and the rank and best score of the current user.

## Running Locally

```bash
python3 -m http.server 8000 --bind ::
```
