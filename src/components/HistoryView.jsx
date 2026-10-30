import React from 'react'

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

function normalizeExerciseName(name) {
  return name.trim().toLocaleLowerCase()
}

function formatWeight(weight) {
  return Number.isInteger(weight) ? weight : weight.toFixed(1)
}

function getHeaviestSet(exercise) {
  return exercise.sets.reduce((heaviest, set) => {
    const weight = Number(set.weight)

    if (!Number.isFinite(weight)) return heaviest
    if (!heaviest || weight > heaviest.weight) {
      return { weight, reps: Number(set.reps) }
    }

    return heaviest
  }, null)
}

function WeightTrend({ exerciseName, points }) {
  const width = 320
  const height = 112
  const plotLeft = 38
  const plotRight = width - 10
  const plotTop = 14
  const plotBottom = height - 12
  const weights = points.map((point) => point.weight)
  const lowestWeight = Math.min(...weights)
  const highestWeight = Math.max(...weights)
  const range = highestWeight - lowestWeight
  const padding = Math.max(highestWeight * 0.1, 5)
  const scaleMin = range === 0 ? lowestWeight - padding : lowestWeight
  const scaleMax = range === 0 ? highestWeight + padding : highestWeight

  const chartPoints = points.map((point, index) => {
    const x = points.length === 1
      ? (plotLeft + plotRight) / 2
      : plotLeft + (index / (points.length - 1)) * (plotRight - plotLeft)
    const y = plotBottom
      - ((point.weight - scaleMin) / (scaleMax - scaleMin)) * (plotBottom - plotTop)

    return { ...point, x, y }
  })

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return (
    <div className="weight-trend">
      <svg
        className="weight-trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${exerciseName} heaviest set weight over time`}
      >
        <title>{exerciseName} weight over time</title>
        <desc>
          Heaviest set per workout, from {formatWeight(firstPoint.weight)} pounds to{' '}
          {formatWeight(lastPoint.weight)} pounds.
        </desc>
        <line className="trend-grid-line" x1={plotLeft} y1={plotTop} x2={plotRight} y2={plotTop} />
        <line className="trend-grid-line" x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} />
        <text className="trend-axis-label" x="2" y={range === 0 ? chartPoints[0].y + 4 : plotTop + 4}>
          {formatWeight(highestWeight)}
        </text>
        {range > 0 && (
          <text className="trend-axis-label" x="2" y={plotBottom + 4}>{formatWeight(lowestWeight)}</text>
        )}
        <path className="trend-line" d={linePath} />
        {chartPoints.map((point, index) => (
          <circle className="trend-point" cx={point.x} cy={point.y} r="4" key={`${point.date}-${index}`}>
            <title>{formatDate(point.date)}: {formatWeight(point.weight)} lbs</title>
          </circle>
        ))}
      </svg>
      <div className="trend-date-labels">
        <span>{formatDate(firstPoint.date)}</span>
        {points.length > 1 && <span>{formatDate(lastPoint.date)}</span>}
      </div>
    </div>
  )
}

function ExerciseHistory({ exerciseName, workouts, onBack }) {
  const normalizedName = normalizeExerciseName(exerciseName)
  const sessions = workouts
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => normalizeExerciseName(exercise.name) === normalizedName)
        .map((exercise) => ({ date: workout.date, exercise })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const sessionBestSets = sessions
    .map(({ date, exercise }) => ({ date, ...getHeaviestSet(exercise) }))
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
            <WeightTrend exerciseName={exerciseName} points={trendPoints} />
          </section>
        </div>
      )}

      <div className="history-list">
        {sessions.map(({ date, exercise }, sessionIndex) => (
          <article className="history-card exercise-session" key={`${date}-${exercise.id}-${sessionIndex}`}>
            <div className="history-card-heading">
              <time dateTime={date}>{formatDate(date)}</time>
              <span>{setCountLabel(exercise.sets.length)}</span>
            </div>

            <div className="history-sets">
              <div className="history-set-labels" aria-hidden="true">
                <span>Set</span>
                <span>LBS</span>
                <span>Reps</span>
              </div>
              {exercise.sets.map((set, setIndex) => (
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
  notice,
  onSelectExercise,
  onEditWorkout,
  onDeleteWorkout,
  onBack,
}) {
  if (selectedExercise) {
    return (
      <ExerciseHistory
        exerciseName={selectedExercise}
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
                    onClick={() => onSelectExercise(exercise.name)}
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
