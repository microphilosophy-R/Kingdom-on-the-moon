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
  // 住宅成本放宽：K(1.5x原), H(1.25x原), M(1.33x原)，配合前期折扣
  if (id === 'K') return 3
  if (id === 'H') return 5
  if (id === 'M') return 8
  if (id === 'E3') return 4
  return 7
}
