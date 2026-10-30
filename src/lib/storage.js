const WORKOUTS_KEY = 'workout-log:workouts'

export function loadWorkouts() {
  try {
    const savedWorkouts = JSON.parse(localStorage.getItem(WORKOUTS_KEY) ?? '[]')
    return Array.isArray(savedWorkouts) ? savedWorkouts : []
  } catch {
    return []
  }
}

export function saveWorkout(workout) {
  const workouts = loadWorkouts()
  const updatedWorkouts = [...workouts, workout]

  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
  return updatedWorkouts
}
