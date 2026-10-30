import React, { useState } from 'react'
import WeightTrend from './WeightTrend.jsx'

function localDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now - offset).toISOString().slice(0, 10)
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatWeight(weight) {
  return Number.isInteger(weight) ? weight : weight.toFixed(1)
}

function BodyweightView({ entries, onSave }) {
  const [date, setDate] = useState(localDate)
  const [weight, setWeight] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const newestEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const trendPoints = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  function handleSubmit(event) {
    event.preventDefault()
    const numericWeight = Number(weight)

    if (!date) {
      setError('Choose a date.')
      setMessage('')
      return
    }

    if (weight === '' || !Number.isFinite(numericWeight) || numericWeight <= 0) {
      setError('Enter a weight greater than zero.')
      setMessage('')
      return
    }

    onSave({ date, weight: numericWeight })
    setWeight('')
    setError('')
    setMessage('Bodyweight saved on this device.')
  }

  return (
    <section className="view-panel bodyweight-view" aria-labelledby="bodyweight-title">
      <header className="view-heading">
        <p className="eyebrow">Bodyweight</p>
        <h1 id="bodyweight-title">Track bodyweight</h1>
        <p className="intro">Log a weigh-in and follow the change over time.</p>
      </header>

      <form className="bodyweight-form" onSubmit={handleSubmit} noValidate>
        <div className="bodyweight-fields">
          <label htmlFor="bodyweight-date">
            <span>Date</span>
            <input
              id="bodyweight-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <label htmlFor="bodyweight-weight">
            <span>Weight (LBS)</span>
            <input
              id="bodyweight-weight"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              placeholder="e.g. 182.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
          </label>
        </div>

        {error && <p className="form-message error" role="alert">{error}</p>}
        {message && <p className="form-message success" role="status">{message}</p>}

        <button className="save-button bodyweight-save-button" type="submit">
          Save bodyweight
        </button>
      </form>

      {trendPoints.length > 0 && (
        <section className="trend-card bodyweight-trend-card" aria-labelledby="bodyweight-trend-title">
          <div className="trend-heading">
            <h2 id="bodyweight-trend-title">Bodyweight trend</h2>
            <span>Each saved weigh-in · LBS</span>
          </div>
          <WeightTrend
            title="Bodyweight over time"
            description="Saved bodyweight entries"
            points={trendPoints}
          />
        </section>
      )}

      <section className="bodyweight-history" aria-labelledby="bodyweight-history-title">
        <div className="section-heading">
          <h2 id="bodyweight-history-title">Entries</h2>
          <span>{entries.length}</span>
        </div>

        {newestEntries.length === 0 ? (
          <p className="empty-state">Saved bodyweight entries will appear here.</p>
        ) : (
          <div className="bodyweight-list">
            {newestEntries.map((entry) => (
              <article className="bodyweight-entry" key={entry.id}>
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                <strong>{formatWeight(entry.weight)} lbs</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default BodyweightView
