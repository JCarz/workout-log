function displayExerciseName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
}

function singularizeLastWord(name) {
  const words = name.split(' ')
  const lastWord = words[words.length - 1]
  if (!lastWord) return name

  if (/(?:ches|shes|xes)$/.test(lastWord)) {
    words[words.length - 1] = lastWord.slice(0, -2)
  } else if (lastWord.length > 3 && lastWord.endsWith('s') && !lastWord.endsWith('ss') && !lastWord.endsWith('us')) {
    words[words.length - 1] = lastWord.slice(0, -1)
  }

  return words.join(' ')
}

export function normalizeExerciseName(name) {
  const normalized = displayExerciseName(name)
    .toLowerCase()
    .replace(/[‐‑–—-]+/g, ' ')
    .replace(/[\p{P}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return singularizeLastWord(normalized)
}

export function getExerciseGroups(workouts) {
  const groups = new Map()

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const key = normalizeExerciseName(exercise.name)
      const displayName = displayExerciseName(exercise.name)
      if (!key || !displayName) return

      const group = groups.get(key) ?? {
        key,
        uses: 0,
        lastUsed: '',
        lastSets: [],
        displayNames: new Map(),
      }
      const display = group.displayNames.get(displayName) ?? { displayName, uses: 0, lastUsed: '' }

      group.uses += 1
      display.uses += 1
      if (workout.date > group.lastUsed) {
        group.lastUsed = workout.date
        group.lastSets = exercise.sets
      } else if (workout.date === group.lastUsed) {
        group.lastSets = [...group.lastSets, ...exercise.sets]
      }
      if (workout.date > display.lastUsed) display.lastUsed = workout.date

      group.displayNames.set(displayName, display)
      groups.set(key, group)
    })
  })

  return [...groups.values()]
    .map((group) => {
      const variants = [...group.displayNames.values()].sort(
        (first, second) =>
          second.uses - first.uses
          || second.lastUsed.localeCompare(first.lastUsed)
          || first.displayName.localeCompare(second.displayName),
      )
      const [display] = variants

      return {
        key: group.key,
        displayName: display.displayName,
        uses: group.uses,
        lastUsed: group.lastUsed,
        lastSets: group.lastSets,
        variants,
      }
    })
    .sort(
      (first, second) =>
        second.lastUsed.localeCompare(first.lastUsed)
        || second.uses - first.uses
        || first.displayName.localeCompare(second.displayName),
    )
}
