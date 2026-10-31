import React, { useEffect, useRef, useState } from 'react'
import BodyweightView from './components/BodyweightView.jsx'
import DataView from './components/DataView.jsx'
import HistoryView from './components/HistoryView.jsx'
import {
  clearWorkoutDraft,
  deleteWorkout,
  loadAppData,
  loadWorkoutDraft,
  restoreAllData,
  saveBodyweightEntry,
  saveWorkoutDraft,
  saveWorkout,
  saveWorkouts,
  updateWorkout,
} from './lib/storage.js'

function localDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now - offset).toISOString().slice(0, 10)
}

function createId() {
  return crypto.randomUUID()
}

function createSet(previousSet = {}) {
  return {
    id: createId(),
    reps: previousSet.reps ?? '',
    weight: previousSet.weight ?? '',
  }
}

function createExercise() {
  return { id: createId(), name: '', sets: [] }
}

function getMostRecentWorkout(workouts) {
  return workouts.reduce(
    (latest, workout) => (!latest || workout.date >= latest.date ? workout : latest),
    null,
  )
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function normalizeExerciseName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function getLoggedExercises(workouts) {
  const exercisesByName = new Map()

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const displayName = exercise.name.trim().replace(/\s+/g, ' ')
      const normalizedName = normalizeExerciseName(displayName)
      if (!normalizedName) return

      const existing = exercisesByName.get(normalizedName)
      if (!existing) {
        exercisesByName.set(normalizedName, {
          displayName,
          normalizedName,
          uses: 1,
          lastUsed: workout.date,
          lastSets: exercise.sets,
        })
        return
      }

      existing.uses += 1
      if (workout.date > existing.lastUsed) {
        existing.displayName = displayName
        existing.lastUsed = workout.date
        existing.lastSets = exercise.sets
      }
    })
  })

  return [...exercisesByName.values()].sort(
    (first, second) =>
      second.lastUsed.localeCompare(first.lastUsed)
      || second.uses - first.uses
      || first.displayName.localeCompare(second.displayName),
  )
}

function getExerciseSuggestions(loggedExercises, name) {
  const normalizedName = normalizeExerciseName(name)
  if (!normalizedName) return []

  return loggedExercises
    .filter((exercise) => exercise.normalizedName.includes(normalizedName))
    .filter((exercise) => exercise.normalizedName !== normalizedName)
    .slice(0, 6)
}

function getLastExerciseSummary(loggedExerciseDetails, name) {
  const previousExercise = loggedExerciseDetails.get(normalizeExerciseName(name))
  if (!previousExercise?.lastSets?.length) return null

  const topSet = previousExercise.lastSets.reduce((top, set) =>
    !top || set.weight > top.weight || (set.weight === top.weight && set.reps > top.reps) ? set : top,
  )

  return { setCount: previousExercise.lastSets.length, topSet }
}

function formatSetValue(value) {
  return Number.isInteger(value) ? value : Number(value).toFixed(1)
}

function App() {
  const [initialData] = useState(loadAppData)
  const [restoredDraft] = useState(loadWorkoutDraft)
  const [date, setDate] = useState(() => restoredDraft?.date ?? localDate())
  const [exercises, setExercises] = useState(() => restoredDraft?.exercises ?? [])
  const [workouts, setWorkouts] = useState(() => initialData.workouts)
  const [bodyweightEntries, setBodyweightEntries] = useState(() => initialData.bodyweightEntries)
  const [view, setView] = useState('log')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [editingWorkoutId, setEditingWorkoutId] = useState(() => restoredDraft?.editingWorkoutId ?? '')
  const [historyNotice, setHistoryNotice] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [dataStorageError, setDataStorageError] = useState(() => initialData.error)
  const [hasResumedDraft, setHasResumedDraft] = useState(() => Boolean(restoredDraft))
  const [isFormDirty, setIsFormDirty] = useState(() => Boolean(restoredDraft))
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [isReloadingForUpdate, setIsReloadingForUpdate] = useState(false)
  const draftTimerRef = useRef(null)

  const isEditing = Boolean(editingWorkoutId)
  const lastWorkout = getMostRecentWorkout(workouts)
  const loggedExercises = getLoggedExercises(workouts)
  const loggedExerciseNames = new Map(
    loggedExercises.map((exercise) => [exercise.normalizedName, exercise.displayName]),
  )
  const loggedExerciseDetails = new Map(
    loggedExercises.map((exercise) => [exercise.normalizedName, exercise]),
  )

  function saveCurrentDraft() {
    saveWorkoutDraft({ date, exercises, editingWorkoutId })
  }

  function clearCurrentDraft() {
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    clearWorkoutDraft()
    setIsFormDirty(false)
    setHasResumedDraft(false)
  }

  useEffect(() => {
    if (!isFormDirty) return undefined

    draftTimerRef.current = window.setTimeout(() => {
      saveCurrentDraft()
      draftTimerRef.current = null
    }, 500)

    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
    }
  }, [date, editingWorkoutId, exercises, isFormDirty])

  useEffect(() => {
    function showUpdate(event) {
      if (event.detail?.waiting) setWaitingWorker(event.detail.waiting)
    }

    window.addEventListener('workout-log:update-ready', showUpdate)
    return () => window.removeEventListener('workout-log:update-ready', showUpdate)
  }, [])

  function reloadForUpdate() {
    if (!waitingWorker || isReloadingForUpdate) return

    setIsReloadingForUpdate(true)
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true },
    )
    waitingWorker.postMessage({ type: 'ACTIVATE_UPDATE' })
  }

  useEffect(() => {
    if (!isFormDirty) return undefined

    function flushDraft() {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
      saveCurrentDraft()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushDraft()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flushDraft)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushDraft)
    }
  }, [date, editingWorkoutId, exercises, isFormDirty])

  function addExercise() {
    setExercises((current) => [...current, createExercise()])
    setIsFormDirty(true)
    setMessage('')
    setError('')
  }

  function repeatLastWorkout() {
    if (!lastWorkout) return

    setExercises(
      lastWorkout.exercises.map((exercise) => ({
        id: createId(),
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          id: createId(),
          reps: set.reps,
          weight: set.weight,
        })),
      })),
    )
    setIsFormDirty(true)
    setMessage('Last workout copied. Adjust your sets, then save.')
    setError('')
  }

  function removeExercise(exerciseId) {
    setExercises((current) => current.filter((exercise) => exercise.id !== exerciseId))
    setIsFormDirty(true)
  }

  function updateExerciseName(exerciseId, name) {
    const existingName = loggedExerciseNames.get(normalizeExerciseName(name))
    const displayedName = existingName ?? name

    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, name: displayedName } : exercise,
      ),
    )
    setIsFormDirty(true)
  }

  function addSet(exerciseId) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: [...exercise.sets, createSet(exercise.sets[exercise.sets.length - 1])] }
          : exercise,
      ),
    )
    setIsFormDirty(true)
    setMessage('')
    setError('')
  }

  function repeatLastSet(exerciseId) {
    setExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId || exercise.sets.length === 0) return exercise

        const previousSet = exercise.sets[exercise.sets.length - 1]
        return { ...exercise, sets: [...exercise.sets, createSet(previousSet)] }
      }),
    )
    setIsFormDirty(true)
    setMessage('')
    setError('')
  }

  function removeSet(exerciseId, setId) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
          : exercise,
      ),
    )
    setIsFormDirty(true)
  }

  function updateSet(exerciseId, setId, field, value) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    )
    setIsFormDirty(true)
  }

  function validateWorkout() {
    if (!date) return 'Choose a workout date.'
    if (exercises.length === 0) return 'Add at least one exercise.'

    for (const exercise of exercises) {
      if (!exercise.name.trim()) return 'Give every exercise a name.'
      if (exercise.sets.length === 0) return `Add a set for ${exercise.name.trim()}.`

      for (const set of exercise.sets) {
        if (set.reps === '' || Number(set.reps) <= 0) {
          return 'Enter reps greater than zero for every set.'
        }
        if (set.weight === '' || Number(set.weight) < 0) {
          return 'Enter a weight of zero or more for every set.'
        }
      }
    }

    return ''
  }

  function handleSubmit(event) {
    event.preventDefault()
    const validationError = validateWorkout()

    if (validationError) {
      setError(validationError)
      setMessage('')
      return
    }

    const workout = {
      id: editingWorkoutId || createId(),
      date,
      exercises: exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name.trim(),
        sets: exercise.sets.map((set) => ({
          id: set.id,
          reps: Number(set.reps),
          weight: Number(set.weight),
        })),
      })),
    }

    if (isEditing) {
      const result = updateWorkout(workout)
      if (result.error) {
        setError(result.error)
        return
      }

      setWorkouts(result.workouts)
      resetForm()
      setHistoryNotice('Workout updated.')
      setSelectedExercise('')
      setView('history')
      window.scrollTo({ top: 0 })
      return
    }

    const result = saveWorkout(workout)
    if (result.error) {
      setError(result.error)
      return
    }

    setWorkouts(result.workouts)
    clearCurrentDraft()
    setExercises([])
    setError('')
    setMessage('Workout saved on this device.')
  }

  function resetForm() {
    clearCurrentDraft()
    setDate(localDate())
    setExercises([])
    setEditingWorkoutId('')
    setMessage('')
    setError('')
  }

  function editWorkout(workout) {
    clearCurrentDraft()
    setDate(workout.date)
    setExercises(
      workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set })),
      })),
    )
    setEditingWorkoutId(workout.id)
    setHistoryNotice('')
    setMessage('')
    setError('')
    setSelectedExercise('')
    setView('log')
    window.scrollTo({ top: 0 })
  }

  function removeWorkout(workout) {
    const confirmed = window.confirm('Delete this workout? This cannot be undone.')

    if (!confirmed) return

    const result = deleteWorkout(workout.id)
    if (result.error) {
      setDataStorageError(result.error)
      return
    }

    setWorkouts(result.workouts)
    setHistoryNotice('Workout deleted.')
  }

  function cancelEdit() {
    resetForm()
    setHistoryNotice('')
    setView('history')
  }

  function discardResumedDraft() {
    clearCurrentDraft()
    setDate(localDate())
    setExercises([])
    setEditingWorkoutId('')
    setMessage('')
    setError('')
  }

  function showLog() {
    setView('log')
    setSelectedExercise('')
    setHistoryNotice('')
  }

  function showHistory() {
    if (isEditing) resetForm()
    setView('history')
    setSelectedExercise('')
    setHistoryNotice('')
  }

  function showBodyweight() {
    if (isEditing) resetForm()
    setView('bodyweight')
    setSelectedExercise('')
    setHistoryNotice('')
  }

  function showData() {
    if (isEditing) resetForm()
    setView('data')
    setSelectedExercise('')
    setHistoryNotice('')
  }

  function addBodyweightEntry(entry) {
    const result = saveBodyweightEntry({ ...entry, id: createId() })
    if (result.error) {
      setDataStorageError(result.error)
      return false
    }

    setBodyweightEntries(result.bodyweightEntries)
    return true
  }

  function restoreData(backup) {
    const restored = restoreAllData(backup)
    if (restored.error) {
      setDataStorageError(restored.error)
      return false
    }

    setWorkouts(restored.workouts)
    setBodyweightEntries(restored.bodyweightEntries)
    setDataStorageError('')
    return true
  }

  function addParsedWorkouts(parsedWorkouts) {
    const importedWorkouts = parsedWorkouts.map((workout) => ({
      id: createId(),
      date: workout.date,
      exercises: workout.exercises.map((exercise) => ({
        id: createId(),
        name: exercise.name,
        sets: exercise.sets.map((set) => ({ ...set, id: createId() })),
      })),
    }))

    const result = saveWorkouts(importedWorkouts)
    if (result.error) {
      setDataStorageError(result.error)
      return false
    }

    setWorkouts(result.workouts)
    return true
  }

  return (
    <main className="page-shell">
      <div className="app-shell">
        <header className="app-header">
          <p className="app-name">Barbook</p>
          <nav className="view-switcher" aria-label="Workout log views">
            <button
              type="button"
              className={view === 'log' ? 'active' : ''}
              aria-current={view === 'log' ? 'page' : undefined}
              onClick={showLog}
            >
              Log
            </button>
            <button
              type="button"
              className={view === 'history' ? 'active' : ''}
              aria-current={view === 'history' ? 'page' : undefined}
              onClick={showHistory}
            >
              History <span>{workouts.length}</span>
            </button>
            <button
              type="button"
              className={view === 'bodyweight' ? 'active' : ''}
              aria-current={view === 'bodyweight' ? 'page' : undefined}
              onClick={showBodyweight}
            >
              Bodyweight
            </button>
            <button
              type="button"
              className={view === 'data' ? 'active' : ''}
              aria-current={view === 'data' ? 'page' : undefined}
              onClick={showData}
            >
              Data
            </button>
          </nav>
        </header>

        {dataStorageError && (
          <p className="form-message error data-storage-error" role="alert">{dataStorageError}</p>
        )}

        {waitingWorker && (
          <div className="update-notice" role="status">
            <span>
              Update available{isFormDirty ? '. Your workout draft will be saved first.' : '.'}
            </span>
            <button type="button" onClick={reloadForUpdate} disabled={isReloadingForUpdate}>
              {isReloadingForUpdate ? 'Reloading…' : 'Reload'}
            </button>
          </div>
        )}

        {view === 'log' ? (
          <section className="view-panel workout-form" aria-labelledby="page-title">
            <header className="view-heading">
              <p className="eyebrow">{isEditing ? 'Editing workout' : 'New workout'}</p>
              <h1 id="page-title">{isEditing ? 'Edit workout' : 'Log a workout'}</h1>
              <p className="intro">
                {isEditing ? 'Update the date, exercises, or sets.' : 'Add your exercises and record every set.'}
              </p>
            </header>

            {hasResumedDraft && (
              <div className="draft-notice" role="status">
                <span>Resumed your unsaved workout</span>
                <button type="button" onClick={discardResumedDraft}>
                  Discard
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
          <label className="date-field" htmlFor="workout-date">
            <span>Date</span>
            <input
              id="workout-date"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setIsFormDirty(true)
              }}
              required
            />
          </label>

          {!isEditing && exercises.length === 0 && lastWorkout && (
            <button className="repeat-workout-button" type="button" onClick={repeatLastWorkout}>
              <span>
                <strong>Repeat last workout</strong>
                <small>
                  {formatDate(lastWorkout.date)} · {lastWorkout.exercises.length}{' '}
                  {lastWorkout.exercises.length === 1 ? 'exercise' : 'exercises'}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          )}

          <div className="section-heading">
            <h2>Exercises</h2>
            <span>{exercises.length}</span>
          </div>

          {exercises.length === 0 ? (
            <p className="empty-state">No exercises yet. Start by adding one below.</p>
          ) : (
            <div className="exercise-list">
              {exercises.map((exercise, exerciseIndex) => {
                const suggestions = getExerciseSuggestions(loggedExercises, exercise.name)
                const lastExerciseSummary = getLastExerciseSummary(loggedExerciseDetails, exercise.name)

                return (
                  <fieldset className="exercise-card" key={exercise.id}>
                  <legend>Exercise {exerciseIndex + 1}</legend>
                  <div className="exercise-name-row">
                    <div className="exercise-name-field">
                      <label className="sr-only" htmlFor={`exercise-${exercise.id}`}>
                        Exercise name
                      </label>
                      <input
                        id={`exercise-${exercise.id}`}
                        type="text"
                        placeholder="e.g. Barbell squat"
                        value={exercise.name}
                        onChange={(event) => updateExerciseName(exercise.id, event.target.value)}
                        autoComplete="off"
                      />
                      {suggestions.length > 0 && (
                        <div className="exercise-suggestions" role="listbox" aria-label="Exercise suggestions">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.normalizedName}
                              type="button"
                              role="option"
                              onClick={() => updateExerciseName(exercise.id, suggestion.displayName)}
                            >
                              {suggestion.displayName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-button danger"
                      type="button"
                      onClick={() => removeExercise(exercise.id)}
                    >
                      Remove
                    </button>
                  </div>

                  {lastExerciseSummary && (
                    <p className="exercise-history-hint">
                      Last time: {lastExerciseSummary.setCount}{' '}
                      {lastExerciseSummary.setCount === 1 ? 'set' : 'sets'}, top set{' '}
                      {formatSetValue(lastExerciseSummary.topSet.reps)} x{' '}
                      {formatSetValue(lastExerciseSummary.topSet.weight)}
                    </p>
                  )}

                  {exercise.sets.length > 0 && (
                    <div className="sets" aria-label={`${exercise.name || 'Exercise'} sets`}>
                      <div className="set-labels" aria-hidden="true">
                        <span>Set</span>
                        <span>LBS</span>
                        <span>Reps</span>
                        <span />
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div className="set-row" key={set.id}>
                          <span className="set-number">{setIndex + 1}</span>
                          <label>
                            <span className="sr-only">Weight in pounds for set {setIndex + 1}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.5"
                              placeholder="lbs"
                              value={set.weight}
                              onChange={(event) => updateSet(exercise.id, set.id, 'weight', event.target.value)}
                            />
                          </label>
                          <label>
                            <span className="sr-only">Reps for set {setIndex + 1}</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="1"
                              placeholder="reps"
                              value={set.reps}
                              onChange={(event) => updateSet(exercise.id, set.id, 'reps', event.target.value)}
                            />
                          </label>
                          <button
                            className="remove-set"
                            type="button"
                            onClick={() => removeSet(exercise.id, set.id)}
                            aria-label={`Remove set ${setIndex + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="exercise-set-actions">
                    {exercise.sets.length > 0 && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => repeatLastSet(exercise.id)}
                      >
                        Repeat last set
                      </button>
                    )}
                    <button className="secondary-button" type="button" onClick={() => addSet(exercise.id)}>
                      Add set
                    </button>
                  </div>
                  </fieldset>
                )
              })}
            </div>
          )}

          <button className="add-exercise" type="button" onClick={addExercise}>
            + Add exercise
          </button>

          {error && <p className="form-message error" role="alert">{error}</p>}
          {message && <p className="form-message success" role="status">{message}</p>}

              {isEditing && (
                <button className="cancel-edit-button" type="button" onClick={cancelEdit}>
                  Cancel edit
                </button>
              )}
              <button className="save-button" type="submit">
                {isEditing ? 'Update workout' : 'Save workout'}
              </button>
            </form>
          </section>
        ) : view === 'history' ? (
          <HistoryView
            workouts={workouts}
            selectedExercise={selectedExercise}
            notice={historyNotice}
            onSelectExercise={setSelectedExercise}
            onEditWorkout={editWorkout}
            onDeleteWorkout={removeWorkout}
            onBack={() => setSelectedExercise('')}
          />
        ) : view === 'bodyweight' ? (
          <BodyweightView entries={bodyweightEntries} onSave={addBodyweightEntry} />
        ) : (
          <DataView
            workouts={workouts}
            bodyweightEntries={bodyweightEntries}
            onRestore={restoreData}
            onSaveParsedWorkouts={addParsedWorkouts}
          />
        )}
      </div>
    </main>
  )
}

export default App
