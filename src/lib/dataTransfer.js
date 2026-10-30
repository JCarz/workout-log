function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function parseSet(line) {
  const weightFirst = line.match(
    /^(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?\s*(?:x|×)\s*(\d+)\s*(?:reps?)?$/i,
  )

  if (weightFirst) {
    const set = { weight: Number(weightFirst[1]), reps: Number(weightFirst[2]) }
    return set.reps > 0 ? set : null
  }

  const repsFirst = line.match(
    /^(\d+)\s*(?:reps?)?\s*@\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)?$/i,
  )

  if (repsFirst) {
    const set = { weight: Number(repsFirst[2]), reps: Number(repsFirst[1]) }
    return set.reps > 0 ? set : null
  }

  return null
}

export function parseWorkoutText(text) {
  if (!text.trim()) throw new Error('Paste at least one workout to preview.')

  const workouts = []
  let currentWorkout = null
  let currentExercise = null

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim()
    const lineNumber = index + 1

    if (!line) return

    const dateMatch = line.match(/^(?:date\s*:\s*)?(\d{4}-\d{2}-\d{2})$/i)

    if (dateMatch) {
      if (!isValidDate(dateMatch[1])) {
        throw new Error(`Line ${lineNumber}: use a real date in YYYY-MM-DD format.`)
      }

      currentWorkout = { date: dateMatch[1], exercises: [] }
      workouts.push(currentWorkout)
      currentExercise = null
      return
    }

    if (!currentWorkout) {
      throw new Error(`Line ${lineNumber}: add a YYYY-MM-DD date before the exercises.`)
    }

    const inlineExercise = line.match(/^(.+?):\s*(.+)$/)

    if (inlineExercise) {
      const name = inlineExercise[1].trim()
      const setLines = inlineExercise[2]
        .split(/[,;]/)
        .map((setLine) => setLine.trim())
        .filter(Boolean)
      const sets = setLines.map((setLine) => {
        const parsedSet = parseSet(setLine)

        if (!parsedSet) {
          throw new Error(`Line ${lineNumber}: write sets as weight x reps, such as 135 x 8.`)
        }

        return parsedSet
      })

      if (!name || sets.length === 0) {
        throw new Error(`Line ${lineNumber}: add an exercise name and at least one set.`)
      }

      currentExercise = { name, sets }
      currentWorkout.exercises.push(currentExercise)
      return
    }

    const parsedSet = parseSet(line)

    if (parsedSet) {
      if (!currentExercise) {
        throw new Error(`Line ${lineNumber}: add an exercise name before its sets.`)
      }

      currentExercise.sets.push(parsedSet)
      return
    }

    if (/(?:x|×|@)/i.test(line)) {
      throw new Error(`Line ${lineNumber}: write sets as weight x reps, such as 135 x 8.`)
    }

    currentExercise = { name: line.replace(/:$/, '').trim(), sets: [] }
    currentWorkout.exercises.push(currentExercise)
  })

  for (const workout of workouts) {
    if (workout.exercises.length === 0) {
      throw new Error(`Workout on ${workout.date} needs at least one exercise.`)
    }

    const emptyExercise = workout.exercises.find((exercise) => exercise.sets.length === 0)
    if (emptyExercise) {
      throw new Error(`${emptyExercise.name} on ${workout.date} needs at least one set.`)
    }
  }

  return workouts
}

function isWorkout(workout) {
  return Boolean(
    workout
    && typeof workout.id === 'string'
    && isValidDate(workout.date)
    && Array.isArray(workout.exercises)
    && workout.exercises.length > 0
    && workout.exercises.every((exercise) => (
      exercise
      && typeof exercise.id === 'string'
      && typeof exercise.name === 'string'
      && exercise.name.trim()
      && Array.isArray(exercise.sets)
      && exercise.sets.length > 0
      && exercise.sets.every((set) => (
        set
        && typeof set.id === 'string'
        && Number.isFinite(set.reps)
        && set.reps > 0
        && Number.isFinite(set.weight)
        && set.weight >= 0
      ))
    ))
  )
}

function isBodyweightEntry(entry) {
  return Boolean(
    entry
    && typeof entry.id === 'string'
    && isValidDate(entry.date)
    && Number.isFinite(entry.weight)
    && entry.weight > 0
  )
}

export function createBackup(workouts, bodyweightEntries) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    bodyweightEntries,
  }
}

export function parseBackupJson(text) {
  let backup

  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!backup || backup.version !== 1) {
    throw new Error('This backup version is not supported.')
  }

  if (!Array.isArray(backup.workouts) || !backup.workouts.every(isWorkout)) {
    throw new Error('The backup contains invalid workout data.')
  }

  if (
    !Array.isArray(backup.bodyweightEntries)
    || !backup.bodyweightEntries.every(isBodyweightEntry)
  ) {
    throw new Error('The backup contains invalid bodyweight data.')
  }

  return {
    workouts: backup.workouts,
    bodyweightEntries: backup.bodyweightEntries,
  }
}
