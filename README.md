# Barbook

Barbook is a private, phone-friendly workout logger built with React and Vite. It stores workout data in the browser so you can track training history without creating an account or relying on a backend.

GitHub: https://github.com/JCarz/workout-log

## Features

- Log workouts by date
- Add exercises and sets with reps and weight
- Repeat the most recent workout
- Review workout history and exercise trends
- Track bodyweight entries
- Export and restore backup data
- Install as a PWA for offline use

## Local storage

The app intentionally keeps the existing browser storage keys unchanged so older saved workouts continue to load without migration:

- `workout-log:workouts`
- `workout-log:bodyweight-entries`

## Development

Make sure Node.js and pnpm are available, then run:

```bash
pnpm install
pnpm dev
```

The Vite dev server will print a local URL such as http://localhost:5173/.

## Production build

```bash
pnpm build
pnpm preview
```

## Notes

The user-facing app name was updated to Barbook, but the saved data keys remain the same to avoid affecting existing records.
