/**
 * App 级初始化数据与纯函数：初始资源、初始等级、岗位优先级、设施模板、导航/里程碑配置。
 * 从 App.tsx 拆分而来（原模块级代码），无副作用、不依赖组件状态。
 */
import {
  applyBundle,
  canAfford,
  defaultStartingTechs,
  facilityEconomySpecs,
  facilityOrder,
  getFacilityWorkCapacity,
  isFixedFacility,
  isHousingFacility,
  projectFacilityCost,
  projectFacilityNet,
  selectProductionMethod,
  type ProductionMethodId,
  type Resources,
} from '../economy'
import { regionLayout } from '../data/regionLayout'
import { facilityOrderIndex } from '../data/eraSections'
import type { AppView, ConstructionProject, Icon, Region, RegionId, StaffingPriority } from '../types/game'
import { ArrowLeftRight, FlaskConical, Landmark, Orbit, Rocket, Sparkles, Waves } from 'lucide-react'

export const initialResources: Resources = {
  power: 0,
  water: 180,
  oxygen: 120,
  biomass: 160,
  regolith: 400,
  alloy: 400,
  quantumCore: 10,
  currency: 200,
  population: 12,
  knowledge: 0,
  luxury: 0,
}

export const initialLevels: Partial<Record<RegionId, number>> = { E1: 1, C1: 1, K: 2, S: 1 }
export const initialConstruction = Object.fromEntries(facilityOrder.map(id => [id, null])) as Record<RegionId, ConstructionProject | null>
export const initialProductionMethods = Object.fromEntries(
  facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
) as Record<RegionId, ProductionMethodId>

export const priorityLevels: StaffingPriority[] = [1, 2, 3, 4, 5]
export const defaultPriorityForFacility = (id: RegionId): StaffingPriority => {
  const priority = facilityEconomySpecs[id].priority
  if (priority >= 12) return 5
  if (priority >= 9) return 4
  if (priority >= 7) return 3
  if (priority >= 5) return 2
  return 1
}
export const initialStaffingPriorities = Object.fromEntries(
  facilityOrder.map(id => [id, defaultPriorityForFacility(id)]),
) as Record<RegionId, StaffingPriority>
export const normalizeStaffingPriority = (value: unknown, fallback: StaffingPriority): StaffingPriority => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return priorityLevels.includes(numeric as StaffingPriority) ? numeric as StaffingPriority : fallback
}
export const normalizeStaffingPriorities = (saved?: Partial<Record<RegionId, unknown>>) => Object.fromEntries(
  facilityOrder.map(id => [id, normalizeStaffingPriority(saved?.[id], initialStaffingPriorities[id])]),
) as Record<RegionId, StaffingPriority>
/** 【L2 automation】人口自动分配：按设施岗位优先级（staffingPriorities）贪心分配劳动力到生产设施。 */
export const autoAllocateStaffingFromLevels = (
  levels: Partial<Record<RegionId, number>>,
  population: number,
  priorities: Record<RegionId, StaffingPriority>,
) => {
  const next = Object.fromEntries(facilityOrder.map(id => [id, 0])) as Record<RegionId, number>
  let remainingPopulation = Math.max(0, Math.floor(population))
  const assignable = facilityOrder
    .filter(id => !isHousingFacility(id) && !isFixedFacility(id) && getFacilityWorkCapacity(id, levels[id] ?? 0) > 0)
    .sort((a, b) =>
      (priorities[b] ?? initialStaffingPriorities[b]) - (priorities[a] ?? initialStaffingPriorities[a])
      || facilityEconomySpecs[b].priority - facilityEconomySpecs[a].priority
      || facilityOrderIndex[a] - facilityOrderIndex[b],
    )
  assignable.forEach(id => {
    const capacity = getFacilityWorkCapacity(id, levels[id] ?? 0)
    const assigned = Math.min(capacity, remainingPopulation)
    next[id] = assigned
    remainingPopulation -= assigned
  })
  return next
}
/** 【L2 automation】同上：从 Region[] 提取等级后调用 autoAllocateStaffingFromLevels。 */
export const autoAllocateStaffing = (
  regions: Pick<Region, 'id' | 'level'>[],
  population: number,
  priorities: Record<RegionId, StaffingPriority>,
) => autoAllocateStaffingFromLevels(
  Object.fromEntries(regions.map(region => [region.id, region.level])) as Partial<Record<RegionId, number>>,
  population,
  priorities,
)
export const initialStaffing = autoAllocateStaffingFromLevels(initialLevels, initialResources.population, initialStaffingPriorities)

export const regionTemplate: Region[] = facilityOrder.map(id => {
  const spec = facilityEconomySpecs[id]
  const layout = regionLayout[id]
  const level = initialLevels[id] ?? 0
  return {
    id,
    level,
    icon: layout.icon,
    name: spec.name,
    subtitle: spec.subtitle,
    max: spec.maxLevel,
    note: spec.note,
    interfaceDuty: spec.interfaceDuty,
    phaseNotes: spec.phaseNotes,
    yields: projectFacilityNet(spec, level, {}, defaultStartingTechs),
    cost: projectFacilityCost(spec, level),
    parentIds: layout.parentIds,
    position: layout.position,
  }
})

export const navItems: { id: AppView; label: string; icon: Icon; color: string }[] = [
  { id: 'facilities', label: '设施', icon: Orbit, color: 'oklch(52% .1 76)' },
  { id: 'palace', label: '王城', icon: Landmark, color: 'oklch(45% .08 250)' },
  { id: 'research', label: '科技', icon: FlaskConical, color: 'oklch(55% .09 300)' },
  { id: 'ecology', label: '生态', icon: Waves, color: 'oklch(50% .1 160)' },
  { id: 'starport', label: '贸易', icon: ArrowLeftRight, color: 'oklch(58% .1 40)' },
  { id: 'ship', label: '星舰', icon: Rocket, color: 'oklch(50% .12 330)' },
  { id: 'visitors', label: '异客', icon: Sparkles, color: 'oklch(60% .11 85)' },
]

export const milestoneLogs: Record<number, string> = {
  100: '百日已过，月面设施初具规模。关注资源盈余，规划科技方向。',
  200: '二百御日，殖民地进入成长期。星海贸易港可补充稀缺资源，异客来访值得留意。',
  300: '三百御日，检查各设施等级是否均衡。御座号星舰坞应已启动建造。',
  400: '四百御日，千日试验已过五分之二。科技树的中层突破将解锁关键生产方式。',
  500: '五百御日过半。评估 GDP 增速与人口承载力是否匹配星舰需求。',
  600: '六百御日，试验进入后半程。确保星舰三阶段物资储备进度。',
  700: '七百御日，时间紧迫。审视王月报告中的优化建议，补齐短板。',
  800: '八百御日，距试验到期仅剩二百御日。御座号完成度应过半。',
  900: '九百御日，最后百御日冲刺。将所有资源向星舰倾斜。',
  950: '九百五十御日，仅剩五十御日。检查是否有遗漏的科技或设施可瞬间提升国祚。',
}

export const specialTabFacility: Record<string, AppView> = {
  K: 'palace', L: 'research', R: 'ecology', S: 'starport', D: 'ship',
}

export const canPay = canAfford
export const apply = applyBundle
export const musicSource = '/audio/Gravity_s_Edge.mp3'
