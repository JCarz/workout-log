const WORKOUTS_KEY = 'workout-log:workouts'
const BODYWEIGHT_KEY = 'workout-log:bodyweight-entries'

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

export function saveWorkouts(newWorkouts) {
  const workouts = loadWorkouts()
  const updatedWorkouts = [...workouts, ...newWorkouts]

  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
  return updatedWorkouts
}

export function updateWorkout(updatedWorkout) {
  const workouts = loadWorkouts()
  const updatedWorkouts = workouts.map((workout) =>
    workout.id === updatedWorkout.id ? updatedWorkout : workout,
  )

  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
  return updatedWorkouts
}

export function deleteWorkout(workoutId) {
  const workouts = loadWorkouts()
  const updatedWorkouts = workouts.filter((workout) => workout.id !== workoutId)

  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(updatedWorkouts))
  return updatedWorkouts
}

export function loadBodyweightEntries() {
  try {
    const savedEntries = JSON.parse(localStorage.getItem(BODYWEIGHT_KEY) ?? '[]')
    return Array.isArray(savedEntries) ? savedEntries : []
  } catch {
    return []
  }
}

export function saveBodyweightEntry(entry) {
  const entries = loadBodyweightEntries()
  const updatedEntries = [...entries, entry]

  localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(updatedEntries))
  return updatedEntries
}

export function restoreAllData({ workouts, bodyweightEntries }) {
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts))
  localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(bodyweightEntries))

  return { workouts, bodyweightEntries }
}
