import { getFacilityWorkCapacity, getHousingCapacity, isFixedFacility, isHousingFacility } from '../../economy'
import { displayCopy } from '../../utils/format'
import type { SpecialFacilityViewModel } from '../../types/game'
import { getFacilityArt } from '../../assets/facilityArt'
import { ResourceBundle } from '../resources'

export interface SpecialFacilityPanelProps {
  facility: SpecialFacilityViewModel
  tone: string
  children?: React.ReactNode
  onSelectFacility?: () => void
}

export function SpecialFacilityPanel({ facility, tone, children }: SpecialFacilityPanelProps) {
  const FacilityIcon = facility.region.icon
  const workCapacity = getFacilityWorkCapacity(facility.region.id, facility.region.level)
  const housingCapacity = getHousingCapacity(facility.region.id, facility.region.level)
  const fixed = isFixedFacility(facility.region.id)
  const staffingPercent = fixed ? 100 : workCapacity ? Math.round(facility.assignedPopulation / workCapacity * 100) : housingCapacity ? 100 : 0
  const throughputPercent = Math.round(facility.throughput * 100)
  const statusLabel = facility.region.level <= 0 ? '尚未建造' : fixed ? '固定在线' : isHousingFacility(facility.region.id) ? '容量在线' : facility.assignedPopulation < workCapacity ? '等待人口' : facility.throughput >= 1 ? '系统在线' : facility.throughput > 0 ? '低负荷' : '停摆'
  const actionHint = facility.region.level <= 0
    ? '先在设施详情中签发扩张，专属系统才会进入有效运作。'
    : fixed
      ? '无需建筑调度。直接在贸易清单里设置采购量、倍率和自动保护。'
    : !isHousingFacility(facility.region.id) && facility.assignedPopulation < workCapacity
      ? '人口会按设施优先级自动补入；本页不再提供额外调度入口。'
      : '建筑状态稳定。此页右侧工作台是主要操作区。'

  return (
    <section className={`special-facility-panel ${tone}`}>
      <div className="special-panel-head special-building-head">
        <div className="building-art-slot special-art-slot" aria-label={`${facility.region.name}建筑图片占位`}>
          <img src={getFacilityArt(facility.region.id)} alt={facility.region.name} />
        </div>
        <div><span className="eyebrow">特殊建筑 · 这是什么</span><h2>{facility.region.name}</h2><p>{facility.region.subtitle}</p><p className="special-building-note">{displayCopy(facility.region.note)}</p></div>
      </div>
      <div className="special-facility-stats">
        <div><span>{fixed ? '状态' : '设施等级'}</span><strong>{fixed ? '在线' : facility.region.level}<small>{fixed ? '' : `/${facility.region.max}`}</small></strong></div>
        <div><span>{fixed ? '岗位' : isHousingFacility(facility.region.id) ? '人口容量' : '已分配人口'}</span><strong>{fixed ? '无' : isHousingFacility(facility.region.id) ? housingCapacity : facility.assignedPopulation}<small>{fixed ? '' : `/${isHousingFacility(facility.region.id) ? housingCapacity : workCapacity}`}</small></strong></div>
        <div><span>{fixed ? '模式' : '吞吐率'}</span><strong>{fixed ? '贸易' : throughputPercent}<small>{fixed ? '' : '%'}</small></strong></div>
      </div>
      <div className="special-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>{fixed ? '固定节点，无需派驻人口' : `岗位占用 ${staffingPercent}%`}</small></div>
      <div className="special-production-row">
        <div><span>当前状况</span><strong>{statusLabel}</strong></div>
        <div><span>每日结算</span><ResourceBundle bundle={facility.net} empty="暂无日结算" /></div>
      </div>
      <div className="special-intervention-note">
        <span>是否需要干预</span>
        <p>{actionHint}</p>
      </div>
      {children}
    </section>
  )
}
