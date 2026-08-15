import { useMemo } from 'react'
import type { TrendPoint } from '../../types/game'
import { fmtAmount } from '../../utils/format'
import styles from './TrendChart.module.css'

export interface TrendSeries {
  key: string
  label: string
  color: string
  accessor: (p: TrendPoint) => number
}

export interface TrendChartProps {
  data: TrendPoint[]
  series: TrendSeries[]
  title?: string
  /** 迷你模式：只显示线条，不显示坐标轴和标题 */
  mini?: boolean
  /** 当 trendPoints 为空时的回退表格行 */
  fallbackRows?: { label: string; produced: string; consumed: string; net: string; negative: boolean }[]
  /** 右侧 Y 轴的 series key（该 series 的值使用右侧轴） */
  rightAxisKey?: string
}

const SVG_PADDING = { top: 12, right: 48, bottom: 28, left: 48 }
const MINI_PADDING = { top: 4, right: 4, bottom: 4, left: 4 }

function fmtShort(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'K'
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(2) + 'K'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

function computeYRange(values: number[]): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (Number.isFinite(v)) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!Number.isFinite(min)) return [0, 1]
  if (min === max) return [min - Math.abs(min) * 0.1 - 1, max + Math.abs(max) * 0.1 + 1]
  const pad = (max - min) * 0.1
  const floor = min - pad
  const ceil = max + pad
  // If range crosses zero, anchor zero
  if (floor < 0 && ceil > 0) {
    const absMax = Math.max(Math.abs(floor), Math.abs(ceil))
    return [-absMax, absMax]
  }
  return [floor, ceil]
}

/** 为 polyline 生成 SVG path d 属性 */
function buildPolyline(
  points: { x: number; y: number }[],
): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const { x, y } = points[0]
    return `M${x},${y} L${x + 0.1},${y}`
  }
  return points.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
}

export function TrendChart({
  data,
  series,
  title,
  mini = false,
  fallbackRows,
  rightAxisKey,
}: TrendChartProps) {
  const hasData = data.length > 0
  const padding = mini ? MINI_PADDING : SVG_PADDING
  const width = 600
  const height = mini ? 100 : 200

  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  // Separate left/right axis series
  const leftSeries = rightAxisKey
    ? series.filter(s => s.key !== rightAxisKey)
    : series
  const rightSeries = rightAxisKey
    ? series.filter(s => s.key === rightAxisKey)
    : []

  // Compute value ranges
  const leftRange = useMemo(() => {
    const all = leftSeries.flatMap(s => data.map(p => s.accessor(p)))
    return computeYRange(all)
  }, [data, leftSeries])

  const rightRange = useMemo(() => {
    if (rightSeries.length === 0) return [0, 1] as const
    const all = rightSeries.flatMap(s => data.map(p => s.accessor(p)))
    return computeYRange(all)
  }, [data, rightSeries])

  const toX = (day: number) => {
    if (data.length <= 1) return padding.left + plotW / 2
    const minDay = data[0].day
    const maxDay = data[data.length - 1].day
    const range = maxDay - minDay || 1
    return padding.left + ((day - minDay) / range) * plotW
  }

  const toY = (value: number, range: readonly [number, number]) => {
    const [min, max] = range
    const span = max - min || 1
    return padding.top + plotH - ((value - min) / span) * plotH
  }

  // Build left-side polyline points
  const leftPolylines = leftSeries.map(s => {
    const points = data.map(p => ({
      x: toX(p.day),
      y: toY(s.accessor(p), leftRange),
    }))
    return { key: s.key, color: s.color, d: buildPolyline(points) }
  })

  // Build right-side polyline points
  const rightPolylines = rightSeries.map(s => {
    const points = data.map(p => ({
      x: toX(p.day),
      y: toY(s.accessor(p), rightRange),
    }))
    return { key: s.key, color: s.color, d: buildPolyline(points) }
  })

  // Y-axis ticks
  const leftTicks = useMemo(() => {
    const [min, max] = leftRange
    if (mini) return []
    const span = max - min
    const step = span <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(span)) - 1)
    const ticks: number[] = []
    let t = Math.floor(min / step) * step
    while (t <= max + step * 0.5) {
      if (t >= min - step * 0.5) ticks.push(t)
      t += step
    }
    return ticks.slice(0, 6)
  }, [leftRange, mini])

  const rightTicks = useMemo(() => {
    if (mini || rightSeries.length === 0) return []
    const [min, max] = rightRange
    const span = max - min
    const step = span <= 0 ? 1 : Math.pow(10, Math.floor(Math.log10(span)) - 1)
    const ticks: number[] = []
    let t = Math.floor(min / step) * step
    while (t <= max + step * 0.5) {
      if (t >= min - step * 0.5) ticks.push(t)
      t += step
    }
    return ticks.slice(0, 6)
  }, [mini, rightRange, rightSeries])

  // X-axis ticks (show ~5 labels)
  const xTicks = useMemo(() => {
    if (mini || data.length === 0) return []
    const result: { day: number; x: number }[] = []
    const step = Math.max(1, Math.floor(data.length / 5))
    for (let i = 0; i < data.length; i += step) {
      result.push({ day: data[i].day, x: toX(data[i].day) })
    }
    // Always include last
    const last = data[data.length - 1]
    const lastX = toX(last.day)
    if (result.length === 0 || result[result.length - 1].day !== last.day) {
      result.push({ day: last.day, x: lastX })
    }
    return result
  }, [data, mini])

  // Fallback table
  if (!hasData && !mini && fallbackRows && fallbackRows.length > 0) {
    return (
      <section className={styles['reign-trend-chart']}>
        {title && <h3>{title}</h3>}
        <div className={styles['reign-resource-table']}>
          {fallbackRows.map(row => (
            <div key={row.label}>
              <span>{row.label}</span>
              <b>{row.produced}</b>
              <b>{row.consumed}</b>
              <b className={row.negative ? styles.negative : ''}>{row.net}</b>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!hasData && !mini) {
    return (
      <section className={styles['reign-trend-chart']}>
        {title && <h3>{title}</h3>}
        <p style={{ color: 'oklch(47% .026 250)', fontSize: 'var(--font-note)', padding: '.5rem 0' }}>
          暂无趋势数据，运行一个完整王月后将生成趋势曲线。
        </p>
      </section>
    )
  }

  if (!hasData && mini) return null

  const allSeries = [...leftSeries, ...rightSeries]

  return (
    <section className={mini ? styles['palace-trend-mini'] : styles['reign-trend-chart']}>
      {title && !mini && <h3>{title}</h3>}
      {!mini && (
        <div className={styles['reign-trend-legend']}>
          {allSeries.map(s => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* Grid lines (left axis) */}
        {!mini && leftTicks.map(t => (
          <line
            key={`gl-${t}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={toY(t, leftRange)}
            y2={toY(t, leftRange)}
            stroke="oklch(82% .012 250)"
            strokeWidth={0.5}
          />
        ))}
        {/* Left Y axis */}
        {!mini && leftTicks.map(t => (
          <text
            key={`lt-${t}`}
            x={padding.left - 6}
            y={toY(t, leftRange) + 3}
            textAnchor="end"
            fill="oklch(48% .025 250)"
            fontSize={9}
            fontFamily="var(--ui-mono)"
          >
            {fmtShort(t)}
          </text>
        ))}
        {/* Right Y axis */}
        {!mini && rightTicks.map(t => (
          <text
            key={`rt-${t}`}
            x={width - padding.right + 6}
            y={toY(t, rightRange) + 3}
            textAnchor="start"
            fill="oklch(48% .025 250)"
            fontSize={9}
            fontFamily="var(--ui-mono)"
          >
            {fmtShort(t)}
          </text>
        ))}
        {/* X axis */}
        {!mini && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH}
            y2={padding.top + plotH}
            stroke="oklch(70% .02 250)"
            strokeWidth={0.8}
          />
        )}
        {!mini && xTicks.map(({ day, x }) => (
          <text
            key={`xt-${day}`}
            x={x}
            y={height - 4}
            textAnchor="middle"
            fill="oklch(48% .025 250)"
            fontSize={8}
            fontFamily="var(--ui-mono)"
          >
            御{day}
          </text>
        ))}
        {/* Left-side polylines */}
        {leftPolylines.map(pl => (
          <path
            key={pl.key}
            d={pl.d}
            fill="none"
            stroke={pl.color}
            strokeWidth={mini ? 1.5 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* Right-side polylines (dashed) */}
        {rightPolylines.map(pl => (
          <path
            key={pl.key}
            d={pl.d}
            fill="none"
            stroke={pl.color}
            strokeWidth={mini ? 1.5 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        ))}
      </svg>
    </section>
  )
}
