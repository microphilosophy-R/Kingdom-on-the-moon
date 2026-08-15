import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDot, Clock, Crown, Droplet, Factory,
  Coins, FlaskConical, FolderOpen, Gauge, House, Info, Landmark, Leaf, LogOut, Minus, Mountain, Orbit,
  Pause, Pickaxe, Play, Rocket, Save, Settings, Sparkles, Sprout, Sun, Theater, Users, Volume2, Waves, X, Zap,
  type LucideProps,
} from 'lucide-react'
import {
  applyBundle,
  autoCorrectStaffing,
  buildFacilityModifiers,
  calculateCurrencyDebtInterest,
  canBuildFacility,
  canAfford,
  canExecuteStarportTrade,
  defaultReserveFloors,
  defaultStartingTechs,
  facilityEconomySpecs,
  facilityOrder,
  gameCalendar,
  getConstructionDays,
  getFacilityWorkCapacity,
  getHousingCapacity,
  hasTech,
  isFixedFacility,
  isHousingFacility,
  projectDailyFlow,
  projectFacilityCost,
  projectFacilityFlow,
  projectFacilityNet,
  projectPopulationSystem,
  resourceGroups,
  resourceMeta,
  resourceOrder,
  selectProductionMethod,
  settleDailyResources,
  planAutoTradesForDeficits,
  shipProjectStages,
  starportTradeOffers,
  technologyCatalog,
  weightedValue,
  defaultDifficulty,
  type AutomationPlan,
  type Difficulty,
  type FacilityId,
  type FacilityState,
  type PopulationProjection,
  type ProductionMethodId,
  type ResourceKey,
  type Resources,
  type TechnologyId,
} from './economy'
import {
  buildEncounter,
  getAvailableEventChains,
  getCurrentGameEra,
  rolesById,
  type Encounter,
  type Role,
} from './events'
import { createDisabledAutomationPlan, gameOptimizers, type OptimizerId } from './optimizers'
import { Button, IconButton, PortraitSlot, ProgressLine } from './components/ui'
import {
  ConstructionDaysPill,
  CostResourceList,
  FlowArrowSvg,
  ProductionFlow,
  ResourceAtom,
  ResourceBundle,
  ResourceDeltaRows,
  ResourceSymbolStrip,
  resourceUiMeta,
} from './components/resources'
import { LetterActions, Modal, SectionHeading, TabNav } from './components/layout'
import {
  FacilityList,
  FacilityOrderGlyph,
  InfoToggle,
  PlanetFacilities,
  ReignReportModal,
  SettingsPanel,
  SpecialFacilityPanel,
  StartGate,
  TechnologyCard,
  TechnologyImagePlaceholder,
  TechnologyTags,
  TutorialOverlay,
  VictoryModal,
  Visitors,
  type StartOptions,
} from './components/business'
import {
  EcologyPhaseBlock,
  PalaceReportBlock,
  ResearchTreeBlock,
  ShipProgressBlock,
  TradeBoardBlock,
} from './components/business/SpecialBlocks'
import { displayCopy, fmt, fmtAmount, fmtCompactAmount, fmtSignedCompactAmount, formatDay } from './utils/format'
import { getPhaseGuidance, hasResearchPrerequisites, orderLabel, summarizeOptimizerDirections, techLabel, technologyCategoryLabel, throughputClass } from './utils/game'
import { scaleResourceBundle } from './utils/trade'
import { regionLayout } from './data/regionLayout'
import { facilityEra, facilityEraSections, facilityOrderIndex, researchableTechIds } from './data/eraSections'
import { visitorPortraits } from './data/visitorPortraits'
import { PlanetScene, planetTextures } from './PlanetScene'
import charChenlin from './assets/char-00.jpg'
import type { AppView, ConstructionProject, FacilityOrderMode, GameSaveState, Icon, ReignReport, ReignReportBaseline, Region, RegionId, SaveSlotMeta, StaffingPriority, TrendPoint } from './types/game'

type FacilityEra = 'early' | 'mid' | 'late'
type TechnologyEra = 'early' | 'mid' | 'late'

const initialResources: Resources = {
  power: 24,
  water: 12,
  oxygen: 14,
  biomass: 10,
  regolith: 22,
  alloy: 14,
  quantumCore: 2,
  currency: 10,
  population: 12,
  knowledge: 0,
  luxury: 0,
}

const initialLevels: Partial<Record<RegionId, number>> = { E1: 1, C1: 1, K: 2, S: 1 }
const initialConstruction = Object.fromEntries(facilityOrder.map(id => [id, null])) as Record<RegionId, ConstructionProject | null>
const initialProductionMethods = Object.fromEntries(
  facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
) as Record<RegionId, ProductionMethodId>

const priorityLevels: StaffingPriority[] = [1, 2, 3, 4, 5]
const defaultPriorityForFacility = (id: RegionId): StaffingPriority => {
  const priority = facilityEconomySpecs[id].priority
  if (priority >= 12) return 5
  if (priority >= 9) return 4
  if (priority >= 7) return 3
  if (priority >= 5) return 2
  return 1
}
const initialStaffingPriorities = Object.fromEntries(
  facilityOrder.map(id => [id, defaultPriorityForFacility(id)]),
) as Record<RegionId, StaffingPriority>
const normalizeStaffingPriority = (value: unknown, fallback: StaffingPriority): StaffingPriority => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return priorityLevels.includes(numeric as StaffingPriority) ? numeric as StaffingPriority : fallback
}
const normalizeStaffingPriorities = (saved?: Partial<Record<RegionId, unknown>>) => Object.fromEntries(
  facilityOrder.map(id => [id, normalizeStaffingPriority(saved?.[id], initialStaffingPriorities[id])]),
) as Record<RegionId, StaffingPriority>
const autoAllocateStaffingFromLevels = (
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
const autoAllocateStaffing = (
  regions: Pick<Region, 'id' | 'level'>[],
  population: number,
  priorities: Record<RegionId, StaffingPriority>,
) => autoAllocateStaffingFromLevels(
  Object.fromEntries(regions.map(region => [region.id, region.level])) as Partial<Record<RegionId, number>>,
  population,
  priorities,
)
const initialStaffing = autoAllocateStaffingFromLevels(initialLevels, initialResources.population, initialStaffingPriorities)

const regionTemplate: Region[] = facilityOrder.map(id => {
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

const navItems: { id: AppView; label: string; icon: Icon; color: string }[] = [
  { id: 'facilities', label: '设施', icon: Orbit, color: 'oklch(52% .1 76)' },
  { id: 'palace', label: '王城', icon: Landmark, color: 'oklch(45% .08 250)' },
  { id: 'research', label: '科技', icon: FlaskConical, color: 'oklch(55% .09 300)' },
  { id: 'ecology', label: '生态', icon: Waves, color: 'oklch(50% .1 160)' },
  { id: 'starport', label: '贸易', icon: ArrowLeftRight, color: 'oklch(58% .1 40)' },
  { id: 'ship', label: '星舰', icon: Rocket, color: 'oklch(50% .12 330)' },
  { id: 'visitors', label: '异客', icon: Sparkles, color: 'oklch(60% .11 85)' },
]

const milestoneLogs: Record<number, string> = {
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

const specialTabFacility: Record<string, AppView> = {
  K: 'palace', L: 'research', R: 'ecology', S: 'starport', D: 'ship',
}

const canPay = canAfford
const apply = applyBundle
const musicSource = '/audio/Gravity_s_Edge.mp3'
const saveKey = (slotIndex: number) => `lunar-crown-save-v4-${slotIndex}`
const saveMetaKey = (slotIndex: number) => `lunar-crown-save-meta-${slotIndex}`
const maxSaveSlots = 6
const musicVolumeKey = 'lunar-crown-music-volume'
const tutorialSeenKey = 'lunar-crown-tutorial-seen'
const autoSaveKey = 'lunar-crown-autosave-v6'

const readAutoSave = (): GameSaveState | null => {
  try {
    const raw = window.localStorage.getItem(autoSaveKey)
    if (!raw) return null
    return JSON.parse(raw) as GameSaveState
  } catch {
    return null
  }
}

const writeAutoSave = (save: GameSaveState) => {
  window.localStorage.setItem(autoSaveKey, JSON.stringify(save))
}

const clearAutoSave = () => {
  window.localStorage.removeItem(autoSaveKey)
}

const readSaveSlotMeta = (slotIndex: number): SaveSlotMeta | null => {
  try {
    const raw = window.localStorage.getItem(saveMetaKey(slotIndex))
    if (!raw) return null
    return JSON.parse(raw) as SaveSlotMeta
  } catch {
    return null
  }
}

const readAllSaveSlotMetas = (): (SaveSlotMeta | null)[] =>
  Array.from({ length: maxSaveSlots }, (_, i) => readSaveSlotMeta(i))

const writeSaveSlotMeta = (slotIndex: number, meta: SaveSlotMeta) => {
  window.localStorage.setItem(saveMetaKey(slotIndex), JSON.stringify(meta))
}

const formatSaveSlotDay = (day: number) => {
  const monthNumber = Math.max(1, Math.ceil(day / gameCalendar.reignMonthDays))
  return `第 ${monthNumber} 个${gameCalendar.monthName}·御日 ${day}`
}
const allResourceKeys = resourceGroups.flatMap(group => group.keys)
const weightedShipReadiness = (resources: Resources) => {
  const ratios = shipProjectStages.flatMap(stage =>
    Object.entries(stage.input).map(([key, required]) => Math.min(1, resources[key as ResourceKey] / (required || 1))),
  )
  return ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 24 : 0
}
const mergeResourceChanges = (...bundles: Partial<Resources>[]): Resources => {
  const total = Object.fromEntries(resourceOrder.map(key => [key, 0])) as Resources
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}
const flowFromPopulation = (projection: PopulationProjection) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()

  resourceOrder.forEach(key => {
    const net = projection.net[key] ?? 0
    const lifeSupport = projection.lifeSupportCost[key] ?? 0
    if (lifeSupport > 0) consumption[key] += lifeSupport
    if (key === 'water' || key === 'oxygen' || key === 'biomass') return
    if (net > 0) production[key] += net
    if (net < 0) consumption[key] += Math.abs(net)
  })

  return { production, consumption }
}
const flowFromTrades = (trades: ReturnType<typeof planAutoTradesForDeficits>['trades'], currencyInterest = 0) => {
  const production = mergeResourceChanges()
  const consumption = mergeResourceChanges()
  const net = mergeResourceChanges()

  trades.forEach(trade => {
    resourceOrder.forEach(key => {
      const input = trade.input[key] ?? 0
      const output = trade.output[key] ?? 0
      if (output > 0) production[key] += output
      if (input > 0) consumption[key] += input
      net[key] += output - input
    })
  })
  if (currencyInterest > 0) {
    consumption.currency += currencyInterest
    net.currency -= currencyInterest
  }

  return { production, consumption, net }
}
const summarizeResourceRows = (production: Resources, consumption: Resources): ReignReport['resourceRows'] => {
  const rows: ReignReport['resourceRows'] = {}
  resourceOrder.forEach(key => {
    const produced = production[key] ?? 0
    const consumed = consumption[key] ?? 0
    const net = produced - consumed
    if (produced || consumed || net) rows[key] = { produced, consumed, net }
  })
  return rows
}
const loadStoredMusicVolume = () => {
  if (typeof window === 'undefined') return 0.42
  const stored = window.localStorage.getItem(musicVolumeKey)
  const parsed = stored === null ? 0.42 : Number(stored)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.42
}

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [resources, setResources] = useState<Resources>(initialResources)
  const [regions, setRegions] = useState(regionTemplate)
  const [day, setDay] = useState(1)
  const [isRunning, setRunning] = useState(false)
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal')
  const [view, setView] = useState<AppView>('facilities')
  const [selected, setSelected] = useState<RegionId>('E1')
  const [planetDocked, setPlanetDocked] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [planetTexture, setPlanetTexture] = useState(() => planetTextures[Math.floor(Math.random() * planetTextures.length)])
  const [visitor, setVisitor] = useState<Encounter | null>(null)
  const [roster, setRoster] = useState<Role[]>([])
  const [assigned, setAssigned] = useState<Record<RegionId, string | undefined>>(Object.fromEntries(facilityOrder.map(id => [id, undefined])) as Record<RegionId, string | undefined>)
  const [chainProgress, setChainProgress] = useState<Record<string, number>>({})
  const [techs, setTechs] = useState<string[]>(defaultStartingTechs)
  const [activeResearch, setActiveResearch] = useState<TechnologyId>(researchableTechIds[0])
  const [researchProgress, setResearchProgress] = useState<Partial<Record<TechnologyId, number>>>({})
  const [productionMethods, setProductionMethods] = useState<Record<RegionId, ProductionMethodId>>(initialProductionMethods)
  const [staffingPriorities, setStaffingPriorities] = useState<Record<RegionId, StaffingPriority>>(initialStaffingPriorities)
  const [manualStaffing, setManualStaffing] = useState<Partial<Record<RegionId, number>>>({})
  const [autoStaffingByFacility, setAutoStaffingByFacility] = useState<Partial<Record<RegionId, boolean>>>({})
  const [facilityOrders, setFacilityOrders] = useState<Record<RegionId, FacilityOrderMode>>(Object.fromEntries(facilityOrder.map(id => [id, 'hold'])) as Record<RegionId, FacilityOrderMode>)
  const [facilityOrderStarted, setFacilityOrderStarted] = useState<Record<RegionId, number>>(Object.fromEntries(facilityOrder.map(id => [id, 1])) as Record<RegionId, number>)
  const [construction, setConstruction] = useState<Record<RegionId, ConstructionProject | null>>(initialConstruction)
  const [populationPressureDays, setPopulationPressureDays] = useState(0)
  const [activeOptimizerId, setActiveOptimizerId] = useState<OptimizerId | 'none'>('none')
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty)
  const [observerMode, setObserverMode] = useState(false)
  const [autoEventsEnabled, setAutoEventsEnabled] = useState(false)
  const [autoTradeProtectionEnabled, setAutoTradeProtectionEnabled] = useState(true)
  const [autoTradeEnabled, setAutoTradeEnabled] = useState<Partial<Record<ResourceKey, boolean>>>({})
  const [tradeSourcedResources, setTradeSourcedResources] = useState<Partial<Record<ResourceKey, boolean>>>({})
  const [dailyManualTrades, setDailyManualTrades] = useState<Partial<Record<ResourceKey, { dir: 'buy' | 'sell'; qty: number }>>>({})
  const [lastAutomatedAction, setLastAutomatedAction] = useState<{ id: RegionId; day: number; mode: FacilityOrderMode } | null>(null)
  const policy = 'ration' as const
  const [reignReportBaseline, setReignReportBaseline] = useState<ReignReportBaseline>({ day: 1, resources: initialResources, gdp: 0 })
  const [lastReignReport, setLastReignReport] = useState<ReignReport | null>(null)
  const [activeReignReport, setActiveReignReport] = useState<ReignReport | null>(null)
  const [reignTrendPoints, setReignTrendPoints] = useState<TrendPoint[]>([])
  const reignTrendRef = useRef<TrendPoint[]>([])
  const [log, setLog] = useState<string[]>(['御日 001：月面行宫已就位，御座号的第一根龙骨等待铸造。'])
  const [pendingMonthlyReport, setPendingMonthlyReport] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startSettingsOpen, setStartSettingsOpen] = useState(false)
  const [musicVolume, setMusicVolume] = useState(loadStoredMusicVolume)
  const [saveStatus, setSaveStatus] = useState('本机多槽存档')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [saveSlotMetas, setSaveSlotMetas] = useState<(SaveSlotMeta | null)[]>(() => readAllSaveSlotMetas())
  const [autoSaveState, setAutoSaveState] = useState<GameSaveState | null>(() => readAutoSave())
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [showVictory, setShowVictory] = useState(false)

  const selectedRegion = regions.find(region => region.id === selected)!
  const selectedCost = projectFacilityCost(facilityEconomySpecs[selectedRegion.id], selectedRegion.level, techs, difficulty)
  const palaceRegion = regions.find(region => region.id === 'K')!
  const palaceLevel = palaceRegion.level
  const habitatLevel = regions.find(region => region.id === 'M')?.level ?? 0
  const shipLevel = regions.find(region => region.id === 'D')!.level
  const completed = day >= gameCalendar.finalDay
  const staffing = useMemo(() => {
    const auto = autoAllocateStaffing(regions, resources.population, staffingPriorities)
    // 手动调配覆盖：保持手动值（不超过容量），自动分配补足其余
    facilityOrder.forEach(id => {
      const manual = manualStaffing[id]
      if (manual !== undefined) {
        if (isHousingFacility(id)) {
          auto[id] = Math.min(manual, getHousingCapacity(id, regions.find(r => r.id === id)?.level ?? 0))
        } else {
          auto[id] = Math.min(manual, getFacilityWorkCapacity(id, regions.find(r => r.id === id)?.level ?? 0))
        }
      }
    })
    // 系统默认人力纠正（便捷工具）：仅在优化器未启用时执行，跌破债务上限时撤人纠偏。
    if (activeOptimizerId === 'none') {
      return autoCorrectStaffing(
        resources,
        regions.map(region => ({ id: region.id, level: region.level })),
        auto,
        techs,
        productionMethods,
      ).adjustedStaffing
    }
    return auto
  }, [regions, resources, staffingPriorities, manualStaffing, activeOptimizerId, techs, productionMethods])
  const allocatedPopulation = useMemo(() => facilityOrder.reduce((sum, id) => sum + (staffing[id] ?? 0), 0), [staffing])
  const freePopulation = Math.max(0, Math.floor(resources.population - allocatedPopulation))

  // 人口建筑手动调配重分配：总量不变，按优先级再平衡
  const housingIds = useMemo(() => facilityOrder.filter(id => isHousingFacility(id)), [])

  /** 切换某建筑的自动/手动调配模式 */
  const handleToggleAutoStaffing = (id: RegionId, auto: boolean) => {
    if (auto) {
      // 切回自动：清除手动值
      setAutoStaffingByFacility(prev => { const n = { ...prev }; delete n[id]; return n })
      setManualStaffing(prev => { const n = { ...prev }; delete n[id]; return n })
    } else {
      // 切到手動：保留当前值作为手动
      setAutoStaffingByFacility(prev => ({ ...prev, [id]: false }))
      setManualStaffing(prev => ({ ...prev, [id]: staffing[id] ?? 0 }))
    }
  }

  /** 人口建筑手动调配：重分配空闲人口到其它建筑以保持总量 */
  const handleHousingRedistribute = (id: RegionId, newValue: number) => {
    if (observerMode) return
    const oldValue = staffing[id] ?? 0
    const delta = newValue - oldValue
    if (delta === 0) return
    setAutoStaffingByFacility(prev => { const n = { ...prev }; n[id] = false; return n })
    setManualStaffing(prev => {
      const next = { ...prev, [id]: newValue }
      // 计算其它可分配人口建筑的当前人数
      const otherIds = housingIds.filter(hid => hid !== id)
      const otherStaffing = otherIds.map(hid => {
        const manual = prev[hid] ?? staffing[hid]
        return { hid, manual, capacity: getHousingCapacity(hid, regions.find(r => r.id === hid)?.level ?? 0) }
      }).sort((a, b) => (staffingPriorities[b.hid] ?? 0) - (staffingPriorities[a.hid] ?? 0))
      let remaining = -delta
      if (remaining > 0) {
        // 削减此建筑，按优先级分配给其它建筑
        const reversed = [...otherStaffing].sort((a, b) => (staffingPriorities[b.hid] ?? 0) - (staffingPriorities[a.hid] ?? 0))
        for (const item of reversed) {
          if (remaining <= 0) break
          const space = item.capacity - (item.manual ?? staffing[item.hid] ?? 0)
          const give = Math.min(space, remaining)
          if (give > 0) { next[item.hid] = (item.manual ?? staffing[item.hid] ?? 0) + give; remaining -= give }
        }
      } else if (remaining < 0) {
        // 增加此建筑，按优先级从其它建筑抽取
        for (const item of otherStaffing) {
          if (remaining >= 0) break
          const current = item.manual ?? staffing[item.hid] ?? 0
          const take = Math.min(current, -remaining)
          if (take > 0) { next[item.hid] = current - take; remaining += take }
        }
        // 剩余不足则截断目标值
        if (remaining < 0) next[id] = newValue + remaining
      }
      return next
    })
  }

  const activeResearchSpec = technologyCatalog[activeResearch]
  const researchThroughput = Math.max(1, Math.min(10, 1 + Math.floor((staffing.L ?? 0) * 0.5) + (hasTech(techs, 'TL-2') ? 1 : 0) + (hasTech(techs, 'TL-3') ? 2 : 0)))

  const facilityStates = useMemo<Record<RegionId, FacilityState>>(
    () => Object.fromEntries(regions.map(region => [
      region.id,
      { id: region.id, level: Math.min(getFacilityWorkCapacity(region.id, region.level), staffing[region.id] ?? 0) },
    ])) as Record<RegionId, FacilityState>,
    [regions, staffing],
  )
  const facilityLevels = useMemo(
    () => Object.fromEntries(regions.map(region => [region.id, region.level])) as Record<RegionId, number>,
    [regions],
  )
  const workerByFacility = useMemo(
    () => Object.fromEntries(regions.map(region => [region.id, roster.find(item => item.id === assigned[region.id])])) as Partial<Record<RegionId, Role>>,
    [regions, roster, assigned],
  )
  const facilityModifiers = useMemo(
    () => Object.fromEntries(facilityOrder.map(id => {
      const worker = workerByFacility[id]
      return [id, buildFacilityModifiers(habitatLevel, policy, worker?.specialty === id ? 1 + worker.boost : 1)]
    })) as Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>,
    [workerByFacility, habitatLevel, policy],
  )
  const productionFlow = useMemo(() => projectDailyFlow({
    facilities: facilityStates,
    facilityLevels,
    modifiers: facilityModifiers,
    techs,
    productionMethods,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
  }), [facilityStates, facilityLevels, facilityModifiers, techs, productionMethods, policy])
  const housingFacilityMap = useMemo(
    () => regions.reduce((map, region) => ({ ...map, [region.id]: { id: region.id, level: region.level } }), {} as Record<RegionId, FacilityState>),
    [regions],
  )
  const afterProductionResources = useMemo(() => settleDailyResources(resources, productionFlow.net), [resources, productionFlow])
  const preliminaryPopulationProjection = useMemo<PopulationProjection>(() => projectPopulationSystem({
    resources: afterProductionResources,
    facilities: housingFacilityMap,
    policy,
    techs,
    pressureDays: populationPressureDays,
  }), [afterProductionResources, housingFacilityMap, policy, techs, populationPressureDays])
  const autoTradeTargets = useMemo(() => ({
    water: preliminaryPopulationProjection.lifeSupportCost.water ?? 0,
    oxygen: preliminaryPopulationProjection.lifeSupportCost.oxygen ?? 0,
    biomass: preliminaryPopulationProjection.lifeSupportCost.biomass ?? 0,
    regolith: 0,
    alloy: 0,
    quantumCore: 0,
    luxury: 0,
  }), [preliminaryPopulationProjection])
  const autoTradePlan = useMemo(() => planAutoTradesForDeficits(
    afterProductionResources,
    autoTradeTargets,
    regions.map(region => ({ id: region.id, level: region.level })),
    techs,
    autoTradeEnabled,
    autoTradeProtectionEnabled,
  ), [afterProductionResources, autoTradeTargets, regions, techs, autoTradeEnabled, autoTradeProtectionEnabled])
  const currencyDebtInterest = useMemo(() => calculateCurrencyDebtInterest(autoTradePlan.resources), [autoTradePlan.resources])
  const populationBaseResources = useMemo(
    () => currencyDebtInterest > 0 ? apply(autoTradePlan.resources, { currency: -currencyDebtInterest }) : autoTradePlan.resources,
    [autoTradePlan.resources, currencyDebtInterest],
  )
  const populationProjection = useMemo<PopulationProjection>(() => projectPopulationSystem({
    resources: populationBaseResources,
    facilities: housingFacilityMap,
    policy,
    techs,
    pressureDays: populationPressureDays,
  }), [populationBaseResources, housingFacilityMap, policy, techs, populationPressureDays])
  const populationFlow = useMemo(() => flowFromPopulation(populationProjection), [populationProjection])
  const tradeFlow = useMemo(() => flowFromTrades(autoTradePlan.trades, currencyDebtInterest), [autoTradePlan.trades, currencyDebtInterest])
  const dailyProduction = useMemo(() => mergeResourceChanges(productionFlow.production, populationFlow.production, tradeFlow.production), [productionFlow, populationFlow, tradeFlow])
  const dailyConsumption = useMemo(() => mergeResourceChanges(productionFlow.consumption, populationFlow.consumption, tradeFlow.consumption), [productionFlow, populationFlow, tradeFlow])
  const dailyNet = useMemo(() => mergeResourceChanges(productionFlow.net, populationProjection.net, tradeFlow.net), [productionFlow, populationProjection, tradeFlow])
  const selfProducedSurplus = useMemo(() => {
    const rows: Partial<Record<ResourceKey, boolean>> = {}
    resourceOrder.forEach(key => {
      const produced = (productionFlow.production[key] ?? 0) + (populationFlow.production[key] ?? 0)
      const consumed = (productionFlow.consumption[key] ?? 0) + (populationFlow.consumption[key] ?? 0)
      rows[key] = produced > consumed && produced - consumed > 0.01
    })
    return rows
  }, [productionFlow, populationFlow])
  const gdp = useMemo(() => weightedValue(dailyProduction), [dailyProduction])
  const optimizerInput = useMemo(() => ({
    resources,
    facilities: regions.map(region => ({ id: region.id, level: region.level })),
    staffing,
    population: populationProjection,
    blockedFacilities: facilityOrder.filter(id => construction[id]),
    modifiers: facilityModifiers,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
    reserveFloors: defaultReserveFloors,
    techs,
    productionMethods,
    year: day,
    capitalHorizonYears: 360,
    autoEventsEnabled,
    chainProgress,
    difficulty,
  }), [resources, regions, staffing, populationProjection, construction, facilityModifiers, techs, productionMethods, policy, day, autoEventsEnabled, chainProgress, difficulty])
  const automationPlan = useMemo<AutomationPlan>(() => (
    activeOptimizerId === 'none'
      ? createDisabledAutomationPlan(resources, regions.map(region => ({ id: region.id, level: region.level })))
      : gameOptimizers[activeOptimizerId].run(optimizerInput)
  ), [activeOptimizerId, resources, regions, optimizerInput])
  const shipProgress = Math.min(100, Math.round(shipLevel * 14 + (hasTech(techs, 'TD-1') ? 6 : 0) + Math.min(24, weightedShipReadiness(resources))))
  const score = Math.round(shipProgress * 8 + regions.reduce((sum, region) => sum + region.level * 12, 0) + roster.length * 25 + resources.knowledge * 2)
  const activeStage = (() => {
    const methodId = productionMethods['D'] ?? 'MD-1'
    return parseInt(methodId.replace('MD-', ''), 10) || 1
  })()
  const activeTabId: AppView = view === 'visitors' ? 'visitors' : view === 'facilities' ? (specialTabFacility[selected] ?? 'facilities') : 'facilities'

  useEffect(() => {
    window.localStorage.setItem(musicVolumeKey, String(musicVolume))
    const audio = audioRef.current
    if (!audio) return
    audio.volume = musicVolume
    if (!gameStarted || musicVolume <= 0) {
      audio.pause()
      return
    }
    audio.play().catch(() => {
      setSaveStatus('浏览器等待一次点击后再播放音乐')
    })
  }, [gameStarted, musicVolume])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const writeLog = (line: string) => setLog(previous => [line, ...previous].slice(0, 5))

  const createReignReport = (
    reportDay: number,
    reportResources: Resources = resources,
    reportRegions: Region[] = regions,
    reportStaffing: Record<RegionId, number> = staffing,
    reportConstruction: Record<RegionId, ConstructionProject | null> = construction,
    reportPopulation: PopulationProjection = populationProjection,
    reportProduction: Resources = dailyProduction,
    reportConsumption: Resources = dailyConsumption,
    reportGdp: number = gdp,
    baseline: ReignReportBaseline = reignReportBaseline,
    trendPoints: TrendPoint[] = [],
  ): ReignReport => {
    const reportPlan = gameOptimizers['crown-steward'].run({
      ...optimizerInput,
      resources: reportResources,
      facilities: reportRegions.map(region => ({ id: region.id, level: region.level })),
      staffing: reportStaffing,
      population: reportPopulation,
      blockedFacilities: facilityOrder.filter(id => reportConstruction[id]),
      year: reportDay,
    })
    const isOpening = reportDay <= 1
    return {
      id: `${reportDay}-${Math.round(reportGdp * 100)}`,
      startDay: isOpening ? 1 : baseline.day,
      endDay: reportDay,
      monthNumber: Math.max(1, Math.ceil(reportDay / gameCalendar.reignMonthDays)),
      populationStart: isOpening ? reportResources.population : baseline.resources.population,
      populationEnd: reportResources.population,
      populationDelta: isOpening ? 0 : reportResources.population - baseline.resources.population,
      housingCapacity: reportPopulation.capacity,
      gdp: reportGdp,
      gdpDelta: isOpening ? 0 : reportGdp - baseline.gdp,
      resourceRows: summarizeResourceRows(reportProduction, reportConsumption),
      suggestions: summarizeOptimizerDirections(reportPlan, reportPopulation),
      phaseGuidance: getPhaseGuidance(reportDay),
      trendPoints,
    }
  }

  const publishReignReport = (report: ReignReport, reportResources: Resources, reportGdp: number) => {
    setLastReignReport(report)
    setActiveReignReport(report)
    setReignReportBaseline({ day: report.endDay, resources: reportResources, gdp: reportGdp })
    setRunning(false)
    writeLog(`${formatDay(report.endDay)}：第 ${report.monthNumber} 个${gameCalendar.monthName}报告已归档，日 GDP ${report.gdp.toFixed(1)}。`)
  }

  const currentSave = (): GameSaveState => ({
    version: 6,
    savedAt: new Date().toISOString(),
    gameStarted,
    resources,
    regionLevels: Object.fromEntries(regions.map(region => [region.id, region.level])) as Record<RegionId, number>,
    day,
    isRunning,
    speed,
    view,
    selected,
    planetDocked,
    detailOpen,
    dockCollapsed,
    planetTextureId: planetTexture.id,
    visitor,
    roster,
    assigned,
    chainProgress,
    techs,
    activeResearch,
    researchProgress,
    productionMethods,
    staffing,
    staffingPriorities,
    facilityOrders,
    facilityOrderStarted,
    construction,
    populationPressureDays,
    activeOptimizerId,
    difficulty,
    observerMode,
    autoEventsEnabled,
    autoTradeProtectionEnabled,
    autoTradeEnabled,
    tradeSourcedResources,
    lastAutomatedAction,
    policy,
    policyLastChangedDay: 1,
    policyReportStartedDay: 1,
    policyReportBaseline: initialResources,
    lastPolicyReport: null,
    reignReportBaseline,
    lastReignReport,
    activeReignReport,
    log,
    pendingMonthlyReport,
  })

  const applySave = (save: GameSaveState) => {
    setResources(save.resources)
    setRegions(regionTemplate.map(region => ({ ...region, level: save.regionLevels[region.id] ?? region.level })))
    setDay(save.day)
    setRunning(save.isRunning)
    setSpeed(save.speed)
    setView(save.view)
    setSelected(save.selected)
    setPlanetDocked(save.planetDocked)
    setDetailOpen(save.detailOpen)
    setDockCollapsed(save.dockCollapsed ?? false)
    setPlanetTexture(planetTextures.find(texture => texture.id === save.planetTextureId) ?? planetTexture)
    setVisitor(save.visitor)
    setRoster(save.roster)
    setAssigned(save.assigned)
    setChainProgress(save.chainProgress)
    setTechs(save.techs)
    setActiveResearch(save.activeResearch)
    setResearchProgress(save.researchProgress)
    setProductionMethods(save.productionMethods)
    setStaffingPriorities(normalizeStaffingPriorities(save.staffingPriorities))
    setFacilityOrders(save.facilityOrders)
    setFacilityOrderStarted(save.facilityOrderStarted)
    setConstruction(save.construction)
    setPopulationPressureDays(save.populationPressureDays)
    setActiveOptimizerId(save.activeOptimizerId ?? 'none')
    setDifficulty(save.difficulty ?? defaultDifficulty)
    setObserverMode(save.observerMode ?? false)
    setAutoEventsEnabled(save.autoEventsEnabled ?? false)
    setAutoTradeProtectionEnabled(save.autoTradeProtectionEnabled ?? true)
    setAutoTradeEnabled(save.autoTradeEnabled ?? {})
    setTradeSourcedResources(save.tradeSourcedResources ?? {})
    setLastAutomatedAction(save.lastAutomatedAction)
    setReignReportBaseline(save.reignReportBaseline)
    setLastReignReport(save.lastReignReport)
    setActiveReignReport(save.activeReignReport)
    setLog(save.log)
    setPendingMonthlyReport(save.pendingMonthlyReport)
    setGameStarted(true)
  }

  const saveGame = (slotIndex: number, slotName?: string) => {
    const snapshot = currentSave()
    try {
      window.localStorage.setItem(saveKey(slotIndex), JSON.stringify(snapshot))
      const meta: SaveSlotMeta = {
        name: slotName ?? `存档 ${slotIndex + 1}`,
        day: snapshot.day,
        score,
        savedAt: new Date().toISOString(),
      }
      writeSaveSlotMeta(slotIndex, meta)
      setSaveSlotMetas(readAllSaveSlotMetas())
      setToastMessage(`已存档至槽位 ${slotIndex + 1}：${meta.name}`)
      setSaveStatus(`已存档：${formatSaveSlotDay(meta.day)}`)
    } catch {
      setToastMessage('存档失败：浏览器存储异常')
    }
  }

  const loadGame = (slotIndex: number) => {
    try {
      const rawSave = window.localStorage.getItem(saveKey(slotIndex))
      if (!rawSave) {
        setToastMessage(`槽位 ${slotIndex + 1} 为空，没有可读取的存档`)
        return
      }
      const parsed = JSON.parse(rawSave) as GameSaveState
      if (![4, 5, 6].includes(parsed.version) || !parsed.resources || !parsed.regionLevels || !parsed.construction || !parsed.reignReportBaseline) throw new Error('invalid save')
      applySave(parsed)
      setSettingsOpen(false)
      setStartSettingsOpen(false)
      const meta = readSaveSlotMeta(slotIndex)
      setToastMessage(`已读取槽位 ${slotIndex + 1}：${meta?.name ?? `存档 ${slotIndex + 1}`}`)
      setSaveStatus(`已读档：${formatSaveSlotDay(parsed.day)}`)
    } catch {
      setToastMessage('读档失败：存档格式损坏')
    }
  }

  const renameSaveSlot = (slotIndex: number, newName: string) => {
    const meta = readSaveSlotMeta(slotIndex)
    if (!meta) return
    const updated: SaveSlotMeta = { ...meta, name: newName }
    writeSaveSlotMeta(slotIndex, updated)
    setSaveSlotMetas(readAllSaveSlotMetas())
    setToastMessage(`槽位 ${slotIndex + 1} 已重命名为「${newName}」`)
  }

  const saveAutoSave = () => {
    const snapshot = currentSave()
    try {
      writeAutoSave(snapshot)
      setAutoSaveState(snapshot)
      setToastMessage(`已自动存档：${formatSaveSlotDay(snapshot.day)}`)
      setSaveStatus(`已自动存档：${formatSaveSlotDay(snapshot.day)}`)
    } catch {
      setToastMessage('自动存档失败：浏览器存储异常')
    }
  }

  const continueGame = (options: Pick<StartOptions, 'observerMode'>) => {
    const save = readAutoSave()
    if (!save) return
    if (![4, 5, 6].includes(save.version) || !save.resources || !save.regionLevels || !save.construction || !save.reignReportBaseline) {
      clearAutoSave()
      setAutoSaveState(null)
      setToastMessage('自动存档损坏，已清除')
      return
    }
    const savedObserverMode = save.observerMode ?? false
    applySave({ ...save, observerMode: options.observerMode })
    // 仅当玩家在开始界面改变了观察者开关时调整接管状态
    if (options.observerMode && !savedObserverMode) {
      setActiveOptimizerId('crown-steward')
      setRunning(true)
    } else if (!options.observerMode && savedObserverMode) {
      setActiveOptimizerId('none')
      setRunning(false)
    }
    setSettingsOpen(false)
    setStartSettingsOpen(false)
    setShowVictory(false)
    setToastMessage(`已读档：自动存档（${formatSaveSlotDay(save.day)}）`)
    setSaveStatus(`已读档：${formatSaveSlotDay(save.day)}`)
  }

  const exitToHome = () => {
    setRunning(false)
    setSettingsOpen(false)
    setShowVictory(false)
    setGameStarted(false)
    setActiveOptimizerId('none')
    setObserverMode(false)
    setDifficulty(defaultDifficulty)
    audioRef.current?.pause()
  }

  const exitGame = (save = true) => {
    if (save) saveAutoSave()
    exitToHome()
  }

  const handleClearAndExit = () => {
    clearAutoSave()
    setAutoSaveState(null)
    exitToHome()
    setToastMessage('自动存档已清除，可开始新的试验')
  }

  const chooseVisitor = () => {
    const facilityStates = regions.map(r => ({ id: r.id, level: r.level }))
    const currentEra = getCurrentGameEra(facilityStates)
    const available = getAvailableEventChains(chainProgress, currentEra)
    if (available.length) {
      const chain = available[Math.floor(Math.random() * available.length)]
      setVisitor(buildEncounter(chain, chainProgress[chain.id] ?? 0))
    }
  }

  const advanceEncounter = (encounter: Encounter, completed = false) => {
    setChainProgress(previous => {
      const nextStep = completed ? encounter.chain.events.length : Math.min((previous[encounter.chain.id] ?? 0) + 1, encounter.chain.events.length)
      return { ...previous, [encounter.chain.id]: nextStep }
    })
    setVisitor(null)
  }

  const advanceDay = () => {
    if (completed) return
    const nextDay = day + 1
    const isReportDay = nextDay % gameCalendar.reignMonthDays === 0
    const afterDailyNet = settleDailyResources(resources, dailyNet)
    let finalResources = afterDailyNet
    const manualTradeEntries = Object.entries(dailyManualTrades) as [ResourceKey, { dir: 'buy' | 'sell'; qty: number }][]
    if (manualTradeEntries.length) {
      const doDailyTrade = (r: Resources, key: ResourceKey, dir: 'buy' | 'sell', qty: number): Resources | null => {
        const offer = starportTradeOffers.find(o => o.resource === key)
        if (!offer) return null
        const bp = offer.input.currency ?? 0
        const sp = offer.baseValue * (1 - offer.sellDiscount)
        const obp = offer.output[offer.resource] ?? 1
        const input: Partial<Resources> = dir === 'buy' ? { currency: bp * qty } : { [key]: qty }
        const output: Partial<Resources> = dir === 'buy' ? { [key]: qty * obp } : { currency: sp * qty }
        if (!canExecuteStarportTrade(r, input)) return null
        return apply(apply(r, input, -1), output)
      }
      manualTradeEntries.forEach(([key, trade]) => {
        const result = doDailyTrade(finalResources, key, trade.dir, trade.qty)
        if (result) finalResources = result
      })
    }
    const completedProjects = Object.entries(construction).filter(([, project]) => project && project.completeDay <= nextDay) as [RegionId, ConstructionProject][]
    const startedActions: typeof automationPlan.actions = []
    const completedTechnologyActions: typeof automationPlan.technologyActions = []

    if (activeResearchSpec && !hasTech(techs, activeResearch) && hasResearchPrerequisites(activeResearch, techs)) {
      const requiredKnowledge = activeResearchSpec.researchCost ?? 0
      const currentProgress = researchProgress[activeResearch] ?? 0
      const remainingKnowledge = Math.max(0, requiredKnowledge - currentProgress)
      const spentKnowledge = Math.min(finalResources.knowledge, researchThroughput, remainingKnowledge)
      if (spentKnowledge > 0 || requiredKnowledge === 0) {
        const nextProgress = Math.min(requiredKnowledge, currentProgress + spentKnowledge)
        finalResources = { ...finalResources, knowledge: finalResources.knowledge - spentKnowledge }
        setResearchProgress(previous => ({ ...previous, [activeResearch]: nextProgress }))
        if (nextProgress >= requiredKnowledge) {
          setTechs(previous => previous.some(item => item.includes(activeResearch)) ? previous : [...previous, `${activeResearch} ${activeResearchSpec.name}`])
          writeLog(`${formatDay(nextDay)}：问天研究实验室完成「${activeResearchSpec.name}」。`)
        }
      }
    }

    setResources(finalResources)
    setPopulationPressureDays(populationProjection.nextPressureDays)
    if (autoTradeProtectionEnabled && autoTradePlan.tradedResources.length) {
      setTradeSourcedResources(previous => {
        const next = { ...previous }
        autoTradePlan.tradedResources.forEach(key => { next[key] = true })
        return next
      })
      if (isReportDay) {
        writeLog(`${formatDay(nextDay)}：星海交易港自动补入 ${autoTradePlan.tradedResources.map(key => resourceMeta[key].label).join('、')}。`)
      }
    }

    if (completedProjects.length) {
      setRegions(previous => previous.map(region => {
        const project = completedProjects.find(([id]) => id === region.id)?.[1]
        return project?.mode === 'expand' ? { ...region, level: project.toLevel } : region
      }))
      setConstruction(previous => {
        const next = { ...previous }
        completedProjects.forEach(([id]) => { next[id] = null })
        return next
      })
      writeLog(`${formatDay(nextDay)}：${completedProjects.map(([id, project]) => `${regions.find(region => region.id === id)?.name ?? id}${project.mode === 'expand' ? '完工' : '拆除冷却结束'}`).join('、')}。`)
    }

    const completedProjectById = Object.fromEntries(completedProjects) as Partial<Record<RegionId, ConstructionProject>>
    const manualContinuousProjects: [RegionId, ConstructionProject][] = []
    const manualImmediateLevels: Partial<Record<RegionId, number>> = {}
    facilityOrder.forEach(id => {
      const mode = facilityOrders[id]
      if (mode !== 'expand-continuous' && mode !== 'shrink-continuous') return
      if (isFixedFacility(id)) return
      if (construction[id] && !completedProjectById[id]) return
      const region = regions.find(item => item.id === id)!
      const completedProject = completedProjectById[id]
      const currentLevel = completedProject?.mode === 'expand' ? completedProject.toLevel : region.level
      const spec = facilityEconomySpecs[id]
      if (mode === 'expand-continuous') {
        const cost = projectFacilityCost(spec, currentLevel, techs, difficulty)
        if (!canBuildFacility(spec, techs) || currentLevel >= spec.maxLevel || !canPay(finalResources, cost)) return
        finalResources = apply(finalResources, cost, -1)
        manualContinuousProjects.push([id, {
          mode: 'expand',
          startedDay: nextDay,
          completeDay: nextDay + getConstructionDays(techs),
          fromLevel: currentLevel,
          toLevel: currentLevel + 1,
          cost,
        }])
        return
      }
      if (currentLevel <= 0) return
      const refund = scaleResourceBundle(projectFacilityCost(spec, currentLevel - 1, techs, difficulty), 0.5)
      finalResources = apply(finalResources, refund)
      manualImmediateLevels[id] = currentLevel - 1
      manualContinuousProjects.push([id, {
        mode: 'shrink',
        startedDay: nextDay,
        completeDay: nextDay + getConstructionDays(techs),
        fromLevel: currentLevel,
        toLevel: currentLevel - 1,
        cost: refund,
      }])
    })
    if (manualContinuousProjects.length) {
      setResources(finalResources)
      if (Object.keys(manualImmediateLevels).length) {
        setRegions(previous => previous.map(region => manualImmediateLevels[region.id] === undefined ? region : { ...region, level: manualImmediateLevels[region.id]! }))
      }
      setConstruction(previous => {
        const next = { ...previous }
        manualContinuousProjects.forEach(([id, project]) => { next[id] = project })
        return next
      })
      setFacilityOrderStarted(previous => {
        const next = { ...previous }
        manualContinuousProjects.forEach(([id]) => { next[id] = nextDay })
        return next
      })
      writeLog(`${formatDay(nextDay)}：持续命令继续执行 ${manualContinuousProjects.map(([id]) => regions.find(region => region.id === id)?.name ?? id).join('、')}。`)
    }

    if (activeOptimizerId !== 'none' && isReportDay) {
    const startedIds = new Set<RegionId>()
    automationPlan.technologyActions.forEach(action => {
      if (!canPay(finalResources, action.cost)) return
      finalResources = apply(finalResources, action.cost, -1)
      completedTechnologyActions.push(action)
    })
    automationPlan.actions.forEach(action => {
      if (startedIds.has(action.id) || construction[action.id]) return
      action.trades?.forEach(trade => {
        if (canPay(finalResources, trade.input)) {
          finalResources = apply(apply(finalResources, trade.input, -1), trade.output)
        }
      })
      if (!canPay(finalResources, action.cost)) return
      finalResources = apply(finalResources, action.cost, -1)
      startedActions.push(action)
      startedIds.add(action.id)
    })
    if (completedTechnologyActions.length || startedActions.length) {
      setResources(finalResources)
    }
    if (completedTechnologyActions.length) {
      setTechs(previous => {
        const next = [...previous]
        completedTechnologyActions.forEach(action => {
          if (!next.some(item => item.includes(action.techId))) next.push(`${action.techId} ${action.name}`)
        })
        return next
      })
    }
    if (startedActions.length) {
      setTechs(previous => {
        const next = [...previous]
        startedActions.flatMap(action => action.technologyUnlocks ?? []).forEach(techId => {
          if (!next.some(item => item.includes(techId))) next.push(`${techId} ${technologyCatalog[techId].name}`)
        })
        return next
      })
      setConstruction(previous => {
        const next = { ...previous }
        startedActions.forEach(action => {
          next[action.id] = {
            mode: 'expand',
            startedDay: nextDay,
            completeDay: nextDay + getConstructionDays(techs),
            fromLevel: action.fromLevel,
            toLevel: action.toLevel,
            cost: action.cost,
          }
        })
        return next
      })
      setFacilityOrders(previous => {
        const next = { ...previous }
        startedActions.forEach(action => { next[action.id] = 'expand' })
        return next
      })
      setFacilityOrderStarted(previous => {
        const next = { ...previous }
        startedActions.forEach(action => { next[action.id] = nextDay })
        return next
      })
      setLastAutomatedAction({ id: startedActions[0].id, day: nextDay, mode: 'expand' })
      const names = startedActions.map(action => regions.find(region => region.id === action.id)?.name ?? action.id).join('、')
      if (isReportDay) {
        setPendingMonthlyReport(`${formatDay(nextDay + 1)} 王月报告：内置优化署开工 ${names}，共 ${startedActions.length} 项，完工后进入新规模。`)
      }
    } else if (isReportDay) {
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 王月报告：内置优化署完成复核，当前无可执行扩建；维持既有施工队列。`)
    }
    }

    setDay(nextDay)
    // Track daily trend point
    const trendPoint: TrendPoint = {
      day: nextDay,
      population: finalResources.population,
      alloy: finalResources.alloy,
      currency: finalResources.currency,
      water: finalResources.water,
      oxygen: finalResources.oxygen,
      biomass: finalResources.biomass,
      regolith: finalResources.regolith,
      knowledge: finalResources.knowledge,
      power: finalResources.power,
      luxury: finalResources.luxury ?? 0,
      gdp: gdp,
      netAlloy: dailyNet.alloy ?? 0,
      netKnowledge: dailyNet.knowledge ?? 0,
      netCurrency: dailyNet.currency ?? 0,
    }
    reignTrendRef.current = [...reignTrendRef.current, trendPoint]
    setReignTrendPoints(reignTrendRef.current)
    if (isReportDay) {
      const trendData = [...reignTrendRef.current]
      const report = createReignReport(nextDay, finalResources, regions, staffing, construction, populationProjection, dailyProduction, dailyConsumption, gdp, reignReportBaseline, trendData)
      publishReignReport(report, finalResources, gdp)
      reignTrendRef.current = []
      setReignTrendPoints([])
    }
    if (pendingMonthlyReport && nextDay % gameCalendar.reignMonthDays === 1) {
      writeLog(pendingMonthlyReport)
      setPendingMonthlyReport(null)
    }
    if (!isReportDay && !visitor && (nextDay % 80 === 0 || Math.random() < 0.025)) chooseVisitor()
    if (milestoneLogs[nextDay]) {
      writeLog(`${formatDay(nextDay)}：${milestoneLogs[nextDay]}`)
    }
    if (nextDay === gameCalendar.finalDay) {
      writeLog(`${formatDay(gameCalendar.finalDay)}：千日试验到期。御座号的完成度将成为此局国祚。`)
      setShowVictory(true)
    }
  }

  useEffect(() => {
    if (!gameStarted || !isRunning || completed) return
    const timer = window.setInterval(advanceDay, speed === 'fast' ? gameCalendar.fastMsPerDay : gameCalendar.normalMsPerDay)
    return () => window.clearInterval(timer)
    // The interval intentionally observes current game state after each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, isRunning, completed, day, dailyNet, visitor, speed, pendingMonthlyReport, automationPlan, activeOptimizerId, construction, populationProjection])

  const selectFacility = (id: RegionId) => {
    setSelected(id)
    setView('facilities')
    setPlanetDocked(true)
    setDetailOpen(true)
  }

  // 观察者模式下拦截一切玩家主动操作（建造/拆除/科研/贸易/人员/分配）
  const guarded = <Args extends unknown[]>(fn: (...args: Args) => void) => (...args: Args) => {
    if (!observerMode) fn(...args)
  }

  const upgrade = (id: RegionId, orderMode: Extract<FacilityOrderMode, 'expand' | 'expand-continuous'> = 'expand') => {
    if (observerMode) return
    const region = regions.find(item => item.id === id)!
    const spec = facilityEconomySpecs[id]
    const cost = projectFacilityCost(facilityEconomySpecs[id], region.level, techs, difficulty)
    if (isFixedFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}是固定贸易节点，不需要扩建。`)
      return
    }
    if (!canBuildFacility(spec, techs) || region.level >= region.max) return
    if (construction[id]) {
      writeLog(`${formatDay(day)}：${region.name}仍在施工或拆除冷却中。`)
      return
    }
    if (!canPay(resources, cost)) {
      writeLog(`${formatDay(day)}：${region.name}的扩建诏令因库存不足被退回。`)
      return
    }
    setResources(previous => apply(previous, cost, -1))
    setConstruction(previous => ({
      ...previous,
      [id]: {
        mode: 'expand',
        startedDay: day,
        completeDay: day + getConstructionDays(techs),
        fromLevel: region.level,
        toLevel: region.level + 1,
        cost,
      },
    }))
    setFacilityOrders(previous => ({ ...previous, [id]: orderMode }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}开工扩建，预计 ${getConstructionDays(techs)} 御日后升为第 ${region.level + 1} 阶。${orderMode === 'expand-continuous' ? '持续增加命令已记录。' : ''}`)
  }

  const holdFacility = (id: RegionId) => {
    if (observerMode) return
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'hold' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}维持现行规模，等待下个王月报告复核。`)
  }

  const shrinkFacility = (id: RegionId, orderMode: Extract<FacilityOrderMode, 'shrink' | 'shrink-continuous'> = 'shrink') => {
    const region = regions.find(item => item.id === id)!
    if (isFixedFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}是固定贸易节点，不能缩减规模。`)
      return
    }
    if (region.level <= 0) return
    if (construction[id]) {
      writeLog(`${formatDay(day)}：${region.name}仍在施工或拆除冷却中。`)
      return
    }
    setFacilityOrders(previous => ({ ...previous, [id]: orderMode }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    const refund = scaleResourceBundle(projectFacilityCost(facilityEconomySpecs[id], region.level - 1, techs, difficulty), 0.5)
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: Math.max(0, item.level - 1) } : item))
    setResources(previous => apply(previous, refund))
    setConstruction(previous => ({
      ...previous,
      [id]: {
        mode: 'shrink',
        startedDay: day,
        completeDay: day + getConstructionDays(techs),
        fromLevel: region.level,
        toLevel: Math.max(0, region.level - 1),
        cost: refund,
      },
    }))
    writeLog(`${formatDay(day)}：${region.name}缩小至第 ${Math.max(0, region.level - 1)} 阶，回收约 50% 建材并进入冷却。${orderMode === 'shrink-continuous' ? '持续收缩命令已记录。' : ''}`)
  }

  const setStaffPriority = (id: RegionId, priority: StaffingPriority) => {
    if (observerMode) return
    const region = regions.find(item => item.id === id)!
    if (isFixedFacility(id) || isHousingFacility(id)) {
      writeLog(`${formatDay(day)}：${region.name}不占用岗位，优先级不参与人口分配。`)
      return
    }
    setStaffingPriorities(previous => ({ ...previous, [id]: priority }))
    writeLog(`${formatDay(day)}：${region.name}岗位优先级调整为 ${priority}。`)
  }

  const acceptTrade = () => {
    if (observerMode) return
    if (!visitor || !canPay(resources, visitor.offer.take)) return
    if (visitor.offer.give.population && (populationProjection.availableCapacity < visitor.offer.give.population || populationProjection.lifeSupportRatio < 1)) {
      writeLog(`${formatDay(day)}：住房或生命维持不足，${visitor.event.title}暂缓接纳人口。`)
      return
    }
    setResources(previous => apply(apply(previous, visitor.offer.take, -1), visitor.offer.give))
    if (visitor.offer.tech) setTechs(previous => previous.includes(visitor.offer.tech!) ? previous : [...previous, visitor.offer.tech!])
    writeLog(`${formatDay(day)}：${visitor.event.title}落定，${visitor.name}${visitor.offer.tech ? `交出「${visitor.offer.tech}」` : '留下新的回声'}。`)
    advanceEncounter(visitor)
  }

  const employ = () => {
    if (observerMode) return
    if (!visitor) return
    if (!canPay(resources, visitor.retainerCost)) return
    setResources(previous => apply(previous, visitor.retainerCost, -1))
    setRoster(previous => previous.some(member => member.id === visitor.id) ? previous : [...previous, rolesById[visitor.id]])
    setAssigned(previous => ({ ...previous, [visitor.specialty]: visitor.id }))
    writeLog(`${formatDay(day)}：${visitor.name}宣誓效忠，入职${regions.find(region => region.id === visitor.specialty)?.name}。`)
    advanceEncounter(visitor, visitor.chain.arc === 'simple')
  }

  const dismiss = () => {
    if (visitor) writeLog(`${formatDay(day)}：${visitor.name}离开了月面，信标从本轮记录中熄灭。`)
    if (visitor) advanceEncounter(visitor, true)
  }

  // 观察者模式下访客来函自动礼送，避免阻塞自动推进
  useEffect(() => {
    if (observerMode && visitor) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observerMode, visitor])

  const executeTrade = (name: string, input: Partial<Resources>, output: Partial<Resources>) => {
    if (observerMode) return
    if (!canExecuteStarportTrade(resources, input)) {
      writeLog(`${formatDay(day)}：${name}未能成交，库存不足。`)
      return
    }
    if (output.population && (populationProjection.availableCapacity < output.population || populationProjection.lifeSupportRatio < 1)) {
      writeLog(`${formatDay(day)}：${name}未能成交，住房或生命维持不足。`)
      return
    }
    setResources(previous => apply(apply(previous, input, -1), output))
    writeLog(`${formatDay(day)}：星海交易港完成「${name}」。`)
  }

  const scheduleDailyTrade = (key: ResourceKey, dir: 'buy' | 'sell', qty: number, input: Partial<Resources>, output: Partial<Resources>) => {
    if (observerMode) return
    if (!canExecuteStarportTrade(resources, input)) {
      writeLog(`${formatDay(day)}：每日交易设置失败，库存不足。`)
      return
    }
    setDailyManualTrades(previous => {
      const next = { ...previous, [key]: { dir, qty } }
      writeLog(`${formatDay(day)}：星海交易港锁定每日${dir === 'buy' ? '进口' : '出口'} ${resourceMeta[key].label} ×${qty}。`)
      return next
    })
  }

  const cancelDailyTrade = (key: ResourceKey) => {
    if (observerMode) return
    setDailyManualTrades(previous => {
      const next = { ...previous }
      delete next[key]
      writeLog(`${formatDay(day)}：星海交易港取消 ${resourceMeta[key].label} 的每日交易。`)
      return next
    })
  }

  const startGame = (options: StartOptions) => {
    setDifficulty(options.difficulty)
    setObserverMode(options.observerMode)
    setActiveOptimizerId(options.observerMode ? 'crown-steward' : 'none')
    setRunning(options.observerMode)
    const openingBaseline = { day: 1, resources, gdp }
    const report = createReignReport(1, resources, regions, staffing, construction, populationProjection, dailyProduction, dailyConsumption, gdp, openingBaseline)
    setGameStarted(true)
    publishReignReport(report, resources, gdp)
    setShowVictory(false)
    if (options.tutorialEnabled) setTutorialOpen(true)
  }

  if (!gameStarted) {
    return (
      <>
        <StartGate
          planetTexture={planetTexture}
          autoSave={autoSaveState ? {
            difficulty: autoSaveState.difficulty ?? defaultDifficulty,
            observerMode: autoSaveState.observerMode ?? false,
            day: autoSaveState.day,
          } : null}
          onStart={startGame}
          onContinue={continueGame}
          onSettings={() => setStartSettingsOpen(true)}
        />
        {startSettingsOpen && (
          <SettingsPanel
            volume={musicVolume}
            saveSlotMetas={saveSlotMetas}
            autoTradeProtectionEnabled={autoTradeProtectionEnabled}
            onAutoTradeProtection={setAutoTradeProtectionEnabled}
            onVolume={setMusicVolume}
            onContinue={() => setStartSettingsOpen(false)}
            onSave={saveGame}
            onLoad={loadGame}
            onRename={renameSaveSlot}
            onExit={() => setStartSettingsOpen(false)}
          />
        )}
        {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
      </>
    )
  }

  if (tutorialOpen) {
    return (
      <>
        <main className="app-shell">
          {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
          <header className="site-header">
            <div className="brand-block">
              <div className="brand-seal"><Crown size={23} /></div>
              <div><p>月面主权局 · 1000御日试验</p><h1>月冠纪元</h1></div>
            </div>
          </header>
          <TutorialOverlay onComplete={() => { window.localStorage.setItem(tutorialSeenKey, '1'); setTutorialOpen(false); }} />
        </main>
        {settingsOpen && (
          <SettingsPanel
            volume={musicVolume}
            saveSlotMetas={saveSlotMetas}
            autoTradeProtectionEnabled={autoTradeProtectionEnabled}
            onAutoTradeProtection={setAutoTradeProtectionEnabled}
            onVolume={setMusicVolume}
            onContinue={() => setSettingsOpen(false)}
            onSave={saveGame}
            onLoad={loadGame}
            onRename={renameSaveSlot}
            onExit={exitGame}
            onSaveAndExit={() => exitGame(true)}
            onClearAndExit={handleClearAndExit}
          />
        )}
      </>
    )
  }

  return <main className="app-shell">
    {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
    <header className="site-header">
      <div className="brand-block">
        <div className="brand-seal"><Crown size={23} /></div>
        <div><p>月面主权局 · 1000御日试验</p><h1>月冠纪元</h1></div>
      </div>
      <button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={16} />设置</button>
    </header>

    <audio ref={audioRef} src={musicSource} loop preload="auto" />

    <div className={`resource-rail-wrapper${railCollapsed ? ' rail-collapsed' : ''}`}>
      <button
        type="button"
        className="rail-collapse-toggle"
        onClick={() => setRailCollapsed(previous => !previous)}
        aria-expanded={!railCollapsed}
        aria-label={railCollapsed ? '展开资源栏' : '收起资源栏'}
      >
        {railCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        <span className="rail-toggle-label">{railCollapsed ? '展开库存' : '收起'}</span>
      </button>
      <section className="resource-rail" aria-label="王国库存">
        {allResourceKeys.map(key => {
          const value = key === 'power' ? dailyProduction.power : resources[key]
          const canCancelAutoTrade = Boolean(autoTradeProtectionEnabled && tradeSourcedResources[key] && autoTradeEnabled[key] !== false && selfProducedSurplus[key])
          const detail = canCancelAutoTrade ? '自产盈余，可停购' : undefined
          const isPower = key === 'power'
          const isPopulation = key === 'population'
          const subValue = isPower
            ? `/${fmtCompactAmount(dailyConsumption.power)}`
            : isPopulation
              ? `/${fmtSignedCompactAmount(dailyNet.population)}`
              : `/${fmtSignedCompactAmount(dailyNet[key])}`
          return <ResourceAtom
            key={key}
            resourceKey={key}
            value={isPopulation ? allocatedPopulation : value}
            detail={detail}
            subValue={subValue}
            actionLabel={canCancelAutoTrade ? '停购' : undefined}
            onAction={canCancelAutoTrade ? () => setAutoTradeEnabled(previous => ({ ...previous, [key]: false })) : undefined}
          />
        })}
      </section>
    </div>

    {activeReignReport && <ReignReportModal report={activeReignReport} onClose={() => setActiveReignReport(null)} />}

    {showVictory && (
      <VictoryModal
        score={score}
        shipProgress={shipProgress}
        facilityTotalLevel={regions.reduce((sum, r) => sum + r.level, 0)}
        roleCount={roster.length}
        knowledge={resources.knowledge}
        day={day}
        onRestart={() => { clearAutoSave(); setAutoSaveState(null); exitGame(false) }}
      />
    )}

    {visitor && !observerMode && <Modal scrimClassName="event-scrim" panelClassName="diplomatic-letter event-modal" ariaLabel="深空来讯" ariaLive="polite">
      <PortraitSlot src={visitorPortraits[visitor.id]} alt={visitor.name} aria-label="访客肖像" />
      <div className="letter-copy">
        <div className="event-transmission-head">
          <span>深空来讯</span>
          <small>{visitor.species} · {visitor.chain.arc === 'long' ? `链 ${Math.min((chainProgress[visitor.chain.id] ?? 0) + 1, visitor.chain.events.length)}/${visitor.chain.events.length}` : '偶遇'}</small>
        </div>
        <strong>{visitor.event.title}</strong>
        <p className="letter-body">{visitor.event.body}</p>
        <p className="letter-portrait-text">{visitor.portrait}</p>
        {visitor.event.note && <p className="letter-note">{visitor.event.note}</p>}
        {visitor.event.concealed ? <div className="event-exchange concealed"><div><b>隐含风险</b><span className="resource-empty">从来函文字判断</span></div><div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div></div> : <div className="event-exchange">
          <div><b>索取</b><ResourceBundle bundle={visitor.offer.take} /></div>
          <div><b>回赠</b><ResourceBundle bundle={visitor.offer.give} /></div>
          <div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div>
        </div>}
      </div>
      <LetterActions>
        <button onClick={dismiss}>礼送</button>
        <button onClick={acceptTrade} disabled={!canPay(resources, visitor.offer.take) || Boolean(visitor.offer.give.population && (populationProjection.availableCapacity < visitor.offer.give.population || populationProjection.lifeSupportRatio < 1))}>{visitor.event.interaction === 'gift' ? '收下' : visitor.event.interaction === 'accident' ? '接入' : visitor.event.interaction === 'request' ? '准许' : '交换'}</button>
        <button className="primary" onClick={employ} disabled={!canPay(resources, visitor.retainerCost)}>留任</button>
      </LetterActions>
      <IconButton className="letter-close" label="关闭来函" onClick={dismiss}><X size={16} /></IconButton>
    </Modal>}

    <section className="page-content">
      {view === 'facilities' && <PlanetFacilities regions={regions} selected={selected} year={day} techs={techs} habitatLevel={habitatLevel} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} construction={construction} populationProjection={populationProjection} staffing={staffing} staffingPriorities={staffingPriorities} autoStaffingByFacility={autoStaffingByFacility} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} planetTexture={planetTexture} docked={planetDocked} detailOpen={detailOpen} dockCollapsed={dockCollapsed} onDock={() => setPlanetDocked(true)} onBack={() => setDetailOpen(false)} onToggleDockCollapse={() => setDockCollapsed(previous => !previous)} onSelect={selectFacility} onUpgrade={upgrade} onHold={holdFacility} onShrink={shrinkFacility} onPriority={setStaffPriority} onMethod={guarded((regionId: RegionId, methodId: ProductionMethodId) => setProductionMethods(previous => ({ ...previous, [regionId]: methodId })))} onStaffingSet={guarded((id, staff) => setManualStaffing(previous => ({ ...previous, [id]: staff })))} onClearAutoStaffing={handleToggleAutoStaffing} onHousingRedistribute={handleHousingRedistribute} onAssignment={guarded((visitorId: string | undefined) => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId })))}>
        {selected === 'K' && <PalaceReportBlock day={day} lastReignReport={lastReignReport} onOpenReport={setActiveReignReport} />}
        {selected === 'L' && <ResearchTreeBlock techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={guarded(setActiveResearch)} />}
        {selected === 'R' && <EcologyPhaseBlock phaseNotes={selectedRegion.phaseNotes} />}
        {selected === 'S' && <TradeBoardBlock resources={resources} populationProjection={populationProjection} techs={techs} autoTradeProtectionEnabled={autoTradeProtectionEnabled} autoTradeEnabled={autoTradeEnabled} dailyTrades={dailyManualTrades} onProtection={guarded(setAutoTradeProtectionEnabled)} onTrade={executeTrade} onScheduleDailyTrade={scheduleDailyTrade} onCancelDailyTrade={cancelDailyTrade} onAutoTrade={guarded((key, enabled) => setAutoTradeEnabled(previous => ({ ...previous, [key]: enabled })))} />}
        {selected === 'D' && <ShipProgressBlock shipProgress={shipProgress} shipProjectStages={shipProjectStages} activeStage={activeStage} />}
      </PlanetFacilities>}
      {view === 'visitors' && <Visitors roster={roster} assigned={assigned} regions={regions} visitor={visitor} onSelect={selectFacility} onAssignment={guarded((regionId, visitorId) => setAssigned(previous => ({ ...previous, [regionId]: visitorId })))} />}
    </section>

    {settingsOpen && (
      <SettingsPanel
        volume={musicVolume}
        saveSlotMetas={saveSlotMetas}
        autoTradeProtectionEnabled={autoTradeProtectionEnabled}
        onAutoTradeProtection={setAutoTradeProtectionEnabled}
        onVolume={setMusicVolume}
        onContinue={() => setSettingsOpen(false)}
        onSave={saveGame}
        onLoad={loadGame}
        onRename={renameSaveSlot}
        onExit={exitGame}
        onSaveAndExit={() => exitGame(true)}
        onClearAndExit={handleClearAndExit}
      />
    )}

    <footer className="command-deck bottom-tabs">
      <div className="footer-row footer-row-left">
        <div className="scoreline gdp-line"><span>GDP</span><strong>{gdp.toFixed(1)}</strong><small><Coins size={14} /></small></div>
      </div>
      <TabNav items={navItems} activeId={activeTabId} onSelect={(id) => {
        if (id === 'facilities') { setView(id); setDetailOpen(false); return }
        if (id === 'visitors') { setView(id); return }
        if (id === 'palace') { selectFacility('K'); return }
        if (id === 'research') { selectFacility('L'); return }
        if (id === 'ecology') { selectFacility('R'); return }
        if (id === 'starport') { selectFacility('S'); return }
        if (id === 'ship') { selectFacility('D'); return }
      }} />
      <div className="footer-row footer-row-right">
        <div className="time-card" aria-label="时间控制">
          <div className="day-counter">
            <span>御日</span>
            <div><strong>{String(day).padStart(3, '0')}</strong></div>
            <small>/ {gameCalendar.finalDay}</small>
          </div>
          <button className="time-control-btn" onClick={() => setSpeed(speed === 'normal' ? 'fast' : 'normal')} aria-label="切换时间速度"><Gauge size={15} /><span>{speed === 'normal' ? '正常' : '加速'}</span></button>
          <button className="time-control-btn" onClick={() => setRunning(!isRunning)} aria-label={isRunning ? '暂停日历' : '恢复日历'} disabled={completed}>{isRunning ? <Pause size={15} /> : <Play size={15} />}<span>{isRunning ? '暂停' : '继续'}</span></button>
        </div>
      </div>
    </footer>
  </main>
}

export default App
