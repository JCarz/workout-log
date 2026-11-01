import React from 'react'
import WeightTrend from './WeightTrend.jsx'
import { normalizeExerciseName } from '../lib/exercises.js'

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function setCountLabel(count) {
  return `${count} ${count === 1 ? 'set' : 'sets'}`
}

function formatWeight(weight) {
  return Number.isInteger(weight) ? weight : weight.toFixed(1)
}

function getHeaviestSet(sets) {
  return sets.reduce((heaviest, set) => {
    const weight = Number(set.weight)

    if (!Number.isFinite(weight)) return heaviest
    if (!heaviest || weight > heaviest.weight) {
      return { weight, reps: Number(set.reps) }
    }

    return heaviest
  }, null)
}

function ExerciseHistory({ exerciseKey, exerciseName, workouts, onBack }) {
  const sessions = workouts
    .flatMap((workout) => {
      const sets = workout.exercises
        .filter((exercise) => normalizeExerciseName(exercise.name) === exerciseKey)
        .flatMap((exercise) => exercise.sets)

      return sets.length > 0 ? [{ date: workout.date, sets }] : []
    })
    .sort((a, b) => b.date.localeCompare(a.date))
  const sessionBestSets = sessions
    .map(({ date, sets }) => ({ date, ...getHeaviestSet(sets) }))
    .filter((set) => Number.isFinite(set.weight))
  const bestSet = sessionBestSets.reduce(
    (best, set) => (!best || set.weight > best.weight ? set : best),
    null,
  )
  const trendPoints = [...sessionBestSets].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <section className="view-panel" aria-labelledby="exercise-history-title">
      <button className="back-button" type="button" onClick={onBack}>
        ← All workouts
      </button>

      <header className="view-heading compact-heading">
        <p className="eyebrow">Exercise history</p>
        <h1 id="exercise-history-title">{exerciseName}</h1>
        <p className="intro">{sessions.length} {sessions.length === 1 ? 'workout' : 'workouts'} recorded</p>
      </header>

      {bestSet && (
        <div className="exercise-insights">
          <section className="best-set-card" aria-labelledby="best-set-title">
            <div>
              <p className="insight-label" id="best-set-title">Best set</p>
              <strong>{formatWeight(bestSet.weight)} lbs</strong>
            </div>
            <p>{bestSet.reps} reps · {formatDate(bestSet.date)}</p>
          </section>

          <section className="trend-card" aria-labelledby="weight-trend-title">
            <div className="trend-heading">
              <h2 id="weight-trend-title">Weight over time</h2>
              <span>Heaviest set per workout · LBS</span>
            </div>
            <WeightTrend
              title={`${exerciseName} heaviest set weight over time`}
              description="Heaviest set per workout"
              points={trendPoints}
            />
          </section>
        </div>
      )}

      <div className="history-list">
        {sessions.map(({ date, sets }, sessionIndex) => (
          <article className="history-card exercise-session" key={`${date}-${sessionIndex}`}>
            <div className="history-card-heading">
              <time dateTime={date}>{formatDate(date)}</time>
              <span>{setCountLabel(sets.length)}</span>
            </div>

            <div className="history-sets">
              <div className="history-set-labels" aria-hidden="true">
                <span>Set</span>
                <span>LBS</span>
                <span>Reps</span>
              </div>
              {sets.map((set, setIndex) => (
                <div className="history-set-row" key={set.id}>
                  <span>{setIndex + 1}</span>
                  <strong>{set.weight} lbs</strong>
                  <strong>{set.reps}</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function HistoryView({
  workouts,
  selectedExercise,
  selectedExerciseName,
  notice,
  onSelectExercise,
  onEditWorkout,
  onDeleteWorkout,
  onBack,
}) {
  if (selectedExercise) {
    return (
      <ExerciseHistory
        exerciseKey={selectedExercise}
        exerciseName={selectedExerciseName}
        workouts={workouts}
        onBack={onBack}
      />
    )
  }

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="view-panel" aria-labelledby="history-title">
      <header className="view-heading">
        <p className="eyebrow">Past workouts</p>
        <h1 id="history-title">Workout history</h1>
        <p className="intro">Your saved sessions, newest first.</p>
      </header>

      {notice && <p className="form-message success history-notice" role="status">{notice}</p>}

      {sortedWorkouts.length === 0 ? (
        <p className="empty-state">Saved workouts will appear here.</p>
      ) : (
        <div className="history-list">
          {sortedWorkouts.map((workout) => (
            <article className="history-card" key={workout.id}>
              <div className="history-card-heading">
                <time dateTime={workout.date}>{formatDate(workout.date)}</time>
                <span>{workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</span>
              </div>

              <div className="history-exercises">
                {workout.exercises.map((exercise) => (
                  <button
                    type="button"
                    className="history-exercise-button"
                    key={exercise.id}
                    onClick={() => onSelectExercise(normalizeExerciseName(exercise.name))}
                  >
                    <span>
                      <strong>{exercise.name}</strong>
                      <small>{setCountLabel(exercise.sets.length)}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                ))}
              </div>

              <div className="workout-actions">
                <button type="button" onClick={() => onEditWorkout(workout)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="delete-workout-button"
                  onClick={() => onDeleteWorkout(workout)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HistoryView
