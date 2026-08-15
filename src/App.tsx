import { useEffect, useMemo, useRef, useState } from 'react'
import {
  autoCorrectStaffing,
  buildFacilityModifiers,
  calculateCurrencyDebtInterest,
  canBuildFacility,
  canExecuteStarportTrade,
  defaultReserveFloors,
  defaultStartingTechs,
  defaultDifficulty,
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
  projectPopulationSystem,
  resourceMeta,
  resourceOrder,
  settleDailyResources,
  planAutoTradesForDeficits,
  rebalanceStaffing,
  shipProjectStages,
  starportTradeOffers,
  technologyCatalog,
  weightedValue,
  type AutomationPlan,
  type Difficulty,
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
import {
  PlanetFacilities,
  ReignReportModal,
  SettingsPanel,
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
import {
  CommandDeck,
  GameHeader,
  ResourceRail,
  StartScreen,
  TutorialScreen,
  VisitorLetterModal,
} from './components/game'
import { useSaveSystem } from './hooks/useSaveSystem'
import {
  autoAllocateStaffing,
  apply,
  canPay,
  initialConstruction,
  initialProductionMethods,
  initialResources,
  initialStaffingPriorities,
  milestoneLogs,
  musicSource,
  navItems,
  regionTemplate,
  specialTabFacility,
} from './game/appData'
import {
  clearAutoSave,
  loadStoredMusicVolume,
  musicVolumeKey,
  readAllSaveSlotMetas,
  readAutoSave,
  tutorialSeenKey,
} from './game/appPersistence'
import {
  flowFromPopulation,
  flowFromTrades,
  mergeResourceChanges,
  summarizeResourceRows,
  weightedShipReadiness,
} from './game/appFlow'
import { formatDay } from './utils/format'
import { getPhaseGuidance, hasResearchPrerequisites, summarizeOptimizerDirections } from './utils/game'
import { scaleResourceBundle } from './utils/trade'
import { researchableTechIds } from './data/eraSections'
import { planetTextures } from './PlanetScene'
import type {
  AppView,
  ConstructionProject,
  FacilityOrderMode,
  GameSaveState,
  ReignReport,
  ReignReportBaseline,
  Region,
  RegionId,
  SaveSlotMeta,
  StaffingPriority,
  TrendPoint,
} from './types/game'

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
  // 事件自动处理开关（L3 观察者模式通道）：由 StartGate 提供开关；开启后优化器按 defaultAction
  // 模拟事件效果（事件授予的科技经 technologyActions 真实落地，资源转移进入优化器投影）。
  // L1/L2 手动模式事件始终由玩家决策，本开关不生效。
  const [autoEventsEnabled, setAutoEventsEnabled] = useState(false)
  // L2 总开关：优化器（L3）激活时自动让位（见 autoTradeProtectionEffective），切回手动模式即恢复
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
  // 人力最终配置 = 三层，L2/L3 互斥取一：
  //   L2 路径（优化器未激活）：L2 autoAllocateStaffing（按优先级分配）基底 + L1 manual 手动覆盖 + L2 autoCorrectStaffing（债务撤人）兜底；
  //   L3 路径（优化器激活）：   L3 rebalanceStaffing（评分分配）接管，L2 的两套分配工具全部停用。
  const staffing = useMemo(() => {
    const auto = autoAllocateStaffing(regions, resources.population, staffingPriorities)
    // L1 手动覆盖：保持手动值（不超过容量），自动分配补足其余
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
    if (activeOptimizerId !== 'none') {
      // L3：评分分配接管（以覆盖后的 auto 作为「当前在岗」估计，供赤字权重/电力裕度评估）
      return rebalanceStaffing(
        resources,
        regions.map(region => ({ id: region.id, level: region.level })),
        auto,
        techs,
        productionMethods,
        facilityModifiers,
        defaultReserveFloors,
      )
    }
    // L2：债务触发撤人纠偏（系统默认便捷工具）
    return autoCorrectStaffing(
      resources,
      regions.map(region => ({ id: region.id, level: region.level })),
      auto,
      techs,
      productionMethods,
    ).adjustedStaffing
  }, [regions, resources, staffingPriorities, manualStaffing, activeOptimizerId, techs, productionMethods, facilityModifiers])

  // 人口建筑手动调配重分配：总量不变，按优先级再平衡
  const housingIds = useMemo(() => facilityOrder.filter(id => isHousingFacility(id)), [])

  /** 【L2 开关】切换某建筑的自动/手动调配模式（L2 autoAllocateStaffing ↔ L1 manualStaffing 覆盖） */
  const handleToggleAutoStaffing = (id: RegionId, auto: boolean) => {
    if (auto) {
      // 切回自动：清除手动值
      setAutoStaffingByFacility(prev => { const n = { ...prev }; delete n[id]; return n })
      setManualStaffing(prev => { const n = { ...prev }; delete n[id]; return n })
    } else {
      // 切到手動：保留当前值作为手动（人口建筑以当前已安置居民为初值，生产建筑以当前在岗人数为初值）
      setAutoStaffingByFacility(prev => ({ ...prev, [id]: false }))
      setManualStaffing(prev => ({ ...prev, [id]: isHousingFacility(id) ? (populationProjection.residentsByFacility[id] ?? 0) : (staffing[id] ?? 0) }))
    }
  }

  /** 【L1 manual】人口建筑手动调配：重分配空闲人口到其它建筑以保持总量 */
  const handleHousingRedistribute = (id: RegionId, newValue: number) => {
    if (observerMode) return
    const oldValue = autoStaffingByFacility[id] === false ? (staffing[id] ?? 0) : (populationProjection.residentsByFacility[id] ?? 0)
    const delta = newValue - oldValue
    if (delta === 0) return
    setAutoStaffingByFacility(prev => { const n = { ...prev }; n[id] = false; return n })
    setManualStaffing(prev => {
      const next = { ...prev, [id]: newValue }
      // 系统内住房总量与总容量：居民必须全部安置，据此推导其它建筑的容量吸收上限与下限
      const housingTotal = housingIds.reduce((sum, hid) => sum + (
        autoStaffingByFacility[hid] === false ? (prev[hid] ?? staffing[hid] ?? 0) : (populationProjection.residentsByFacility[hid] ?? 0)
      ), 0)
      const totalHousingCapacity = housingIds.reduce((sum, hid) => sum + getHousingCapacity(hid, regions.find(r => r.id === hid)?.level ?? 0), 0)
      const excessCapacity = Math.max(0, totalHousingCapacity - housingTotal)
      // 其它可分配人口建筑的当前人数、容量与下限（下限 = 其余建筑满载时该建筑必须承载的人数）
      const otherIds = housingIds.filter(hid => hid !== id)
      const otherStaffing = otherIds.map(hid => {
        const current = autoStaffingByFacility[hid] === false ? (prev[hid] ?? staffing[hid] ?? 0) : (populationProjection.residentsByFacility[hid] ?? 0)
        const capacity = getHousingCapacity(hid, regions.find(r => r.id === hid)?.level ?? 0)
        return { hid, current, capacity, floor: Math.max(0, capacity - excessCapacity) }
      }).sort((a, b) => (staffingPriorities[b.hid] ?? 0) - (staffingPriorities[a.hid] ?? 0))
      let remaining = -delta
      if (remaining > 0) {
        // 削减此建筑，按优先级分配给其它建筑（最多填满其容量）
        for (const item of otherStaffing) {
          if (remaining <= 0) break
          const give = Math.min(item.capacity - item.current, remaining)
          if (give > 0) { next[item.hid] = item.current + give; remaining -= give }
        }
        // 其它建筑已满载仍无法吸收全部居民，截断目标值（下限保护）
        if (remaining > 0) next[id] = newValue - remaining
      } else if (remaining < 0) {
        // 增加此建筑，按优先级从其它建筑抽取（不低于其下限）
        for (const item of otherStaffing) {
          if (remaining >= 0) break
          const take = Math.min(item.current - item.floor, -remaining)
          if (take > 0) { next[item.hid] = item.current - take; remaining += take }
        }
        // 其它建筑已至下限仍不足，截断目标值
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
  /** 【L2 automation】星港自动补货计划：按 autoTradeTargets（维生缺口）由 planAutoTradesForDeficits 计算，
   *  受 autoTradeProtectionEnabled（总开关）与 autoTradeEnabled（分资源开关）控制。
   *  L3 优化器接管时本工具自动让位（autoTradeProtectionEffective=false），贸易改由 L3 planAutoTradesForCost 决策。 */
  const autoTradeProtectionEffective = activeOptimizerId === 'none' && autoTradeProtectionEnabled
  const autoTradePlan = useMemo(() => planAutoTradesForDeficits(
    afterProductionResources,
    autoTradeTargets,
    regions.map(region => ({ id: region.id, level: region.level })),
    techs,
    autoTradeEnabled,
    autoTradeProtectionEffective,
  ), [afterProductionResources, autoTradeTargets, regions, techs, autoTradeEnabled, autoTradeProtectionEffective])
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
  // 已分配人口 = 生产岗位 + 手动安置居民（自动安置居民由 projection 独立结算，不在 staffing 中）
  const allocatedPopulation = useMemo(() => facilityOrder.reduce((sum, id) => sum + (staffing[id] ?? 0), 0), [staffing])
  // 空闲人口 = 总人口 - 已分配人口（住房承载全体人口，居民与生产岗位是同一批人的不同分工，
  // 因此手动/自动安置都不占用空闲池）；生产建筑可新增岗位以它为上界
  const freePopulation = Math.max(0, Math.floor(resources.population - allocatedPopulation))
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
  /** 【L3 optimizer】优化器计划：未激活时用空计划（createDisabledAutomationPlan），激活时由 gameOptimizers 生成。 */
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

  // 王月报告建议：以「只读」方式运行一次 L3 优化器（不改任何状态），供 summarizeOptimizerDirections 出建议。
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
    // 【L2 automation】每日重复交易执行：玩家通过 scheduleDailyTrade 预约的固定买卖，逐日自动结算。
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

    // 【L2 自动研究】研究目标由 L1 选择（setActiveResearch），每日知识投入由本段自动执行，达标即解锁。
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
    if (autoTradeProtectionEffective && autoTradePlan.tradedResources.length) {
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
    // 【L2 automation】持续命令执行：expand-continuous / shrink-continuous 在无施工冲突时逐日自动下单。
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

    // 【L3 optimizer】王月日执行优化器计划：依次落地科技、贸易与扩建动作（此处才真正改状态）。
    // 注意：此块只在 isReportDay 执行，且不与 L2 自动补货/持续命令互斥（见冲突汇报）。
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
    // 事件来访（L1/L2 手动模式）：由玩家决策。L3 优化器接管时不再在此生成访客，
    // 事件统一交给优化器的 autoEventsEnabled 模拟通道处理（见 C4 修复）。
    if (!isReportDay && !visitor && activeOptimizerId === 'none' && (nextDay % 80 === 0 || Math.random() < 0.025)) chooseVisitor()
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

  // 【L3 门禁】观察者模式下拦截一切 L1/L2 玩家主动操作（建造/拆除/科研/贸易/人员/分配）。
  // 优化器（L3）接管期间，L1/L2 的 UI 入口全部失效，仅保留 L3 计划执行。
  const guarded = <Args extends unknown[]>(fn: (...args: Args) => void) => (...args: Args) => {
    if (!observerMode) fn(...args)
  }

  /** 【L1 manual】单次扩建：立即扣费并写入施工队列（也可附带 expand-continuous 持续命令）。 */
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

  /** 【L1 manual】维持现状：将该设施命令置为 hold。 */
  const holdFacility = (id: RegionId) => {
    if (observerMode) return
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'hold' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}维持现行规模，等待下个王月报告复核。`)
  }

  /** 【L1 manual】单次缩减：立即降级并回收 50% 建材（也可附带 shrink-continuous 持续命令）。 */
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

  /** 【L1 manual】设置岗位优先级：该配置作为 L2 autoAllocateStaffing 的排序依据。 */
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

  /** 【L1 manual】来访者交换：接受 offer（取/赠）并推进事件链。 */
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

  /** 【L1 manual】来访者留任：支付留任费并入职对应设施。 */
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

  /** 【L1 manual】来访者礼送：无代价结束事件。观察者模式下由 effect 自动调用。 */
  const dismiss = () => {
    if (visitor) writeLog(`${formatDay(day)}：${visitor.name}离开了月面，信标从本轮记录中熄灭。`)
    if (visitor) advanceEncounter(visitor, true)
  }

  // 安全网：切换到观察者模式时若存档遗留访客，自动礼送避免阻塞自动推进
  // （L3 下新事件不再由此生成——App 层 chooseVisitor 已按优化器状态跳过，见 C4 修复）。
  useEffect(() => {
    if (observerMode && visitor) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observerMode, visitor])

  /** 【L1 manual】单笔星港交易：立即结算（买入/卖出一次）。 */
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

  /** 【L2 automation】预约每日重复交易：玩家设定固定买卖量，此后每个御日自动执行（见 advanceDay 中的执行段）。 */
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

  /** 【L2 automation】取消每日重复交易预约。 */
  const cancelDailyTrade = (key: ResourceKey) => {
    if (observerMode) return
    setDailyManualTrades(previous => {
      const next = { ...previous }
      delete next[key]
      writeLog(`${formatDay(day)}：星海交易港取消 ${resourceMeta[key].label} 的每日交易。`)
      return next
    })
  }

  /** 【L3 激活】开始/继续执政：observerMode=true 时激活 crown-steward 优化器并自动运行；否则回到 L1/L2 手动模式。 */
  const startGame = (options: StartOptions) => {
    setDifficulty(options.difficulty)
    setObserverMode(options.observerMode)
    setAutoEventsEnabled(options.autoEventsEnabled)
    setActiveOptimizerId(options.observerMode ? 'crown-steward' : 'none')
    setRunning(options.observerMode)
    const openingBaseline = { day: 1, resources, gdp }
    const report = createReignReport(1, resources, regions, staffing, construction, populationProjection, dailyProduction, dailyConsumption, gdp, openingBaseline)
    setGameStarted(true)
    publishReignReport(report, resources, gdp)
    setShowVictory(false)
    if (options.tutorialEnabled) setTutorialOpen(true)
  }

  const {
    saveGame,
    loadGame,
    renameSaveSlot,
    continueGame,
    exitGame,
    handleClearAndExit,
  } = useSaveSystem({
    gameStarted, resources, regions, day, isRunning, speed, view, selected,
    planetDocked, detailOpen, dockCollapsed, planetTexture, visitor, roster, assigned,
    chainProgress, techs, activeResearch, researchProgress, productionMethods,
    staffing, staffingPriorities, facilityOrders, facilityOrderStarted, construction,
    populationPressureDays, activeOptimizerId, difficulty, observerMode, autoEventsEnabled,
    autoTradeProtectionEnabled, autoTradeEnabled, tradeSourcedResources, lastAutomatedAction,
    policy, reignReportBaseline, lastReignReport, activeReignReport, log, pendingMonthlyReport,
  }, {
    setGameStarted, setResources, setRegions, setDay, setRunning, setSpeed, setView, setSelected,
    setPlanetDocked, setDetailOpen, setDockCollapsed, setPlanetTexture, setVisitor, setRoster,
    setAssigned, setChainProgress, setTechs, setActiveResearch, setResearchProgress,
    setProductionMethods, setStaffingPriorities, setFacilityOrders, setFacilityOrderStarted,
    setConstruction, setPopulationPressureDays, setActiveOptimizerId, setDifficulty,
    setObserverMode, setAutoEventsEnabled, setAutoTradeProtectionEnabled, setAutoTradeEnabled,
    setTradeSourcedResources, setLastAutomatedAction, setReignReportBaseline,
    setLastReignReport, setActiveReignReport, setLog, setPendingMonthlyReport,
    setSaveSlotMetas, setToastMessage, setSaveStatus, setAutoSaveState,
    setSettingsOpen, setStartSettingsOpen, setShowVictory,
  }, { score, audioRef })

  if (!gameStarted) {
    return (
      <StartScreen
        planetTexture={planetTexture}
        autoSave={autoSaveState ? {
          difficulty: autoSaveState.difficulty ?? defaultDifficulty,
          observerMode: autoSaveState.observerMode ?? false,
          day: autoSaveState.day,
        } : null}
        startSettingsOpen={startSettingsOpen}
        toastMessage={toastMessage}
        onStart={startGame}
        onContinue={continueGame}
        onOpenSettings={() => setStartSettingsOpen(true)}
        onCloseSettings={() => setStartSettingsOpen(false)}
        volume={musicVolume}
        saveSlotMetas={saveSlotMetas}
        autoTradeProtectionEnabled={autoTradeProtectionEnabled}
        onAutoTradeProtection={setAutoTradeProtectionEnabled}
        onVolume={setMusicVolume}
        onSave={saveGame}
        onLoad={loadGame}
        onRename={renameSaveSlot}
      />
    )
  }

  if (tutorialOpen) {
    return (
      <TutorialScreen
        settingsOpen={settingsOpen}
        toastMessage={toastMessage}
        onCompleteTutorial={() => { window.localStorage.setItem(tutorialSeenKey, '1'); setTutorialOpen(false); }}
        onCloseSettings={() => setSettingsOpen(false)}
        onExit={exitGame}
        onSaveAndExit={() => exitGame(true)}
        onClearAndExit={handleClearAndExit}
        volume={musicVolume}
        saveSlotMetas={saveSlotMetas}
        autoTradeProtectionEnabled={autoTradeProtectionEnabled}
        onAutoTradeProtection={setAutoTradeProtectionEnabled}
        onVolume={setMusicVolume}
        onSave={saveGame}
        onLoad={loadGame}
        onRename={renameSaveSlot}
      />
    )
  }

  return (
    <main className="app-shell">
      {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
      <GameHeader onOpenSettings={() => setSettingsOpen(true)} />

      <audio ref={audioRef} src={musicSource} loop preload="auto" />

      <ResourceRail
        collapsed={railCollapsed}
        resources={resources}
        dailyProduction={dailyProduction}
        dailyConsumption={dailyConsumption}
        dailyNet={dailyNet}
        allocatedPopulation={allocatedPopulation}
        tradeSourcedResources={tradeSourcedResources}
        autoTradeProtectionEnabled={autoTradeProtectionEnabled}
        autoTradeEnabled={autoTradeEnabled}
        selfProducedSurplus={selfProducedSurplus}
        onToggleCollapsed={() => setRailCollapsed(previous => !previous)}
        onStopAutoTrade={key => setAutoTradeEnabled(previous => ({ ...previous, [key]: false }))}
      />

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

      {visitor && !observerMode && (
        <VisitorLetterModal
          visitor={visitor}
          chainProgress={chainProgress}
          populationProjection={populationProjection}
          resources={resources}
          onDismiss={dismiss}
          onAccept={acceptTrade}
          onEmploy={employ}
        />
      )}

      <section className="page-content">
        {view === 'facilities' && <PlanetFacilities regions={regions} selected={selected} year={day} techs={techs} habitatLevel={habitatLevel} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} construction={construction} populationProjection={populationProjection} staffing={staffing} staffingPriorities={staffingPriorities} autoStaffingByFacility={autoStaffingByFacility} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} planetTexture={planetTexture} docked={planetDocked} detailOpen={detailOpen} dockCollapsed={dockCollapsed} onDock={() => setPlanetDocked(true)} onBack={() => setDetailOpen(false)} onToggleDockCollapse={() => setDockCollapsed(previous => !previous)} onSelect={selectFacility} onUpgrade={upgrade} onHold={holdFacility} onShrink={shrinkFacility} onPriority={setStaffPriority} onMethod={guarded((regionId: RegionId, methodId: ProductionMethodId) => setProductionMethods(previous => ({ ...previous, [regionId]: methodId })))} onStaffingSet={guarded((id, staff) => setManualStaffing(previous => ({ ...previous, [id]: staff })))} onClearAutoStaffing={handleToggleAutoStaffing} onHousingRedistribute={handleHousingRedistribute} onAssignment={guarded((visitorId: string | undefined) => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId })))}>
          {selected === 'K' && <PalaceReportBlock day={day} lastReignReport={lastReignReport} onOpenReport={setActiveReignReport} />}
          {selected === 'L' && <ResearchTreeBlock techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={guarded(setActiveResearch)} />}
          {selected === 'R' && <EcologyPhaseBlock phaseNotes={selectedRegion.phaseNotes} progress={selectedRegion.max > 0 ? Math.round(selectedRegion.level / selectedRegion.max * 100) : 0} />}
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

      <CommandDeck
        gdp={gdp}
        navItems={navItems}
        activeTabId={activeTabId}
        day={day}
        isRunning={isRunning}
        speed={speed}
        completed={completed}
        finalDay={gameCalendar.finalDay}
        onSelectTab={id => {
          if (id === 'facilities') { setView(id); setDetailOpen(false); return }
          if (id === 'visitors') { setView(id); return }
          if (id === 'palace') { selectFacility('K'); return }
          if (id === 'research') { selectFacility('L'); return }
          if (id === 'ecology') { selectFacility('R'); return }
          if (id === 'starport') { selectFacility('S'); return }
          if (id === 'ship') { selectFacility('D'); return }
        }}
        onToggleSpeed={() => setSpeed(speed === 'normal' ? 'fast' : 'normal')}
        onToggleRunning={() => setRunning(!isRunning)}
      />
    </main>
  )
}

export default App
