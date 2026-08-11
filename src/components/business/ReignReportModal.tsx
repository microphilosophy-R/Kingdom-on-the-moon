import { Play, Target, X } from 'lucide-react'
import { gameCalendar, resourceMeta, resourceOrder } from '../../economy'
import { fmt, fmtAmount } from '../../utils/format'
import type { ReignReport } from '../../types/game'
import { Button, IconButton } from '../ui'

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

  return (
    <div className="reign-report-scrim" role="presentation">
      <section className="reign-report-modal" role="dialog" aria-modal="true" aria-label="王月报告">
        <header>
          <div>
            <span className="eyebrow">{gameCalendar.monthName} {report.monthNumber} · {formatDay(report.startDay)} 至 {formatDay(report.endDay)}</span>
            <h2>王月报告</h2>
          </div>
          <IconButton label="关闭王月报告" onClick={onClose}><X size={16} /></IconButton>
        </header>

        <div className="reign-report-kpis">
          <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(report.populationEnd)}/{fmtAmount(report.housingCapacity)} 人</small></div>
          <div><span>GDP</span><strong>{report.gdp.toFixed(1)}</strong><small className={report.gdpDelta < 0 ? 'negative' : ''}>{gdpDelta} 星海货币/日</small></div>
          <div><span>阶段长度</span><strong>{report.endDay - report.startDay + 1}</strong><small>御日，50 御日为一王月</small></div>
        </div>

        {report.phaseGuidance && (
          <div className="reign-phase-guidance">
            <h3><Target size={15} />当前阶段目标：{report.phaseGuidance.title}</h3>
            <p>{report.phaseGuidance.description}</p>
            <ul>
              {report.phaseGuidance.goals.map(goal => <li key={goal}>{goal}</li>)}
            </ul>
          </div>
        )}

        <div className="reign-report-grid">
          <section>
            <h3>每日产消</h3>
            <div className="reign-resource-table">
              {rows.map(key => {
                const row = report.resourceRows[key]!
                return <div key={key}>
                  <span>{resourceMeta[key].label}</span>
                  <b>{row.produced ? fmtAmount(row.produced) : '0'}</b>
                  <b>{row.consumed ? fmtAmount(row.consumed) : '0'}</b>
                  <b className={row.net < 0 ? 'negative' : ''}>{row.net > 0 ? '+' : ''}{fmtAmount(row.net)}</b>
                </div>
              })}
            </div>
          </section>

          <section>
            <h3>下个王月方向</h3>
            <ol className="reign-suggestion-list">
              {report.suggestions.map(item => <li key={item}>{item}</li>)}
            </ol>
          </section>
        </div>

        <footer>
          <Button variant="primary" onClick={onClose}><Play size={15} />回到手动决策</Button>
        </footer>
      </section>
    </div>
  )
}
