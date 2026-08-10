import { Waves } from 'lucide-react'
import { SpecialFacilityPanel } from './SpecialFacilityPanel'
import { SectionHeading } from '../layout/SectionHeading'
import { displayCopy } from '../../utils/format'
import type { SpecialFacilityViewModel } from '../../types/game'

export interface EcologyRingProps {
  facility: SpecialFacilityViewModel
  onSelectFacility: () => void
}

export function EcologyRing({ facility, onSelectFacility }: EcologyRingProps) {
  return (
    <div className="special-system-page">
      <SpecialFacilityPanel facility={facility} tone="ecology" onSelectFacility={onSelectFacility}>
        <div className="special-panel-brief">
          <Waves size={16} />
          <span>生态环按阶段改变生态、人口与工业结构，阶段信息直接影响后续设施与人口包。</span>
        </div>
      </SpecialFacilityPanel>
      <section className="special-system-main phase-list">
        <SectionHeading
          eyebrow="R 月穹生态环"
          title="生态阶段"
          description="阶段不是装饰文本，是设施和人口经济的条件。"
        />
        {facility.region.phaseNotes?.map(phase => (
          <p key={phase.name}>
            <b>{phase.name}</b>
            <span>{displayCopy(phase.note)}</span>
          </p>
        ))}
      </section>
    </div>
  )
}
