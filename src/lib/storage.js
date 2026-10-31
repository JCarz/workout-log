const WORKOUTS_KEY = 'workout-log:workouts'
const BODYWEIGHT_KEY = 'workout-log:bodyweight-entries'
const WORKOUT_DRAFT_KEY = 'workout-log:draft'

function isDraftInputValue(value) {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
}

function isWorkoutDraft(draft) {
  return (
    draft &&
    typeof draft === 'object' &&
    typeof draft.date === 'string' &&
    Array.isArray(draft.exercises) &&
    draft.exercises.every(
      (exercise) =>
        exercise &&
        typeof exercise.id === 'string' &&
        typeof exercise.name === 'string' &&
        Array.isArray(exercise.sets) &&
        exercise.sets.every(
          (set) =>
            set &&
            typeof set.id === 'string' &&
            isDraftInputValue(set.reps) &&
            isDraftInputValue(set.weight),
        ),
    )
  )
}

export function loadWorkoutDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(WORKOUT_DRAFT_KEY) ?? 'null')
    return isWorkoutDraft(draft)
      ? { ...draft, editingWorkoutId: typeof draft.editingWorkoutId === 'string' ? draft.editingWorkoutId : '' }
      : null
  } catch {
    return null
  }
}

export function saveWorkoutDraft(draft) {
  try {
    localStorage.setItem(WORKOUT_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Draft recovery is best effort when storage is unavailable or full.
  }
}

export function clearWorkoutDraft() {
  try {
    localStorage.removeItem(WORKOUT_DRAFT_KEY)
  } catch {
    // Keep the form usable when storage is unavailable.
  }
}

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
