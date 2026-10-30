# Barbook

## What the app does

Barbook is a phone-friendly Vite and React app for recording workouts in the browser. It lets you:

- Choose a workout date, which defaults to today.
- Add exercises and record sets with reps and weight in pounds.
- Repeat the most recent workout to pre-fill a new session with fresh copies of its exercises and sets.
- Browse saved workouts by date.
- Tap an exercise to see its history across workouts, including each set's reps and weight.
- See an exercise's best set and its heaviest-set weight trend over time.
- Edit saved workouts or delete them after a confirmation prompt.
- Log bodyweight separately by date, see past entries, and follow a simple weight trend.
- Export all saved data to JSON or restore it from a backup file.
- Paste older workouts as plain text, review the parsed preview, and save them in one step.
- Install the app on a phone or desktop and keep using it offline after the first load.

There is no backend or account system. Workouts are saved in the current browser's localStorage under the existing keys `workout-log:workouts`, and bodyweight entries use `workout-log:bodyweight-entries`. These keys are intentionally unchanged so existing saved workouts remain available after the rename to Barbook.

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

## GitHub repository

https://github.com/JCarz/workout-log

## Possible next steps

- Support bodyweight sets without requiring a numeric weight.
- Show a weekly workout-session count.
- Add duplicate detection when importing older workouts.
- Add bodyweight editing and deletion.
