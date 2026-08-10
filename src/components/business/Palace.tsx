import { BookOpen } from 'lucide-react'
import { gameCalendar, getHousingCapacity, resourceMeta, resourceOrder } from '../../economy'
import buildingKing from '../../assets/building-king.png'
import { ResourceBundle } from '../resources'
import { SectionHeading } from '../layout'
import { displayCopy, fmt, fmtAmount, formatDay } from '../../utils/format'
import type { ReignReport, SpecialFacilityViewModel } from '../../types/game'

export interface PalaceProps {
  facility: SpecialFacilityViewModel
  day: number
  lastReignReport: ReignReport | null
  onOpenReport: (report: ReignReport) => void
}

export function Palace({ facility, day, lastReignReport, onOpenReport }: PalaceProps) {
  const palaceCapacity = getHousingCapacity(facility.region.id, facility.region.level)
  const staffingPercent = palaceCapacity ? 100 : 0
  const palaceStatus = palaceCapacity ? '王城容量在线' : '等待建造'
  const reportProgress = Math.round((day % gameCalendar.reignMonthDays) / gameCalendar.reignMonthDays * 100)
  const palaceIntervention = lastReignReport
    ? `最近一份${gameCalendar.monthName}报告已归档，可在右侧复核人口、GDP 和资源产消。`
    : `第一个${gameCalendar.monthName}报告会在开局和每 ${gameCalendar.reignMonthDays} 御日归档。`
  const reportRows = lastReignReport
    ? resourceOrder.filter(key => lastReignReport.resourceRows[key])
    : []
  const populationDelta = lastReignReport
    ? `${lastReignReport.populationDelta >= 0 ? '+' : ''}${fmtAmount(lastReignReport.populationDelta)}`
    : '0'

  return (
    <div className="palace-layout palace-command">
      <section className="palace-hero palace-building-panel">
        <div className="special-panel-head palace-summary-head">
          <div className="building-art-slot special-art-slot palace-art-slot" aria-label={`${facility.region.name}建筑图片占位`}>
            <img src={buildingKing} alt={facility.region.name} />
          </div>
          <div>
            <span className="eyebrow">特殊建筑 · 这是什么</span>
            <h2>{facility.region.name}</h2>
            <p>{facility.region.subtitle}</p>
            <p className="special-building-note">{displayCopy(facility.region.note)}</p>
          </div>
        </div>
        <div className="palace-building-stats">
          <div><span>王城等级</span><strong>{facility.region.level}<small>/{facility.region.max}</small></strong></div>
          <div><span>人口容量</span><strong>{palaceCapacity}<small>人</small></strong></div>
          <div><span>报告周期</span><strong>{reportProgress}<small>%</small></strong></div>
        </div>
        <div className="palace-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>王城容量 {palaceCapacity}</small></div>
        <div className="special-production-row palace-production-row">
          <div><span>当前状况</span><strong>{palaceStatus}</strong></div>
          <div><span>每日结算</span><ResourceBundle bundle={facility.net} empty="王城未产生净变动" /></div>
        </div>
        <div className="special-intervention-note"><span>是否需要干预</span><p>{palaceIntervention}</p></div>
      </section>

      <section className="policy-board palace-report-board">
        <SectionHeading
          eyebrow="王城档案库"
          title={`${gameCalendar.monthName}报告`}
          description={lastReignReport ? `${formatDay(lastReignReport.startDay)} 至 ${formatDay(lastReignReport.endDay)}` : '等待归档。'}
        />
        {lastReignReport ? <>
          <div className="policy-status palace-report-kpis">
            <div><span>人口变化</span><strong>{populationDelta}</strong><small>{fmt(lastReignReport.populationEnd)}/{fmtAmount(lastReignReport.housingCapacity)} 人</small></div>
            <div><span>GDP</span><strong>{lastReignReport.gdp.toFixed(1)}</strong><small>{lastReignReport.gdpDelta >= 0 ? '+' : ''}{lastReignReport.gdpDelta.toFixed(1)} 星海货币/日</small></div>
            <div><span>阶段</span><strong>{lastReignReport.monthNumber}</strong><small>{gameCalendar.monthName}</small></div>
          </div>
          <div className="policy-cycle-bar" aria-label="王月报告周期进度"><span style={{ width: `${reportProgress}%` }} /></div>
          <div className="palace-report-actions">
            <button className="primary-action" onClick={() => onOpenReport(lastReignReport)}><BookOpen size={15} />打开完整报告</button>
          </div>
          <div className="palace-report-preview">
            <section>
              <h3>每日产消</h3>
              {reportRows.slice(0, 6).map(key => {
                const row = lastReignReport.resourceRows[key]!
                return (
                  <div key={key}>
                    <span>{resourceMeta[key].label}</span>
                    <b>{row.produced ? fmtAmount(row.produced) : '0'}</b>
                    <b>{row.consumed ? fmtAmount(row.consumed) : '0'}</b>
                    <b className={row.net < 0 ? 'negative' : ''}>{row.net >= 0 ? '+' : ''}{fmtAmount(row.net)}</b>
                  </div>
                )
              })}
            </section>
            <section>
              <h3>建议</h3>
              <ol>{lastReignReport.suggestions.map(item => <li key={item}>{item}</li>)}</ol>
            </section>
          </div>
        </> : <div className="policy-report-empty palace-report-empty"><BookOpen size={22} /><span>尚未形成可复核的{gameCalendar.monthName}报告。</span></div>}
      </section>
    </div>
  )
}
