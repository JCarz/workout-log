import React, { useState } from 'react'
import BodyweightView from './components/BodyweightView.jsx'
import DataView from './components/DataView.jsx'
import HistoryView from './components/HistoryView.jsx'
import {
  deleteWorkout,
  loadBodyweightEntries,
  loadWorkouts,
  restoreAllData,
  saveBodyweightEntry,
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

function createSet() {
  return { id: createId(), reps: '', weight: '' }
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

function App() {
  const [date, setDate] = useState(localDate)
  const [exercises, setExercises] = useState([])
  const [workouts, setWorkouts] = useState(loadWorkouts)
  const [bodyweightEntries, setBodyweightEntries] = useState(loadBodyweightEntries)
  const [view, setView] = useState('log')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [editingWorkoutId, setEditingWorkoutId] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isEditing = Boolean(editingWorkoutId)
  const lastWorkout = getMostRecentWorkout(workouts)

  function addExercise() {
    setExercises((current) => [...current, createExercise()])
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
    setMessage('Last workout copied. Adjust your sets, then save.')
    setError('')
  }

  function removeExercise(exerciseId) {
    setExercises((current) => current.filter((exercise) => exercise.id !== exerciseId))
  }

  function updateExerciseName(exerciseId, name) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, name } : exercise,
      ),
    )
  }

  function addSet(exerciseId) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: [...exercise.sets, createSet()] }
          : exercise,
      ),
    )
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
      setWorkouts(updateWorkout(workout))
      resetForm()
      setHistoryNotice('Workout updated.')
      setSelectedExercise('')
      setView('history')
      window.scrollTo({ top: 0 })
      return
    }

    setWorkouts(saveWorkout(workout))
    setExercises([])
    setError('')
    setMessage('Workout saved on this device.')
  }

  function resetForm() {
    setDate(localDate())
    setExercises([])
    setEditingWorkoutId('')
    setMessage('')
    setError('')
  }

  function editWorkout(workout) {
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

    setWorkouts(deleteWorkout(workout.id))
    setHistoryNotice('Workout deleted.')
  }

  function cancelEdit() {
    resetForm()
    setHistoryNotice('')
    setView('history')
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
    setBodyweightEntries(saveBodyweightEntry({ ...entry, id: createId() }))
  }

  function restoreData(backup) {
    const restored = restoreAllData(backup)
    setWorkouts(restored.workouts)
    setBodyweightEntries(restored.bodyweightEntries)
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

    setWorkouts(saveWorkouts(importedWorkouts))
  }

  return (
    <main className="page-shell">
      <div className="app-shell">
        <header className="app-header">
          <p className="app-name">Workout Log</p>
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

        {view === 'log' ? (
          <section className="view-panel workout-form" aria-labelledby="page-title">
            <header className="view-heading">
              <p className="eyebrow">{isEditing ? 'Editing workout' : 'New workout'}</p>
              <h1 id="page-title">{isEditing ? 'Edit workout' : 'Log a workout'}</h1>
              <p className="intro">
                {isEditing ? 'Update the date, exercises, or sets.' : 'Add your exercises and record every set.'}
              </p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
          <label className="date-field" htmlFor="workout-date">
            <span>Date</span>
            <input
              id="workout-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
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
              {exercises.map((exercise, exerciseIndex) => (
                <fieldset className="exercise-card" key={exercise.id}>
                  <legend>Exercise {exerciseIndex + 1}</legend>
                  <div className="exercise-name-row">
                    <label className="sr-only" htmlFor={`exercise-${exercise.id}`}>
                      Exercise name
                    </label>
                    <input
                      id={`exercise-${exercise.id}`}
                      type="text"
                      placeholder="e.g. Barbell squat"
                      value={exercise.name}
                      onChange={(event) => updateExerciseName(exercise.id, event.target.value)}
                    />
                    <button
                      className="text-button danger"
                      type="button"
                      onClick={() => removeExercise(exercise.id)}
                    >
                      Remove
                    </button>
                  </div>

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

                  <button className="secondary-button" type="button" onClick={() => addSet(exercise.id)}>
                    Add set
                  </button>
                </fieldset>
              ))}
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
