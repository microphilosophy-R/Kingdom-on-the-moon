import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, Bot, Check, ChevronLeft, ChevronRight, CircleDot, Crown, Factory,
  FlaskConical, House, Landmark, Leaf, Minus, Mountain, Orbit,
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
const initialProductionMethods = Object.fromEntries(
  facilityOrder.map(id => [id, selectProductionMethod(facilityEconomySpecs[id].productionMethods, defaultStartingTechs).id]),
) as Record<RegionId, ProductionMethodId>

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

const fmt = (value: number) => Math.round(value).toLocaleString('zh-CN')
const fmtAmount = (value: number) => Number.isInteger(value) ? fmt(value) : value.toFixed(1)
const canPay = canAfford
const apply = applyBundle
const formatDay = (day: number) => `御日 ${String(day).padStart(3, '0')}`
const displayCopy = (text: string) => text.replace(/\bM[A-Z0-9]+-\d+\s*为/g, '').replace(/\bM[A-Z0-9]+-\d+\s*/g, '')
const allResourceKeys = resourceGroups.flatMap(group => group.keys)
const resourceGroupLabel = Object.fromEntries(resourceGroups.flatMap(group => group.keys.map(key => [key, group.label]))) as Record<ResourceKey, string>
const weightedShipReadiness = (resources: Resources) => {
  const ratios = shipProjectStages.flatMap(stage =>
    Object.entries(stage.input).map(([key, required]) => Math.min(1, resources[key as ResourceKey] / (required || 1))),
  )
  return ratios.length ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length * 24 : 0
}

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

function ProductionFlow({ input, output }: { input: Partial<Resources>; output: Partial<Resources> }) {
  return <div className="production-flow">
    <div><small>输入</small><ResourceBundle bundle={input} empty="无输入" /></div>
    <ArrowRight size={17} />
    <div><small>输出</small><ResourceBundle bundle={output} empty="无输出" /></div>
  </div>
}

function App() {
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
  const [productionMethods, setProductionMethods] = useState<Record<RegionId, ProductionMethodId>>(initialProductionMethods)
  const [facilityOrders, setFacilityOrders] = useState<Record<RegionId, FacilityOrderMode>>(Object.fromEntries(facilityOrder.map(id => [id, 'hold'])) as Record<RegionId, FacilityOrderMode>)
  const [lastAutomatedAction, setLastAutomatedAction] = useState<{ id: RegionId; day: number; mode: FacilityOrderMode } | null>(null)
  const [policy, setPolicy] = useState<'ration' | 'mandate' | 'festival'>('ration')
  const [log, setLog] = useState<string[]>(['御日 001：月面行宫已就位，御座号的第一根龙骨等待铸造。'])
  const [pendingMonthlyReport, setPendingMonthlyReport] = useState<string | null>(null)
  const [artOpen, setArtOpen] = useState(false)

  const selectedRegion = regions.find(region => region.id === selected)!
  const selectedCost = projectFacilityCost(facilityEconomySpecs[selectedRegion.id], selectedRegion.level)
  const palaceLevel = regions.find(region => region.id === 'K')!.level
  const habitatLevel = regions.find(region => region.id === 'M')!.level
  const shipLevel = regions.find(region => region.id === 'D')!.level
  const completed = day >= gameCalendar.finalDay

  const facilityStates = useMemo<Record<RegionId, FacilityState>>(
    () => Object.fromEntries(regions.map(region => [region.id, { id: region.id, level: region.level }])) as Record<RegionId, FacilityState>,
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

    setResources(executableAction ? apply(afterDailyNet, executableAction.cost, -1) : afterDailyNet)
    if (executableAction) {
      const region = regions.find(item => item.id === executableAction.id)
      setRegions(previous => previous.map(item => item.id === executableAction.id ? { ...item, level: item.level + 1 } : item))
      setLastAutomatedAction({ id: executableAction.id, day: nextDay, mode: 'expand' })
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 月度报告：内置优化署已扩建 ${region?.name ?? executableAction.id} 至第 ${executableAction.toLevel} 阶。库存安全线已复核，预计加权收益 ${executableAction.score.toFixed(1)}。`)
    } else if (shouldOptimize) {
      setPendingMonthlyReport(`${formatDay(nextDay + 1)} 月度报告：内置优化署完成复核，当前无正收益扩建；维持既有设施规模。`)
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
    if (!isRunning || completed) return
    const timer = window.setInterval(advanceDay, speed === 'fast' ? gameCalendar.fastMsPerDay : gameCalendar.normalMsPerDay)
    return () => window.clearInterval(timer)
    // The interval intentionally observes current game state after each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, completed, day, dailyNet, visitor, speed, pendingMonthlyReport, automationPlan])

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
    writeLog(`${formatDay(day)}：${region.name}升为第 ${region.level + 1} 阶。`)
  }

  const holdFacility = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'hold' }))
    writeLog(`${formatDay(day)}：${region.name}维持现行规模，交由内置优化署观察。`)
  }

  const shrinkFacility = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    setFacilityOrders(previous => ({ ...previous, [id]: 'shrink' }))
    if (region.level <= 0) return
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: Math.max(0, item.level - 1) } : item))
    writeLog(`${formatDay(day)}：${region.name}缩小至第 ${Math.max(0, region.level - 1)} 阶，人员转入待命名册。`)
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
      {allResourceKeys.map(key => <ResourceAtom key={key} resourceKey={key} value={resources[key]} net={dailyNet[key] ?? 0} showGroup />)}
    </section>

    {visitor && <div className="event-scrim" role="presentation"><section className="diplomatic-letter event-modal" aria-live="polite" aria-modal="true" role="dialog">
      <div className="visitor-portrait-slot" aria-label="访客肖像占位">
        <span>{visitor.glyph}</span>
        <small>portrait placeholder</small>
      </div>
      <div className="letter-copy">
        <span>外交来函 · {visitor.species} · {visitor.chain.arc === 'long' ? `链 ${Math.min((chainProgress[visitor.chain.id] ?? 0) + 1, visitor.chain.events.length)}/${visitor.chain.events.length}` : '偶遇'}</span>
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
      {view === 'facilities' && <PlanetFacilities regions={regions} selected={selected} year={day} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} planetTexture={planetTexture} docked={planetDocked} detailOpen={detailOpen} onDock={() => setPlanetDocked(true)} onBack={() => setDetailOpen(false)} onSelect={selectFacility} onUpgrade={upgrade} onHold={holdFacility} onShrink={shrinkFacility} onMethod={(methodId) => setProductionMethods(previous => ({ ...previous, [selectedRegion.id]: methodId }))} onAssignment={visitorId => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId }))} />}
      {view === 'palace' && <Palace policy={policy} palaceLevel={palaceLevel} techs={techs} onPolicy={setPolicy} onSelectPalace={() => selectFacility('K')} />}
      {view === 'research' && <ResearchLab techs={techs} onSelectLab={() => setSelected('L')} />}
      {view === 'ecology' && <EcologyRing regions={regions} onSelectRing={() => setSelected('R')} />}
      {view === 'starport' && <Starport techs={techs} onSelectPort={() => setSelected('S')} />}
      {view === 'ship' && <Shipyard shipProgress={shipProgress} score={score} onSelectShip={() => setSelected('D')} />}
      {view === 'visitors' && <Visitors roster={roster} assigned={assigned} regions={regions} visitor={visitor} onSelect={selectFacility} onAssignment={(regionId, visitorId) => setAssigned(previous => ({ ...previous, [regionId]: visitorId }))} />}
    </section>

    <footer className="command-deck bottom-tabs">
      <div className="scoreline"><span>国祚评分</span><strong>{score}</strong><small>星舰进度权重最高</small></div>
      <nav className="tab-nav" aria-label="底部系统菜单">{navItems.map(item => { const NavIcon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><NavIcon size={16} />{item.label}</button> })}</nav>
      <button className="advance-year" onClick={advanceDay} disabled={completed}>推进一日 <ArrowUpRight size={17} /></button>
      <button className="art-button" onClick={() => setArtOpen(!artOpen)}>素材提示词</button>
    </footer>

    {artOpen && <section className="art-brief"><button onClick={() => setArtOpen(false)} aria-label="关闭素材提示"><X size={16} /></button><span>静态美术素材提示词，不含生成图像</span><p>“lunar royal colony command deck, titanium ceremonial architecture buried in moon regolith, restrained brass royal insignia, hard sunlight, blue grey shadows, Chinese sci-fi court ritual, isometric game asset, no text, no people, high-detail matte painting”</p></section>}
  </main>
}

function PlanetFacilities({ regions, selected, year, techs, productionMethods, facilityOrders, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, planetTexture, docked, detailOpen, onDock, onBack, onSelect, onUpgrade, onHold, onShrink, onMethod, onAssignment }: { regions: Region[]; selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: ReturnType<typeof planFacilityAutomation>; planetTexture: typeof planetTextures[number]; docked: boolean; detailOpen: boolean; onDock: () => void; onBack: () => void; onSelect: (id: RegionId) => void; onUpgrade: (id: RegionId) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  if (!docked) {
    return <div className="planet-home">
      <div className="planet-stage">
        <PlanetScene texture={planetTexture} onActivate={onDock} />
        <div className="planet-title"><span className="eyebrow">殖民星球 · {planetTexture.name}</span><h2>静海王国</h2><p>{formatDay(year)} · 已启动 {regions.filter(region => region.level > 0).length}/{regions.length} 座设施</p><button onClick={onDock}>展开设施名录 <ChevronRight size={16} /></button></div>
      </div>
    </div>
  }

  return <div className={detailOpen ? 'planet-workbench detail-mode' : 'planet-workbench'}>
    <section className="planet-dock"><PlanetScene texture={planetTexture} compact onActivate={() => onBack()} /><div><span className="eyebrow">殖民星球</span><h2>{planetTexture.name}</h2><p>{formatDay(year)}，国祚仍在设施、政策与星舰之间被重新分配。</p></div></section>
    {detailOpen ? <FacilityDetailPanel selected={selected} year={year} techs={techs} productionMethods={productionMethods} facilityOrders={facilityOrders} lastAutomatedAction={lastAutomatedAction} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} dailyNet={dailyNet} automationPlan={automationPlan} regions={regions} onBack={onBack} onUpgrade={onUpgrade} onHold={onHold} onShrink={onShrink} onMethod={onMethod} onAssignment={onAssignment} /> : <FacilityList regions={regions} selected={selected} assigned={assigned} roster={roster} onSelect={onSelect} />}
  </div>
}

function FacilityList({ regions, selected, assigned, roster, onSelect }: { regions: Region[]; selected: RegionId; assigned: Record<RegionId, string | undefined>; roster: Role[]; onSelect: (id: RegionId) => void }) {
  return <section className="facility-ledger">
    <div className="section-heading"><div><span className="eyebrow">主要设施</span><h2>建筑名录</h2></div><p>D/R/S/K/L 进入专属系统页。</p></div>
    <div className="facility-ledger-list">{regions.map(region => {
      const RegionIcon = region.icon
      const worker = roster.find(item => item.id === assigned[region.id])
      const special = specialFacilityViews[region.id]
      return <button key={region.id} className={`${selected === region.id ? 'selected' : ''} ${special ? 'special' : ''}`} onClick={() => onSelect(region.id)}>
        <span className="ledger-icon"><RegionIcon size={19} /></span>
        <div><b>{region.name}</b><small>{special ? navItems.find(item => item.id === special)?.label : region.subtitle}</small></div>
        <em>{region.level ? `${region.level}/${region.max}` : '未建'}</em>
        {worker && <i>{worker.glyph}</i>}
      </button>
    })}</div>
  </section>
}

function FacilityDetailPanel({ selected, year, techs, productionMethods, facilityOrders, lastAutomatedAction, roster, assigned, selectedRegion, selectedCost, resources, dailyNet, automationPlan, regions, onBack, onUpgrade, onHold, onShrink, onMethod, onAssignment }: { selected: RegionId; year: number; techs: string[]; productionMethods: Record<RegionId, ProductionMethodId>; facilityOrders: Record<RegionId, FacilityOrderMode>; lastAutomatedAction: { id: RegionId; day: number; mode: FacilityOrderMode } | null; roster: Role[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; dailyNet: Partial<Resources>; automationPlan: ReturnType<typeof planFacilityAutomation>; regions: Region[]; onBack: () => void; onUpgrade: (id: RegionId) => void; onHold: (id: RegionId) => void; onShrink: (id: RegionId) => void; onMethod: (methodId: ProductionMethodId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  const selectedWorker = roster.find(item => item.id === assigned[selectedRegion.id])
  const SelectIcon = selectedRegion.icon
  const selectedSpec = facilityEconomySpecs[selectedRegion.id]
  const selectedMethod = selectProductionMethod(selectedSpec.productionMethods, techs, productionMethods[selectedRegion.id])
  const selectedYield = projectFacilityNet(selectedSpec, selectedRegion.level, {}, techs, selectedMethod.id)
  const selectedBuildable = canBuildFacility(selectedSpec, year, techs)
  const selectedRequiredTech = selectedSpec.requiredTech ? technologyCatalog[selectedSpec.requiredTech] : undefined
  const parents = selectedRegion.parentIds.map(id => regions.find(region => region.id === id)?.name).filter(Boolean)
  const workerChoices = roster.filter(item => item.specialty === selectedRegion.id)
  const currentOrder = facilityOrders[selectedRegion.id] ?? 'hold'
  const nextAutoAction = automationPlan.actions.find(action => action.id === selectedRegion.id)
  const cycleProgress = Math.round(((year % gameCalendar.optimizationIntervalDays) / gameCalendar.optimizationIntervalDays) * 100)
  const recentAuto = lastAutomatedAction?.id === selectedRegion.id && year - lastAutomatedAction.day <= 6
  const affordExpansion = canPay(resources, selectedCost)
  const actionReason = !selectedBuildable
    ? `需要先取得 ${selectedRequiredTech ? selectedRequiredTech.name : selectedSpec.requiredTech}`
    : selectedRegion.level >= selectedRegion.max
      ? '现行设计已达到最高规模'
      : affordExpansion
        ? '库存满足扩建成本，扩张会立即消耗下列资源'
        : '库存不足，扩张按钮会保留判断但暂不可签发'

  return <aside className="inspector facility-detail-page">
    <button className="back-button" onClick={onBack}><ChevronLeft size={16} />建筑名录</button>
    <div className="inspector-head"><span className="facility-icon"><SelectIcon size={23} /></span><div><span className="eyebrow">建筑详情 · {selected}</span><h2>{selectedRegion.name}</h2><p>{selectedRegion.subtitle}</p></div></div>
    <p className="inspector-description">{displayCopy(selectedRegion.note)}</p>
    <p className="inspector-description">{displayCopy(selectedRegion.interfaceDuty)}</p>
    {selectedRegion.phaseNotes?.length ? <div className="phase-list">{selectedRegion.phaseNotes.map(phase => <p key={phase.name}><b>{phase.name}</b><span>{displayCopy(phase.note)}</span></p>)}</div> : null}
    <div className="population-strip">
      <div><span>当前规模</span><strong>{selectedRegion.level}<small>/{selectedRegion.max}</small></strong><em>人口单位</em></div>
      <div><span>王国人口</span><strong>{fmt(resources.population)}</strong><em>库存人口</em></div>
      <div><span>建筑状态</span><strong>{selectedBuildable ? (selectedRegion.level ? '运行中' : '可建造') : '未授权'}</strong><em>{selectedBuildable ? '可调度' : selectedRequiredTech?.name ?? '科技锁定'}</em></div>
    </div>
    <div className="action-brief">
      <div className="section-heading"><div><span className="eyebrow">调度判断</span><h3>先看代价，再签发动作</h3></div><p>{actionReason}</p></div>
      <div className="action-facts">
        <div><span>扩建成本</span><ResourceBundle bundle={selectedCost} empty="无需成本" /></div>
        <div><span>自动建议</span><b>{nextAutoAction ? `建议扩张至 ${nextAutoAction.toLevel}` : automationPlan.reason ?? '维持当前规模'}</b></div>
        <div><span>当前手动状态</span><b>{currentOrder === 'expand' ? '扩张' : currentOrder === 'shrink' ? '缩小' : '保持'}</b></div>
      </div>
      <div className="operation-progress"><span style={{ width: `${cycleProgress}%` }} /><small>内置优化署每 {gameCalendar.optimizationIntervalDays} 御日复核一次，当前周期 {cycleProgress}%</small></div>
      <div className="facility-actions">
        <button className={`${currentOrder === 'expand' ? 'selected' : ''} ${recentAuto && lastAutomatedAction?.mode === 'expand' ? 'auto-feedback' : ''}`} onClick={() => onUpgrade(selectedRegion.id)} disabled={!selectedBuildable || selectedRegion.level >= selectedRegion.max || !affordExpansion}><ArrowUpRight size={15} />扩张</button>
        <button className={currentOrder === 'hold' ? 'selected' : ''} onClick={() => onHold(selectedRegion.id)}><Minus size={15} />保持</button>
        <button className={currentOrder === 'shrink' ? 'selected' : ''} onClick={() => onShrink(selectedRegion.id)} disabled={selectedRegion.level <= 0}><ArrowDownRight size={15} />缩小</button>
      </div>
    </div>
    <div className="production-methods"><span>生产方式</span>{selectedSpec.productionMethods.map(method => {
      const methodReady = hasTech(techs, method.unlockedBy) && method.autoSelect !== false
      const techName = method.unlockedBy ? technologyCatalog[method.unlockedBy]?.name : undefined
      return <article key={method.id} className={method.id === selectedMethod.id && methodReady ? 'active' : ''}>
        <div className="method-copy"><b>{method.name}</b><small>{methodReady ? '已解锁，可切换' : method.autoSelect === false ? '由阶段推进启用' : `需要 ${techName ?? '对应科技'}`}</small></div>
        <ProductionFlow input={method.input} output={method.output} />
        <p>{displayCopy(method.note)}</p>
        {method.id === selectedMethod.id && methodReady ? <em>使用中</em> : <button onClick={() => onMethod(method.id)} disabled={!methodReady}>切换</button>}
      </article>
    })}</div>
    <div className="stat-block"><span>每日结算</span><div>{resourceOrder.filter(key => selectedYield[key]).map(key => <ResourceAtom key={key} resourceKey={key} value={selectedYield[key] ?? 0} compact />)}{!Object.values(selectedYield).filter(Boolean).length && <span className="resource-empty">无日结算</span>}</div></div>
    <div className="path-note"><Orbit size={15} /><span>{parents.length ? `发展路径：${parents.join('、')} → 本设施` : '发展路径：殖民地基础设施'}</span></div>
    {selectedWorker ? <div className="worker-card"><span>{selectedWorker.glyph}</span><div><b>{selectedWorker.name} 正在执勤</b><small>专属区域日产出 +{Math.round(selectedWorker.boost * 100)}%</small></div><button onClick={() => onAssignment(undefined)}>待命</button></div> : workerChoices.length ? <div className="worker-card"><span>{workerChoices[0].glyph}</span><div><b>{workerChoices[0].name} 可派驻</b><small>专属区域日产出 +{Math.round(workerChoices[0].boost * 100)}%</small></div><button onClick={() => onAssignment(workerChoices[0].id)}>派驻</button></div> : null}
    <p className="inspector-footnote">全局日净值当前有 {Object.values(dailyNet).filter(Boolean).length} 项变化。系统自动操作会在上方按钮中短暂高亮。</p>
  </aside>
}

function ResearchLab({ techs, onSelectLab }: { techs: string[]; onSelectLab: () => void }) {
  const researchTechs = Object.values(technologyCatalog).filter(tech => tech.category !== 'construction')
  return <div className="system-page"><section className="system-hero"><FlaskConical size={42} /><span className="eyebrow">L 问天研究实验室</span><h2>科技档案</h2><p>科技值按时代人口规模、资源利润率与增益幅度估算；研究成本约按 1 年回本设计。TL-2/TL-3 会提高电力投入并换取更高知识产出。</p><button onClick={onSelectLab}>定位问天研究实验室</button></section><section className="tech-cabinet system-panel"><span className="eyebrow">候选科技</span>{researchTechs.map(tech => <p key={tech.id} className={hasTech(techs, tech.id) ? 'active' : ''}><FlaskConical size={15} />{tech.id} {tech.name}<small>科技值 {tech.value} / 研究 {tech.researchCost}</small></p>)}</section></div>
}

function EcologyRing({ regions, onSelectRing }: { regions: Region[]; onSelectRing: () => void }) {
  const ring = regions.find(region => region.id === 'R')!
  return <div className="system-page"><section className="system-hero"><Waves size={42} /><span className="eyebrow">R 月穹生态环</span><h2>生态阶段</h2><p>月穹生态环按阶段改变生态、人口与工业结构。</p><button onClick={onSelectRing}>定位月穹生态环</button></section><section className="system-panel phase-list">{ring.phaseNotes?.map(phase => <p key={phase.name}><b>{phase.name}</b><span>{phase.note}</span></p>)}</section></div>
}

function Starport({ techs, onSelectPort }: { techs: string[]; onSelectPort: () => void }) {
  const tradeTechs = techs.filter(tech => tech.startsWith('TS-'))
  return <div className="system-page"><section className="system-hero"><ArrowLeftRight size={42} /><span className="eyebrow">S 星海交易港</span><h2>双向贸易</h2><p>星港科技会固定添加人口、知识、奢侈品等双向贸易权限。</p><button onClick={onSelectPort}>定位星海交易港</button></section><section className="system-panel trade-board">{['TS-1 星际劳工', 'TS-2 知识传输协议', 'TS-3 玫瑰星球'].map(tech => <p key={tech} className={tradeTechs.some(item => item.startsWith(tech.split(' ')[0])) ? 'active' : ''}><ArrowLeftRight size={15} />{tech}</p>)}</section></div>
}

function Shipyard({ shipProgress, score, onSelectShip }: { shipProgress: number; score: number; onSelectShip: () => void }) {
  return <div className="system-page"><section className="system-hero ship-system"><Rocket size={46} /><span className="eyebrow">D 冠冕星舰坞</span><h2>御座号工程</h2><p>千日试验以星舰完成度为核心结算。终局项目分三阶段投入，材料总价值 {Math.round(shipProjectTotalValue)}。</p><button onClick={onSelectShip}>定位冠冕星舰坞</button></section><section className="system-panel ship-meter"><strong>{shipProgress}<small>%</small></strong><div className="ship-progress"><i style={{ width: `${shipProgress}%` }} /></div><p>当前国祚评分 {score}</p><div className="ship-stage-list">{shipProjectStages.map(stage => <article key={stage.id}><b>{stage.id}. {stage.name}</b><ResourceBundle bundle={stage.input} /><small>{stage.note}</small></article>)}</div></section></div>
}

function Palace({ policy, palaceLevel, techs, onPolicy, onSelectPalace }: { policy: 'ration' | 'mandate' | 'festival'; palaceLevel: number; techs: string[]; onPolicy: (policy: 'ration' | 'mandate' | 'festival') => void; onSelectPalace: () => void }) {
  const policies = [
    { id: 'ration' as const, name: '配给法典', level: 1, detail: '生物质 +1/日', icon: Leaf },
    { id: 'mandate' as const, name: '机令总动员', level: 2, detail: '正向产出 +16%', icon: Bot },
    { id: 'festival' as const, name: '失重庆典', level: 3, detail: '正向产出 +6%', icon: Theater },
  ]
  return <div className="palace-layout"><section className="palace-hero"><div className="palace-mark"><Crown size={48} /></div><span className="eyebrow">月面王城 · 政策界面</span><h2>容纳人口，<br />提供税收。</h2><p>月面王城可以容纳人口、提供税收、制定政策，并显示政策界面。星海货币与人口成正比。</p><button onClick={onSelectPalace}>审阅王城设施 <ChevronRight size={17} /></button></section><section className="policy-board"><div className="section-heading"><div><span className="eyebrow">可签发政令</span><h2>王城等级 {palaceLevel}/3</h2></div><p>同一时间只能执行一项政策。</p></div><div className="policy-cards">{policies.map(item => { const PolicyIcon = item.icon; const unlocked = palaceLevel >= item.level; return <button key={item.id} disabled={!unlocked} className={`${policy === item.id ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`} onClick={() => onPolicy(item.id)}><span><PolicyIcon size={22} /></span><div><small>{unlocked ? `王城 ${item.level} 级已授权` : `王城 ${item.level} 级解锁`}</small><h3>{item.name}</h3><p>{item.detail}</p></div>{policy === item.id && <Check size={18} />}</button> })}</div></section><section className="tech-cabinet"><span className="eyebrow">档案柜 · 已获技术</span>{techs.length ? techs.map(tech => <p key={tech}><FlaskConical size={15} />{tech}</p>) : <p className="empty-tech">尚无科技入库。科技会解锁可选生产方式。</p>}</section></div>
}

function Visitors({ roster, assigned, regions, visitor, onSelect, onAssignment }: { roster: Role[]; assigned: Record<RegionId, string | undefined>; regions: Region[]; visitor: Encounter | null; onSelect: (id: RegionId) => void; onAssignment: (regionId: RegionId, visitorId: string | undefined) => void }) {
  return <div className="visitor-layout"><section className="visitor-hero"><span className="eyebrow">异客留任簿 · {roster.length}/{roles.length}</span><h2>陌生人不是资源。<br />他们只是懂得让资源更好地工作。</h2><p>每一位来访者都有独立的族群、需求与专长。选择留任后，他们将持续改变一座设施的产出。</p>{visitor && <div className="pending-visitor"><span>{visitor.glyph}</span><div><b>{visitor.name} 正在等待</b><small>{visitor.species}，请在外交来函中决定去留。</small></div></div>}</section><section className="roster-board">{roster.length ? roster.map(member => { const region = regions.find(item => item.id === member.specialty)!; const RegionIcon = region.icon; const active = assigned[member.specialty] === member.id; return <article key={member.id} className={active ? 'retainer active' : 'retainer'}><div className="retainer-portrait"><span>{member.glyph}</span><small>portrait placeholder</small></div><div className="retainer-copy"><span>{member.species}</span><h3>{member.name}</h3><p>{member.portrait}</p><button onClick={() => onSelect(member.specialty)}><RegionIcon size={14} />{region.name}</button></div><div className="retainer-duty"><b>+{Math.round(member.boost * 100)}%</b><small>专属区域产出</small><button onClick={() => onAssignment(member.specialty, active ? undefined : member.id)}>{active ? '改为待命' : '安排执勤'}</button></div></article> }) : <div className="empty-roster"><Sparkles size={27} /><h3>留任簿仍为空白</h3><p>信标会随机抵达。交换可取得技术，留任则会带来长期区域增益。肖像美术会在这里以占位框接入。</p></div>}</section></div>
}

export default App
