# Workout Log

## What the app does

Workout Log is a phone-friendly Vite and React app for recording workouts in the browser. It lets you:

- Choose a workout date, which defaults to today.
- Add exercises and record sets with reps and weight in pounds.
- Repeat the most recent workout to pre-fill a new session with fresh copies of its exercises and sets.
- Browse saved workouts by date.
- Tap an exercise to see its history across workouts, including each set's reps and weight.
- Edit saved workouts or delete them after a confirmation prompt.

There is no backend or account system. Workouts are saved in the current browser's `localStorage` under `workout-log:workouts`, so they remain after a refresh. Clearing the browser's site data will remove them.

## How to run it

Install Node.js and pnpm, then run these commands from the project directory:

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. To check the production build instead:

```bash
pnpm build
pnpm preview
```

## Possible next steps

- Support bodyweight sets without requiring a numeric weight.
- Show a weekly workout-session count.
- Import past workouts from pasted text with a review step before saving.
- Add an export or backup option before introducing a backend.
