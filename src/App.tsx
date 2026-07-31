import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowLeftRight, ArrowUpRight, Bot, Check, ChevronRight, CircleDot, Crown, Factory,
  FlaskConical, Fuel, House, Landmark, Leaf, LockKeyhole, Menu, Mountain, Orbit,
  Pause, Pickaxe, Play, Rocket, Sparkles, Sprout, Sun, Theater, Waves, X, Zap,
  type LucideProps,
} from 'lucide-react'

type ResourceKey = 'power' | 'fuel' | 'alloy' | 'regolith' | 'water' | 'oxygen' | 'food' | 'research'
type Resources = Record<ResourceKey, number>
type RegionId = 'energy' | 'mines' | 'biosphere' | 'habitats' | 'palace' | 'leisure' | 'exchange' | 'shipyard'
type AppView = 'overview' | 'facilities' | 'palace' | 'visitors'
type Icon = ComponentType<LucideProps>

type Region = {
  id: RegionId
  icon: Icon
  name: string
  subtitle: string
  unlock: number
  level: number
  max: number
  note: string
  yields: Partial<Resources>
  cost: Partial<Resources>
  parentIds: RegionId[]
  position: { x: number; y: number }
}

type Visitor = {
  id: string
  name: string
  species: string
  glyph: string
  portrait: string
  specialty: RegionId
  boost: number
  quote: string
  offer: { give: Partial<Resources>; take: Partial<Resources>; tech?: string }
}

const initialResources: Resources = { power: 24, fuel: 16, alloy: 12, regolith: 22, water: 10, oxygen: 12, food: 9, research: 0 }

const regionTemplate: Region[] = [
  { id: 'energy', icon: Sun, name: '日冕能源庭', subtitle: '燃料 · 光能 · 微型聚变', unlock: 0, level: 1, max: 5, note: '先以氦燃料点火，日冕镜阵在 II 级后加入，IV 级解锁微型聚变。', yields: { power: 5, fuel: -1 }, cost: { regolith: 10, alloy: 8 }, parentIds: [], position: { x: 13, y: 18 } },
  { id: 'mines', icon: Pickaxe, name: '静海采掘署', subtitle: '能源矿物 · 建材 · 土壤', unlock: 0, level: 1, max: 5, note: '月壤、合金与氦-3 的来源。采掘越深，越依赖稳定氧气。', yields: { regolith: 5, alloy: 2, fuel: 2, oxygen: -1 }, cost: { power: 14, alloy: 5 }, parentIds: [], position: { x: 13, y: 67 } },
  { id: 'biosphere', icon: Sprout, name: '翠穹生命环', subtitle: '水 · 氧气 · 农业', unlock: 8, level: 0, max: 5, note: '将冰矿、藻类与土壤转为可以呼吸的王国。', yields: { oxygen: 4, food: 3, water: -1, regolith: -1 }, cost: { power: 16, water: 6, regolith: 8 }, parentIds: ['energy', 'mines'], position: { x: 39, y: 18 } },
  { id: 'habitats', icon: House, name: '月民穹居', subtitle: '人口 · 秩序 · 劳作', unlock: 14, level: 0, max: 5, note: '居住指标决定全域人力效能，每级为基础产出加 4%。', yields: { food: -2, oxygen: -2, research: 1 }, cost: { alloy: 16, regolith: 18, water: 8 }, parentIds: ['mines', 'biosphere'], position: { x: 39, y: 67 } },
  { id: 'palace', icon: Crown, name: '钛金王城', subtitle: '政策 · 皇家增益', unlock: 22, level: 0, max: 3, note: '在计算机礼制之上签发政策。每级解锁一项常驻诏令。', yields: { research: 3, power: -2 }, cost: { alloy: 28, regolith: 24, power: 20 }, parentIds: ['habitats'], position: { x: 65, y: 16 } },
  { id: 'leisure', icon: Theater, name: '低重力游乐廊', subtitle: '凝聚力 · 访客声望', unlock: 30, level: 0, max: 4, note: '让月民愿意留下，也让异客愿意把技术留在此处。', yields: { research: 2, food: -1, power: -1 }, cost: { alloy: 20, power: 22, food: 10 }, parentIds: ['habitats', 'palace'], position: { x: 65, y: 48 } },
  { id: 'exchange', icon: ArrowLeftRight, name: '真空交易港', subtitle: '盈余转化 · 电力结算', unlock: 38, level: 0, max: 4, note: '电力是王国货币。每年自动出售充裕物资，并允许补给。', yields: { power: 3 }, cost: { alloy: 26, power: 26, food: 12 }, parentIds: ['leisure'], position: { x: 65, y: 80 } },
  { id: 'shipyard', icon: Rocket, name: '冠冕星舰坞', subtitle: '终局工程 · 出航评分', unlock: 52, level: 0, max: 5, note: '以庞大物资推进“御座号”巨型星舰。王国的一切最终归于这艘船。', yields: { power: -5, alloy: -3, fuel: -2 }, cost: { alloy: 56, power: 60, fuel: 25, research: 15 }, parentIds: ['palace', 'exchange'], position: { x: 89, y: 48 } },
]

const visitors: Visitor[] = [
  { id: 'sava', name: '萨瓦·碎光', species: '折光甲壳人', glyph: '◈', portrait: '冰裂色甲壳，掌中托着一枚会逆向燃烧的晶体', specialty: 'energy', boost: 0.42, quote: '“你们把恒星装进了贡箱，我可以让它少吃一点。”', offer: { give: { fuel: 14, research: 6 }, take: { water: 6 }, tech: '日冕镜阵效率 +15%' } },
  { id: 'melu', name: '梅露·第九孢', species: '浮游菌落使节', glyph: '❋', portrait: '以琥珀孢囊维持人形，靠近时能听见雨声', specialty: 'biosphere', boost: 0.48, quote: '“土壤记得每一位被埋葬的王。你们的还很年轻。”', offer: { give: { oxygen: 16, food: 12 }, take: { power: 10 }, tech: '生态圈年度水耗 -1' } },
  { id: 'orri', name: '欧里·无重力', species: '轨道鲸后裔', glyph: '☾', portrait: '一团悬浮的银灰潮汐，发声时舱壁会轻轻共振', specialty: 'shipyard', boost: 0.55, quote: '“星舰的骨骼不该只记得重力，也要记得离开它。”', offer: { give: { alloy: 22, research: 8 }, take: { fuel: 8, power: 12 }, tech: '星舰推进额外 +2%' } },
  { id: 'nix', name: '尼克斯·二十七', species: '退役礼仪机', glyph: '⌘', portrait: '黄铜面孔上的旧王徽仍在缓慢闪烁', specialty: 'palace', boost: 0.4, quote: '“我曾侍奉过七位不朽君主，结果都差不多。”', offer: { give: { research: 14, power: 8 }, take: { alloy: 10 }, tech: '王城政策维护费归零' } },
  { id: 'taro', name: '塔罗·掘井者', species: '硅酸盐游牧民', glyph: '◇', portrait: '石英皮肤上刻满失落小行星的矿脉图', specialty: 'mines', boost: 0.46, quote: '“月亮不是死的，只是它把话说得很慢。”', offer: { give: { regolith: 30, fuel: 9 }, take: { oxygen: 7 }, tech: '采掘署合金产出 +1' } },
  { id: 'evi', name: '伊芙·回声', species: '声学群体', glyph: '≈', portrait: '数十条细小波纹在王冠形扬声器中彼此回答', specialty: 'leisure', boost: 0.5, quote: '“我听见你们把孤独叫作秩序，所以来收集一点。”', offer: { give: { food: 10, research: 8 }, take: { power: 9 }, tech: '娱乐区研究 +1' } },
]

const resourceMeta: Record<ResourceKey, { label: string; icon: Icon; tone: string }> = {
  power: { label: '电力', icon: Zap, tone: 'gold' }, fuel: { label: '氦燃料', icon: Fuel, tone: 'coral' }, alloy: { label: '合金', icon: Factory, tone: 'slate' }, regolith: { label: '月壤', icon: Mountain, tone: 'ochre' }, water: { label: '水', icon: Waves, tone: 'cyan' }, oxygen: { label: '氧气', icon: CircleDot, tone: 'cyan' }, food: { label: '食物', icon: Leaf, tone: 'green' }, research: { label: '研学', icon: FlaskConical, tone: 'violet' },
}

const resourceGroups: { label: string; keys: ResourceKey[] }[] = [
  { label: '能源', keys: ['power', 'fuel'] }, { label: '物质', keys: ['alloy', 'regolith'] }, { label: '生命维持', keys: ['water', 'oxygen', 'food'] }, { label: '知识', keys: ['research'] },
]
const navItems: { id: AppView; label: string; icon: Icon }[] = [
  { id: 'overview', label: '王国总览', icon: Orbit }, { id: 'facilities', label: '设施树', icon: Factory }, { id: 'palace', label: '王城政令', icon: Landmark }, { id: 'visitors', label: '异客档案', icon: Sparkles },
]

const fmt = (value: number) => Math.max(0, Math.floor(value)).toLocaleString('zh-CN')
const canPay = (bank: Resources, price: Partial<Resources>) => Object.entries(price).every(([key, value]) => bank[key as ResourceKey] >= (value ?? 0))
const apply = (bank: Resources, change: Partial<Resources>, direction = 1): Resources => {
  const next = { ...bank }
  Object.entries(change).forEach(([key, value]) => { next[key as ResourceKey] = Math.max(0, next[key as ResourceKey] + direction * (value ?? 0)) })
  return next
}
const resourceText = (bundle: Partial<Resources>) => Object.entries(bundle).map(([key, value]) => `${resourceMeta[key as ResourceKey].label} ${value}`).join('、')

function App() {
  const [resources, setResources] = useState<Resources>(initialResources)
  const [regions, setRegions] = useState(regionTemplate)
  const [year, setYear] = useState(1)
  const [isRunning, setRunning] = useState(true)
  const [view, setView] = useState<AppView>('overview')
  const [selected, setSelected] = useState<RegionId>('energy')
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [roster, setRoster] = useState<Visitor[]>([])
  const [assigned, setAssigned] = useState<Record<RegionId, string | undefined>>({ energy: undefined, mines: undefined, biosphere: undefined, habitats: undefined, palace: undefined, leisure: undefined, exchange: undefined, shipyard: undefined })
  const [techs, setTechs] = useState<string[]>([])
  const [policy, setPolicy] = useState<'ration' | 'mandate' | 'festival'>('ration')
  const [log, setLog] = useState<string[]>(['纪元 01：月面行宫已就位，御座号的第一根龙骨等待铸造。'])
  const [menuOpen, setMenuOpen] = useState(false)
  const [artOpen, setArtOpen] = useState(false)

  const selectedRegion = regions.find(region => region.id === selected)!
  const selectedCost = Object.fromEntries(Object.entries(selectedRegion.cost).map(([key, value]) => [key, (value ?? 0) * (selectedRegion.level + 1)])) as Partial<Resources>
  const palaceLevel = regions.find(region => region.id === 'palace')!.level
  const habitatLevel = regions.find(region => region.id === 'habitats')!.level
  const shipLevel = regions.find(region => region.id === 'shipyard')!.level
  const completed = year >= 100

  const yearlyNet = useMemo(() => {
    const net: Partial<Resources> = {}
    const habitatBonus = 1 + habitatLevel * 0.04
    const policyBonus = policy === 'mandate' ? 1.16 : policy === 'festival' ? 1.06 : 1
    regions.forEach(region => {
      if (!region.level) return
      const worker = roster.find(item => item.id === assigned[region.id])
      const workerBonus = worker?.specialty === region.id ? 1 + worker.boost : 1
      Object.entries(region.yields).forEach(([key, amount]) => {
        const base = amount ?? 0
        const value = base * region.level * (base > 0 ? habitatBonus * policyBonus * workerBonus : 1)
        net[key as ResourceKey] = (net[key as ResourceKey] ?? 0) + value
      })
    })
    if (policy === 'ration') net.food = (net.food ?? 0) + 1
    if (techs.some(tech => tech.includes('日冕'))) net.power = (net.power ?? 0) + 2
    if (techs.some(tech => tech.includes('生态'))) net.water = (net.water ?? 0) + 1
    return net
  }, [regions, roster, assigned, habitatLevel, policy, techs])

  const shipProgress = Math.min(100, Math.round(shipLevel * 17 + (techs.some(tech => tech.includes('星舰')) ? 8 : 0) + Math.min(20, resources.research / 10)))
  const score = Math.round(shipProgress * 8 + regions.reduce((sum, region) => sum + region.level * 12, 0) + roster.length * 25)
  const writeLog = (line: string) => setLog(previous => [line, ...previous].slice(0, 5))

  const chooseVisitor = () => {
    const available = visitors.filter(item => !roster.some(member => member.id === item.id))
    if (available.length) setVisitor(available[Math.floor(Math.random() * available.length)])
  }
  const advanceYear = () => {
    if (completed) return
    const nextYear = year + 1
    setResources(previous => apply(previous, yearlyNet))
    setYear(nextYear)
    if (!visitor && (nextYear % 8 === 0 || Math.random() < 0.16)) chooseVisitor()
    if (nextYear === 100) writeLog('纪元 100：百年王诏到期。御座号的完成度将成为此局国祚。')
  }
  useEffect(() => {
    if (!isRunning || completed) return
    const timer = window.setInterval(advanceYear, 1250)
    return () => window.clearInterval(timer)
  // The interval intentionally observes current game state after each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, completed, year, yearlyNet, visitor])

  const selectFacility = (id: RegionId) => { setSelected(id); setView('facilities') }
  const upgrade = (id: RegionId) => {
    const region = regions.find(item => item.id === id)!
    const cost = Object.fromEntries(Object.entries(region.cost).map(([key, value]) => [key, (value ?? 0) * (region.level + 1)])) as Partial<Resources>
    if (year < region.unlock || region.level >= region.max) return
    if (!canPay(resources, cost)) { writeLog(`纪元 ${String(year).padStart(2, '0')}：${region.name}的扩建诏令因库存不足被退回。`); return }
    setResources(previous => apply(previous, cost, -1))
    setRegions(previous => previous.map(item => item.id === id ? { ...item, level: item.level + 1 } : item))
    writeLog(`纪元 ${String(year).padStart(2, '0')}：${region.name}升为第 ${region.level + 1} 阶。`)
  }
  const acceptTrade = () => {
    if (!visitor || !canPay(resources, visitor.offer.take)) return
    setResources(previous => apply(apply(previous, visitor.offer.take, -1), visitor.offer.give))
    if (visitor.offer.tech) setTechs(previous => previous.includes(visitor.offer.tech!) ? previous : [...previous, visitor.offer.tech!])
    writeLog(`纪元 ${String(year).padStart(2, '0')}：与${visitor.name}完成交换${visitor.offer.tech ? `，取得「${visitor.offer.tech}」` : ''}。`)
    setVisitor(null)
  }
  const employ = () => {
    if (!visitor) return
    setRoster(previous => [...previous, visitor])
    setAssigned(previous => ({ ...previous, [visitor!.specialty]: visitor!.id }))
    writeLog(`纪元 ${String(year).padStart(2, '0')}：${visitor.name}宣誓效忠，入职${regions.find(region => region.id === visitor!.specialty)?.name}。`)
    setVisitor(null)
  }
  const dismiss = () => { if (visitor) writeLog(`纪元 ${String(year).padStart(2, '0')}：${visitor.name}离开了月面。对方的信标仍会在未来重现。`); setVisitor(null) }

  return <main className="app-shell">
    <header className="site-header">
      <div className="brand-block"><div className="brand-seal"><Crown size={23} /></div><div><p>月面主权局 · 100年封闭试验</p><h1>月冠纪元</h1></div></div>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开导航菜单"><Menu size={19} /></button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="游戏主导航">{navItems.map(item => { const NavIcon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setMenuOpen(false) }}><NavIcon size={16} />{item.label}</button> })}</nav>
      <div className="reign-control"><span>御历</span><strong>{String(Math.min(year, 100)).padStart(3, '0')}</strong><small>/ 100</small><button onClick={() => setRunning(!isRunning)} aria-label={isRunning ? '暂停纪元' : '恢复纪元'}>{isRunning ? <Pause size={15} /> : <Play size={15} />}{isRunning ? '暂停' : '恢复'}</button></div>
    </header>

    <section className="resource-rail" aria-label="王国库存">
      {resourceGroups.map(group => <div className="resource-group" key={group.label}><span className="group-label">{group.label}</span>{group.keys.map(key => { const meta = resourceMeta[key]; const ResourceIcon = meta.icon; const net = yearlyNet[key] ?? 0; return <div className="resource" key={key}><ResourceIcon className={meta.tone} size={17} /><div><small>{meta.label}</small><strong>{fmt(resources[key])}</strong></div><em className={net < 0 ? 'negative' : ''}>{net >= 0 ? '+' : ''}{net.toFixed(1)}/年</em></div> })}</div>)}
    </section>

    {visitor && <section className="diplomatic-letter" aria-live="polite"><div className="letter-symbol">{visitor.glyph}</div><div className="letter-copy"><span>外交来函 · {visitor.species}</span><strong>{visitor.name}正在静候回音</strong><small>索取：{resourceText(visitor.offer.take)}，回赠：{resourceText(visitor.offer.give)}</small></div><div className="letter-actions"><button onClick={dismiss}>礼送</button><button onClick={acceptTrade} disabled={!canPay(resources, visitor.offer.take)}>交换</button><button className="primary" onClick={employ}>留任</button></div><button className="letter-close" onClick={dismiss} aria-label="关闭来函"><X size={16} /></button></section>}

    <section className="page-content">
      {view === 'overview' && <Overview regions={regions} log={log} shipProgress={shipProgress} score={score} visitor={visitor} selectFacility={selectFacility} onViewFacilities={() => setView('facilities')} />}
      {view === 'facilities' && <Facilities regions={regions} selected={selected} year={year} roster={roster} assigned={assigned} selectedRegion={selectedRegion} selectedCost={selectedCost} resources={resources} yearlyNet={yearlyNet} onSelect={setSelected} onUpgrade={upgrade} onAssignment={(visitorId) => setAssigned(previous => ({ ...previous, [selectedRegion.id]: visitorId }))} />}
      {view === 'palace' && <Palace policy={policy} palaceLevel={palaceLevel} techs={techs} onPolicy={setPolicy} onSelectPalace={() => selectFacility('palace')} />}
      {view === 'visitors' && <Visitors roster={roster} assigned={assigned} regions={regions} visitor={visitor} onSelect={selectFacility} onAssignment={(regionId, visitorId) => setAssigned(previous => ({ ...previous, [regionId]: visitorId }))} />}
    </section>

    <footer className="command-deck"><div className="scoreline"><span>国祚评分</span><strong>{score}</strong><small>星舰进度权重最高</small></div><p>{completed ? `百年试验完毕。御座号完成 ${shipProgress}%，最终国祚评分 ${score}。` : '每 1.25 秒为一御历，资源自动结算。暂停后可从容审阅每一项诏令。'}</p><button className="advance-year" onClick={advanceYear} disabled={completed}>推进一岁 <ArrowUpRight size={17} /></button><button className="art-button" onClick={() => setArtOpen(!artOpen)}>素材提示词</button></footer>
    {artOpen && <section className="art-brief"><button onClick={() => setArtOpen(false)} aria-label="关闭素材提示"><X size={16} /></button><span>静态美术素材提示词，不含生成图像</span><p>“lunar royal colony command deck, titanium ceremonial architecture buried in moon regolith, restrained brass royal insignia, hard sunlight, blue grey shadows, Chinese sci-fi court ritual, isometric game asset, no text, no people, high-detail matte painting”</p></section>}
  </main>
}

function Overview({ regions, log, shipProgress, score, visitor, selectFacility, onViewFacilities }: { regions: Region[]; log: string[]; shipProgress: number; score: number; visitor: Visitor | null; selectFacility: (id: RegionId) => void; onViewFacilities: () => void }) {
  const built = regions.filter(region => region.level > 0).length
  return <div className="overview-grid">
    <section className="welcome-panel"><span className="eyebrow">第一个百年 · 统治摘要</span><h2>将一块无人认领的月壤<br />编译成可远航的王国。</h2><p>你既是月球的君主，也是维生系统的最后一位运维者。每一项繁荣，都需在氧气、秩序与离开家园之间签署。</p><div className="overview-actions"><button className="primary-action" onClick={onViewFacilities}>审阅设施树 <ChevronRight size={17} /></button><span><b>{built}</b> / {regions.length} 座设施已启动</span></div></section>
    <section className="ship-card"><div><span className="eyebrow">御座号 · 巨型星舰工程</span><strong>{shipProgress}<small>%</small></strong><p>国祚评分 {score}</p></div><Rocket size={54} strokeWidth={1.25} /><div className="ship-progress"><i style={{ width: `${shipProgress}%` }} /></div></section>
    <section className="overview-facilities"><div className="section-heading"><div><span className="eyebrow">殖民地轮廓</span><h3>本期重点设施</h3></div><button onClick={onViewFacilities}>完整设施树 <ChevronRight size={16} /></button></div><div className="facility-summary">{regions.slice(0, 5).map(region => { const RegionIcon = region.icon; return <button key={region.id} onClick={() => selectFacility(region.id)}><span className={region.level ? 'ready' : ''}><RegionIcon size={20} /></span><b>{region.name}</b><small>{region.level ? `等级 ${region.level}/${region.max}` : `御历 ${region.unlock} 解锁`}</small></button> })}</div></section>
    <section className="chronicle-panel"><span className="eyebrow">月面纪事</span>{log.slice(0, 3).map((entry, index) => <p key={index}>{entry}</p>)}</section>
    <section className="signal-panel"><span className="eyebrow">深空信号</span>{visitor ? <><div className="signal-being">{visitor.glyph}</div><h3>{visitor.name}</h3><p>{visitor.quote}</p><small>外交来函已置于顶栏，选择交换、留任或礼送。</small></> : <><div className="signal-being quiet"><Orbit size={27} /></div><h3>暂无线报</h3><p>未知的信标仍在静海上空巡弋。</p><small>每位异客只会以自身的需求与专长抵达。</small></>}</section>
  </div>
}

function Facilities({ regions, selected, year, roster, assigned, selectedRegion, selectedCost, resources, yearlyNet, onSelect, onUpgrade, onAssignment }: { regions: Region[]; selected: RegionId; year: number; roster: Visitor[]; assigned: Record<RegionId, string | undefined>; selectedRegion: Region; selectedCost: Partial<Resources>; resources: Resources; yearlyNet: Partial<Resources>; onSelect: (id: RegionId) => void; onUpgrade: (id: RegionId) => void; onAssignment: (visitorId: string | undefined) => void }) {
  const selectedWorker = roster.find(item => item.id === assigned[selectedRegion.id])
  const SelectIcon = selectedRegion.icon
  const parents = selectedRegion.parentIds.map(id => regions.find(region => region.id === id)?.name).filter(Boolean)
  const workerChoices = roster.filter(item => item.specialty === selectedRegion.id)
  return <div className="facilities-layout">
    <section className="facility-tree-panel"><div className="section-heading"><div><span className="eyebrow">殖民地设施树</span><h2>静海王国的发展路径</h2></div><p>连线仅显示建设逻辑，实际解锁仍以御历为准。</p></div><div className="tree-scroll"><div className="tree-canvas">
      <svg className="tree-lines" viewBox="0 0 1000 560" aria-hidden="true">{regions.flatMap(region => region.parentIds.map(parentId => { const parent = regions.find(item => item.id === parentId)!; const locked = year < region.unlock; const ready = region.level > 0; return <path key={`${parentId}-${region.id}`} className={ready ? 'built' : locked ? 'locked' : 'available'} d={`M ${parent.position.x * 10 + 75} ${parent.position.y * 5.6 + 34} C ${(parent.position.x * 10 + region.position.x * 10) / 2} ${parent.position.y * 5.6 + 34}, ${(parent.position.x * 10 + region.position.x * 10) / 2} ${region.position.y * 5.6 + 34}, ${region.position.x * 10 - 74} ${region.position.y * 5.6 + 34}`} /> }))}</svg>
      {regions.map(region => { const RegionIcon = region.icon; const locked = year < region.unlock; const worker = roster.find(item => item.id === assigned[region.id]); const state = locked ? 'locked' : region.level ? 'built' : 'available'; return <button key={region.id} className={`facility-node ${state} ${selected === region.id ? 'selected' : ''}`} style={{ left: `${region.position.x}%`, top: `${region.position.y}%` }} onClick={() => onSelect(region.id)}><span className="node-icon">{locked ? <LockKeyhole size={20} /> : <RegionIcon size={22} />}</span><span className="node-copy"><b>{region.name}</b><small>{locked ? `御历 ${region.unlock} 解锁` : `等级 ${region.level}/${region.max}`}</small></span>{worker && <span className="node-worker" title={`${worker.name}正在执勤`}>{worker.glyph}</span>}</button> })}
    </div></div><div className="tree-legend"><span><i className="built" />已建成</span><span><i className="available" />可规划</span><span><i className="locked" />御历未至</span></div></section>
    <aside className="inspector"><div className="inspector-head"><span className="facility-icon"><SelectIcon size={23} /></span><div><span className="eyebrow">设施检查器</span><h2>{selectedRegion.name}</h2><p>{selectedRegion.subtitle}</p></div></div><p className="inspector-description">{selectedRegion.note}</p><div className="stat-block"><span>年度结算</span><div>{Object.entries(selectedRegion.yields).map(([key, value]) => { const meta = resourceMeta[key as ResourceKey]; const ResourceIcon = meta.icon; return <b key={key} className={(value ?? 0) < 0 ? 'cost' : ''}><ResourceIcon size={13} />{(value ?? 0) > 0 ? '+' : ''}{value}</b> })}</div></div><div className="stat-block"><span>扩建至第 {selectedRegion.level + 1} 阶</span><div>{Object.entries(selectedCost).map(([key, value]) => { const meta = resourceMeta[key as ResourceKey]; const ResourceIcon = meta.icon; return <b key={key}><ResourceIcon size={13} />{fmt(value ?? 0)}</b> })}</div></div><div className="path-note"><Orbit size={15} /><span>{parents.length ? `发展路径：${parents.join('、')} → 本设施` : '发展路径：殖民地基础设施'}</span></div>{selectedWorker ? <div className="worker-card"><span>{selectedWorker.glyph}</span><div><b>{selectedWorker.name} 正在执勤</b><small>专属区域年产出 +{Math.round(selectedWorker.boost * 100)}%</small></div><button onClick={() => onAssignment(undefined)}>待命</button></div> : workerChoices.length ? <div className="worker-card"><span>{workerChoices[0].glyph}</span><div><b>{workerChoices[0].name} 可派驻</b><small>专属区域年产出 +{Math.round(workerChoices[0].boost * 100)}%</small></div><button onClick={() => onAssignment(workerChoices[0].id)}>派驻</button></div> : null}<button className="upgrade-button" onClick={() => onUpgrade(selectedRegion.id)} disabled={year < selectedRegion.unlock || selectedRegion.level >= selectedRegion.max || !canPay(resources, selectedCost)}>{year < selectedRegion.unlock ? `御历 ${selectedRegion.unlock} 才可颁建` : selectedRegion.level >= selectedRegion.max ? '已至现行最高阶' : `签发扩建诏令 · 年净值 ${Object.values(yearlyNet).filter(Boolean).length} 项`}</button></aside>
  </div>
}

function Palace({ policy, palaceLevel, techs, onPolicy, onSelectPalace }: { policy: 'ration' | 'mandate' | 'festival'; palaceLevel: number; techs: string[]; onPolicy: (policy: 'ration' | 'mandate' | 'festival') => void; onSelectPalace: () => void }) {
  const policies = [{ id: 'ration' as const, name: '配给法典', level: 1, detail: '食物 +1/年', icon: Leaf }, { id: 'mandate' as const, name: '机器总动员', level: 2, detail: '正向产出 +16%', icon: Bot }, { id: 'festival' as const, name: '失重庆典', level: 3, detail: '正向产出 +6%', icon: Theater }]
  return <div className="palace-layout"><section className="palace-hero"><div className="palace-mark"><Crown size={48} /></div><span className="eyebrow">钛金王城 · 皇家运行系统</span><h2>以算法签字，<br />以氧气执行。</h2><p>王城不是装饰。它将统治翻译为稳定的制度增益，并决定月民是否愿意留在这片没有故乡的土地。</p><button onClick={onSelectPalace}>审阅王城设施 <ChevronRight size={17} /></button></section><section className="policy-board"><div className="section-heading"><div><span className="eyebrow">可签发政令</span><h2>王城等级 {palaceLevel}/3</h2></div><p>同一时间只能实行一项政策。</p></div><div className="policy-cards">{policies.map(item => { const PolicyIcon = item.icon; const unlocked = palaceLevel >= item.level; return <button key={item.id} disabled={!unlocked} className={`${policy === item.id ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`} onClick={() => onPolicy(item.id)}><span><PolicyIcon size={22} /></span><div><small>{unlocked ? `王城 ${item.level} 级已授权` : `王城 ${item.level} 级解锁`}</small><h3>{item.name}</h3><p>{item.detail}</p></div>{policy === item.id && <Check size={18} />}</button> })}</div></section><section className="tech-cabinet"><span className="eyebrow">档案柜 · 已获技术</span>{techs.length ? techs.map(tech => <p key={tech}><FlaskConical size={15} />{tech}</p>) : <p className="empty-tech">尚无外星技术入库。接待来自深空的异客以扩充王室档案。</p>}</section></div>
}

function Visitors({ roster, assigned, regions, visitor, onSelect, onAssignment }: { roster: Visitor[]; assigned: Record<RegionId, string | undefined>; regions: Region[]; visitor: Visitor | null; onSelect: (id: RegionId) => void; onAssignment: (regionId: RegionId, visitorId: string | undefined) => void }) {
  return <div className="visitor-layout"><section className="visitor-hero"><span className="eyebrow">异客留任簿 · {roster.length}/6</span><h2>陌生人不是资源。<br />他们只是懂得让资源更好地工作。</h2><p>每一位来访者都有独立的族群、需求与专属领域。选择留任后，他们将持续改变一座设施的产出。</p>{visitor && <div className="pending-visitor"><span>{visitor.glyph}</span><div><b>{visitor.name} 正在等候</b><small>{visitor.species}，请在顶部外交来函中决定去留。</small></div></div>}</section><section className="roster-board">{roster.length ? roster.map(member => { const region = regions.find(item => item.id === member.specialty)!; const RegionIcon = region.icon; const active = assigned[member.specialty] === member.id; return <article key={member.id} className={active ? 'retainer active' : 'retainer'}><div className="retainer-glyph">{member.glyph}</div><div className="retainer-copy"><span>{member.species}</span><h3>{member.name}</h3><p>{member.portrait}</p><button onClick={() => onSelect(member.specialty)}><RegionIcon size={14} />{region.name}</button></div><div className="retainer-duty"><b>+{Math.round(member.boost * 100)}%</b><small>专属区域产出</small><button onClick={() => onAssignment(member.specialty, active ? undefined : member.id)}>{active ? '改为待命' : '安排执勤'}</button></div></article> }) : <div className="empty-roster"><Sparkles size={27} /><h3>留任簿仍为空白</h3><p>信标会随机抵达。交换可取得技术，留任则会带来长期区域增益。</p></div>}</section></div>
}

export default App
