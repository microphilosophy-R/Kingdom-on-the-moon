/**
 * 存档系统 hook：当前快照组装、存档恢复、多槽位存取、自动存档与退出流程。
 * 从 App.tsx 的存档段拆分而来。state 与 setters 由 App 每轮渲染传入，闭包始终保持新鲜。
 */
import { defaultDifficulty, type Difficulty, type ProductionMethodId, type ResourceKey, type Resources, type TechnologyId } from '../economy'
import type { OptimizerId } from '../optimizers'
import type { Encounter, Role } from '../events'
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
} from '../types/game'
import type { StartOptions } from '../components/business'
import type { PlanetTexture } from '../PlanetScene'
import { initialResources, normalizeStaffingPriorities, regionTemplate } from '../game/appData'
import { planetTextures } from '../PlanetScene'
import {
  clearAutoSave,
  formatSaveSlotDay,
  readAllSaveSlotMetas,
  readAutoSave,
  readSaveSlotMeta,
  saveKey,
  saveMetaKey,
  writeAutoSave,
  writeSaveSlotMeta,
} from '../game/appPersistence'

export interface SaveSystemState {
  gameStarted: boolean
  resources: Resources
  regions: Region[]
  day: number
  isRunning: boolean
  speed: 'normal' | 'fast'
  view: AppView
  selected: RegionId
  planetDocked: boolean
  detailOpen: boolean
  dockCollapsed: boolean
  planetTexture: PlanetTexture
  visitor: Encounter | null
  roster: Role[]
  assigned: Record<RegionId, string | undefined>
  chainProgress: Record<string, number>
  techs: string[]
  activeResearch: TechnologyId
  researchProgress: Partial<Record<TechnologyId, number>>
  productionMethods: Record<RegionId, ProductionMethodId>
  staffing: Record<RegionId, number>
  staffingPriorities: Record<RegionId, StaffingPriority>
  facilityOrders: Record<RegionId, FacilityOrderMode>
  facilityOrderStarted: Record<RegionId, number>
  construction: Record<RegionId, ConstructionProject | null>
  populationPressureDays: number
  difficulty: Difficulty
  observerMode: boolean
  autoEventsEnabled: boolean
  autoTradeProtectionEnabled: boolean
  autoTradeEnabled: Partial<Record<ResourceKey, boolean>>
  tradeSourcedResources: Partial<Record<ResourceKey, boolean>>
  lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null
  policy: 'ration'
  reignReportBaseline: ReignReportBaseline
  lastReignReport: ReignReport | null
  activeReignReport: ReignReport | null
  log: string[]
  pendingMonthlyReport: string | null
}

export interface SaveSystemSetters {
  setGameStarted: (value: boolean) => void
  setResources: (value: Resources) => void
  setRegions: (value: Region[]) => void
  setDay: (value: number) => void
  setRunning: (value: boolean) => void
  setSpeed: (value: 'normal' | 'fast') => void
  setView: (value: AppView) => void
  setSelected: (value: RegionId) => void
  setPlanetDocked: (value: boolean) => void
  setDetailOpen: (value: boolean) => void
  setDockCollapsed: (value: boolean) => void
  setPlanetTexture: (value: PlanetTexture) => void
  setVisitor: (value: Encounter | null) => void
  setRoster: (value: Role[]) => void
  setAssigned: (value: Record<RegionId, string | undefined>) => void
  setChainProgress: (value: Record<string, number>) => void
  setTechs: (value: string[]) => void
  setActiveResearch: (value: TechnologyId) => void
  setResearchProgress: (value: Partial<Record<TechnologyId, number>>) => void
  setProductionMethods: (value: Record<RegionId, ProductionMethodId>) => void
  setStaffingPriorities: (value: Record<RegionId, StaffingPriority>) => void
  setFacilityOrders: (value: Record<RegionId, FacilityOrderMode>) => void
  setFacilityOrderStarted: (value: Record<RegionId, number>) => void
  setConstruction: (value: Record<RegionId, ConstructionProject | null>) => void
  setPopulationPressureDays: (value: number) => void
  setActiveOptimizerId: (value: OptimizerId | 'none') => void
  setDifficulty: (value: Difficulty) => void
  setAutoEventsEnabled: (value: boolean) => void
  setAutoTradeProtectionEnabled: (value: boolean) => void
  setAutoTradeEnabled: (value: Partial<Record<ResourceKey, boolean>>) => void
  setTradeSourcedResources: (value: Partial<Record<ResourceKey, boolean>>) => void
  setLastAutomatedAction: (value: { id: RegionId; day: number; mode: FacilityOrderMode } | null) => void
  setReignReportBaseline: (value: ReignReportBaseline) => void
  setLastReignReport: (value: ReignReport | null) => void
  setActiveReignReport: (value: ReignReport | null) => void
  setLog: (value: string[]) => void
  setPendingMonthlyReport: (value: string | null) => void
  setSaveSlotMetas: (value: (SaveSlotMeta | null)[]) => void
  setToastMessage: (value: string | null) => void
  setSaveStatus: (value: string) => void
  setAutoSaveState: (value: GameSaveState | null) => void
  setSettingsOpen: (value: boolean) => void
  setStartSettingsOpen: (value: boolean) => void
  setShowVictory: (value: boolean) => void
}

export interface SaveSystemDeps {
  score: number
  audioRef: { current: HTMLAudioElement | null }
}

export function useSaveSystem(state: SaveSystemState, setters: SaveSystemSetters, deps: SaveSystemDeps) {
  const { score, audioRef } = deps

  const currentSave = (): GameSaveState => ({
    version: 6,
    savedAt: new Date().toISOString(),
    gameStarted: state.gameStarted,
    resources: state.resources,
    regionLevels: Object.fromEntries(state.regions.map(region => [region.id, region.level])) as Record<RegionId, number>,
    day: state.day,
    isRunning: state.isRunning,
    speed: state.speed,
    view: state.view,
    selected: state.selected,
    planetDocked: state.planetDocked,
    detailOpen: state.detailOpen,
    dockCollapsed: state.dockCollapsed,
    planetTextureId: state.planetTexture.id,
    visitor: state.visitor,
    roster: state.roster,
    assigned: state.assigned,
    chainProgress: state.chainProgress,
    techs: state.techs,
    activeResearch: state.activeResearch,
    researchProgress: state.researchProgress,
    productionMethods: state.productionMethods,
    staffing: state.staffing,
    staffingPriorities: state.staffingPriorities,
    facilityOrders: state.facilityOrders,
    facilityOrderStarted: state.facilityOrderStarted,
    construction: state.construction,
    populationPressureDays: state.populationPressureDays,
    difficulty: state.difficulty,
    observerMode: state.observerMode,
    autoEventsEnabled: state.autoEventsEnabled,
    autoTradeProtectionEnabled: state.autoTradeProtectionEnabled,
    autoTradeEnabled: state.autoTradeEnabled,
    tradeSourcedResources: state.tradeSourcedResources,
    lastAutomatedAction: state.lastAutomatedAction,
    policy: state.policy,
    policyLastChangedDay: 1,
    policyReportStartedDay: 1,
    policyReportBaseline: initialResources,
    lastPolicyReport: null,
    reignReportBaseline: state.reignReportBaseline,
    lastReignReport: state.lastReignReport,
    activeReignReport: state.activeReignReport,
    log: state.log,
    pendingMonthlyReport: state.pendingMonthlyReport,
  })

  const applySave = (save: GameSaveState) => {
    setters.setResources(save.resources)
    setters.setRegions(regionTemplate.map(region => ({ ...region, level: save.regionLevels[region.id] ?? region.level })))
    setters.setDay(save.day)
    setters.setRunning(save.isRunning)
    setters.setSpeed(save.speed)
    setters.setView(save.view)
    setters.setSelected(save.selected)
    setters.setPlanetDocked(save.planetDocked)
    setters.setDetailOpen(save.detailOpen)
    setters.setDockCollapsed(save.dockCollapsed ?? false)
    setters.setPlanetTexture(planetTextures.find(texture => texture.id === save.planetTextureId) ?? state.planetTexture)
    setters.setVisitor(save.visitor)
    setters.setRoster(save.roster)
    setters.setAssigned(save.assigned)
    setters.setChainProgress(save.chainProgress)
    setters.setTechs(save.techs)
    setters.setActiveResearch(save.activeResearch)
    setters.setResearchProgress(save.researchProgress)
    setters.setProductionMethods(save.productionMethods)
    setters.setStaffingPriorities(normalizeStaffingPriorities(save.staffingPriorities))
    setters.setFacilityOrders(save.facilityOrders)
    setters.setFacilityOrderStarted(save.facilityOrderStarted)
    setters.setConstruction(save.construction)
    setters.setPopulationPressureDays(save.populationPressureDays)
    // 观察者模式 = 优化器开启状态：存档仅以 observerMode 为事实来源，activeOptimizerId 由此派生（避免两字段不同步）
    setters.setActiveOptimizerId(save.observerMode ? 'crown-steward' : 'none')
    setters.setDifficulty(save.difficulty ?? defaultDifficulty)
    setters.setAutoEventsEnabled(save.autoEventsEnabled ?? false)
    setters.setAutoTradeProtectionEnabled(save.autoTradeProtectionEnabled ?? true)
    setters.setAutoTradeEnabled(save.autoTradeEnabled ?? {})
    setters.setTradeSourcedResources(save.tradeSourcedResources ?? {})
    setters.setLastAutomatedAction(save.lastAutomatedAction)
    setters.setReignReportBaseline(save.reignReportBaseline)
    setters.setLastReignReport(save.lastReignReport)
    setters.setActiveReignReport(save.activeReignReport)
    setters.setLog(save.log)
    setters.setPendingMonthlyReport(save.pendingMonthlyReport)
    setters.setGameStarted(true)
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
      setters.setSaveSlotMetas(readAllSaveSlotMetas())
      setters.setToastMessage(`已存档至槽位 ${slotIndex + 1}：${meta.name}`)
      setters.setSaveStatus(`已存档：${formatSaveSlotDay(meta.day)}`)
    } catch {
      setters.setToastMessage('存档失败：浏览器存储异常')
    }
  }

  const loadGame = (slotIndex: number) => {
    try {
      const rawSave = window.localStorage.getItem(saveKey(slotIndex))
      if (!rawSave) {
        setters.setToastMessage(`槽位 ${slotIndex + 1} 为空，没有可读取的存档`)
        return
      }
      const parsed = JSON.parse(rawSave) as GameSaveState
      if (![4, 5, 6].includes(parsed.version) || !parsed.resources || !parsed.regionLevels || !parsed.construction || !parsed.reignReportBaseline) throw new Error('invalid save')
      applySave(parsed)
      setters.setSettingsOpen(false)
      setters.setStartSettingsOpen(false)
      const meta = readSaveSlotMeta(slotIndex)
      setters.setToastMessage(`已读取槽位 ${slotIndex + 1}：${meta?.name ?? `存档 ${slotIndex + 1}`}`)
      setters.setSaveStatus(`已读档：${formatSaveSlotDay(parsed.day)}`)
    } catch {
      setters.setToastMessage('读档失败：存档格式损坏')
    }
  }

  const renameSaveSlot = (slotIndex: number, newName: string) => {
    const meta = readSaveSlotMeta(slotIndex)
    if (!meta) return
    const updated: SaveSlotMeta = { ...meta, name: newName }
    writeSaveSlotMeta(slotIndex, updated)
    setters.setSaveSlotMetas(readAllSaveSlotMetas())
    setters.setToastMessage(`槽位 ${slotIndex + 1} 已重命名为「${newName}」`)
  }

  const saveAutoSave = () => {
    const snapshot = currentSave()
    try {
      writeAutoSave(snapshot)
      setters.setAutoSaveState(snapshot)
      setters.setToastMessage(`已自动存档：${formatSaveSlotDay(snapshot.day)}`)
      setters.setSaveStatus(`已自动存档：${formatSaveSlotDay(snapshot.day)}`)
    } catch {
      setters.setToastMessage('自动存档失败：浏览器存储异常')
    }
  }

  const continueGame = (options: Pick<StartOptions, 'observerMode' | 'autoEventsEnabled'>) => {
    const save = readAutoSave()
    if (!save) return
    if (![4, 5, 6].includes(save.version) || !save.resources || !save.regionLevels || !save.construction || !save.reignReportBaseline) {
      clearAutoSave()
      setters.setAutoSaveState(null)
      setters.setToastMessage('自动存档损坏，已清除')
      return
    }
    const savedObserverMode = save.observerMode ?? false
    applySave({ ...save, observerMode: options.observerMode, autoEventsEnabled: options.autoEventsEnabled })
    // 观察者模式 = 优化器接管 = 自动运行；手动模式维持玩家控制的运行状态
    if (options.observerMode && !savedObserverMode) {
      setters.setRunning(true)
    } else if (!options.observerMode && savedObserverMode) {
      setters.setRunning(false)
    }
    setters.setSettingsOpen(false)
    setters.setStartSettingsOpen(false)
    setters.setShowVictory(false)
    setters.setToastMessage(`已读档：自动存档（${formatSaveSlotDay(save.day)}）`)
    setters.setSaveStatus(`已读档：${formatSaveSlotDay(save.day)}`)
  }

  const exitToHome = () => {
    setters.setRunning(false)
    setters.setSettingsOpen(false)
    setters.setShowVictory(false)
    setters.setGameStarted(false)
    setters.setActiveOptimizerId('none')
    setters.setDifficulty(defaultDifficulty)
    audioRef.current?.pause()
  }

  const exitGame = (save = true) => {
    if (save) saveAutoSave()
    exitToHome()
  }

  const handleClearAndExit = () => {
    clearAutoSave()
    setters.setAutoSaveState(null)
    exitToHome()
    setters.setToastMessage('自动存档已清除，可开始新的试验')
  }

  return { saveGame, loadGame, renameSaveSlot, saveAutoSave, continueGame, exitToHome, exitGame, handleClearAndExit }
}
