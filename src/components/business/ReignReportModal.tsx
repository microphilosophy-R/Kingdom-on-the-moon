import { Play, Target, X } from 'lucide-react'
import { gameCalendar, resourceMeta, resourceOrder } from '../../economy'
import { fmt, fmtAmount } from '../../utils/format'
import type { ReignReport } from '../../types/game'
import { Button, IconButton } from '../ui'
import { TrendChart, type TrendSeries } from './TrendChart'
import styles from './ReignReportModal.module.css'

export interface ReignReportModalProps {
  report: ReignReport
  onClose: () => void
}

function formatDay(day: number) {
  return `御日 ${day}`
}

export function ReignReportModal({ report, onClose }: ReignReportModalProps) {
  const rows = resourceOrder.filter(key => report.resourceRows[key])
  const positiveGdp = report.gdpDelta > 0
  const populationDelta = report.populationDelta >= 0 ? `+${fmtAmount(report.populationDelta)}` : fmtAmount(report.populationDelta)
  const gdpDelta = report.gdpDelta === 0 ? '0.0' : `${positiveGdp ? '+' : ''}${report.gdpDelta.toFixed(1)}`

  // Fallback rows for when trend data is unavailable
  const fallbackRows = rows.map(key => {
    const row = report.resourceRows[key]!
    return {
      label: resourceMeta[key].label,
      produced: row.produced ? fmtAmount(row.produced) : '0',
      consumed: row.consumed ? fmtAmount(row.consumed) : '0',
      net: `${row.net > 0 ? '+' : ''}${fmtAmount(row.net)}`,
      negative: row.net < 0,
    }
  })

  // Trend chart series definitions
  const populationSeries: TrendSeries[] = [
    { key: 'pop', label: '人口', color: 'oklch(55% .14 142)', accessor: p => p.population },
  ]

  const resourceSeries: TrendSeries[] = [
    { key: 'alloy', label: '合金', color: 'oklch(58% .16 28)', accessor: p => p.alloy },
    { key: 'regolith', label: '月壤', color: 'oklch(52% .02 250)', accessor: p => p.regolith },
    { key: 'knowledge', label: '知识', color: 'oklch(58% .14 296)', accessor: p => p.knowledge },
    { key: 'currency', label: '货币', color: 'oklch(62% .12 85)', accessor: p => p.currency },
  ]

  const netSeries: TrendSeries[] = [
    { key: 'netAlloy', label: '合金/日', color: 'oklch(58% .16 28)', accessor: p => p.netAlloy },
    { key: 'netKnowledge', label: '知识/日', color: 'oklch(58% .14 296)', accessor: p => p.netKnowledge },
    { key: 'netCurrency', label: '货币/日', color: 'oklch(62% .12 85)', accessor: p => p.netCurrency },
  ]

  return (
    <div className={styles['reign-report-scrim']} role="presentation">
      <section className={styles['reign-report-modal']} role="dialog" aria-modal="true" aria-label="王月报告">
        <header>
          <div>
            <span className="eyebrow">{gameCalendar.monthName} {report.monthNumber} · {formatDay(report.startDay)} 至 {formatDay(report.endDay)}</span>
            <h2>王月报告</h2>
          </div>
          <IconButton label="关闭王月报告" onClick={onClose}><X size={16} /></IconButton>
        </header>

        <div className={styles['reign-report-kpis']}>
          <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(report.populationEnd)}/{fmtAmount(report.housingCapacity)} 人</small></div>
          <div><span>GDP</span><strong>{report.gdp.toFixed(1)}</strong><small className={report.gdpDelta < 0 ? styles.negative : ''}>{gdpDelta} 星海货币/日</small></div>
          <div><span>阶段长度</span><strong>{report.endDay - report.startDay + 1}</strong><small>御日，50 御日为一王月</small></div>
        </div>

        {report.phaseGuidance && (
          <div className={styles['reign-phase-guidance']}>
            <h3><Target size={15} />当前阶段目标：{report.phaseGuidance.title}</h3>
            <p>{report.phaseGuidance.description}</p>
            <ul>
              {report.phaseGuidance.goals.map(goal => <li key={goal}>{goal}</li>)}
            </ul>
          </div>
        )}

        <div className={styles['reign-report-grid']}>
          <div className={styles['reign-charts-panel']}>
            <TrendChart
              data={report.trendPoints}
              series={populationSeries}
              title="人口趋势"
              fallbackRows={fallbackRows}
            />
            <TrendChart
              data={report.trendPoints}
              series={resourceSeries}
              title="核心资源库存"
              rightAxisKey="currency"
              fallbackRows={fallbackRows}
            />
            <TrendChart
              data={report.trendPoints}
              series={netSeries}
              title="日净产趋势"
              fallbackRows={fallbackRows}
            />
          </div>
        </div>

        <footer>
          <Button variant="primary" onClick={onClose}><Play size={15} />回到手动决策</Button>
        </footer>
      </section>
    </div>
  )
}
