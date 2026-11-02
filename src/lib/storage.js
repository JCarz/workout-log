import { normalizeExerciseName } from './exercises.js'

const WORKOUTS_KEY = 'workout-log:workouts'
const BODYWEIGHT_KEY = 'workout-log:bodyweight-entries'
const WORKOUT_DRAFT_KEY = 'workout-log:draft'
const SCHEMA_VERSION_KEY = 'workout-log:schema-version'
const PRE_MIGRATION_BACKUP_KEY = 'workout-log:backup-pre-migration'
const PRE_EXERCISE_MERGE_BACKUP_KEY = 'workout-log:backup-pre-exercise-merge'
const LAST_BACKUP_KEY = 'workout-log:last-backup-at'
const CURRENT_SCHEMA_VERSION = 1

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function safeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeSet(set, workoutIndex, exerciseIndex, setIndex) {
  const savedSet = isRecord(set) ? set : {}
  return {
    id: safeString(savedSet.id, `legacy-set-${workoutIndex}-${exerciseIndex}-${setIndex}`),
    reps: safeNumber(savedSet.reps),
    weight: safeNumber(savedSet.weight),
  }
}

function normalizeExercise(exercise, workoutIndex, exerciseIndex) {
  const savedExercise = isRecord(exercise) ? exercise : {}
  const sets = Array.isArray(savedExercise.sets) ? savedExercise.sets : []

  return {
    id: safeString(savedExercise.id, `legacy-exercise-${workoutIndex}-${exerciseIndex}`),
    name: safeString(savedExercise.name),
    sets: sets.map((set, setIndex) => normalizeSet(set, workoutIndex, exerciseIndex, setIndex)),
  }
}

function normalizeWorkout(workout, workoutIndex) {
  const savedWorkout = isRecord(workout) ? workout : {}
  const exercises = Array.isArray(savedWorkout.exercises) ? savedWorkout.exercises : []

  return {
    id: safeString(savedWorkout.id, `legacy-workout-${workoutIndex}`),
    date: safeString(savedWorkout.date),
    exercises: exercises.map((exercise, exerciseIndex) =>
      normalizeExercise(exercise, workoutIndex, exerciseIndex),
    ),
  }
}

function normalizeBodyweightEntry(entry, entryIndex) {
  const savedEntry = isRecord(entry) ? entry : {}
  return {
    id: safeString(savedEntry.id, `legacy-bodyweight-${entryIndex}`),
    date: safeString(savedEntry.date),
    weight: safeNumber(savedEntry.weight),
  }
}

function readCollection(key, label, normalize) {
  let rawValue

  try {
    rawValue = localStorage.getItem(key)
  } catch {
    return { value: [], raw: [], error: `Couldn't access your saved ${label}. It has not been changed.` }
  }

  if (rawValue === null) return { value: [], raw: [], error: '' }

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return {
        value: [],
        raw: [],
        error: `Your saved ${label} are not in a usable format. They have not been changed.`,
      }
    }

    return { value: parsed.map(normalize), raw: parsed, error: '' }
  } catch {
    return {
      value: [],
      raw: [],
      error: `Your saved ${label} could not be read. They have not been changed.`,
    }
  }
}

function readWorkouts() {
  return readCollection(WORKOUTS_KEY, 'workouts', normalizeWorkout)
}

function readBodyweightEntries() {
  return readCollection(BODYWEIGHT_KEY, 'bodyweight entries', normalizeBodyweightEntry)
}

function readSchemaVersion() {
  try {
    const rawVersion = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (rawVersion === null) return { version: 0, error: '' }

    const version = Number(rawVersion)
    if (!Number.isInteger(version) || version < 0) {
      return { version: 0, error: 'Your saved data version could not be read. It has not been changed.' }
    }

    return { version, error: '' }
  } catch {
    return { version: 0, error: 'Your saved data version could not be read. It has not been changed.' }
  }
}

function savePreMigrationBackup(schemaVersion, workouts, bodyweightEntries) {
  try {
    localStorage.setItem(
      PRE_MIGRATION_BACKUP_KEY,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        schemaVersion,
        workouts,
        bodyweightEntries,
      }),
    )
    return ''
  } catch {
    return 'A pre-migration backup could not be saved, so your data was not migrated.'
  }
}

const migrations = {
  1() {
    // Version 1 records that the original, unversioned local data was checked safely.
  },
}

function runMigrations(workouts, bodyweightEntries) {
  const savedVersion = readSchemaVersion()
  if (savedVersion.error) return savedVersion.error
  if (savedVersion.version > CURRENT_SCHEMA_VERSION) {
    return 'Your saved data was created by a newer version of Barbook. It has not been changed.'
  }

  for (let version = savedVersion.version + 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
    const backupError = savePreMigrationBackup(version - 1, workouts, bodyweightEntries)
    if (backupError) return backupError

    try {
      migrations[version]()
      localStorage.setItem(SCHEMA_VERSION_KEY, String(version))
    } catch {
      return 'Your data migration could not finish. Your original data and backup were left in place.'
    }
  }

  return ''
}

export function loadAppData() {
  const workoutResult = readWorkouts()
  const bodyweightResult = readBodyweightEntries()
  const readErrors = [workoutResult.error, bodyweightResult.error].filter(Boolean)

  if (readErrors.length > 0) {
    return {
      workouts: workoutResult.value,
      bodyweightEntries: bodyweightResult.value,
      error: readErrors.join(' '),
    }
  }

  const migrationError = runMigrations(workoutResult.raw, bodyweightResult.raw)
  return {
    workouts: workoutResult.value,
    bodyweightEntries: bodyweightResult.value,
    error: migrationError,
  }
}

export function loadWorkouts() {
  return readWorkouts().value
}

export function loadBodyweightEntries() {
  return readBodyweightEntries().value
}

function saveCollection(key, value, label) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return ''
  } catch {
    return `Couldn't save your ${label}. Your existing data has not been changed.`
  }
}

export function saveWorkout(workout) {
  const result = readWorkouts()
  if (result.error) return { workouts: result.value, error: result.error }

  const workouts = [...result.value, workout]
  return { workouts, error: saveCollection(WORKOUTS_KEY, workouts, 'workout') }
}

export function saveWorkouts(newWorkouts) {
  const result = readWorkouts()
  if (result.error) return { workouts: result.value, error: result.error }

  const workouts = [...result.value, ...newWorkouts]
  return { workouts, error: saveCollection(WORKOUTS_KEY, workouts, 'workouts') }
}

export function updateWorkout(updatedWorkout) {
  const result = readWorkouts()
  if (result.error) return { workouts: result.value, error: result.error }

  const workouts = result.value.map((workout) =>
    workout.id === updatedWorkout.id ? updatedWorkout : workout,
  )
  return { workouts, error: saveCollection(WORKOUTS_KEY, workouts, 'workout') }
}

export function deleteWorkout(workoutId) {
  const result = readWorkouts()
  if (result.error) return { workouts: result.value, error: result.error }

  const workouts = result.value.filter((workout) => workout.id !== workoutId)
  return { workouts, error: saveCollection(WORKOUTS_KEY, workouts, 'workouts') }
}

export function saveBodyweightEntry(entry) {
  const result = readBodyweightEntries()
  if (result.error) return { bodyweightEntries: result.value, error: result.error }

  const bodyweightEntries = [...result.value, entry]
  return {
    bodyweightEntries,
    error: saveCollection(BODYWEIGHT_KEY, bodyweightEntries, 'bodyweight entry'),
  }
}

export function restoreAllData({ workouts, bodyweightEntries }) {
  const workoutsError = saveCollection(WORKOUTS_KEY, workouts, 'workouts')
  if (workoutsError) return { workouts: [], bodyweightEntries: [], error: workoutsError }

  const bodyweightError = saveCollection(BODYWEIGHT_KEY, bodyweightEntries, 'bodyweight entries')
  if (bodyweightError) return { workouts: [], bodyweightEntries: [], error: bodyweightError }

  const versionError = saveCollection(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION, 'data version')
  return { workouts, bodyweightEntries, error: versionError }
}

function savePreExerciseMergeBackup(workouts, bodyweightEntries) {
  try {
    localStorage.setItem(
      PRE_EXERCISE_MERGE_BACKUP_KEY,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        workouts,
        bodyweightEntries,
      }),
    )
    return ''
  } catch {
    return 'A pre-merge backup could not be saved, so no exercise names were changed.'
  }
}

function readPreExerciseMergeBackup() {
  try {
    const backup = JSON.parse(localStorage.getItem(PRE_EXERCISE_MERGE_BACKUP_KEY) ?? 'null')
    if (!isRecord(backup) || !Array.isArray(backup.workouts) || !Array.isArray(backup.bodyweightEntries)) {
      return { backup: null, error: '' }
    }

    return { backup, error: '' }
  } catch {
    return { backup: null, error: 'The pre-merge backup could not be read. Your current data was not changed.' }
  }
}

export function getPreExerciseMergeBackup() {
  return readPreExerciseMergeBackup().backup
}

export function mergeExerciseNames({ keys, keepName }) {
  const exerciseKeys = new Set((Array.isArray(keys) ? keys : []).filter((key) => typeof key === 'string' && key))
  const keptName = typeof keepName === 'string' ? keepName.trim() : ''
  if (exerciseKeys.size === 0 || !keptName) {
    return { workouts: [], error: 'Choose exercise names to merge and a name to keep.' }
  }

  const workoutResult = readWorkouts()
  const bodyweightResult = readBodyweightEntries()
  if (workoutResult.error || bodyweightResult.error) {
    return { workouts: workoutResult.value, error: workoutResult.error || bodyweightResult.error }
  }

  const backupError = savePreExerciseMergeBackup(workoutResult.raw, bodyweightResult.raw)
  if (backupError) return { workouts: workoutResult.value, error: backupError }

  let changedExerciseCount = 0
  let changedWorkoutCount = 0
  const workouts = workoutResult.raw.map((workout) => {
    if (!isRecord(workout) || !Array.isArray(workout.exercises)) return workout

    let changedWorkout = false
    const exercises = workout.exercises.map((exercise) => {
      if (!isRecord(exercise) || typeof exercise.name !== 'string') return exercise

      if (!exerciseKeys.has(normalizeExerciseName(exercise.name)) || exercise.name === keptName) return exercise

      changedExerciseCount += 1
      changedWorkout = true
      return { ...exercise, name: keptName }
    })

    if (!changedWorkout) return workout
    changedWorkoutCount += 1
    return { ...workout, exercises }
  })

  const saveError = saveCollection(WORKOUTS_KEY, workouts, 'workouts')
  if (saveError) return { workouts: workoutResult.value, error: saveError }

  return {
    workouts: readWorkouts().value,
    error: '',
    changedExerciseCount,
    changedWorkoutCount,
    keepName: keptName,
  }
}

export function undoLastExerciseMerge() {
  const { backup, error } = readPreExerciseMergeBackup()
  if (error) return { workouts: [], error }
  if (!backup) return { workouts: [], error: 'There is no pre-merge backup to restore.' }

  const workoutsError = saveCollection(WORKOUTS_KEY, backup.workouts, 'workouts')
  if (workoutsError) return { workouts: [], error: workoutsError }

  const bodyweightError = saveCollection(BODYWEIGHT_KEY, backup.bodyweightEntries, 'bodyweight entries')
  if (bodyweightError) return { workouts: [], error: bodyweightError }

  return {
    workouts: readWorkouts().value,
    bodyweightEntries: readBodyweightEntries().value,
    error: '',
  }
}

export function getLastBackupAt() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY) ?? ''
  } catch {
    return ''
  }
}

export function recordBackupExport() {
  const exportedAt = new Date().toISOString()
  try {
    localStorage.setItem(LAST_BACKUP_KEY, exportedAt)
  } catch {
    // The exported file remains a valid backup even if this convenience timestamp cannot be stored.
  }
  return exportedAt
}

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
