import React from 'react'

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

function WeightTrend({ title, description, points }) {
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
        aria-label={title}
      >
        <title>{title}</title>
        <desc>
          {description}, from {formatWeight(firstPoint.weight)} pounds to{' '}
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

export default WeightTrend
