import { hasTech } from './technologies'
import type { FacilityId } from './types'
export const gameCalendar = {
  dayName: '御日',
  monthName: '王月',
  reignMonthDays: 50,
  finalDay: 1000,
  normalMsPerDay: 1600,
  fastMsPerDay: 1000,
  optimizationIntervalDays: 50,
  expectedRealMinutes: 60,
}

export const jobsPerFacilityLevel = 4
export const baseConstructionDays = 20
export const constructionRefundRate = 0.5

export const housingCapacityPerLevel: Partial<Record<FacilityId, number>> = {
  K: 8,
  H: 16,
  M: 24,
}

export const fixedFacilityIds: FacilityId[] = ['S']

export const isHousingFacility = (id: FacilityId) => Boolean(housingCapacityPerLevel[id])

export const isFixedFacility = (id: FacilityId) => fixedFacilityIds.includes(id)

export const getFacilityWorkCapacity = (id: FacilityId, level: number) =>
  isHousingFacility(id) || isFixedFacility(id) ? 0 : Math.max(0, level) * jobsPerFacilityLevel

export const getHousingCapacity = (id: FacilityId, level: number) =>
  Math.max(0, level) * (housingCapacityPerLevel[id] ?? 0)

export const getConstructionDays = (techs: string[] = []) => {
  const reduction = (hasTech(techs, 'TG-1') ? 0.05 : 0) + (hasTech(techs, 'TG-3') ? 0.10 : 0)
  return Math.max(Math.ceil(baseConstructionDays * 0.5), Math.ceil(baseConstructionDays * (1 - reduction)))
}

export const getConstructionCostDiscount = (techs: string[] = []) =>
  hasTech(techs, 'TG-3') ? 0.95 : 1

export const getUpgradeCostScale = (id: FacilityId) => {
  if (isFixedFacility(id)) return 0
  // 基准：200天合金累积利润 ~8260；人口建筑略加权（K:2x原值, H:1.75x, M:1.83x）
  if (id === 'K') return 4
  if (id === 'H') return 7
  if (id === 'M') return 11
  if (id === 'E3') return 4
  return 7
}
