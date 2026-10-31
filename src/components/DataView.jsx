import React, { useEffect, useRef, useState } from 'react'
import {
  createBackup,
  parseBackupJson,
  parseWorkoutText,
} from '../lib/dataTransfer.js'
import { getLastBackupAt, recordBackupExport } from '../lib/storage.js'

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

function formatLastBackup(lastBackupAt) {
  const date = new Date(lastBackupAt)
  if (!lastBackupAt || Number.isNaN(date.getTime())) return 'Never exported'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function needsBackupReminder(lastBackupAt) {
  const lastBackup = new Date(lastBackupAt)
  return !lastBackupAt || Number.isNaN(lastBackup.getTime()) || Date.now() - lastBackup > 30 * 24 * 60 * 60 * 1000
}

function DataView({ workouts, bodyweightEntries, onRestore, onSaveParsedWorkouts }) {
  const fileInput = useRef(null)
  const [exportUrl, setExportUrl] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt)
  const [workoutText, setWorkoutText] = useState('')
  const [preview, setPreview] = useState([])
  const [parseMessage, setParseMessage] = useState('')
  const [parseError, setParseError] = useState('')

  useEffect(() => {
    const backup = createBackup(workouts, bodyweightEntries)
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)

    setExportUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [workouts, bodyweightEntries])

  function noteExport() {
    setLastBackupAt(recordBackupExport())
    setBackupError('')
    setBackupMessage('JSON backup downloaded.')
  }

  async function importData(event) {
    const [file] = event.target.files
    event.target.value = ''

    if (!file) return

    try {
      const backup = parseBackupJson(await file.text())
      const confirmed = window.confirm(
        `Restore ${backup.workouts.length} workouts and ${backup.bodyweightEntries.length} bodyweight entries? This will replace the data currently saved on this device.`,
      )

      if (!confirmed) return

      if (!onRestore(backup)) {
        setBackupMessage('')
        setBackupError('The backup could not be restored. Your existing data was not changed.')
        return
      }

      setBackupError('')
      setBackupMessage('Backup restored on this device.')
    } catch (error) {
      setBackupMessage('')
      setBackupError(error.message)
    }
  }

  function updateWorkoutText(value) {
    setWorkoutText(value)
    setPreview([])
    setParseMessage('')
    setParseError('')
  }

  function previewWorkouts() {
    try {
      const parsedWorkouts = parseWorkoutText(workoutText)
      setPreview(parsedWorkouts)
      setParseError('')
      setParseMessage(
        `${parsedWorkouts.length} ${parsedWorkouts.length === 1 ? 'workout' : 'workouts'} ready to review.`,
      )
    } catch (error) {
      setPreview([])
      setParseMessage('')
      setParseError(error.message)
    }
  }

  function savePreview() {
    const count = preview.length
    if (!onSaveParsedWorkouts(preview)) {
      setParseMessage('')
      setParseError('The workouts could not be saved. Your existing data was not changed.')
      return
    }

    setWorkoutText('')
    setPreview([])
    setParseError('')
    setParseMessage(`${count} ${count === 1 ? 'workout' : 'workouts'} saved.`)
  }

  return (
    <section className="view-panel data-view" aria-labelledby="data-title">
      <header className="view-heading">
        <p className="eyebrow">Your data</p>
        <h1 id="data-title">Backup and import</h1>
        <p className="intro">Keep a copy of everything or bring older workouts into the app.</p>
      </header>

      <section className="data-card" aria-labelledby="backup-title">
        <div className="data-card-heading">
          <h2 id="backup-title">JSON backup</h2>
          <p>Exports workouts and bodyweight entries in one file.</p>
          <p className="backup-status">Last backup: {formatLastBackup(lastBackupAt)}</p>
        </div>

        <div className="data-actions">
          <a
            className="data-button primary-data-button"
            href={exportUrl}
            download={`workout-log-backup-${localDate()}.json`}
            onClick={noteExport}
          >
            Export JSON
          </a>
          <button className="data-button" type="button" onClick={() => fileInput.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={importData}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {backupError && <p className="form-message error" role="alert">{backupError}</p>}
        {backupMessage && <p className="form-message success" role="status">{backupMessage}</p>}
        {needsBackupReminder(lastBackupAt) && (
          <p className="backup-reminder">A monthly export is a simple extra safeguard for your data.</p>
        )}
      </section>

      <section className="data-card text-import-card" aria-labelledby="text-import-title">
        <div className="data-card-heading">
          <h2 id="text-import-title">Paste past workouts</h2>
          <p>Start each workout with its date, then list each exercise and its sets.</p>
        </div>

        <pre className="import-example" aria-label="Plain text workout example">{`2026-10-20
Bench Press
135 x 8
135 x 8

Barbell Row: 95 x 10, 95 x 10`}</pre>

        <label className="workout-text-field" htmlFor="workout-text">
          <span>Past workouts</span>
          <textarea
            id="workout-text"
            value={workoutText}
            onChange={(event) => updateWorkoutText(event.target.value)}
            placeholder="Paste workouts here"
          />
        </label>

        <button className="data-button preview-button" type="button" onClick={previewWorkouts}>
          Preview workouts
        </button>

        {parseError && <p className="form-message error" role="alert">{parseError}</p>}
        {parseMessage && <p className="form-message success" role="status">{parseMessage}</p>}

        {preview.length > 0 && (
          <section className="import-preview" aria-labelledby="import-preview-title">
            <div className="section-heading">
              <h2 id="import-preview-title">Preview</h2>
              <span>{preview.length}</span>
            </div>

            <div className="preview-workout-list">
              {preview.map((workout, workoutIndex) => (
                <article className="preview-workout" key={`${workout.date}-${workoutIndex}`}>
                  <div className="preview-workout-heading">
                    <time dateTime={workout.date}>{formatDate(workout.date)}</time>
                    <span>
                      {workout.exercises.length}{' '}
                      {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </span>
                  </div>

                  <div className="preview-exercises">
                    {workout.exercises.map((exercise, exerciseIndex) => (
                      <div className="preview-exercise" key={`${exercise.name}-${exerciseIndex}`}>
                        <strong>{exercise.name}</strong>
                        <p>
                          {exercise.sets.map((set) => (
                            `${formatWeight(set.weight)} lbs × ${set.reps}`
                          )).join(' · ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <button className="save-button import-save-button" type="button" onClick={savePreview}>
              Save {preview.length} {preview.length === 1 ? 'workout' : 'workouts'}
            </button>
          </section>
        )}
      </section>
    </section>
  )
}

export default DataView
