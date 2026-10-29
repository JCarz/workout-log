import React, { useState } from 'react'
import { saveWorkout } from './lib/storage.js'

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

function App() {
  const [date, setDate] = useState(localDate)
  const [exercises, setExercises] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function addExercise() {
    setExercises((current) => [...current, createExercise()])
    setMessage('')
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
      id: createId(),
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

    saveWorkout(workout)
    setExercises([])
    setError('')
    setMessage('Workout saved on this device.')
  }

  return (
    <main className="page-shell">
      <section className="workout-form" aria-labelledby="page-title">
        <header>
          <p className="eyebrow">Workout Log</p>
          <h1 id="page-title">Log a workout</h1>
          <p className="intro">Add your exercises and record every set.</p>
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
                        <span>Weight</span>
                        <span>Reps</span>
                        <span />
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div className="set-row" key={set.id}>
                          <span className="set-number">{setIndex + 1}</span>
                          <label>
                            <span className="sr-only">Weight for set {setIndex + 1}</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.5"
                              placeholder="kg"
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

          <button className="save-button" type="submit">Save workout</button>
        </form>
      </section>
    </main>
  )
}

export default App
