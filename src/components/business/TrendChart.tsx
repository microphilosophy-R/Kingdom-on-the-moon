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

/** 生成「美观」刻度步长：1 / 2 / 2.5 / 5 / 10 × 10^n，使刻度均匀铺满绘图区 */
function niceStep(span: number, target = 5): number {
  if (span <= 0) return 1
  const raw = span / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return nice * mag
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
      day: p.day,
      value: s.accessor(p),
    }))
    return { key: s.key, color: s.color, d: buildPolyline(points), points }
  })

  // Build right-side polyline points
  const rightPolylines = rightSeries.map(s => {
    const points = data.map(p => ({
      x: toX(p.day),
      y: toY(s.accessor(p), rightRange),
      day: p.day,
      value: s.accessor(p),
    }))
    return { key: s.key, color: s.color, d: buildPolyline(points), points }
  })

  // Y-axis ticks（美观步长，均匀铺满全高，而非只落在数据密集区）
  const leftTicks = useMemo(() => {
    if (mini) return []
    const [min, max] = leftRange
    const step = niceStep(max - min)
    const ticks: number[] = []
    let t = Math.floor(min / step) * step
    while (t <= max + step * 0.25) {
      if (t >= min - step * 0.25) ticks.push(Number(t.toFixed(6)))
      t += step
    }
    return ticks
  }, [leftRange, mini])

  const rightTicks = useMemo(() => {
    if (mini || rightSeries.length === 0) return []
    const [min, max] = rightRange
    const step = niceStep(max - min)
    const ticks: number[] = []
    let t = Math.floor(min / step) * step
    while (t <= max + step * 0.25) {
      if (t >= min - step * 0.25) ticks.push(Number(t.toFixed(6)))
      t += step
    }
    return ticks
  }, [mini, rightRange, rightSeries])

  // X-axis ticks（每 10 御日一格；数据不足一格时退化为首尾两天）
  const xTicks = useMemo(() => {
    if (mini || data.length === 0) return []
    const first = data[0].day
    const last = data[data.length - 1].day
    const result: { day: number; x: number }[] = []
    const start = Math.ceil(first / 10) * 10
    for (let d = start; d <= last; d += 10) {
      result.push({ day: d, x: toX(d) })
    }
    if (result.length === 0) {
      result.push({ day: first, x: toX(first) })
      if (first !== last) result.push({ day: last, x: toX(last) })
    }
    return result
  }, [data, mini])

  // 数据标签：仅单 series 非 mini（多线图避免标签重叠），10 御日一格 + 首尾
  const valueLabels = !mini && leftSeries.length === 1 && rightSeries.length === 0 && leftPolylines.length > 0
    ? leftPolylines[0].points.filter(pt => pt.day % 10 === 0 || pt.day === data[0].day || pt.day === data[data.length - 1].day)
    : []

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
        {/* Data points */}
        {!mini && [...leftPolylines, ...rightPolylines].map(pl =>
          pl.points.map(pt => (
            <circle
              key={`${pl.key}-${pt.day}`}
              cx={pt.x}
              cy={pt.y}
              r={2}
              fill={pl.color}
            />
          ))
        )}
        {/* Value labels（顶部溢出时移到点下方） */}
        {valueLabels.map(pt => (
          <text
            key={`vl-${pt.day}`}
            x={pt.x}
            y={pt.y - 6 < 10 ? pt.y + 12 : pt.y - 6}
            textAnchor="middle"
            fill={leftPolylines[0].color}
            fontSize={8}
            fontFamily="var(--ui-mono)"
          >
            {fmtShort(pt.value)}
          </text>
        ))}
      </svg>
    </section>
  )
}
