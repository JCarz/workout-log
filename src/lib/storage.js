const WORKOUTS_KEY = 'workout-log:workouts'

export function saveWorkout(workout) {
  const savedWorkouts = JSON.parse(localStorage.getItem(WORKOUTS_KEY) ?? '[]')
  const workouts = Array.isArray(savedWorkouts) ? savedWorkouts : []

  localStorage.setItem(WORKOUTS_KEY, JSON.stringify([...workouts, workout]))
}
