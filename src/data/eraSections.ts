import { facilityOrder, technologyCatalog } from '../economy'
import type { AppView } from '../types/game'
import type { FacilityId, TechnologyId } from '../economy'

export const facilityEra: Record<FacilityId, 'early' | 'mid' | 'late'> = {
  E1: 'early',
  C1: 'early',
  K: 'early',
  B: 'early',
  L: 'early',
  E2: 'mid',
  C2: 'mid',
  F: 'mid',
  P: 'mid',
  H: 'mid',
  S: 'mid',
  R: 'mid',
  M: 'late',
  E3: 'late',
  D: 'late',
}

export const facilityEraSections: { id: 'early' | 'mid' | 'late'; label: string; note: string }[] = [
  { id: 'early', label: '早期设施', note: '维持月面前哨的最低闭环。' },
  { id: 'mid', label: '中期设施', note: '打开工业、文化、贸易与生态改造。' },
  { id: 'late', label: '晚期设施', note: '服务终局星舰与外星科技。' },
]

export const researchEraSections: { id: 'early' | 'mid' | 'late'; label: string; note: string }[] = [
  { id: 'early', label: '前期', note: '维持月面闭环与第一批生产方式。' },
  { id: 'mid', label: '中期', note: '打开工业、贸易、生态和外星接口。' },
  { id: 'late', label: '晚期', note: '服务终局星舰、高能研究与禁忌能源。' },
]

export const researchableTechIds: TechnologyId[] = Object.values(technologyCatalog)
  .sort((a, b) => {
    const eraRank = { early: 1, mid: 2, late: 3 }
    return eraRank[a.era ?? 'early'] - eraRank[b.era ?? 'early'] || a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  .map(tech => tech.id)

export const facilityOrderIndex = Object.fromEntries(facilityOrder.map((id, index) => [id, index])) as Record<FacilityId, number>

export const specialFacilityViews: Partial<Record<FacilityId, AppView>> = {
  K: 'palace',
  L: 'research',
  R: 'ecology',
  S: 'starport',
  D: 'ship',
}
