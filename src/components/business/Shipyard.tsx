import { Rocket } from 'lucide-react'
import { shipProjectStages, shipProjectTotalValue } from '../../economy'
import { ResourceBundle } from '../resources'
import { SectionHeading } from '../layout'
import { SpecialFacilityPanel } from './SpecialFacilityPanel'
import type { SpecialFacilityViewModel } from '../../types/game'

export interface ShipyardProps {
  facility: SpecialFacilityViewModel
  shipProgress: number
  score: number
  onSelectFacility: () => void
}

export function Shipyard({ facility, shipProgress, score, onSelectFacility }: ShipyardProps) {
  return (
    <div className="special-system-page">
      <SpecialFacilityPanel facility={facility} tone="shipyard" onSelectFacility={onSelectFacility}>
        <div className="special-panel-brief">
          <Rocket size={16} />
          <span>千日试验以星舰完成度为核心结算，阶段投入会直接决定终局评分。</span>
        </div>
      </SpecialFacilityPanel>
      <section className="special-system-main ship-meter">
        <SectionHeading
          eyebrow="D 冠冕星舰坞"
          title="御座号工程"
          description={`材料总价值 ${Math.round(shipProjectTotalValue)}，当前国祚评分 ${score}。`}
        />
        <strong>{shipProgress}<small>%</small></strong>
        <div className="ship-progress"><i style={{ width: `${shipProgress}%` }} /></div>
        <div className="ship-stage-list">
          {shipProjectStages.map(stage => (
            <article key={stage.id}>
              <b>{stage.id}. {stage.name}</b>
              <ResourceBundle bundle={stage.input} />
              <small>{stage.note}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
