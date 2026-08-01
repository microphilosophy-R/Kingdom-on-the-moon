import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Bot, Check, ChevronLeft, ChevronRight, CircleDot, Crown, Factory,
  FlaskConical, House, Info, Landmark, Leaf, Lock, Minus, Mountain, Orbit,
  Pause, Pickaxe, Play, Rocket, Sparkles, Sprout, Sun, Theater, Waves, X, Zap,
  type LucideProps,
} from 'lucide-react'
import {
  applyBundle,
  buildFacilityModifiers,
  canBuildFacility,
  canAfford,
  defaultReserveFloors,
  defaultStartingTechs,
  facilityEconomySpecs,
  facilityOrder,
  gameCalendar,
  hasTech,
  projectDailyNet,
  projectFacilityCost,
  projectFacilityNet,
  planFacilityAutomation,
  resourceGroups,
  resourceMeta,
  resourceOrder,
  selectProductionMethod,
  shipProjectStages,
  shipProjectTotalValue,
  technologyCatalog,
  type FacilityId,
  type FacilityState,
  type ProductionMethodId,
  type ResourceKey,
  type Resources,
  type TechnologyId,
} from './economy'
import {
  buildEncounter,
  getAvailableEventChains,
  roles,
  rolesById,
  type Encounter,
  type Role,
} from './events'
import { PlanetScene, planetTextures } from './PlanetScene'

type AppView = 'facilities' | 'palace' | 'research' | 'ecology' | 'starport' | 'ship' | 'visitors'
type Icon = ComponentType<LucideProps>
type RegionId = FacilityId
type FacilityOrderMode = 'expand' | 'hold' | 'shrink'
type FacilityEra = 'early' | 'mid' | 'late'
type TechnologyEra = 'early' | 'mid' | 'late'
type PolicyId = 'ration' | 'mandate' | 'festival'

type PolicyReport = {
  policy: PolicyId
  startDay: number
  endDay: number
  delta: Partial<Resources>
  summary: string
}

type SpecialFacilityViewModel = {
  region: Region
  assignedPopulation: number
  net: Partial<Resources>
  modifier: { outputMultiplier?: number; upkeepMultiplier?: number }
  throughput: number
  methodName: string
}

type Region = FacilityState & {
  icon: Icon
  name: string
  subtitle: string
  unlock: number
  max: number
  note: string
  interfaceDuty: string
  phaseNotes?: { name: string; note: string }[]
  yields: Partial<Resources>
  cost: Partial<Resources>
  parentIds: RegionId[]
  position: { x: number; y: number }
}

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

const regionLayout: Record<RegionId, { icon: Icon; parentIds: RegionId[]; position: { x: number; y: number } }> = {
  E1: { icon: Sun, parentIds: [], position: { x: 8, y: 12 } },
  C1: { icon: Pickaxe, parentIds: [], position: { x: 8, y: 32 } },
  K: { icon: Crown, parentIds: [], position: { x: 8, y: 52 } },
  B: { icon: Sprout, parentIds: ['E1', 'C1'], position: { x: 26, y: 18 } },
  E2: { icon: CircleDot, parentIds: ['E1'], position: { x: 26, y: 38 } },
  C2: { icon: Pickaxe, parentIds: ['C1', 'B'], position: { x: 26, y: 60 } },
  F: { icon: Factory, parentIds: ['C2', 'E2'], position: { x: 44, y: 20 } },
  P: { icon: Leaf, parentIds: ['C1', 'B'], position: { x: 44, y: 42 } },
  R: { icon: Waves, parentIds: ['B', 'P'], position: { x: 44, y: 64 } },
  L: { icon: FlaskConical, parentIds: ['K', 'F'], position: { x: 62, y: 14 } },
  H: { icon: Sparkles, parentIds: ['K', 'B'], position: { x: 62, y: 34 } },
  M: { icon: House, parentIds: ['R', 'K'], position: { x: 62, y: 56 } },
  S: { icon: ArrowLeftRight, parentIds: ['K', 'L', 'H'], position: { x: 62, y: 78 } },
  E3: { icon: Orbit, parentIds: ['E2', 'F', 'R'], position: { x: 80, y: 32 } },
  D: { icon: Rocket, parentIds: ['L', 'F', 'S', 'M'], position: { x: 80, y: 72 } },
}

const initialLevels: Partial<Record<RegionId, number>> = { E1: 1, C1: 1, K: 1 }
const initialStaffing = Object.fromEntries(facilityOrder.map(id => [id, initialLevels[id] ?? 0])) as Record<RegionId, number>
const initialProductionMethods = Object.fromEntries(
  facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
) as Record<RegionId, ProductionMethodId>

const facilityEra: Record<RegionId, FacilityEra> = {
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

const facilityEraSections: { id: FacilityEra; label: string; note: string }[] = [
  { id: 'early', label: '早期设施', note: '维持月面前哨的最低闭环。' },
  { id: 'mid', label: '中期设施', note: '打开工业、文化、贸易与生态改造。' },
  { id: 'late', label: '晚期设施', note: '服务终局星舰与外星科技。' },
]

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
    unlock: spec.unlockYear,
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

const navItems: { id: AppView; label: string; icon: Icon }[] = [
  { id: 'facilities', label: '设施', icon: Orbit },
  { id: 'palace', label: '政策', icon: Landmark },
  { id: 'research', label: '科技', icon: FlaskConical },
  { id: 'ecology', label: '生态', icon: Waves },
  { id: 'starport', label: '贸易', icon: ArrowLeftRight },
  { id: 'ship', label: '星舰', icon: Rocket },
  { id: 'visitors', label: '异客', icon: Sparkles },
]

const specialFacilityViews: Partial<Record<RegionId, AppView>> = {
  K: 'palace',
  L: 'research',
  R: 'ecology',
  S: 'starport',
  D: 'ship',
}

const resourceUiMeta: Record<ResourceKey, { label: string; icon: Icon; tone: string }> = {
  power: { label: resourceMeta.power.label, icon: Zap, tone: 'gold' },
  water: { label: resourceMeta.water.label, icon: Waves, tone: 'cyan' },
  oxygen: { label: resourceMeta.oxygen.label, icon: CircleDot, tone: 'cyan' },
  biomass: { label: resourceMeta.biomass.label, icon: Sprout, tone: 'green' },
  regolith: { label: resourceMeta.regolith.label, icon: Mountain, tone: 'ochre' },
  alloy: { label: resourceMeta.alloy.label, icon: Factory, tone: 'slate' },
  quantumCore: { label: resourceMeta.quantumCore.label, icon: Orbit, tone: 'violet' },
  currency: { label: resourceMeta.currency.label, icon: Landmark, tone: 'gold' },
  population: { label: resourceMeta.population.label, icon: House, tone: 'coral' },
  knowledge: { label: resourceMeta.knowledge.label, icon: FlaskConical, tone: 'violet' },
  luxury: { label: resourceMeta.luxury.label, icon: Sparkles, tone: 'violet' },
}

const policyCooldownDays = gameCalendar.optimizationIntervalDays

const policyDefinitions: { id: PolicyId; name: string; level: number; detail: string; icon: Icon }[] = [
  { id: 'ration', name: '配给法典', level: 1, detail: '生物质 +1/日', icon: Leaf },
  { id: 'mandate', name: '机令总动员', level: 2, detail: '正向产出 +16%', icon: Bot },
  { id: 'festival', name: '失重庆典', level: 3, detail: '正向产出 +6%', icon: Theater },
]

const researchEraSections: { id: TechnologyEra; label: string; note: string }[] = [
  { id: 'early', label: '前期', note: '维持月面闭环与第一批生产方式。' },
  { id: 'mid', label: '中期', note: '打开工业、贸易、生态和外星接口。' },
  { id: 'late', label: '晚期', note: '服务终局星舰、高能研究与禁忌能源。' },
]

const technologyCategoryLabel: Record<NonNullable<(typeof technologyCatalog)[TechnologyId]['category']>, string> = {
  construction: '建造许可',
  'production-method': '生产方式',
  'facility-efficiency': '效率修正',
  global: '全局规则',
  trade: '贸易权限',
}

const researchableTechIds = Object.values(technologyCatalog)
  .filter(tech => tech.category !== 'construction')
  .sort((a, b) => {
    const eraRank = { early: 1, mid: 2, late: 3 }
    return eraRank[a.era ?? 'early'] - eraRank[b.era ?? 'early'] || a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  .map(tech => tech.id)

const fmt = (value: number) => Math.round(value).toLocaleString('zh-CN')
const fmtAmount = (value: number) => Number.isInteger(value) ? fmt(value) : value.toFixed(1)
const canPay = canAfford
const apply = applyBundle
const formatDay = (day: number) => `御日 ${String(day).padStart(3, '0')}`
const displayCopy = (text: string) => text.replace(/\b[TM][A-Z0-9]+-\d+\s*为/g, '').replace(/\b[TM][A-Z0-9]+-\d+\s*/g, '')
const allResourceKeys = resourceGroups.flatMap(group => group.keys)
const resourceGroupLabel = Object.fromEntries(resourceGroups.flatMap(group => group.keys.map(key => [key, group.label]))) as Record<ResourceKey, string>
const weightedShipReadiness = (resources: Resources) => {
  const ratios = shipProjectStages.flatMap(stage =>
    Object.entries(stage.input).map(([key, required]) => Math.min(1, resources[key as ResourceKey] / (required || 1))),
  )
  return ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 24 : 0
}
const diffResources = (from: Resources, to: Resources): Partial<Resources> => {
  const delta: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = to[key] - from[key]
    if (Math.abs(value) >= 0.01) delta[key] = Number(value.toFixed(2))
  })
  return delta
}
const makePolicyReport = (policy: PolicyId, startDay: number, endDay: number, from: Resources, to: Resources): PolicyReport => {
  const delta = diffResources(from, to)
  const changed = resourceOrder.filter(key => delta[key]).length
  const policyName = policyDefinitions.find(item => item.id === policy)?.name ?? policy
  return {
    policy,
    startDay,
    endDay,
    delta,
    summary: `${policyName}执行 ${Math.max(1, endDay - startDay + 1)} 御日，${changed ? `记录 ${changed} 项库存净变动` : '库存未出现显著净变动'}。`,
  }
}
const completedTechnologyIds = (techs: string[]) =>
  Object.values(technologyCatalog).filter(tech => hasTech(techs, tech.id)).map(tech => tech.id)
const hasResearchPrerequisites = (techId: TechnologyId, techs: string[]) =>
  (technologyCatalog[techId].prerequisites ?? []).every(prerequisite => hasTech(techs, prerequisite))
const techLabel = (techId: TechnologyId) => technologyCatalog[techId]?.name ?? techId

function ResourceAtom({ resourceKey, value, net, compact = false, showGroup = false }: { resourceKey: ResourceKey; value: number; net?: number; compact?: boolean; showGroup?: boolean }) {
  const meta = resourceUiMeta[resourceKey]
  const ResourceIcon = meta.icon
  return <span className={`resource-atom ${compact ? 'compact' : ''}`}>
    <ResourceIcon className={meta.tone} size={compact ? 13 : 17} />
    <span>
      {showGroup && <small className="resource-family">{resourceGroupLabel[resourceKey]}</small>}
      <small>{meta.label}</small>
      <strong className={value < 0 ? 'negative' : ''}>{value > 0 && compact ? '+' : ''}{fmtAmount(value)}</strong>
    </span>
    {net !== undefined && <em className={net < 0 ? 'negative' : ''}>{net >= 0 ? '+' : ''}{net.toFixed(1)}/日</em>}
  </span>
}

function ResourceBundle({ bundle, empty = '无', signed = false }: { bundle: Partial<Resources>; empty?: string; signed?: boolean }) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) return <span className="resource-empty">{empty}</span>
  return <span className="resource-bundle">
    {entries.map(key => <ResourceAtom key={key} resourceKey={key} value={(bundle[key] ?? 0) * (signed ? 1 : 1)} compact />)}
  </span>
}

function ResourceSymbolStrip({ bundle, empty = '无' }: { bundle: Partial<Resources>; empty?: string }) {
  const entries = resourceOrder.filter(key => bundle[key])
  if (!entries.length) return <span className="symbol-empty">{empty}</span>
  return <span className="resource-symbol-strip">
    {entries.map(key => {
      const meta = resourceUiMeta[key]
      const ResourceIcon = meta.icon
      const value = bundle[key] ?? 0
      return <span key={key} className="resource-symbol-item" title={`${meta.label} ${fmtAmount(value)}`}>
        <ResourceIcon className={meta.tone} size={13} />
        <small className={value < 0 ? 'negative' : ''}>{fmtAmount(value)}</small>
      </span>
    })}
  </span>
}

function ProductionFlow({ input, output }: { input: Partial<Resources>; output: Partial<Resources> }) {
  return <div className="production-flow">
    <div><small>输入</small><ResourceBundle bundle={input} empty="无输入" /></div>
    <ArrowRight size={17} />
    <div><small>输出</small><ResourceBundle bundle={output} empty="无输出" /></div>
  </div>
}

const throughputClass = (rate: number) => rate >= 1.1 ? 'surged' : rate >= 0.8 ? 'steady' : rate > 0 ? 'thin' : 'idle'
const orderLabel = (mode: FacilityOrderMode) => mode === 'expand' ? '扩张中' : mode === 'shrink' ? '缩减中' : '保持'
const orderIcon = (mode: FacilityOrderMode) => mode === 'expand' ? <ArrowUpRight size={13} /> : mode === 'shrink' ? <ArrowDownRight size={13} /> : <Minus size={13} />

function InfoToggle({ title, children }: { title: string; children: ReactNode }) {
  return <details className="info-toggle">
    <summary aria-label={title} title={title}><Info size={13} /></summary>
    <div>{children}</div>
  </details>
}

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [resources, setResources] = useState<Resources>(initialResources)
  const [regions, setRegions] = useState(regionTemplate)
  const [day, setDay] = useState(1)
  const [isRunning, setRunning] = useState(true)
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal')
  const [view, setView] = useState<AppView>('facilities')
  const [selected, setSelected] = useState<RegionId>('E1')
  const [planetDocked, setPlanetDocked] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [planetTexture] = useState(() => planetTextures[Math.floor(Math.random() * planetTextures.length)])
  const [visitor, setVisitor] = useState<Encounter | null>(null)
  const [roster, setRoster] = useState<Role[]>([])
  const [assigned, setAssigned] = useState<Record<RegionId, string | undefined>>(Object.fromEntries(facilityOrder.map(id => [id, undefined])) as Record<RegionId, string | undefined>)
  const [chainProgress, setChainProgress] = useState<Record<string, number>>({})
  const [techs, setTechs] = useState<string[]>(defaultStartingTechs)
  const [activeResearch, setActiveResearch] = useState<TechnologyId>(researchableTechIds[0])
  const [researchProgress, setResearchProgress] = useState<Partial<Record<TechnologyId, number>>>({})
  const [productionMethods, setProductionMethods] = useState<Record<RegionId, ProductionMethodId>>(initialProductionMethods)
  const [staffing, setStaffing] = useState<Record<RegionId, number>>(initialStaffing)
  const [facilityOrders, setFacilityOrders] = useState<Record<RegionId, FacilityOrderMode>>(Object.fromEntries(facilityOrder.map(id => [id, 'hold'])) as Record<RegionId, FacilityOrderMode>)
  const [facilityOrderStarted, setFacilityOrderStarted] = useState<Record<RegionId, number>>(Object.fromEntries(facilityOrder.map(id => [id, 1])) as Record<RegionId, number>)
  const [lastAutomatedAction, setLastAutomatedAction] = useState<{ id: RegionId; day: number; mode: FacilityOrderMode } | null>(null)
  const [policy, setPolicy] = useState<PolicyId>('ration')
  const [policyLastChangedDay, setPolicyLastChangedDay] = useState(1 - policyCooldownDays)
  const [policyReportStartedDay, setPolicyReportStartedDay] = useState(1)
  const [policyReportBaseline, setPolicyReportBaseline] = useState<Resources>(initialResources)
  const [lastPolicyReport, setLastPolicyReport] = useState<PolicyReport | null>(null)
  const [log, setLog] = useState<string[]>(['御日 001：月面行宫已就位，御座号的第一根龙骨等待铸造。'])
  const [pendingMonthlyReport, setPendingMonthlyReport] = useState<string | null>(null)

  const selectedRegion = regions.find(region => region.id === selected)!
  const selectedCost = projectFacilityCost(facilityEconomySpecs[selectedRegion.id], selectedRegion.level)
  const palaceRegion = regions.find(region => region.id === 'K')!
  const palaceLevel = palaceRegion.level
  const habitatLevel = staffing.M ?? 0
  const shipLevel = regions.find(region => region.id === 'D')!.level
  const completed = day >= gameCalendar.finalDay
  const allocatedPopulation = useMemo(() => facilityOrder.reduce((sum, id) => sum + (staffing[id] ?? 0), 0), [staffing])
  const freePopulation = Math.max(0, Math.floor(resources.population - allocatedPopulation))
  const policyCooldownRemaining = Math.max(0, policyCooldownDays - (day - policyLastChangedDay))
  const policyEffectiveDay = Math.max(1, policyLastChangedDay)
  const policyReportProgress = Math.min(100, Math.max(0, Math.round((day - policyReportStartedDay) / policyCooldownDays * 100)))
  const activeResearchSpec = technologyCatalog[activeResearch]
  const researchThroughput = Math.max(1, Math.min(10, 1 + Math.floor((staffing.L ?? 0) * 0.5) + (hasTech(techs, 'TL-2') ? 1 : 0) + (hasTech(techs, 'TL-3') ? 2 : 0)))

  const facilityStates = useMemo<Record<RegionId, FacilityState>>(
    () => Object.fromEntries(regions.map(region => [region.id, { id: region.id, level: Math.min(region.level, staffing[region.id] ?? 0) }])) as Record<RegionId, FacilityState>,
    [regions, staffing],
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
  const dailyNet = useMemo(() => projectDailyNet({
    facilities: facilityStates,
    modifiers: facilityModifiers,
    techs,
    productionMethods,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
  }), [facilityStates, facilityModifiers, techs, productionMethods, policy])
  const automationPlan = useMemo(() => planFacilityAutomation({
    resources,
    facilities: regions.map(region => ({ id: region.id, level: region.level })),
    modifiers: facilityModifiers,
    globalBonus: policy === 'ration' ? { biomass: 1 } : {},
    reserveFloors: defaultReserveFloors,
    techs,
    productionMethods,
    year: day,
    capitalHorizonYears: 360,
  }), [resources, regions, facilityModifiers, techs, productionMethods, policy, day])
  const shipProgress = Math.min(100, Math.round(shipLevel * 14 + (hasTech(techs, 'TD-1') ? 6 : 0) + Math.min(24, weightedShipReadiness(resources))))
  const score = Math.round(shipProgress * 8 + regions.reduce((sum, region) => sum + region.level * 12, 0) + roster.length * 25 + resources.knowledge * 2)
  const specialFacility = (id: RegionId): SpecialFacilityViewModel => {
    const region = regions.find(item => item.id === id)!
    const assignedPopulation = Math.min(region.level, staffing[id] ?? 0)
    const modifier = facilityModifiers[id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
    const selectedMethod = selectProductionMethod(facilityEconomySpecs[id].productionMethods, techs, productionMethods[id])
    return {
      region,
      assignedPopulation,
      net: projectFacilityNet(facilityEconomySpecs[id], assignedPopulation, modifier, techs, selectedMethod.id),
      modifier,
      throughput: region.level ? assignedPopulation / region.level * (modifier.outputMultiplier ?? 1) : 0,
      methodName: selectedMethod.name,
    }
  }
  const palaceFacility = specialFacility('K')

  const writeLog = (line: string) => setLog(previous => [line, ...previous].slice(0, 5))

  const chooseVisitor = () => {
    const available = getAvailableEventChains(chainProgress)
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
    const afterDailyNet = apply(resources, dailyNet)
    const shouldOptimize = nextDay % gameCalendar.optimizationIntervalDays === 0
    const plannedAction = shouldOptimize ? automationPlan.actions[0] : undefined
    const executableAction = plannedAction && canPay(afterDailyNet, plannedAction.cost) ? plannedAction : undefined
    let finalResources = executableAction ? apply(afterDailyNet, executableAction.cost, -1) : afterDailyNet

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
    if (executableAction) {
      const region = regions.find(item => item.id === executableAction.id)
      setRegions(previous => previous.map(item => item.id === executableAction.id ? { ...item, level: item.level + 1 } : item))
      setStaffing(previous => ({ ...previous, [executableAction.id]: Math.min((region?.level ?? 0) + 1, (previous[executableAction.id] ?? 0) + (freePopulation > 0 ? 1 : 0)) }))
      setFacilityOrders(previous => ({ ...previous, [executableAction.id]: 'expand' }))
      setFacilityOrderStarted(previous => ({ ...previous, [executableAction.id]: nextDay }))
      setLastAutomatedAction({ id: executableAction.id, day: nextDay, mode: 'expand' })
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 月度报告：内置优化署已扩建 ${region?.name ?? executableAction.id} 至第 ${executableAction.toLevel} 阶。库存安全线已复核，预计加权收益 ${executableAction.score.toFixed(1)}。`)
    } else if (shouldOptimize) {
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 月度报告：内置优化署完成复核，当前无正收益扩建；维持既有设施规模。`)
    }

    if (nextDay - policyReportStartedDay >= policyCooldownDays) {
      setLastPolicyReport(makePolicyReport(policy, policyReportStartedDay, nextDay - 1, policyReportBaseline, finalResources))
      setPolicyReportStartedDay(nextDay)
      setPolicyReportBaseline(finalResources)
    }

    setDay(nextDay)
    if (pendingMonthlyReport && nextDay % gameCalendar.optimizationIntervalDays === 1) {
      writeLog(pendingMonthlyReport)
      setPendingMonthlyReport(null)
    }
    if (!visitor && (nextDay % 80 === 0 || Math.random() < 0.025)) chooseVisitor()
    if (nextDay === gameCalendar.finalDay) writeLog(`${formatDay(gameCalendar.finalDay)}：千日试验到期。御座号的完成度将成为此局国祚。`)
  }

  useEffect(() => {
    if (!gameStarted || !isRunning || completed) return
    const timer = window.setInterval(advanceDay, speed === 'fast' ? gameCalendar.fastMsPerDay : gameCalendar.normalMsPerDay)
    return () => window.clearInterval(timer)
    // The interval intentionally observes current game state after each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, isRunning, completed, day, dailyNet, visitor, speed, pendingMonthlyReport, automationPlan])

  const selectFacility = (id: RegionId) => {
    setSelected(id)
    const specialView = specialFacilityViews[id]
    if (specialView) {
      setView(specialView)
      setPlanetDocked(true)
      setDetailOpen(false)
      return
    }
    setView('facilities')
    setPlanetDocked(true)
    setDetailOpen(true)
  }

  const upgrade = (id: RegionId) => {
    setFacilityOrders(previous => ({ ...previous, [id]: 'expand' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    const region = regions.find(item => item.id === id)!
    const spec = facilityEconomySpecs[id]
    const cost = projectFacilityCost(facilityEconomySpecs[id], region.level)
    if (!canBuildFacility(spec, day, techs) || region.level >= region.max) return
    if (!canPay(resources, cost)) {
      writeLog(`${formatDay(day)}：${region.name}的扩建诏令因库存不足被退回。`)
      return
    }
    setResources(previous => apply(previous, cost, -1))
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: item.level + 1 } : item))
    setStaffing(previous => ({ ...previous, [id]: Math.min(region.level + 1, (previous[id] ?? 0) + (freePopulation > 0 ? 1 : 0)) }))
    writeLog(`${formatDay(day)}：${region.name}升为第 ${region.level + 1} 阶。`)
  }

  const holdFacility = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'hold' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    writeLog(`${formatDay(day)}：${region.name}维持现行规模，交由内置优化署观察。`)
  }

  const shrinkFacility = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'shrink' }))
    setFacilityOrderStarted(previous => ({ ...previous, [id]: day }))
    if (region.level <= 0) return
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: Math.max(0, item.level - 1) } : item))
    setStaffing(previous => ({ ...previous, [id]: Math.min(Math.max(0, region.level - 1), previous[id] ?? 0) }))
    writeLog(`${formatDay(day)}：${region.name}缩小至第 ${Math.max(0, region.level - 1)} 阶，人员转入待命名册。`)
  }

  const assignPopulation = (id: RegionId, delta: 1 | -1) => {
    const region = regions.find(item => item.id === id)!
    setStaffing(previous => {
      const current = previous[id] ?? 0
      const next = Math.max(0, Math.min(region.level, current + delta))
      if (delta > 0 && freePopulation <= 0) return previous
      return { ...previous, [id]: next }
    })
    writeLog(`${formatDay(day)}：${region.name}${delta > 0 ? '增派' : '撤回'} 1 个人口单位。`)
  }

  const changePolicy = (nextPolicy: PolicyId) => {
    if (nextPolicy === policy) return
    const remaining = Math.max(0, policyCooldownDays - (day - policyLastChangedDay))
    if (remaining > 0) {
      writeLog(`${formatDay(day)}：王城冷却尚余 ${remaining} 御日，新的政令未被盖印。`)
      return
    }
    const nextPolicyName = policyDefinitions.find(item => item.id === nextPolicy)?.name ?? nextPolicy
    setPolicy(nextPolicy)
    setPolicyLastChangedDay(day)
    setPolicyReportStartedDay(day)
    setPolicyReportBaseline(resources)
    writeLog(`${formatDay(day)}：月面王城签发「${nextPolicyName}」，下一次改令需等待 ${policyCooldownDays} 御日。`)
  }

  const acceptTrade = () => {
    if (!visitor || !canPay(resources, visitor.offer.take)) return
    setResources(previous => apply(apply(previous, visitor.offer.take, -1), visitor.offer.give))
    if (visitor.offer.tech) setTechs(previous => previous.includes(visitor.offer.tech!) ? previous : [...previous, visitor.offer.tech!])
    writeLog(`${formatDay(day)}：${visitor.event.title}落定，${visitor.name}${visitor.offer.tech ? `交出「${visitor.offer.tech}」` : '留下新的回声'}。`)
    advanceEncounter(visitor)
  }

  const employ = () => {
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

  const inspectFacility = (id: RegionId) => {
    setSelected(id)
    setView('facilities')
    setPlanetDocked(true)
    setDetailOpen(true)
  }

  const executeTrade = (name: string, input: Partial<Resources>, output: Partial<Resources>) => {
    if (!canPay(resources, input)) {
      writeLog(`${formatDay(day)}：${name}未能成交，库存不足。`)
      return
    }
    setResources(previous => apply(apply(previous, input, -1), output))
    writeLog(`${formatDay(day)}：星海交易港完成「${name}」。`)
  }

  if (!gameStarted) {
    return <StartGate planetTexture={planetTexture} onStart={() => {
      setGameStarted(true)
      setRunning(true)
    }} />
  }

  return <main className="app-shell">
    <header className="site-header">
      <div className="brand-block">
        <div className="brand-seal"><Crown size={23} /></div>
        <div><p>月面主权局 · 1000御日试验</p><h1>月冠纪元</h1></div>
      </div>
      <div className="reign-control">
        <span>{gameCalendar.dayName}</span><strong>{String(Math.min(day, gameCalendar.finalDay)).padStart(3, '0')}</strong><small>/ {gameCalendar.finalDay}</small>
        <button onClick={() => setRunning(!isRunning)} aria-label={isRunning ? '暂停日历' : '恢复日历'}>{isRunning ? <Pause size={15} /> : <Play size={15} />}{isRunning ? '暂停' : '恢复'}</button>
        <button onClick={() => setSpeed(speed === 'normal' ? 'fast' : 'normal')} aria-label="切换时间速度">{speed === 'normal' ? '正常' : '加速'}</button>
      </div>
    </header>

    <section className="resource-rail" aria-label="王国库存">
      {allResourceKeys.map(key => <ResourceAtom key={key} resourceKey={key} value={resources[key]} net={dailyNet[key] ?? 0} />)}
    </section>

    {visitor && <div className="event-scrim" role="presentation"><section className="diplomatic-letter event-modal" aria-live="polite" aria-modal="true" role="dialog">
      <div className="visitor-portrait-slot" aria-label="访客肖像占位">
        <span>{visitor.glyph}</span>
        <small>portrait placeholder</small>
      </div>
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
      <div className="letter-actions"><button onClick={dismiss}>礼送</button><button onClick={acceptTrade} disabled={!canPay(resources, visitor.offer.take)}>{visitor.event.interaction === 'gift' ? '收下' : visitor.event.interaction === 'accident' ? '接入' : visitor.event.interaction === 'request' ? '准许' : '交换'}</button><button className="primary" onClick={employ} disabled={!canPay(resources, visitor.retainerCost)}>留任</button></div>
      <button className="letter-close" onClick={dismiss} aria-label="关闭来函"><X size={16} /></button>
    </section></div>}

    <section className="page-content">
      {view === 'facilities' && <PlanetFacilities regions={regions} selected={selected} year={day} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} staffing={staffing} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} planetTexture={planetTexture} docked={planetDocked} detailOpen={detailOpen} onDock={() => setPlanetDocked(true)} onBack={() => setDetailOpen(false)} onSelect={selectFacility} onUpgrade={upgrade} onHold={holdFacility} onShrink={shrinkFacility} onStaff={assignPopulation} onMethod={(methodId) => setProductionMethods(previous => ({ ...previous, [selectedRegion.id]: methodId }))} onAssignment={visitorId => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId }))} />}
      {view === 'palace' && <Palace policy={policy} policyStartedDay={policyEffectiveDay} facility={palaceFacility} cooldownRemaining={policyCooldownRemaining} reportProgress={policyReportProgress} lastReport={lastPolicyReport} onPolicy={changePolicy} onSelectFacility={() => inspectFacility('K')} />}
      {view === 'research' && <ResearchLab facility={specialFacility('L')} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} researchThroughput={researchThroughput} knowledgeStock={resources.knowledge} onResearch={setActiveResearch} onSelectFacility={() => inspectFacility('L')} />}
      {view === 'ecology' && <EcologyRing facility={specialFacility('R')} onSelectFacility={() => inspectFacility('R')} />}
      {view === 'starport' && <Starport facility={specialFacility('S')} resources={resources} techs={techs} onTrade={executeTrade} onSelectFacility={() => inspectFacility('S')} />}
      {view === 'ship' && <Shipyard facility={specialFacility('D')} shipProgress={shipProgress} score={score} onSelectFacility={() => inspectFacility('D')} />}
      {view === 'visitors' && <Visitors roster={roster} assigned={assigned} regions={regions} visitor={visitor} onSelect={selectFacility} onAssignment={(regionId, visitorId) => setAssigned(previous => ({ ...previous, [regionId]: visitorId }))} />}
    </section>

    <footer className="command-deck bottom-tabs">
      <div className="scoreline"><span>国祚评分</span><strong>{score}</strong><small>星舰进度权重最高</small></div>
      <nav className="tab-nav" aria-label="底部系统菜单">{navItems.map(item => { const NavIcon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><NavIcon size={16} />{item.label}</button> })}</nav>
      <button className="advance-year" onClick={advanceDay} disabled={completed}>推进一日 <ArrowUpRight size={17} /></button>
    </footer>
  </main>
}

function StartGate({ planetTexture, onStart }: { planetTexture: typeof planetTextures[number]; onStart: () => void }) {
  return <main className="start-gate">
    <section className="start-orbit" aria-label="殖民星球预览">
      <PlanetScene texture={planetTexture} onActivate={onStart} />
    </section>
    <section className="start-console" aria-label="开始游戏">
      <div className="brand-seal"><Crown size={25} /></div>
      <span className="eyebrow">月面主权局 · 1000御日试验</span>
      <h1>月冠纪元</h1>
      <p>在第一个御日签发殖民诏令。资源会自动结算，设施、政策、科技、贸易与星舰共同决定国祚。</p>
      <div className="start-facts">
        <span><Orbit size={14} />{planetTexture.name}</span>
        <span><Rocket size={14} />终局星舰</span>
        <span><Landmark size={14} />政务舱</span>
      </div>
      <button className="primary-action" onClick={onStart}><Play size={16} />开始执政</button>
    </section>
  </main>
}

function PlanetFacilities({ regions, selected, year, techs, productionMethods, facilityOrders, facilityOrderStarted, staffing, allocatedPopulation, freePopulation, facilityModifiers, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, planetTexture, docked, detailOpen, onDock, onBack, onSelect, onUpgrade, onHold, onShrink, onStaff, onMethod, onAssignment }: { regions: Region[]; selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; facilityOrderStarted: Record<RegionId, number>; staffing: Record<RegionId, number>; allocatedPopulation: number; freePopulation: number; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: ReturnType<typeof planFacilityAutomation>; planetTexture: typeof planetTextures[number]; docked: boolean; detailOpen: boolean; onDock: () => void; onBack: () => void; onSelect: (id: RegionId) => void; onUpgrade: (id: RegionId) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId) => void; onStaff: (id: RegionId, delta: 1 | -1) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  if (!docked) {
    return <div className="planet-home">
      <div className="planet-stage">
        <PlanetScene texture={planetTexture} onActivate={onDock} />
        <div className="planet-title"><span className="eyebrow">殖民星球 · {planetTexture.name}</span><h2>静海王国</h2><p>{formatDay(year)} · 已启动 {regions.filter(region => region.level > 0).length}/{regions.length} 座设施</p><button onClick={onDock}>展开设施名录 <ChevronRight size={16} /></button></div>
      </div>
    </div>
  }

  return <div className={detailOpen ? 'planet-workbench detail-mode' : 'planet-workbench'}>
    {!detailOpen && <section className="planet-dock">
      <div className="docked-orbit"><PlanetScene texture={planetTexture} compact onActivate={() => onBack()} /></div>
      <div className="planet-dock-copy"><span className="eyebrow">殖民星球</span><h2>{planetTexture.name}</h2><p>{formatDay(year)}，国祚仍在设施、政策与星舰之间被重新分配。</p></div>
      <aside className="king-profile">
        <div className="king-portrait-slot"><Crown size={22} /><span>王像待绘</span></div>
        <div><span className="eyebrow">玩家国王</span><h3>月冠执政者</h3><p>姓名、称号、肖像与个人诏令摘要将在此处展示。当前视图保留为后续角色化叙事入口。</p></div>
      </aside>
    </section>}
    {detailOpen ? <FacilityDetailPanel selected={selected} year={year} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} facilityOrderStarted={facilityOrderStarted} staffing={staffing} allocatedPopulation={allocatedPopulation} freePopulation={freePopulation} facilityModifiers={facilityModifiers} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} regions={regions} onBack={onBack} onUpgrade={onUpgrade} onHold={onHold} onShrink={onShrink} onStaff={onStaff} onMethod={onMethod} onAssignment={onAssignment} /> : <FacilityList regions={regions} selected={selected} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} staffing={staffing} facilityModifiers={facilityModifiers} assigned={assigned} roster={roster} onSelect={onSelect} />}
  </div>
}

function FacilityList({ regions, selected, techs, productionMethods, facilityOrders, staffing, facilityModifiers, assigned, roster, onSelect }: { regions: Region[]; selected: RegionId; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; staffing: Record<RegionId, number>; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; assigned: Record<RegionId, string | undefined>; roster: Role[]; onSelect: (id: RegionId) => void }) {
  return <section className="facility-ledger">
    <div className="section-heading"><div><span className="eyebrow">主要设施</span><h2>建筑名录</h2></div><p>D/R/S/K/L 进入专属系统页。</p></div>
    <div className="facility-era-list">{facilityEraSections.map(section => {
      const sectionRegions = regions.filter(region => facilityEra[region.id] === section.id)
      return <section key={section.id} className="facility-era-section">
        <header><span>{section.label}</span><small>{section.note}</small></header>
        <div className="facility-ledger-list">{sectionRegions.map(region => {
          const RegionIcon = region.icon
          const worker = roster.find(item => item.id === assigned[region.id])
          const special = specialFacilityViews[region.id]
          const method = selectProductionMethod(facilityEconomySpecs[region.id].productionMethods, techs, productionMethods[region.id])
          const capacity = region.level
          const assignedPop = Math.min(capacity, staffing[region.id] ?? 0)
          const staffRate = capacity > 0 ? assignedPop / capacity : 0
          const modifier = facilityModifiers[region.id]?.outputMultiplier ?? 1
          const throughput = staffRate * modifier
          const order = facilityOrders[region.id] ?? 'hold'
          return <button key={region.id} className={`${selected === region.id ? 'selected' : ''} ${special ? 'special' : ''} throughput-${throughputClass(throughput)}`} onClick={() => onSelect(region.id)}>
            <span className="ledger-icon"><RegionIcon size={19} /></span>
            <div className="ledger-main"><b>{region.name}</b><small>{special ? navItems.find(item => item.id === special)?.label : region.subtitle}</small></div>
            <div className="ledger-flow"><ResourceSymbolStrip bundle={method.input} empty="-" /><ArrowRight size={14} /><ResourceSymbolStrip bundle={method.output} empty="-" /></div>
            <div className="ledger-state"><span>{orderIcon(order)}{orderLabel(order)}</span><em>{capacity ? `${assignedPop}/${capacity}` : '未建'}</em><strong>{Math.round(throughput * 100)}%</strong></div>
            {worker && <i>{worker.glyph}</i>}
          </button>
        })}</div>
      </section>
    })}</div>
  </section>
}

function FacilityDetailPanel({ selected, year, techs, productionMethods, facilityOrders, facilityOrderStarted, staffing, allocatedPopulation, freePopulation, facilityModifiers, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, regions, onBack, onUpgrade, onHold, onShrink, onStaff, onMethod, onAssignment }: { selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; facilityOrderStarted: Record<RegionId, number>; staffing: Record<RegionId, number>; allocatedPopulation: number; freePopulation: number; facilityModifiers: Partial<Record<RegionId, ReturnType<typeof buildFacilityModifiers>>>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: ReturnType<typeof planFacilityAutomation>; regions: Region[]; onBack: () => void; onUpgrade: (id: RegionId) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId) => void; onStaff: (id: RegionId, delta: 1 | -1) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  const selectedWorker = roster.find(item => item.id === assigned[selectedRegion.id])
  const SelectIcon = selectedRegion.icon
  const selectedSpec = facilityEconomySpecs[selectedRegion.id]
  const selectedMethod = selectProductionMethod(selectedSpec.productionMethods, techs, productionMethods[selectedRegion.id])
  const assignedPopulation = Math.min(selectedRegion.level, staffing[selectedRegion.id] ?? 0)
  const staffRate = selectedRegion.level > 0 ? assignedPopulation / selectedRegion.level : 0
  const selectedModifier = facilityModifiers[selectedRegion.id] ?? { outputMultiplier: 1, upkeepMultiplier: 1 }
  const selectedYield = projectFacilityNet(selectedSpec, assignedPopulation, selectedModifier, techs, selectedMethod.id)
  const selectedBuildable = canBuildFacility(selectedSpec, year, techs)
  const selectedRequiredTech = selectedSpec.requiredTech ? technologyCatalog[selectedSpec.requiredTech] : undefined
  const parents = selectedRegion.parentIds.map(id => regions.find(region => region.id === id)?.name).filter(Boolean)
  const workerChoices = roster.filter(item => item.specialty === selectedRegion.id)
  const currentOrder = facilityOrders[selectedRegion.id] ?? 'hold'
  const nextAutoAction = automationPlan.actions.find(action => action.id === selectedRegion.id)
  const cycleProgress = Math.round(((year % gameCalendar.optimizationIntervalDays) / gameCalendar.optimizationIntervalDays) * 100)
  const operationProgress = currentOrder === 'hold' ? cycleProgress : Math.min(100, Math.max(8, Math.round(((year - (facilityOrderStarted[selectedRegion.id] ?? year) + 1) / gameCalendar.optimizationIntervalDays) * 100)))
  const recentAuto = lastAutomatedAction?.id === selectedRegion.id && year - lastAutomatedAction.day <= 6
  const throughput = staffRate * selectedModifier.outputMultiplier
  const isSpecialDetail = Boolean(specialFacilityViews[selectedRegion.id])
  const techBonusSources = [
    hasTech(techs, 'TG-1') ? 'TG-1 全局生产效率' : null,
    hasTech(techs, 'TG-2') ? 'TG-2 电力消耗减免' : null,
    hasTech(techs, 'TL-2') && selectedRegion.id === 'L' ? 'TL-2 研究吞吐量' : null,
    hasTech(techs, 'TL-3') && selectedRegion.id === 'L' ? 'TL-3 高能课题' : null,
  ].filter(Boolean)
  const bonusSources = [
    `人口分配 ${Math.round(staffRate * 100)}%`,
    selectedModifier.outputMultiplier !== 1 ? `政策/居住/角色合计 x${selectedModifier.outputMultiplier.toFixed(2)}` : '基础吞吐 x1.00',
    selectedWorker ? `${selectedWorker.name} +${Math.round(selectedWorker.boost * 100)}%` : null,
    ...techBonusSources,
  ].filter(Boolean)
  const affordExpansion = canPay(resources, selectedCost)
  const actionReason = !selectedBuildable
    ? `需要先取得 ${selectedRequiredTech ? selectedRequiredTech.name : selectedSpec.requiredTech}`
    : selectedRegion.level >= selectedRegion.max
      ? '现行设计已达到最高规模'
      : affordExpansion
        ? '库存满足扩建成本，扩张会立即消耗下列资源'
        : '库存不足，扩张按钮会保留判断但暂不可签发'

  return <aside className={`inspector facility-detail-page ${isSpecialDetail ? 'special-detail' : 'standard-detail'}`}>
    <div className="facility-detail-toolbar">
      <button className="back-button" onClick={onBack}><ChevronLeft size={16} />建筑名录</button>
      <InfoToggle title="建筑说明">
        <p>{displayCopy(selectedRegion.note)}</p>
        <p>{displayCopy(selectedRegion.interfaceDuty)}</p>
        {selectedRegion.phaseNotes?.map(phase => <p key={phase.name}><b>{phase.name}</b>：{displayCopy(phase.note)}</p>)}
      </InfoToggle>
    </div>
    <section className="facility-identity-panel">
      <div className="building-art-slot" aria-label={`${selectedRegion.name}建筑图片占位`}>
        <SelectIcon size={44} />
        <span>建筑美术占位</span>
      </div>
      <div className="building-title-copy">
        <span className="eyebrow">{isSpecialDetail ? '特殊建筑详情' : '普通建筑详情'} · {selected}</span>
        <h2>{selectedRegion.name}</h2>
        <p>{selectedRegion.subtitle}</p>
        <div className="path-note compact"><Orbit size={15} /><span>{parents.length ? `${parents.join('、')} → 本设施` : '殖民地基础设施'}</span></div>
      </div>
    </section>
    <section className="population-strip">
      <div><span>岗位容量</span><strong>{selectedRegion.level}<small>/{selectedRegion.max}</small></strong><em>建筑可容纳人口</em></div>
      <div><span>已分配人口</span><strong>{assignedPopulation}<small>/{selectedRegion.level}</small></strong><em>王国余闲 {freePopulation}</em></div>
      <div><span>建筑状态</span><strong>{selectedBuildable ? (selectedRegion.level ? '运行中' : '可建造') : '未授权'}</strong><em>{selectedBuildable ? `${allocatedPopulation}/${fmt(resources.population)} 人口已派用` : selectedRequiredTech?.name ?? '科技锁定'}</em></div>
    </section>
    <section className="detail-operations">
      <div className="staffing-control">
        <div className="staffing-meter"><span style={{ width: `${selectedRegion.level ? Math.round(assignedPopulation / selectedRegion.level * 100) : 0}%` }} /><small>人口分配 {selectedRegion.level ? Math.round(assignedPopulation / selectedRegion.level * 100) : 0}%</small></div>
        <div className="staffing-buttons"><button onClick={() => onStaff(selectedRegion.id, -1)} disabled={assignedPopulation <= 0}>撤员</button><button onClick={() => onStaff(selectedRegion.id, 1)} disabled={selectedRegion.level <= assignedPopulation || freePopulation <= 0}>增员</button></div>
      </div>
      <div className={`throughput-panel throughput-${throughputClass(throughput)}`}>
        <div><span>建筑吞吐率</span><strong>{Math.round(throughput * 100)}%</strong><em>{throughput >= 1 ? '满负荷或受加成' : throughput > 0 ? '低负荷运行' : '停摆'}</em></div>
        <div><span>加成来源</span><p>{bonusSources.join('；')}</p></div>
      </div>
    </section>
    <section className="action-brief">
      <div className="section-heading"><div><span className="eyebrow">调度判断</span><h3>签发动作</h3></div><InfoToggle title="调度说明"><p>{actionReason}</p><p>{nextAutoAction ? `自动建议扩张至 ${nextAutoAction.toLevel}` : automationPlan.reason ?? '维持当前规模'}</p></InfoToggle></div>
      <div className="action-facts">
        <div><span>扩建成本</span><ResourceBundle bundle={selectedCost} empty="无需成本" /></div>
        <div><span>自动建议</span><b>{nextAutoAction ? `扩张至 ${nextAutoAction.toLevel}` : '维持'}</b></div>
        <div><span>当前状态</span><b>{currentOrder === 'expand' ? '扩张' : currentOrder === 'shrink' ? '缩小' : '保持'}</b></div>
      </div>
      <div className={`operation-progress operation-${currentOrder}`} title={currentOrder === 'hold' ? `优化署每 ${gameCalendar.optimizationIntervalDays} 御日复核一次` : orderLabel(currentOrder)}><span style={{ width: `${operationProgress}%` }} /><small>{currentOrder === 'hold' ? `复核周期 ${cycleProgress}%` : `${orderLabel(currentOrder)} ${operationProgress}%`}</small></div>
      <div className="facility-actions">
        <button className={`${currentOrder === 'expand' ? 'selected' : ''} ${recentAuto && lastAutomatedAction?.mode === 'expand' ? 'auto-feedback' : ''}`} onClick={() => onUpgrade(selectedRegion.id)} disabled={!selectedBuildable || selectedRegion.level >= selectedRegion.max || !affordExpansion}><ArrowUpRight size={15} />扩张</button>
        <button className={currentOrder === 'hold' ? 'selected' : ''} onClick={() => onHold(selectedRegion.id)}><Minus size={15} />保持</button>
        <button className={currentOrder === 'shrink' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id)} disabled={selectedRegion.level <= 0}><ArrowDownRight size={15} />缩小</button>
      </div>
    </section>
    <section className="production-methods"><span>生产方式</span>{selectedSpec.productionMethods.map(method => {
      const methodReady = hasTech(techs, method.unlockedBy) && method.autoSelect !== false
      const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
      return <article key={method.id} className={method.id === selectedMethod.id && methodReady ? 'active' : ''}>
        <div className="method-copy"><b>{method.name}</b><small>{methodReady ? '已解锁，可切换' : method.autoSelect === false ? '由阶段推进启用' : `需要 ${techName ?? '对应科技'}`}</small></div>
        <ProductionFlow input={method.input} output={method.output} />
        <InfoToggle title={`${method.name}说明`}><p>{displayCopy(method.note)}</p></InfoToggle>
        {method.id === selectedMethod.id && methodReady ? <em>使用中</em> : <button onClick={() => onMethod(method.id)} disabled={!methodReady}>切换</button>}
      </article>
    })}</section>
    <section className="stat-block"><span>每日结算</span><div>{resourceOrder.filter(key => selectedYield[key]).map(key => <ResourceAtom key={key} resourceKey={key} value={selectedYield[key] ?? 0} compact />)}{!Object.values(selectedYield).filter(Boolean).length && <span className="resource-empty">无日结算</span>}</div></section>
    {selectedWorker ? <div className="worker-card"><span>{selectedWorker.glyph}</span><div><b>{selectedWorker.name} 正在执勤</b><small>专属区域日产出 +{Math.round(selectedWorker.boost * 100)}%</small></div><button onClick={() => onAssignment(undefined)}>待命</button></div> : workerChoices.length ? <div className="worker-card"><span>{workerChoices[0].glyph}</span><div><b>{workerChoices[0].name} 可派驻</b><small>专属区域日产出 +{Math.round(workerChoices[0].boost * 100)}%</small></div><button onClick={() => onAssignment(workerChoices[0].id)}>派驻</button></div> : null}
    <div className="inspector-footnote"><span>全局日净值 {Object.values(dailyNet).filter(Boolean).length} 项变化</span><InfoToggle title="自动操作说明"><p>系统自动操作会在调度按钮中短暂高亮。</p></InfoToggle></div>
  </aside>
}

function SpecialFacilityPanel({ facility, tone, children, onSelectFacility }: { facility: SpecialFacilityViewModel; tone: string; children?: ReactNode; onSelectFacility: () => void }) {
  const FacilityIcon = facility.region.icon
  const staffingPercent = facility.region.level ? Math.round(facility.assignedPopulation / facility.region.level * 100) : 0
  const throughputPercent = Math.round(facility.throughput * 100)

  return <section className={`special-facility-panel ${tone}`}>
    <div className="special-panel-head">
      <span className="special-panel-icon"><FacilityIcon size={28} /></span>
      <div><span className="eyebrow">{facility.region.id} 特殊设施 · 建筑状态</span><h2>{facility.region.name}</h2><p>{facility.region.subtitle}</p></div>
      <InfoToggle title="特殊设施说明"><p>{displayCopy(facility.region.note)}</p></InfoToggle>
    </div>
    <div className="special-facility-stats">
      <div><span>设施等级</span><strong>{facility.region.level}<small>/{facility.region.max}</small></strong></div>
      <div><span>已分配人口</span><strong>{facility.assignedPopulation}<small>/{facility.region.level}</small></strong></div>
      <div><span>吞吐率</span><strong>{throughputPercent}<small>%</small></strong></div>
    </div>
    <div className="special-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>岗位占用 {staffingPercent}%</small></div>
    <div className="special-production-row">
      <div><span>当前生产方式</span><strong>{facility.methodName}</strong></div>
      <div><span>每日结算</span><ResourceBundle bundle={facility.net} empty="暂无日结算" /></div>
    </div>
    {children}
    <button className="special-secondary-action" onClick={onSelectFacility}><Orbit size={15} />查看设施详情</button>
  </section>
}

function TechnologyImagePlaceholder({ active }: { active: boolean }) {
  return <svg className="tech-image-placeholder" viewBox="0 0 120 74" role="img" aria-label="科技图像占位">
    <rect x="1" y="1" width="118" height="72" rx="6" />
    <circle cx="36" cy="37" r="16" />
    <path d="M52 37h34M76 24l12 13-12 13M20 58h80" className={active ? 'active-line' : ''} />
  </svg>
}

function TechnologyTags({ tech }: { tech: (typeof technologyCatalog)[TechnologyId] }) {
  const ScopeIcon = tech.scope === 'G' ? Bot : regionLayout[tech.scope].icon
  const facilityTags = facilityOrder.filter(id => tech.scope === id || displayCopy(tech.note).includes(facilityEconomySpecs[id].name)).slice(0, 2)
  const resourceTags = resourceOrder.filter(key => displayCopy(tech.note).includes(resourceMeta[key].label)).slice(0, 3)

  return <div className="tech-tags">
    <span><ScopeIcon size={13} />{tech.scope === 'G' ? '全局' : facilityEconomySpecs[tech.scope].name}</span>
    {facilityTags.filter(id => id !== tech.scope).map(id => {
      const TagIcon = regionLayout[id].icon
      return <span key={id}><TagIcon size={13} />{facilityEconomySpecs[id].name}</span>
    })}
    {resourceTags.map(key => {
      const ResourceIcon = resourceUiMeta[key].icon
      return <span key={key}><ResourceIcon className={resourceUiMeta[key].tone} size={13} />{resourceMeta[key].label}</span>
    })}
  </div>
}

function TechnologyCard({ techId, techs, activeResearch, researchProgress, onResearch }: { techId: TechnologyId; techs: string[]; activeResearch: TechnologyId; researchProgress: Partial<Record<TechnologyId, number>>; onResearch: (techId: TechnologyId) => void }) {
  const tech = technologyCatalog[techId]
  const completed = hasTech(techs, techId)
  const prerequisitesReady = hasResearchPrerequisites(techId, techs)
  const active = activeResearch === techId && !completed
  const locked = !completed && !prerequisitesReady
  const requiredKnowledge = tech.researchCost ?? 0
  const progress = completed ? requiredKnowledge : (researchProgress[techId] ?? 0)
  const progressPercent = requiredKnowledge ? Math.min(100, Math.round(progress / requiredKnowledge * 100)) : 100
  const prerequisites = tech.prerequisites ?? []

  return <button className={`tech-card ${completed ? 'completed' : ''} ${active ? 'researching' : ''} ${locked ? 'locked' : ''}`} onClick={() => !completed && prerequisitesReady && onResearch(techId)} disabled={completed || locked}>
    <div className="tech-card-top">
      <TechnologyImagePlaceholder active={active} />
      <span>{technologyCategoryLabel[tech.category ?? 'global']}</span>
    </div>
    <div className="tech-card-copy">
      <h3>{tech.name}</h3>
      <TechnologyTags tech={tech} />
      <InfoToggle title={`${tech.name}说明`}><p>{displayCopy(tech.note)}</p></InfoToggle>
    </div>
    <div className="tech-prerequisites">
      <span>前置</span>
      <small>{prerequisites.length ? prerequisites.map(techLabel).join('、') : '无'}</small>
    </div>
    <div className="tech-cost-row">
      <span><FlaskConical size={13} />需要知识 {requiredKnowledge}</span>
      {locked ? <em><Lock size={12} />前置未满足</em> : completed ? <em><BookOpen size={12} />已入科技书</em> : active ? <em>研究中</em> : <em>可切换研究</em>}
    </div>
    <div className="tech-progress"><span style={{ width: `${progressPercent}%` }} /><small>{progressPercent}%</small></div>
  </button>
}

function ResearchLab({ facility, techs, activeResearch, researchProgress, researchThroughput, knowledgeStock, onResearch, onSelectFacility }: { facility: SpecialFacilityViewModel; techs: string[]; activeResearch: TechnologyId; researchProgress: Partial<Record<TechnologyId, number>>; researchThroughput: number; knowledgeStock: number; onResearch: (techId: TechnologyId) => void; onSelectFacility: () => void }) {
  const completedIds = completedTechnologyIds(techs)
  const currentTech = technologyCatalog[activeResearch]
  const currentCost = currentTech.researchCost ?? 0
  const currentProgress = hasTech(techs, activeResearch) ? currentCost : (researchProgress[activeResearch] ?? 0)
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="research" onSelectFacility={onSelectFacility}>
      <div className="research-rule-box">
        <span><FlaskConical size={16} />研究规则</span>
        <p>每次只推进一项研究。日结算后，问天研究实验室从库存知识中投入当前课题；点击可研究卡片会切换课题。</p>
        <div><b>知识库存 {fmtAmount(knowledgeStock)}</b><b>每日投入上限 {researchThroughput}</b><b>当前 {currentTech.name}</b></div>
        <div className="tech-progress"><span style={{ width: `${currentCost ? Math.min(100, Math.round(currentProgress / currentCost * 100)) : 100}%` }} /><small>{fmtAmount(currentProgress)} / {currentCost}</small></div>
      </div>
    </SpecialFacilityPanel>
    <section className="special-system-main technology-workbench">
      <div className="section-heading"><div><span className="eyebrow">L 问天研究实验室</span><h2>科技树</h2></div><p>从左到右按阶段推进，卡片只显示玩家需要判断的信息。</p></div>
      <div className="technology-tree-scroll" aria-label="横向科技树">
        <div className="technology-tree">
          {researchEraSections.map(section => {
            const techIds = researchableTechIds.filter(id => (technologyCatalog[id].era ?? 'early') === section.id)
            return <section className="tech-era-column" key={section.id}>
              <header><span>{section.label}</span><small>{section.note}</small></header>
              {techIds.map(id => <TechnologyCard key={id} techId={id} techs={techs} activeResearch={activeResearch} researchProgress={researchProgress} onResearch={onResearch} />)}
            </section>
          })}
        </div>
      </div>
      <aside className="technology-book">
        <div><BookOpen size={17} /><span>科技书</span><small>已完成科技使用实线边框；未完成科技保留在树中。</small></div>
        <div>{completedIds.map(id => <span key={id}>{techLabel(id)}</span>)}</div>
      </aside>
    </section>
  </div>
}

function EcologyRing({ facility, onSelectFacility }: { facility: SpecialFacilityViewModel; onSelectFacility: () => void }) {
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="ecology" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><Waves size={16} /><span>生态环按阶段改变生态、人口与工业结构，阶段信息直接影响后续设施与人口包。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main phase-list"><div className="section-heading"><div><span className="eyebrow">R 月穹生态环</span><h2>生态阶段</h2></div><p>阶段不是装饰文本，是设施和人口经济的条件。</p></div>{facility.region.phaseNotes?.map(phase => <p key={phase.name}><b>{phase.name}</b><span>{displayCopy(phase.note)}</span></p>)}</section>
  </div>
}

function Starport({ facility, resources, techs, onTrade, onSelectFacility }: { facility: SpecialFacilityViewModel; resources: Resources; techs: string[]; onTrade: (name: string, input: Partial<Resources>, output: Partial<Resources>) => void; onSelectFacility: () => void }) {
  const tradeOffers: { id: TechnologyId; name: string; input: Partial<Resources>; output: Partial<Resources>; note: string }[] = [
    { id: 'TS-1', name: '招募星际劳工', input: { currency: 6, luxury: 1 }, output: { population: 1 }, note: '以货币和礼物换取 1 人口单位。' },
    { id: 'TS-2', name: '购买知识封包', input: { currency: 5, alloy: 2 }, output: { knowledge: 6 }, note: '把工业品转为可投入研究的知识。' },
    { id: 'TS-3', name: '输出玫瑰奢侈品', input: { biomass: 4, water: 2 }, output: { luxury: 3, currency: 2 }, note: '把生态盈余转为礼物与结算货币。' },
  ]
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="trade" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><ArrowLeftRight size={16} /><span>已解锁的星港科技会打开对应交易单。库存不足时交易按钮自动禁用。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main trade-board">
      <div className="section-heading"><div><span className="eyebrow">S 星海交易港</span><h2>贸易清单</h2></div><InfoToggle title="贸易规则"><p>交易立即结算库存，不改变每日净值。解锁 TS 系列科技后，对应交易单会从封存状态变为可执行。</p></InfoToggle></div>
      <div className="trade-offer-list">{tradeOffers.map(offer => {
        const unlocked = hasTech(techs, offer.id)
        const affordable = canPay(resources, offer.input)
        return <article key={offer.id} className={unlocked ? 'active' : 'locked'}>
          <div><span>{offer.id}</span><h3>{offer.name}</h3><small>{unlocked ? offer.note : `需要 ${technologyCatalog[offer.id].name}`}</small></div>
          <div className="trade-flow"><ResourceBundle bundle={offer.input} empty="无需投入" /><ArrowRight size={15} /><ResourceBundle bundle={offer.output} empty="无产出" /></div>
          <button onClick={() => onTrade(offer.name, offer.input, offer.output)} disabled={!unlocked || !affordable}>{unlocked ? '交易' : '封存'}</button>
        </article>
      })}</div>
    </section>
  </div>
}

function Shipyard({ facility, shipProgress, score, onSelectFacility }: { facility: SpecialFacilityViewModel; shipProgress: number; score: number; onSelectFacility: () => void }) {
  return <div className="special-system-page">
    <SpecialFacilityPanel facility={facility} tone="shipyard" onSelectFacility={onSelectFacility}>
      <div className="special-panel-brief"><Rocket size={16} /><span>千日试验以星舰完成度为核心结算，阶段投入会直接决定终局评分。</span></div>
    </SpecialFacilityPanel>
    <section className="special-system-main ship-meter"><div className="section-heading"><div><span className="eyebrow">D 冠冕星舰坞</span><h2>御座号工程</h2></div><p>材料总价值 {Math.round(shipProjectTotalValue)}，当前国祚评分 {score}。</p></div><strong>{shipProgress}<small>%</small></strong><div className="ship-progress"><i style={{ width: `${shipProgress}%` }} /></div><div className="ship-stage-list">{shipProjectStages.map(stage => <article key={stage.id}><b>{stage.id}. {stage.name}</b><ResourceBundle bundle={stage.input} /><small>{stage.note}</small></article>)}</div></section>
  </div>
}

function Palace({ policy, policyStartedDay, facility, cooldownRemaining, reportProgress, lastReport, onPolicy, onSelectFacility }: { policy: PolicyId; policyStartedDay: number; facility: SpecialFacilityViewModel; cooldownRemaining: number; reportProgress: number; lastReport: PolicyReport | null; onPolicy: (policy: PolicyId) => void; onSelectFacility: () => void }) {
  const currentPolicy = policyDefinitions.find(item => item.id === policy)!
  const currentPolicyName = currentPolicy.name
  const palaceCapacity = facility.region.level
  const staffingPercent = palaceCapacity ? Math.round(facility.assignedPopulation / palaceCapacity * 100) : 0
  const throughputPercent = Math.round(facility.throughput * 100)
  const canChangePolicy = cooldownRemaining <= 0

  return <div className="palace-layout palace-command">
    <section className="palace-hero palace-building-panel">
      <div className="palace-mark"><Crown size={48} /></div>
      <span className="eyebrow">K 月面王城 · 建筑页</span>
      <h2>{facility.region.name}</h2>
      <div className="palace-note-line"><span>{facility.region.subtitle}</span><InfoToggle title="王城说明"><p>{displayCopy(facility.region.note)}</p></InfoToggle></div>
      <div className="palace-building-stats">
        <div><span>王城等级</span><strong>{facility.region.level}<small>/{facility.region.max}</small></strong></div>
        <div><span>已分配人口</span><strong>{facility.assignedPopulation}<small>/{palaceCapacity}</small></strong></div>
        <div><span>吞吐率</span><strong>{throughputPercent}<small>%</small></strong></div>
      </div>
      <div className="palace-staffing-meter"><span style={{ width: `${staffingPercent}%` }} /><small>岗位占用 {staffingPercent}%</small></div>
      <div className="palace-output">
        <span>每日结算</span>
        <ResourceBundle bundle={facility.net} empty="王城未产生净变动" />
      </div>
      <button onClick={onSelectFacility}><Orbit size={15} />查看设施详情</button>
    </section>

    <section className="policy-board">
      <div className="section-heading">
        <div><span className="eyebrow">王城签发台</span><h2>{currentPolicyName}</h2></div>
        <p>{canChangePolicy ? '可立即更改政策；签发后进入 20 御日冷却。' : `距再次改令 ${cooldownRemaining} 御日。`}</p>
      </div>
      <div className="policy-status">
        <div><span>当前政策</span><strong>{currentPolicyName}</strong><small>{formatDay(policyStartedDay)} 生效中</small></div>
        <div><span>改令冷却</span><strong>{canChangePolicy ? '可签发' : `${cooldownRemaining}日`}</strong><small>固定 20 御日</small></div>
        <div><span>报告周期</span><strong>{reportProgress}<small>%</small></strong><small>下一份 20 御日报告</small></div>
      </div>
      <div className="policy-cycle-bar" aria-label="政策报告周期进度"><span style={{ width: `${reportProgress}%` }} /></div>
      <div className="policy-cards">{policyDefinitions.map(item => {
        const PolicyIcon = item.icon
        const unlocked = facility.region.level >= item.level
        const active = policy === item.id
        const disabled = active || !unlocked || !canChangePolicy
        const reason = active ? '当前执行' : !unlocked ? `王城 ${item.level} 级解锁` : !canChangePolicy ? `冷却 ${cooldownRemaining} 御日` : '可立即签发'
        return <button key={item.id} disabled={disabled} className={`${active ? 'selected' : ''} ${!unlocked ? 'locked' : ''} ${!canChangePolicy && !active ? 'cooling' : ''}`} onClick={() => onPolicy(item.id)}>
          <span><PolicyIcon size={22} /></span>
          <div><small>{reason}</small><h3>{item.name}</h3><p>{item.detail}</p></div>
          {active && <Check size={18} />}
        </button>
      })}</div>
    </section>

    <section className="policy-report">
      <div className="section-heading">
        <div><span className="eyebrow">上一轮 20 御日执行报告</span><h2>{lastReport ? `${formatDay(lastReport.startDay)} 至 ${formatDay(lastReport.endDay)}` : '尚未归档'}</h2></div>
        <p>报告记录政策周期内的库存净变动，用于复核王城倾向是否值得延续。</p>
      </div>
      {lastReport ? <div className="policy-report-body">
        <div><span>执行政策</span><strong>{policyDefinitions.find(item => item.id === lastReport.policy)?.name ?? lastReport.policy}</strong><small>{lastReport.summary}</small></div>
        <div><span>库存净变动</span><ResourceBundle bundle={lastReport.delta} empty="无显著变动" /></div>
      </div> : <div className="policy-report-empty"><Landmark size={22} /><span>尚未完成第一个 20 御日政策周期。</span></div>}
    </section>
  </div>
}

function Visitors({ roster, assigned, regions, visitor, onSelect, onAssignment }: { roster: Role[]; assigned: Record<RegionId, string | undefined>; regions: Region[]; visitor: Encounter | null; onSelect: (id: RegionId) => void; onAssignment: (regionId: RegionId, visitorId: string | undefined) => void }) {
  return <div className="visitor-layout"><section className="visitor-hero"><span className="eyebrow">异客留任簿 · {roster.length}/{roles.length}</span><h2>陌生人不是资源。<br />他们只是懂得让资源更好地工作。</h2><p>每一位来访者都有独立的族群、需求与专长。选择留任后，他们将持续改变一座设施的产出。</p>{visitor && <div className="pending-visitor"><span>{visitor.glyph}</span><div><b>{visitor.name} 正在等待</b><small>{visitor.species}，请在外交来函中决定去留。</small></div></div>}</section><section className="roster-board">{roster.length ? roster.map(member => { const region = regions.find(item => item.id === member.specialty)!; const RegionIcon = region.icon; const active = assigned[member.specialty] === member.id; return <article key={member.id} className={active ? 'retainer active' : 'retainer'}><div className="retainer-portrait"><span>{member.glyph}</span><small>portrait placeholder</small></div><div className="retainer-copy"><span>{member.species}</span><h3>{member.name}</h3><p>{member.portrait}</p><button onClick={() => onSelect(member.specialty)}><RegionIcon size={14} />{region.name}</button></div><div className="retainer-duty"><b>+{Math.round(member.boost * 100)}%</b><small>专属区域产出</small><button onClick={() => onAssignment(member.specialty, active ? undefined : member.id)}>{active ? '改为待命' : '安排执勤'}</button></div></article> }) : <div className="empty-roster"><Sparkles size={27} /><h3>留任簿仍为空白</h3><p>信标会随机抵达。交换可取得技术，留任则会带来长期区域增益。肖像美术会在这里以占位框接入。</p></div>}</section></div>
}

export default App
