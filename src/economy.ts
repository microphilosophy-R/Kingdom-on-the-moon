export type ResourceKey =
  | 'power'
  | 'water'
  | 'oxygen'
  | 'biomass'
  | 'regolith'
  | 'alloy'
  | 'quantumCore'
  | 'currency'
  | 'population'
  | 'knowledge'
  | 'luxury'

export type Resources = Record<ResourceKey, number>

export type ResourceCategory = 'energy' | 'life' | 'matter' | 'society' | 'science' | 'culture'

export type ResourceSpec = {
  label: string
  category: ResourceCategory
  source: string
  coreUse: string
  deficit: string
  tradeRule: string
  autoBuyRule: string
  tradable: boolean
  storable: boolean
  reserveFloor: number
  weight: number
}

export type FacilityId = 'E1' | 'E2' | 'E3' | 'C1' | 'C2' | 'B' | 'F' | 'P' | 'R' | 'S' | 'K' | 'L' | 'H' | 'M' | 'D'
export type FacilityRole = 'energy' | 'extraction' | 'life' | 'industry' | 'ecology' | 'trade' | 'government' | 'research' | 'culture' | 'habitat' | 'ship'
export type ProductionMethodId = `M${FacilityId}-${number}`
export type TechnologyId = `T${string}-${number}`

export type FacilityPhase = {
  name: string
  note: string
}

export type ProductionMethod = {
  id: ProductionMethodId
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
  unlockedBy?: TechnologyId
  condition?: string
  autoSelect?: boolean
  note: string
}

export type TechnologySpec = {
  id: TechnologyId
  name: string
  scope: FacilityId | 'G'
  category?: 'construction' | 'production-method' | 'facility-efficiency' | 'global' | 'trade'
  era?: 'early' | 'mid' | 'late'
  alien?: boolean
  prerequisites?: TechnologyId[]
  unlocksFacility?: FacilityId
  unlocks?: ProductionMethodId
  value?: number
  researchCost?: number
  note: string
}

export type FacilityEconomySpec = {
  id: FacilityId
  code: FacilityId
  name: string
  subtitle: string
  role: FacilityRole
  unlockYear: number
  requiredTech?: TechnologyId
  maxLevel: number
  baseUpgradeCost: Partial<Resources>
  yieldGrowth: number
  priority: number
  reserveFloor: Partial<Resources>
  interfaceDuty: string
  note: string
  productionMethods: ProductionMethod[]
  phaseNotes?: FacilityPhase[]
}

export type FacilityState = {
  id: FacilityId
  level: number
}

export type FacilityModifiers = {
  outputMultiplier?: number
  upkeepMultiplier?: number
}

export type AnnualContext = {
  facilities: Record<FacilityId, FacilityState>
  facilityLevels?: Partial<Record<FacilityId, number>>
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  techs?: string[]
  productionMethods?: Partial<Record<FacilityId, ProductionMethodId>>
}

export type AutomationAction = {
  id: FacilityId
  fromLevel: number
  toLevel: number
  technologyUnlocks?: TechnologyId[]
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  trades?: AutoTrade[]
  projectedResources: Resources
}

export type TechnologyAutomationAction = {
  techId: TechnologyId
  name: string
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  trades?: AutoTrade[]
  unlocksFacility?: FacilityId
  projectedResources: Resources
}

export type AutomationPlan = {
  mode: 'auto' | 'manual'
  reason?: string
  actions: AutomationAction[]
  technologyActions: TechnologyAutomationAction[]
  targetLevels: Record<FacilityId, number>
  weightedProfit: number
  projectedResources: Resources
}

export type StarportTradeOffer = {
  id: string
  unlockTech: TechnologyId
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
  note: string
  automated?: boolean
}

export type AutoTrade = {
  offerId: string
  name: string
  input: Partial<Resources>
  output: Partial<Resources>
}

export type PopulationPolicy = 'ration' | 'mandate' | 'festival'

export type PopulationProjection = {
  capacity: number
  availableCapacity: number
  residentsByFacility: Partial<Record<FacilityId, number>>
  facilityNet: Partial<Record<FacilityId, Partial<Resources>>>
  lifeSupportCost: Partial<Resources>
  lifeSupportRatio: number
  growthPotential: number
  migrationIn: number
  attrition: number
  nextPressureDays: number
  net: Partial<Resources>
  status: 'stable' | 'full' | 'strained'
}

export type PopulationContext = {
  resources: Resources
  facilities: Record<FacilityId, FacilityState>
  policy: PopulationPolicy
  techs?: string[]
  pressureDays?: number
}

export type ShipProjectStage = {
  id: 1 | 2 | 3
  name: string
  input: Partial<Resources>
  note: string
}

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

export const isHousingFacility = (id: FacilityId) => Boolean(housingCapacityPerLevel[id])

export const getFacilityWorkCapacity = (id: FacilityId, level: number) =>
  isHousingFacility(id) ? 0 : Math.max(0, level) * jobsPerFacilityLevel

export const getHousingCapacity = (id: FacilityId, level: number) =>
  Math.max(0, level) * (housingCapacityPerLevel[id] ?? 0)

export const getConstructionDays = (techs: string[] = []) => {
  const reduction = (hasTech(techs, 'TG-1') ? 0.05 : 0) + (hasTech(techs, 'TG-3') ? 0.10 : 0)
  return Math.max(Math.ceil(baseConstructionDays * 0.5), Math.ceil(baseConstructionDays * (1 - reduction)))
}

export const getConstructionCostDiscount = (techs: string[] = []) =>
  hasTech(techs, 'TG-3') ? 0.95 : 1

const getUpgradeCostScale = (id: FacilityId) => {
  if (id === 'K') return 2
  if (id === 'H') return 4
  if (id === 'M') return 6
  return jobsPerFacilityLevel
}

export const resourceOrder: ResourceKey[] = [
  'power',
  'water',
  'oxygen',
  'biomass',
  'regolith',
  'alloy',
  'quantumCore',
  'currency',
  'population',
  'knowledge',
  'luxury',
]

export const emptyResources = (): Resources => ({
  power: 0,
  water: 0,
  oxygen: 0,
  biomass: 0,
  regolith: 0,
  alloy: 0,
  quantumCore: 0,
  currency: 0,
  population: 0,
  knowledge: 0,
  luxury: 0,
})

export type ResourceFlow = {
  production: Resources
  consumption: Resources
  net: Resources
}

export const resourceMeta: Record<ResourceKey, ResourceSpec> = {
  power: {
    label: '电力',
    category: 'energy',
    source: '日冕能源署光伏阵列、月冕能源署聚变堆、归元装置黑洞约束',
    coreUse: '经济基石。维持设施运转，不可存储、不可交易。陈林每天看的第一组数字。',
    deficit: '设施按优先级降载，投入与产出同步缩减。月面先暗下来的是工业，最后暗的是维生。',
    tradeRule: '不可交易，不进入库存模拟。',
    autoBuyRule: '不参与自动购买。',
    tradable: false,
    storable: false,
    reserveFloor: 12,
    weight: 4.2,
  },
  water: {
    label: '水',
    category: 'life',
    source: '静海采掘署、西海采掘署、月穹生态环、星海交易港',
    coreUse: '生命维持、人口供给与生态改造。月面上最贵的液体。',
    deficit: '人口下降，相关建筑重新调整直到恢复盈余。水断了，人就开始走。',
    tradeRule: '可交易，可由交易港补充。',
    autoBuyRule: '低于安全线时允许自动补入。',
    tradable: true,
    storable: true,
    reserveFloor: 8,
    weight: 2.2,
  },
  oxygen: {
    label: '氧气',
    category: 'life',
    source: '水培生态球、天工精炼署、日冕能源署、伊犁河谷、月穹生态环、星海交易港',
    coreUse: '生命维持与生产。月面上每一口氧气都是造出来的。',
    deficit: '人口下降，相关建筑重新调整直到恢复盈余。',
    tradeRule: '可交易，可由交易港补充。',
    autoBuyRule: '低于安全线时允许自动补入。',
    tradable: true,
    storable: true,
    reserveFloor: 10,
    weight: 2.5,
  },
  biomass: {
    label: '生物质',
    category: 'life',
    source: '水培生态球、伊犁河谷、月穹生态环、星海交易港',
    coreUse: '生命维持、人口供给与生产。控制人口增长的关键阀门。',
    deficit: '人口下降，相关建筑重新调整直到恢复盈余。',
    tradeRule: '可交易，可由交易港补充。',
    autoBuyRule: '低于安全线时允许自动补入。',
    tradable: true,
    storable: true,
    reserveFloor: 8,
    weight: 2.0,
  },
  regolith: {
    label: '月壤',
    category: 'matter',
    source: '静海采掘署、西海采掘署、星海交易港',
    coreUse: '初级工业品、前期贸易出口与基础建设。月面脚下的灰土，什么都有一点，什么都不多。',
    deficit: '相关生产建筑停止运行，直到恢复盈余。',
    tradeRule: '可交易；后期因消耗增大可逐渐成为进口资源。',
    autoBuyRule: '可由交易港按最低线补足。',
    tradable: true,
    storable: true,
    reserveFloor: 12,
    weight: 1.2,
  },
  alloy: {
    label: '合金',
    category: 'matter',
    source: '天工精炼署、西海采掘署、伊犁河谷、星海交易港',
    coreUse: '中级工业品、星舰与后期高级设施材料。御座号的龙骨就是用这些合金焊起来的。',
    deficit: '相关生产建筑停止运行，直到恢复盈余。',
    tradeRule: '可交易，是中期重要出口资源。',
    autoBuyRule: '低于安全线时优先补足。',
    tradable: true,
    storable: true,
    reserveFloor: 10,
    weight: 2.8,
  },
  quantumCore: {
    label: '量子计算核心',
    category: 'science',
    source: '问天研究实验室、星海交易港',
    coreUse: '高级工业品、后期高级建筑与星舰材料。御座号王座核心最稀缺的那块骨头。',
    deficit: '相关高阶建筑停止运行，直到恢复盈余。',
    tradeRule: '可交易，是后期高价值资源。',
    autoBuyRule: '仅在交易港有库存与货币时补入。',
    tradable: true,
    storable: true,
    reserveFloor: 2,
    weight: 4.8,
  },
  currency: {
    label: '星海货币',
    category: 'society',
    source: '月面王城税收、天工精炼署重原子炼金',
    coreUse: '星海交易港结算货币。陈林签字签出来的东西。',
    deficit: '自动购买暂停，恢复盈余后继续交易。',
    tradeRule: '不作为普通商品流通，只作为贸易结算。',
    autoBuyRule: '余额不足时暂停自动购买。',
    tradable: false,
    storable: true,
    reserveFloor: 6,
    weight: 2.6,
  },
  population: {
    label: '人口',
    category: 'society',
    source: '月面王城、翡翠宫、新月府、星海交易港',
    coreUse: '居民总数与劳动力总量。住进来的人都知道王上走不了，但他们自己半年后可以走。',
    deficit: '建筑吞吐率按比例收缩。',
    tradeRule: '不是普通库存品；解锁 TS-1 星际劳工后可在交易港处理人力资源双向贸易。',
    autoBuyRule: '不自动购买。',
    tradable: true,
    storable: true,
    reserveFloor: 10,
    weight: 3.6,
  },
  knowledge: {
    label: '知识',
    category: 'science',
    source: '问天研究实验室、星海交易港',
    coreUse: '解锁更先进的科技。月面上唯一能让陈林觉得"在进步"的东西。',
    deficit: '不会直接停产，但会阻断科技推进。',
    tradeRule: '解锁 TS-2 知识传输协议后可在交易港处理知识双向贸易。',
    autoBuyRule: '默认不自动购买。',
    tradable: false,
    storable: true,
    reserveFloor: 0,
    weight: 4.0,
  },
  luxury: {
    label: '艺术奢侈品',
    category: 'culture',
    source: '翡翠宫、星海交易港',
    coreUse: '外星人需求、贸易与外交。',
    deficit: '部分外星人事件无法满足，贸易收益下降。',
    tradeRule: '解锁 TS-3 玫瑰星球后可在交易港处理艺术奢侈品双向贸易。',
    autoBuyRule: '低优先级自动购买。',
    tradable: true,
    storable: true,
    reserveFloor: 0,
    weight: 1.8,
  },
}

export const resourceGroups: { label: string; keys: ResourceKey[] }[] = [
  { label: '能源', keys: ['power'] },
  { label: '生命维持', keys: ['water', 'oxygen', 'biomass', 'population'] },
  { label: '工业', keys: ['regolith', 'alloy', 'quantumCore'] },
  { label: '秩序', keys: ['currency', 'knowledge'] },
  { label: '文化', keys: ['luxury'] },
]

export const defaultReserveFloors: Resources = {
  power: 12,
  water: 8,
  oxygen: 10,
  biomass: 8,
  regolith: 12,
  alloy: 10,
  quantumCore: 2,
  currency: 6,
  population: 10,
  knowledge: 0,
  luxury: 0,
}

export const resourceWeights: Resources = {
  power: 0.5,
  water: 1.0,
  oxygen: 1.0,
  biomass: 1.0,
  regolith: 1.0,
  alloy: 8.0,
  quantumCore: 128.0,
  currency: 1.0,
  population: 5.0,
  knowledge: 2.0,
  luxury: 3.0,
}

const eraPopulationScale: Record<NonNullable<TechnologySpec['era']>, number> = {
  early: 5,
  mid: 20,
  late: 50,
}

const globalTechnologyScale: Record<NonNullable<TechnologySpec['era']>, number> = {
  early: 20,
  mid: 200,
  late: 700,
}

const technologyMagnitude = (tech: TechnologySpec) => {
  if (tech.category === 'construction') return 0
  if (tech.category === 'global') return 0.01
  if (tech.category === 'facility-efficiency') return 0.05
  if (tech.category === 'production-method') return 0.08
  if (tech.category === 'trade') return 0.04
  return 0.03
}

const technologyBaseScale = (tech: TechnologySpec) => {
  const era = tech.era ?? 'early'
  return tech.scope === 'G' ? globalTechnologyScale[era] : eraPopulationScale[era]
}

export const estimateTechnologyValue = (tech: TechnologySpec) =>
  Math.round(technologyBaseScale(tech) * technologyMagnitude(tech) * 360)

export const estimateTechnologyResearchCost = (tech: TechnologySpec) =>
  tech.category === 'construction' ? 0 : Math.max(8, Math.round(estimateTechnologyValue(tech) / 12))

export const technologyCatalog: Record<TechnologyId, TechnologySpec> = {
  'TE1-0': {
    id: 'TE1-0',
    name: '日冕能源署建造许可',
    scope: 'E1',
    category: 'construction',
    era: 'early',
    unlocksFacility: 'E1',
    note: '解锁 E1 日冕能源署建造。初始默认具备——署里至少给了他一块光伏板。',
  },
  'TE1-1': {
    id: 'TE1-1',
    name: '纳米光催化剂',
    scope: 'E1',
    category: 'production-method',
    era: 'early',
    unlocks: 'ME1-2',
    note: '解锁 E1 可选生产方式 ME1-2。萨瓦的逆燃晶体让光伏阵列学会了吃水，额外产出氧气。',
  },
  'TE1-2': {
    id: 'TE1-2',
    name: '光伏阵列校准',
    scope: 'E1',
    category: 'facility-efficiency',
    era: 'early',
    note: 'E1 日冕能源署电力输出 +5%。把光伏阵列的角度校准到太渊的光路，多一点电，多一点活路。',
  },
  'TE2-0': {
    id: 'TE2-0',
    name: '月冕能源署建造许可',
    scope: 'E2',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'E2',
    note: '解锁 E2 月冕能源署建造。月壤烧出来的电，暖和不起来。',
  },
  'TE3-0': {
    id: 'TE3-0',
    name: '外星科技：微型黑洞约束',
    scope: 'E3',
    category: 'production-method',
    era: 'late',
    alien: true,
    unlocksFacility: 'E3',
    unlocks: 'ME3-1',
    note: '外星科技。解锁 E3 归元装置建造与 ME3-1。欧里的约束箴言把微型黑洞系在掌心——不消耗资源，代价在别处。',
  },
  'TC1-0': {
    id: 'TC1-0',
    name: '静海采掘署建造许可',
    scope: 'C1',
    category: 'construction',
    era: 'early',
    unlocksFacility: 'C1',
    note: '解锁 C1 静海采掘署建造。初始默认具备——陈林给它取了"静海"这个名字，因为述职报告需要一个地名。',
  },
  'TC1-1': {
    id: 'TC1-1',
    name: '月面钻头阵列',
    scope: 'C1',
    category: 'facility-efficiency',
    era: 'early',
    note: 'C1 静海采掘署月壤输出 +5%。钻头阵列排得更密，月面少了一块皮。',
  },
  'TC2-0': {
    id: 'TC2-0',
    name: '西海采掘署建造许可',
    scope: 'C2',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'C2',
    note: '解锁 C2 西海采掘署建造。西海是太渊引力阱内的碎屑带，陈林签远征令时在想：这名字比"碎屑带"好听。',
  },
  'TC2-1': {
    id: 'TC2-1',
    name: '小行星锚定索',
    scope: 'C2',
    category: 'facility-efficiency',
    era: 'mid',
    note: 'C2 西海采掘署合金输出 +5%，氧气消耗 +5%。锚定索让远征队挖得更深，但人也喘得更急。',
  },
  'TC2-2': {
    id: 'TC2-2',
    name: '发现伊甸园',
    scope: 'C2',
    category: 'production-method',
    era: 'mid',
    alien: true,
    unlocks: 'MC2-2',
    note: '外星科技，中期。阿缇娅的坐标核指向一颗活着的生态行星。解锁 MC2-2，远征不再消耗生命维持补给。',
  },
  'TB-0': {
    id: 'TB-0',
    name: '水培生态球建造许可',
    scope: 'B',
    category: 'construction',
    era: 'early',
    unlocksFacility: 'B',
    note: '解锁 B 水培生态球建造。月面上唯一像活物的设施。',
  },
  'TB-1': {
    id: 'TB-1',
    name: '闭环藻膜培养',
    scope: 'B',
    category: 'facility-efficiency',
    era: 'early',
    note: 'B 水培生态球生物质输出 +5%。藻膜闭环更密，少浪费一滴水。',
  },
  'TB-2': {
    id: 'TB-2',
    name: '无水栽培技术',
    scope: 'B',
    category: 'production-method',
    era: 'early',
    unlocks: 'MB-2',
    note: '早期非开局科技。梅露的干燥孢囊教会生态球吃月壤而非水——以略低价值的代价换一口气。',
  },
  'TF-0': {
    id: 'TF-0',
    name: '天工精炼署建造许可',
    scope: 'F',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'F',
    note: '解锁 F 天工精炼署建造。',
  },
  'TF-1': {
    id: 'TF-1',
    name: '重原子炼金术',
    scope: 'F',
    category: 'production-method',
    era: 'mid',
    alien: true,
    unlocks: 'MF-2',
    note: '外星科技，中期。塔罗的矿脉图上有一段炼金注释，让精炼炉从月壤里榨出星海货币。',
  },
  'TP-0': {
    id: 'TP-0',
    name: '伊犁河谷建造许可',
    scope: 'P',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'P',
    note: '解锁 P 伊犁河谷建造。陈林取了一个地球河谷的名字，没人追问。',
  },
  'TP-1': {
    id: 'TP-1',
    name: '合金作物',
    scope: 'P',
    category: 'production-method',
    era: 'mid',
    alien: true,
    unlocks: 'MP-2',
    note: '外星科技，中期。合金作物在河谷里长出金属，像一颗种子记住了矿脉。',
  },
  'TR-0': {
    id: 'TR-0',
    name: '月穹生态环建造许可',
    scope: 'R',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'R',
    note: '解锁 R 月穹生态环建造。月面最庞大的工程——把没有空气的石头改成能呼吸的地方。',
  },
  'TS-0': {
    id: 'TS-0',
    name: '星海交易港建造许可',
    scope: 'S',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'S',
    note: '解锁 S 星海交易港建造。月面与外界唯一的商业接口。',
  },
  'TK-0': {
    id: 'TK-0',
    name: '月面王城建造许可',
    scope: 'K',
    category: 'construction',
    era: 'early',
    unlocksFacility: 'K',
    note: '解锁 K 月面王城建造。初始默认具备——龙椅已经在了，不需要再建。',
  },
  'TL-0': {
    id: 'TL-0',
    name: '问天研究实验室建造许可',
    scope: 'L',
    category: 'construction',
    era: 'early',
    unlocksFacility: 'L',
    note: '解锁 L 问天研究实验室建造。月面上唯一能让人觉得"在进步"的地方。',
  },
  'TL-1': {
    id: 'TL-1',
    name: '原子阵列光刻机',
    scope: 'L',
    category: 'production-method',
    era: 'late',
    unlocks: 'ML-2',
    note: '解锁 ML-2 原子阵列光刻。让实验室从产出知识变成产出量子计算核心——御座号最缺的那块骨头。',
  },
  'TL-2': {
    id: 'TL-2',
    name: '研究吞吐量调度',
    scope: 'L',
    category: 'facility-efficiency',
    era: 'mid',
    note: 'L 研究实验室电力投入 +25%，知识产出 +35%。把盈余电力灌进仪器，让它问得更快。',
  },
  'TL-3': {
    id: 'TL-3',
    name: '高能课题队列',
    scope: 'L',
    category: 'facility-efficiency',
    era: 'late',
    note: 'L 研究实验室电力投入 +50%，知识产出 +70%。与 TL-2 叠加，后期高速研究。仪器开始发烫。',
  },
  'TH-0': {
    id: 'TH-0',
    name: '翡翠宫建造许可',
    scope: 'H',
    category: 'construction',
    era: 'mid',
    unlocksFacility: 'H',
    note: '解锁 H 翡翠宫建造。月面上最不实用的设施，但产出的艺术奢侈品能卖给罗莎。',
  },
  'TM-0': {
    id: 'TM-0',
    name: '新月府建造许可',
    scope: 'M',
    category: 'construction',
    era: 'late',
    unlocksFacility: 'M',
    note: '解锁 M 新月府建造。该科技应在月穹生态环完成后取得——先让月面能呼吸，再让人住得像人。',
  },
  'TD-0': {
    id: 'TD-0',
    name: '冠冕星舰坞建造许可',
    scope: 'D',
    category: 'construction',
    era: 'late',
    unlocksFacility: 'D',
    note: '解锁 D 冠冕星舰坞建造。账面上是"垦殖成果展示项目"，实际上是御座号的船台。',
  },
  'TD-1': {
    id: 'TD-1',
    name: '舰坞总装排程',
    scope: 'D',
    category: 'facility-efficiency',
    era: 'late',
    note: 'D 冠冕星舰坞项目推进效率 +5%。总装排程更紧凑，龙骨长得更快。陈林来看的次数也更频繁。',
  },
  'TS-1': {
    id: 'TS-1',
    name: '星际劳工',
    scope: 'S',
    category: 'trade',
    era: 'mid',
    alien: true,
    note: '外星科技。尼克斯的名册带来星际劳工双向贸易权限。人不只是住进来，也可以双向贸易出去。',
  },
  'TS-2': {
    id: 'TS-2',
    name: '知识传输协议',
    scope: 'S',
    category: 'trade',
    era: 'mid',
    alien: true,
    note: '外星科技。伊芙的回声接入带来知识双向贸易权限。知识可以在星海中流通，像声波一样双向贸易。',
  },
  'TS-3': {
    id: 'TS-3',
    name: '玫瑰星球',
    scope: 'S',
    category: 'trade',
    era: 'mid',
    alien: true,
    note: '外星科技。罗莎的香料账册打开玫瑰星球航线，艺术奢侈品可以双向贸易。',
  },
  'TG-1': {
    id: 'TG-1',
    name: '天工工业软件套装',
    scope: 'G',
    category: 'global',
    era: 'mid',
    note: '全局生产效率 +1%；建筑扩大/缩小时间 -5%。天工软件让机器更勤快一点。',
  },
  'TG-2': {
    id: 'TG-2',
    name: '空间微波散热学',
    scope: 'G',
    category: 'global',
    era: 'mid',
    note: '所有建筑电力消耗 -5%。微波散热让月面上的热量少浪费一点——月面本来就够冷了。',
  },
  'TG-3': {
    id: 'TG-3',
    name: '通用建筑预制件',
    scope: 'G',
    category: 'global',
    era: 'mid',
    note: '所有建筑扩大成本 -5%；扩大/缩小时间 -10%。预制件让扩建像搭积木，但搭的还是月面上的积木。',
  },
  'TG-4': {
    id: 'TG-4',
    name: '星海会计协议',
    scope: 'G',
    category: 'global',
    era: 'mid',
    note: '交易手续费 -5%；自动购买溢价 -5%。会计协议让星海交易港少收一点过路费。',
  },
}

const technologyPrerequisites: Partial<Record<TechnologyId, TechnologyId[]>> = {
  'TE1-1': ['TE1-0'],
  'TE1-2': ['TE1-1'],
  'TB-1': ['TB-0'],
  'TB-2': ['TB-1'],
  'TC1-1': ['TC1-0'],
  'TE2-0': ['TE1-1'],
  'TC2-0': ['TC1-1', 'TB-0'],
  'TF-0': ['TC2-0', 'TE2-0'],
  'TP-0': ['TC1-1', 'TB-0'],
  'TR-0': ['TB-1', 'TP-0'],
  'TL-2': ['TL-0'],
  'TS-0': ['TK-0', 'TL-0'],
  'TH-0': ['TK-0', 'TB-1'],
  'TC2-1': ['TC2-0'],
  'TC2-2': ['TC2-0', 'TS-0'],
  'TF-1': ['TF-0', 'TS-0'],
  'TP-1': ['TP-0', 'TS-0'],
  'TS-1': ['TS-0'],
  'TS-2': ['TS-0', 'TL-2'],
  'TS-3': ['TS-0', 'TH-0'],
  'TG-1': ['TL-2', 'TF-0'],
  'TG-2': ['TE2-0', 'TL-2'],
  'TG-3': ['TF-0', 'TG-1'],
  'TG-4': ['TS-0', 'TG-1'],
  'TL-1': ['TL-2', 'TF-1'],
  'TL-3': ['TL-1', 'TG-2'],
  'TM-0': ['TR-0', 'TH-0'],
  'TD-0': ['TF-1', 'TL-1', 'TS-0'],
  'TD-1': ['TD-0', 'TG-3'],
  'TE3-0': ['TE2-0', 'TF-1', 'TL-3'],
}

Object.values(technologyCatalog).forEach(tech => {
  tech.prerequisites = technologyPrerequisites[tech.id] ?? []
  tech.value = estimateTechnologyValue(tech)
  tech.researchCost = estimateTechnologyResearchCost(tech)
})

export const defaultStartingTechs = [
  'TE1-0 日冕能源署建造许可',
  'TC1-0 静海采掘署建造许可',
  'TK-0 月面王城建造许可',
  'TB-0 Hydroponic biosphere charter',
  'TS-0 Starport charter',
]

export const hasTech = (techs: string[] = [], techId?: TechnologyId) => {
  if (!techId) return true
  const tech = technologyCatalog[techId]
  return techs.some(item => item.includes(techId) || (tech && item.includes(tech.name)))
}

export const hasRequiredFacilityTech = (spec: FacilityEconomySpec, techs: string[] = []) =>
  hasTech(techs, spec.requiredTech)

export const hasTechnologyPrerequisites = (techId: TechnologyId, techs: string[] = []) =>
  (technologyCatalog[techId].prerequisites ?? []).every(prerequisite => hasTech(techs, prerequisite))

export const canBuildFacility = (spec: FacilityEconomySpec, year: number, techs: string[] = []) => {
  void year
  return hasRequiredFacilityTech(spec, techs)
}

export const canUseProductionMethod = (method: ProductionMethod, techs: string[] = []) =>
  method.autoSelect !== false && hasTech(techs, method.unlockedBy)

export const selectProductionMethod = (
  methods: ProductionMethod[],
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
) => {
  const selectedMethod = selectedMethodId ? methods.find(method => method.id === selectedMethodId) : undefined
  if (selectedMethod && canUseProductionMethod(selectedMethod, techs)) return selectedMethod
  return methods.find(method => !method.unlockedBy && method.autoSelect !== false) ?? methods.find(method => canUseProductionMethod(method, techs)) ?? methods[0]
}

const scaleBundleResource = (bundle: Partial<Resources>, key: ResourceKey, multiplier: number) => {
  if (!bundle[key]) return
  bundle[key] = bundle[key]! * multiplier
}

const applyTechnologyToMethod = (
  spec: FacilityEconomySpec,
  method: ProductionMethod,
  techs: string[] = [],
) => {
  const input = { ...method.input }
  const output = { ...method.output }

  if (hasTech(techs, 'TG-1')) {
    resourceOrder.forEach(key => {
      if (key === 'population') return
      scaleBundleResource(output, key, 1.01)
    })
  }

  if (hasTech(techs, 'TG-2')) scaleBundleResource(input, 'power', 0.95)

  if (spec.id === 'E1' && hasTech(techs, 'TE1-2')) scaleBundleResource(output, 'power', 1.05)
  if (spec.id === 'C1' && method.id === 'MC1-1' && hasTech(techs, 'TC1-1')) scaleBundleResource(output, 'regolith', 1.05)
  if (spec.id === 'C2' && method.id === 'MC2-1' && hasTech(techs, 'TC2-1')) {
    scaleBundleResource(output, 'alloy', 1.05)
    scaleBundleResource(input, 'oxygen', 1.05)
  }
  if (spec.id === 'B' && method.id === 'MB-1' && hasTech(techs, 'TB-1')) scaleBundleResource(output, 'biomass', 1.05)
  if (spec.id === 'L' && hasTech(techs, 'TL-2')) {
    scaleBundleResource(input, 'power', 1.25)
    scaleBundleResource(output, 'knowledge', 1.35)
  }
  if (spec.id === 'L' && hasTech(techs, 'TL-3')) {
    scaleBundleResource(input, 'power', 1.5)
    scaleBundleResource(output, 'knowledge', 1.7)
  }

  return { input, output }
}

export const facilityEconomySpecs: Record<FacilityId, FacilityEconomySpec> = {
  E1: {
    id: 'E1',
    code: 'E1',
    name: '日冕能源署',
    subtitle: '太渊光伏 · 基础电力',
    role: 'energy',
    unlockYear: 0,
    requiredTech: 'TE1-0',
    maxLevel: 15,
    baseUpgradeCost: { regolith: 2, alloy: 1 },
    yieldGrowth: 0.06,
    priority: 10,
    reserveFloor: { power: 14 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '月面第一座能源设施。太渊的金光被光伏阵列截获，转化为维持殖民地的最低电力。陈林看着仪表盘上的数字，想起署里报告里写的"展示存在"。',
    productionMethods: [
      { id: 'ME1-1', name: '光伏发电', input: {}, output: { power: 6 }, note: '无资源输入，截获太渊金光输出电力。月面上唯一不需要还债的东西。' },
      { id: 'ME1-2', name: '纳米光催化发电', input: { water: 0.6 }, output: { power: 6, oxygen: 1.2 }, unlockedBy: 'TE1-1', note: 'TE1-1 解锁后，以水资源催化光反应，额外产出氧气。像在石头上逼出一口气。' },
    ],
  },
  E2: {
    id: 'E2',
    code: 'E2',
    name: '月冕能源署',
    subtitle: 'He3 聚变 · 中期电力',
    role: 'energy',
    unlockYear: 8,
    requiredTech: 'TE2-0',
    maxLevel: 12,
    baseUpgradeCost: { regolith: 3, alloy: 3, currency: 2 },
    yieldGrowth: 0.07,
    priority: 9,
    reserveFloor: { power: 16, regolith: 10 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: 'He3 聚变发电需要消耗月壤。陈林在审批扩建时曾自言自语："挖脚下的土来点火，这算不算在烧自己的船。"',
    productionMethods: [
      { id: 'ME2-1', name: 'He3 聚变发电', input: { regolith: 1.4 }, output: { power: 8 }, note: '消耗月壤，点燃聚变，输出电力。月壤烧一格少一格。' },
    ],
  },
  E3: {
    id: 'E3',
    code: 'E3',
    name: '归元装置',
    subtitle: '微型黑洞 · 外星能源',
    role: 'energy',
    unlockYear: 36,
    requiredTech: 'TE3-0',
    maxLevel: 10,
    baseUpgradeCost: { alloy: 8, quantumCore: 2, currency: 6 },
    yieldGrowth: 0.1,
    priority: 8,
    reserveFloor: { power: 12, quantumCore: 1 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '由外星科技解锁的禁忌能源。以微型黑洞压缩物质获取能量，不消耗资源。陈林第一次看到它运转时，想起封君律——有些东西不需要还债，但代价在别处。',
    productionMethods: [
      { id: 'ME3-1', name: '微型黑洞压缩', input: {}, output: { power: 10 }, unlockedBy: 'TE3-0', note: 'TE3-0 解锁。微型黑洞压缩物质输出电力，不消耗库存资源。欧里说这是轨道鲸一族的送嫁之物。' },
    ],
  },
  C1: {
    id: 'C1',
    code: 'C1',
    name: '静海采掘署',
    subtitle: '月面采掘 · 水 · 月壤',
    role: 'extraction',
    unlockYear: 0,
    requiredTech: 'TC1-0',
    maxLevel: 15,
    baseUpgradeCost: { regolith: 2, alloy: 1 },
    yieldGrowth: 0.05,
    priority: 8,
    reserveFloor: { power: 10 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '本地月面开采设施。静海是月面上一片平坦的灰色尘壤盆地，陈林给它起的名——他需要一个看起来像地名的东西写进述职报告。',
    productionMethods: [
      { id: 'MC1-1', name: '静海月面采掘', input: { power: 1 }, output: { water: 1.1, regolith: 4.2 }, note: '静海表示在本地月面开采。消耗电力，从尘壤中榨出水和月壤。' },
    ],
  },
  C2: {
    id: 'C2',
    code: 'C2',
    name: '西海采掘署',
    subtitle: '小行星带远征 · 合金',
    role: 'extraction',
    unlockYear: 10,
    requiredTech: 'TC2-0',
    maxLevel: 12,
    baseUpgradeCost: { alloy: 3, currency: 3 },
    yieldGrowth: 0.06,
    priority: 8,
    reserveFloor: { power: 10, water: 6, oxygen: 6, biomass: 4 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '小行星带远征采掘设施。西海不在月面上，是太渊引力阱内一条富矿碎屑带。远征队伍每往返一次，陈林就要在轮换名册上多签一个名字。',
    productionMethods: [
      { id: 'MC2-1', name: '西海小行星带采掘', input: { power: 1.4, water: 0.3, oxygen: 0.4, biomass: 0.2 }, output: { water: 0.8, regolith: 3.4, alloy: 1.2 }, note: '西海表示在小行星带开采。额外消耗水、氧气和生物质维持远征队，产出水、月壤与合金。' },
      { id: 'MC2-2', name: '生态行星资源采集', input: { power: 1.4 }, output: { water: 0.8, regolith: 3.4, alloy: 1.2 }, unlockedBy: 'TC2-2', note: 'TC2-2 外星科技解锁。阿缇娅的坐标核指向一颗活着的生态行星，远征队不再需要携带生命维持补给。' },
    ],
  },
  B: {
    id: 'B',
    code: 'B',
    name: '水培生态球',
    subtitle: '生命维持 · 氧气 · 生物质',
    role: 'life',
    unlockYear: 4,
    requiredTech: 'TB-0',
    maxLevel: 15,
    baseUpgradeCost: { alloy: 2, water: 3, regolith: 3 },
    yieldGrowth: 0.07,
    priority: 10,
    reserveFloor: { water: 10, oxygen: 12, biomass: 8 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '月面上唯一像活物的东西。水培生态球在灰冷的地表上发出微弱的绿光，陈林有时会在夜里去看它，假装月面还有春天。',
    productionMethods: [
      { id: 'MB-1', name: '水培生态循环', input: { water: 0.8 }, output: { oxygen: 2.6, biomass: 1.8 }, note: '消耗水，在球体内培育藻膜，产出氧气与生物质。水是这颗卫星上最贵的奢侈品。' },
      { id: 'MB-2', name: '无水栽培循环', input: { regolith: 0.6 }, output: { oxygen: 2.6, biomass: 1.8 }, unlockedBy: 'TB-2', note: 'TB-2 解锁。梅露的孢囊教会了生态球吃月壤而不是水——以略低价值的代价换一口气。' },
    ],
  },
  F: {
    id: 'F',
    code: 'F',
    name: '天工精炼署',
    subtitle: '工业精炼 · 合金 · 星海货币',
    role: 'industry',
    unlockYear: 12,
    requiredTech: 'TF-0',
    maxLevel: 12,
    baseUpgradeCost: { regolith: 4, alloy: 3, currency: 2 },
    yieldGrowth: 0.07,
    priority: 8,
    reserveFloor: { power: 10, regolith: 10 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '月壤进去，合金出来。天工精炼署是月面唯一像工厂的东西，陈林路过时总能闻到一股灼烧月壤的焦味。',
    productionMethods: [
      { id: 'MF-1', name: '天工精炼', input: { power: 1.2, regolith: 1.6 }, output: { alloy: 2.2, oxygen: 0.4 }, note: '消耗电力与月壤，精炼产出合金与少量氧气。月壤烧出来的合金，带着一股灰味的纯。' },
      { id: 'MF-2', name: '重原子炼金', input: { power: 1.2, regolith: 1.6 }, output: { alloy: 2.2, oxygen: 0.4, currency: 1.0 }, unlockedBy: 'TF-1', note: 'TF-1 外星科技解锁。塔罗的炼金注释让精炼炉学会了从月壤里榨出星海货币——不是策略切换，是额外的馈赠。' },
    ],
  },
  P: {
    id: 'P',
    code: 'P',
    name: '伊犁河谷',
    subtitle: '生态培育 · 生物质 · 氧气',
    role: 'ecology',
    unlockYear: 14,
    requiredTech: 'TP-0',
    maxLevel: 12,
    baseUpgradeCost: { water: 4, regolith: 3, alloy: 2 },
    yieldGrowth: 0.05,
    priority: 7,
    reserveFloor: { water: 10, biomass: 8, regolith: 8 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '阶梯式河谷培育床。陈林给它取了一个地球上某个河谷的名字，同事问他为什么，他说随便取的。没人追问。',
    productionMethods: [
      { id: 'MP-1', name: '河谷生态培育', input: { regolith: 1, water: 0.6 }, output: { biomass: 1.8, oxygen: 1.2 }, note: '默认生产方式。消耗月壤和水，在阶梯上培育生态，产出生物质与氧气。' },
      { id: 'MP-2', name: '合金作物', input: { regolith: 1, water: 0.6 }, output: { biomass: 1.0, oxygen: 0.8, alloy: 0.4 }, unlockedBy: 'TP-1', note: 'TP-1 外星科技解锁。合金作物产出较少生物质和氧气，但额外产出合金——在河谷里长出金属，像一颗种子记住了矿脉。' },
    ],
  },
  R: {
    id: 'R',
    code: 'R',
    name: '月穹生态环',
    subtitle: '分阶段生态改造',
    role: 'ecology',
    unlockYear: 18,
    requiredTech: 'TR-0',
    maxLevel: 10,
    baseUpgradeCost: { water: 6, biomass: 6, alloy: 6 },
    yieldGrowth: 0.08,
    priority: 11,
    reserveFloor: { water: 12, oxygen: 12, biomass: 10 },
    interfaceDuty: '特殊设施页展示四阶段工程进度、投入与回报。',
    note: '投资型项目：前期吸收多余资源，中期集中投入，后期释放产出。',
    productionMethods: [
      { id: 'MR-1', name: '气候改造装置建设', input: { alloy: 2.4, power: 2 }, output: {}, condition: '默认阶段', note: '投入合金和能源，没有产出。' },
      { id: 'MR-2', name: '大气改造', input: { oxygen: 3 }, output: {}, condition: '阶段推进', autoSelect: false, note: '投入大量氧气。' },
      { id: 'MR-3', name: '生态改造', input: { water: 2.8, regolith: 1.2, biomass: 1 }, output: {}, condition: '阶段推进', autoSelect: false, note: '投入水、月壤和生物质。' },
      { id: 'MR-4', name: '回报阶段', input: {}, output: { water: 2.4, oxygen: 2.6, biomass: 2.1 }, condition: '阶段推进', autoSelect: false, note: '没有资源消耗，随进度提高逐渐产出。' },
    ],
    phaseNotes: [
      { name: '气候改造装置建设阶段', note: '投入合金和能源，没有产出。' },
      { name: '大气改造阶段', note: '需要投入大量氧气。' },
      { name: '生态改造阶段', note: '需要投入大量水，以及一定的月壤和生物质。' },
      { name: '回报阶段', note: '没有资源消耗，随着进度提高逐渐产出；解锁科技可以加速推进。' },
    ],
  },
  S: {
    id: 'S',
    code: 'S',
    name: '星海交易港',
    subtitle: '双向贸易 · 手动补充 · 自动购买',
    role: 'trade',
    unlockYear: 20,
    requiredTech: 'TS-0',
    maxLevel: 12,
    baseUpgradeCost: { alloy: 2, currency: 6 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { currency: 8, power: 10 },
    interfaceDuty: '展示双向贸易、手动补充与自动购买状态。',
    note: '贸易建筑。星海交易港是月面与外界唯一的商业接口，陈林每次看到轮换船停靠时都会多看一眼舷梯——然后低头回签文件。',
    productionMethods: [
      { id: 'MS-1', name: '贸易结算', input: {}, output: {}, note: '不产生固定日净值。双向贸易由市场与自动购买规则处理。' },
    ],
    phaseNotes: [
      { name: '双向贸易', note: '已解锁的星港贸易品类均可双向处理。买进来的是活路，卖出去的是面子。' },
      { name: '手动补充', note: '可以手动补充已开放贸易品类。陈林偶尔会亲自补一单，算是行使王权。' },
      { name: '自动购买', note: '星海货币赤字时暂停，恢复盈余后继续。没钱就不买，这是月面上唯一讲道理的规矩。' },
    ],
  },
  K: {
    id: 'K',
    code: 'K',
    name: '月面王城',
    subtitle: '人口 · 税收 · 政策',
    role: 'government',
    unlockYear: 0,
    requiredTech: 'TK-0',
    maxLevel: 15,
    baseUpgradeCost: { regolith: 3, alloy: 2 },
    yieldGrowth: 0.08,
    priority: 10,
    reserveFloor: { population: 10 },
    interfaceDuty: '展示人口、税收、政策界面与上一轮王月执行报告。',
    note: '月面王城是陈林的龙椅所在。它同时是人口建筑、税收来源和政策签发台。陈林大部分时间坐在这里，不是因为他想，是因为封君律不让他站起来。',
    productionMethods: [
      { id: 'MK-1', name: '王城安置与税收', input: {}, output: {}, note: '前期人口容量建筑。每级提供 8 人口容量；居民生命维持、人口增长与税收由全局人口系统结算。' },
    ],
    phaseNotes: [
      { name: '人口', note: '月面王城是前期人口建筑。住进来的人都知道王上走不了，但他们自己半年后可以走。' },
      { name: '税收', note: '通过征税获得铸币权，星海货币与人口成正比。陈林收的不是税，是签字的代价。' },
      { name: '政策', note: '显示政策界面并允许制定政策。每道政策盖的都是陈林的章，但每道政策的红头是上头批的。' },
    ],
  },
  L: {
    id: 'L',
    code: 'L',
    name: '问天研究实验室',
    subtitle: '知识 · 科技 · 量子计算核心',
    role: 'research',
    unlockYear: 22,
    requiredTech: 'TL-0',
    maxLevel: 15,
    baseUpgradeCost: { alloy: 6, currency: 6 },
    yieldGrowth: 0.1,
    priority: 9,
    reserveFloor: { power: 10, quantumCore: 1 },
    interfaceDuty: '特殊设施页展示科技界面。',
    note: '可以解锁科技；前期产出知识，后期在相关科技解锁后可生产量子计算核心。',
    productionMethods: [
      { id: 'ML-1', name: '基础研究', input: { power: 0.8 }, output: { knowledge: 2.4 }, note: '前期主要产出知识。' },
      { id: 'ML-2', name: '原子阵列光刻', input: { power: 1.8, water: 0.5, oxygen: 0.5, alloy: 0.8 }, output: { knowledge: 1.6, quantumCore: 0.6 }, unlockedBy: 'TL-1', note: 'TL-1 解锁后生产量子计算核心。' },
    ],
    phaseNotes: [
      { name: '前期', note: '主要产出知识。' },
      { name: '后期', note: '相关科技解锁后，可生产量子计算核心。' },
    ],
  },
  H: {
    id: 'H',
    code: 'H',
    name: '翡翠宫',
    subtitle: '中期人口 · 艺术奢侈品',
    role: 'culture',
    unlockYear: 26,
    requiredTech: 'TH-0',
    maxLevel: 12,
    baseUpgradeCost: { alloy: 6, biomass: 5 },
    yieldGrowth: 0.07,
    priority: 5,
    reserveFloor: { biomass: 6 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '中期人口建筑。翡翠宫是月面上最不实用的东西——它消耗更多资源，但产出艺术奢侈品。陈林批准建造时，述职报告里写的是"文化软实力"，心里想的是"有朝一日能卖给罗莎"。',
    productionMethods: [
      { id: 'MH-1', name: '宫廷居住与供养', input: {}, output: {}, note: '中期人口容量建筑。每级提供 16 人口容量；宫廷居民消耗更高，但会按居住人口产出艺术奢侈品。' },
    ],
  },
  M: {
    id: 'M',
    code: 'M',
    name: '新月府',
    subtitle: '后期人口 · 低消耗',
    role: 'habitat',
    unlockYear: 30,
    requiredTech: 'TM-0',
    maxLevel: 10,
    baseUpgradeCost: { alloy: 18, regolith: 16, water: 8 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { population: 10 },
    interfaceDuty: '展示光伏配方、当前产量、规模与扩建成本。',
    note: '后期人口建筑。新月府的生态居民包单位消耗更低，但需要月穹生态环完成后才能解锁。陈林在图纸上的批注是："先让月面能呼吸，再让人住得像人。"',
    productionMethods: [
      { id: 'MM-1', name: '新月府生态居住', input: {}, output: {}, note: '后期人口容量建筑。每级提供 24 人口容量；生态居民生命维持消耗更低。' },
    ],
  },
  D: {
    id: 'D',
    code: 'D',
    name: '冠冕星舰坞',
    subtitle: '胜利目标 · 御座号建造项目',
    role: 'ship',
    unlockYear: 48,
    requiredTech: 'TD-0',
    maxLevel: 10,
    baseUpgradeCost: { alloy: 40, quantumCore: 6, currency: 16 },
    yieldGrowth: 0.1,
    priority: 12,
    reserveFloor: { power: 14, alloy: 12, quantumCore: 2, currency: 6 },
    interfaceDuty: '展示御座号项目进度、三阶段物资供应、人力供应与胜利条件。',
    note: '胜利目标建筑。冠冕星舰坞账面上是"垦殖成果展示项目"，实际上是御座号的建造地。陈林每天都会来看龙骨进度——不是出于责任感，是出于想回家。',
    productionMethods: [
      { id: 'MD-1', name: '远洋星舰建造', input: { power: 4, alloy: 3, oxygen: 2 }, output: {}, note: '项目型生产方式。按日消耗电力、合金和氧气，不产出普通库存资源。实际胜利投入分为三阶段，由星舰界面展示。' },
    ],
    phaseNotes: [
      { name: '第一阶段：龙骨与生命舱', note: '投入合金、氧气和电力。龙骨对准太渊方向，像一根想要刺穿天穹的刺。' },
      { name: '第二阶段：远航壳层与循环农场', note: '投入合金、电力、月壤和生物质。远航壳层让御座号能撑过深空，循环农场让乘客能活着撑过去。' },
      { name: '第三阶段：王座核心与深空储备', note: '投入量子计算核心、电力、合金、水和生物质。王座核心是御座号的心脏——陈林给它取了这个名字，因为他终于要离开一把龙椅，登上另一把。' },
    ],
  },
}

export const facilityOrder: FacilityId[] = ['E1', 'C1', 'K', 'B', 'E2', 'C2', 'F', 'P', 'R', 'L', 'H', 'M', 'S', 'E3', 'D']

export const shipProjectStages: ShipProjectStage[] = [
  {
    id: 1,
    name: '龙骨与生命舱',
    input: { alloy: 160, oxygen: 80 },
    note: '第一阶段投入合金、氧气和电力，完成星舰基础结构与维生舱段。',
  },
  {
    id: 2,
    name: '远航壳层与循环农场',
    input: { alloy: 240, regolith: 160, biomass: 100 },
    note: '第二阶段投入合金、电力、月壤和生物质，完成长期远航壳层与生态循环。',
  },
  {
    id: 3,
    name: '王座核心与深空储备',
    input: { quantumCore: 16, alloy: 360, water: 120, biomass: 140 },
    note: '第三阶段投入量子计算核心、电力、合金、水和生物质，完成御座号核心。',
  },
]

export const resourceText = (bundle: Partial<Resources>) =>
  resourceOrder
    .map(key => (bundle[key] ? `${resourceMeta[key].label} ${bundle[key]}` : null))
    .filter(Boolean)
    .join('、')

export const methodText = (method: ProductionMethod) => {
  const input = resourceText(method.input) || '无'
  const output = resourceText(method.output) || '无'
  return `输入：${input}；输出：${output}`
}

export const canAfford = (bank: Resources, price: Partial<Resources>) =>
  resourceOrder.every(key => bank[key] >= (price[key] ?? 0))

export const applyBundle = (bank: Resources, change: Partial<Resources>, direction = 1): Resources => {
  const next = { ...bank }
  resourceOrder.forEach(key => {
    const delta = change[key] ?? 0
    next[key] = next[key] + direction * delta
  })
  return next
}

export const starportTradeOffers: StarportTradeOffer[] = [
  {
    id: 'ts0-currency-to-alloy',
    unlockTech: 'TS-0',
    name: 'Starport alloy purchase',
    input: { currency: 4 },
    output: { alloy: 1 },
    note: 'Uses the starting starport to import construction alloy.',
    automated: true,
  },
  {
    id: 'ts0-regolith-to-alloy',
    unlockTech: 'TS-0',
    name: 'Regolith export for alloy',
    input: { regolith: 6 },
    output: { alloy: 1 },
    note: 'Exports spare regolith and receives alloy for construction.',
    automated: true,
  },
  {
    id: 'ts1-labor',
    unlockTech: 'TS-1',
    name: 'Recruit interstellar workers',
    input: { currency: 6, luxury: 1 },
    output: { population: 1 },
    note: 'Trades currency and gifts for one population unit.',
  },
  {
    id: 'ts2-knowledge',
    unlockTech: 'TS-2',
    name: 'Purchase knowledge packet',
    input: { currency: 5, alloy: 2 },
    output: { knowledge: 6 },
    note: 'Converts industrial goods into researchable knowledge.',
  },
  {
    id: 'ts3-luxury-export',
    unlockTech: 'TS-3',
    name: 'Export luxury goods',
    input: { biomass: 4, water: 2 },
    output: { luxury: 3, currency: 2 },
    note: 'Turns ecological surplus into gifts and settlement currency.',
  },
]

const scaleBundle = (bundle: Partial<Resources>, multiplier: number): Partial<Resources> => {
  const scaled: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = bundle[key] ?? 0
    if (value) scaled[key] = value * multiplier
  })
  return scaled
}

const hasOperationalStarport = (facilities: FacilityState[], techs: string[] = []) =>
  hasTech(techs, 'TS-0') && facilities.some(facility => facility.id === 'S' && facility.level > 0)

export function planAutoTradesForCost(
  resources: Resources,
  cost: Partial<Resources>,
  facilities: FacilityState[],
  techs: string[] = [],
  reserveFloors: Partial<Resources> = defaultReserveFloors,
): { trades: AutoTrade[]; resources: Resources } {
  if (!hasOperationalStarport(facilities, techs)) return { trades: [], resources }

  const floors = { ...defaultReserveFloors, ...reserveFloors } as Resources
  let working = { ...resources }
  const trades: AutoTrade[] = []
  const alloyTarget = (cost.alloy ?? 0) + floors.alloy
  let alloyShortage = Math.max(0, alloyTarget - working.alloy)
  if (alloyShortage <= 0) return { trades, resources: working }

  starportTradeOffers
    .filter(offer => offer.automated && (offer.output.alloy ?? 0) > 0 && hasTech(techs, offer.unlockTech))
    .forEach(offer => {
      if (alloyShortage <= 0) return
      const outputAlloy = offer.output.alloy ?? 0
      const maxBatches = resourceOrder.reduce((limit, key) => {
        const required = offer.input[key] ?? 0
        if (!required) return limit
        const reserved = (cost[key] ?? 0) + floors[key]
        const surplus = Math.max(0, working[key] - reserved)
        return Math.min(limit, Math.floor(surplus / required))
      }, Number.POSITIVE_INFINITY)
      if (!Number.isFinite(maxBatches) || maxBatches <= 0) return

      const batches = Math.min(maxBatches, Math.ceil(alloyShortage / outputAlloy))
      const input = scaleBundle(offer.input, batches)
      const output = scaleBundle(offer.output, batches)
      working = applyBundle(applyBundle(working, input, -1), output)
      alloyShortage = Math.max(0, alloyTarget - working.alloy)
      trades.push({ offerId: offer.id, name: offer.name, input, output })
    })

  return { trades, resources: working }
}

export const weightedValue = (bundle: Partial<Resources>, weights: Resources = resourceWeights) =>
  resourceOrder.reduce((sum, key) => sum + (bundle[key] ?? 0) * weights[key], 0)

export const shipProjectTotalValue = shipProjectStages.reduce((sum, stage) => sum + weightedValue(stage.input), 0)

export function projectFacilityFlow(
  spec: FacilityEconomySpec,
  assignedPopulation: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
  facilityLevel?: number,
): ResourceFlow {
  const flow: ResourceFlow = {
    production: emptyResources(),
    consumption: emptyResources(),
    net: emptyResources(),
  }
  if (assignedPopulation <= 0) return flow
  if (!hasRequiredFacilityTech(spec, techs)) return flow
  if (isHousingFacility(spec.id)) return flow
  const method = selectProductionMethod(spec.productionMethods, techs, selectedMethodId)
  if (!canUseProductionMethod(method, techs)) return flow
  const adjustedMethod = applyTechnologyToMethod(spec, method, techs)
  const outputMultiplier = modifiers.outputMultiplier ?? 1
  const upkeepMultiplier = modifiers.upkeepMultiplier ?? 1
  const builtLevel = facilityLevel ?? Math.max(1, Math.ceil(assignedPopulation / jobsPerFacilityLevel))
  const levelScale = assignedPopulation * (1 + Math.max(0, builtLevel - 1) * spec.yieldGrowth)

  resourceOrder.forEach(key => {
    const produced = (adjustedMethod.output[key] ?? 0) * levelScale * outputMultiplier
    const consumed = (adjustedMethod.input[key] ?? 0) * levelScale * upkeepMultiplier
    if (produced) flow.production[key] += produced
    if (consumed) flow.consumption[key] += consumed
    flow.net[key] += produced - consumed
  })

  return flow
}

export function projectFacilityNet(
  spec: FacilityEconomySpec,
  assignedPopulation: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
  facilityLevel?: number,
): Partial<Resources> {
  const net: Partial<Resources> = {}
  const flow = projectFacilityFlow(spec, assignedPopulation, modifiers, techs, selectedMethodId, facilityLevel)

  resourceOrder.forEach(key => {
    if (flow.net[key]) net[key] = flow.net[key]
  })

  return net
}

export function projectFacilityCost(spec: FacilityEconomySpec, level: number, techs: string[] = []): Partial<Resources> {
  const nextLevel = Math.max(1, level + 1)
  const cost: Partial<Resources> = {}
  const multiplier = getUpgradeCostScale(spec.id) * getConstructionCostDiscount(techs)
  resourceOrder.forEach(key => {
    const base = spec.baseUpgradeCost[key] ?? 0
    if (!base) return
    cost[key] = base * nextLevel * multiplier
  })
  return cost
}

export function projectTechnologyCost(tech: TechnologySpec, techs: string[] = []): Partial<Resources> {
  if (tech.category === 'construction' && tech.unlocksFacility) {
    const facilityCost = projectFacilityCost(facilityEconomySpecs[tech.unlocksFacility], 0, techs)
    const cost = { ...facilityCost }
    delete cost.population
    return cost
  }
  const researchCost = tech.researchCost ?? estimateTechnologyResearchCost(tech)
  return researchCost > 0 ? { knowledge: researchCost } : {}
}

const mergeBundles = (...bundles: Partial<Resources>[]) => {
  const total = emptyResources()
  bundles.forEach(bundle => {
    resourceOrder.forEach(key => {
      total[key] += bundle[key] ?? 0
    })
  })
  return total
}

const meetsFloor = (resources: Resources, floors: Resources) =>
  resourceOrder.every(key => resources[key] >= floors[key])

const reserveBreach = (resources: Resources, floors: Resources) =>
  resourceOrder.find(key => resources[key] < floors[key])

export function projectDailyNet(context: AnnualContext): Resources {
  return projectDailyFlow(context).net
}

export function projectDailyFlow(context: AnnualContext): ResourceFlow {
  const total: ResourceFlow = {
    production: emptyResources(),
    consumption: emptyResources(),
    net: emptyResources(),
  }

  facilityOrder.forEach(id => {
    const facility = context.facilities[id]
    if (!facility || facility.level <= 0) return
    const spec = facilityEconomySpecs[id]
    const modifiers = context.modifiers[id] ?? {}
    const contribution = projectFacilityFlow(spec, facility.level, modifiers, context.techs, context.productionMethods?.[id], context.facilityLevels?.[id])
    resourceOrder.forEach(key => {
      total.production[key] += contribution.production[key] ?? 0
      total.consumption[key] += contribution.consumption[key] ?? 0
      total.net[key] += contribution.net[key] ?? 0
    })
  })

  if (context.globalBonus) {
    resourceOrder.forEach(key => {
      const bonus = context.globalBonus?.[key] ?? 0
      if (bonus >= 0) total.production[key] += bonus
      else total.consumption[key] += Math.abs(bonus)
      total.net[key] += bonus
    })
  }

  return total
}

export const projectAnnualNet = projectDailyNet

const residentRules: Record<FacilityId, { water: number; oxygen: number; biomass: number; currency?: number; luxury?: number }> = {
  K: { water: 0.025, oxygen: 0.020, biomass: 0.015, currency: 0.040 },
  H: { water: 0.035, oxygen: 0.030, biomass: 0.035, luxury: 0.025 },
  M: { water: 0.012, oxygen: 0.010, biomass: 0.010 },
  E1: { water: 0, oxygen: 0, biomass: 0 },
  E2: { water: 0, oxygen: 0, biomass: 0 },
  E3: { water: 0, oxygen: 0, biomass: 0 },
  C1: { water: 0, oxygen: 0, biomass: 0 },
  C2: { water: 0, oxygen: 0, biomass: 0 },
  B: { water: 0, oxygen: 0, biomass: 0 },
  F: { water: 0, oxygen: 0, biomass: 0 },
  P: { water: 0, oxygen: 0, biomass: 0 },
  R: { water: 0, oxygen: 0, biomass: 0 },
  S: { water: 0, oxygen: 0, biomass: 0 },
  L: { water: 0, oxygen: 0, biomass: 0 },
  D: { water: 0, oxygen: 0, biomass: 0 },
}

const populationPolicyOrder: Record<PopulationPolicy, FacilityId[]> = {
  ration: ['M', 'K', 'H'],
  mandate: ['K', 'M', 'H'],
  festival: ['H', 'K', 'M'],
}

export function projectPopulationSystem(context: PopulationContext): PopulationProjection {
  const capacity = (['K', 'H', 'M'] as FacilityId[]).reduce(
    (sum, id) => sum + getHousingCapacity(id, context.facilities[id]?.level ?? 0),
    0,
  )
  let unassignedResidents = Math.max(0, context.resources.population)
  const residentsByFacility: Partial<Record<FacilityId, number>> = {}

  populationPolicyOrder[context.policy].forEach(id => {
    const residents = Math.min(unassignedResidents, getHousingCapacity(id, context.facilities[id]?.level ?? 0))
    if (residents > 0) residentsByFacility[id] = residents
    unassignedResidents -= residents
  })

  const facilityNet: Partial<Record<FacilityId, Partial<Resources>>> = {}
  const lifeSupportCost: Partial<Resources> = {}
  let currency = 0
  let luxury = 0

  ;(['K', 'H', 'M'] as FacilityId[]).forEach(id => {
    const residents = residentsByFacility[id] ?? 0
    const rule = residentRules[id]
    const net: Partial<Resources> = {}
    if (residents <= 0) {
      facilityNet[id] = net
      return
    }
    net.water = -residents * rule.water
    net.oxygen = -residents * rule.oxygen
    net.biomass = -residents * rule.biomass
    if (rule.currency) {
      net.currency = residents * rule.currency
      currency += net.currency
    }
    if (rule.luxury) {
      net.luxury = residents * rule.luxury
      luxury += net.luxury
    }
    lifeSupportCost.water = (lifeSupportCost.water ?? 0) + residents * rule.water
    lifeSupportCost.oxygen = (lifeSupportCost.oxygen ?? 0) + residents * rule.oxygen
    lifeSupportCost.biomass = (lifeSupportCost.biomass ?? 0) + residents * rule.biomass
    facilityNet[id] = net
  })

  const lifeSupportRatio = (['water', 'oxygen', 'biomass'] as ResourceKey[]).reduce((ratio, key) => {
    const required = lifeSupportCost[key] ?? 0
    if (required <= 0) return ratio
    return Math.min(ratio, Math.max(0, context.resources[key]) / required)
  }, 1)
  const availableCapacity = capacity - context.resources.population
  const hasCapacityPressure = availableCapacity <= 0
  const hasLifePressure = lifeSupportRatio < 1
  const nextPressureDays = hasCapacityPressure || hasLifePressure ? (context.pressureDays ?? 0) + 1 : 0

  const policyMultiplier = context.policy === 'festival' ? 1.15 : context.policy === 'ration' ? 0.85 : 1
  const growthPotential = (
    0.04 +
    (context.facilities.K?.level ?? 0) * 0.03 +
    (context.facilities.H?.level ?? 0) * 0.08 +
    (context.facilities.M?.level ?? 0) * 0.12 +
    (hasTech(context.techs, 'TS-1') ? 0.25 : 0) +
    (hasTech(context.techs, 'TC2-2') ? 0.18 : 0)
  ) * policyMultiplier
  const migrationIn = hasCapacityPressure || hasLifePressure ? 0 : Math.min(Math.max(0, availableCapacity), growthPotential * lifeSupportRatio)
  const overCapacity = Math.max(0, -availableCapacity)
  const attrition = nextPressureDays >= 3
    ? Math.min(
      5,
      Math.max(0, context.resources.population - defaultReserveFloors.population),
      overCapacity * 0.1 + Math.max(0, 1 - lifeSupportRatio) * context.resources.population * 0.03,
    )
    : 0
  const populationDelta = Math.max(
    defaultReserveFloors.population - context.resources.population,
    Math.min(Math.max(0, availableCapacity), migrationIn) - attrition,
  )

  const net: Partial<Resources> = {
    population: populationDelta,
    water: -(lifeSupportCost.water ?? 0),
    oxygen: -(lifeSupportCost.oxygen ?? 0),
    biomass: -(lifeSupportCost.biomass ?? 0),
  }
  if (currency) net.currency = currency
  if (luxury) net.luxury = luxury

  return {
    capacity,
    availableCapacity,
    residentsByFacility,
    facilityNet,
    lifeSupportCost,
    lifeSupportRatio,
    growthPotential,
    migrationIn,
    attrition,
    nextPressureDays,
    net,
    status: hasLifePressure ? 'strained' : hasCapacityPressure ? 'full' : 'stable',
  }
}

export type PlanInput = {
  resources: Resources
  facilities: FacilityState[]
  staffing?: Partial<Record<FacilityId, number>>
  population?: PopulationProjection
  blockedFacilities?: FacilityId[]
  modifiers?: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  reserveFloors?: Partial<Resources>
  weights?: Partial<Resources>
  techs?: string[]
  productionMethods?: Partial<Record<FacilityId, ProductionMethodId>>
  year?: number
  capitalHorizonYears?: number
}

export function planFacilityAutomation(input: PlanInput): AutomationPlan {
  const reserveFloors = { ...defaultReserveFloors, ...input.reserveFloors } as Resources
  const weights = { ...resourceWeights, ...input.weights } as Resources
  const horizon = input.capitalHorizonYears ?? 5
  const year = input.year ?? 0
  const stateById: Record<FacilityId, FacilityState> = Object.fromEntries(
    facilityOrder.map(id => [id, input.facilities.find(item => item.id === id) ?? { id, level: 0 }]),
  ) as Record<FacilityId, FacilityState>
  const targetLevels: Record<FacilityId, number> = Object.fromEntries(
    facilityOrder.map(id => [id, stateById[id].level]),
  ) as Record<FacilityId, number>

  if (!meetsFloor(input.resources, reserveFloors)) {
    const breach = reserveBreach(input.resources, reserveFloors)
    return {
      mode: 'manual',
      reason: breach ? `${resourceMeta[breach].label} 低于最低要求` : '最低要求未满足',
      actions: [],
      technologyActions: [],
      targetLevels,
      weightedProfit: 0,
      projectedResources: { ...input.resources },
    }
  }

  let workingResources = { ...input.resources }
  let workingTechs = [...(input.techs ?? [])]
  let weightedProfit = 0
  const actions: AutomationAction[] = []
  const technologyActions: TechnologyAutomationAction[] = []

  const overstockTechnologyBonus = () => {
    const materialSurplus =
      Math.max(0, workingResources.alloy - reserveFloors.alloy * 4) * weights.alloy +
      Math.max(0, workingResources.regolith - reserveFloors.regolith * 8) * weights.regolith +
      Math.max(0, workingResources.currency - reserveFloors.currency * 6) * weights.currency
    return Math.min(24, materialSurplus / 1200)
  }

  const evaluate = (id: FacilityId) => {
    const current = stateById[id]
    const spec = facilityEconomySpecs[id]
    if (input.blockedFacilities?.includes(id) || current.level >= spec.maxLevel) return null

    const requiredTech = spec.requiredTech && !hasTech(workingTechs, spec.requiredTech)
      ? technologyCatalog[spec.requiredTech]
      : undefined
    if (requiredTech && (
      current.level > 0 ||
      requiredTech.category !== 'construction' ||
      !hasTechnologyPrerequisites(requiredTech.id, workingTechs)
    )) return null
    if (!requiredTech && !canBuildFacility(spec, year, workingTechs)) return null

    const buildCost = projectFacilityCost(spec, current.level, workingTechs)
    const unlockCost = requiredTech ? projectTechnologyCost(requiredTech, workingTechs) : {}
    const cost = requiredTech ? mergeBundles(unlockCost, buildCost) : buildCost
    const tradePlan = planAutoTradesForCost(
      workingResources,
      cost,
      Object.values(stateById),
      workingTechs,
      reserveFloors,
    )
    if (!canAfford(tradePlan.resources, cost)) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const presentAssigned = isHousingFacility(id) ? 0 : getFacilityWorkCapacity(id, current.level)
    const upgradedAssigned = isHousingFacility(id) ? 0 : getFacilityWorkCapacity(id, current.level + 1)
    const presentNet = projectFacilityNet(spec, presentAssigned, modifiers, workingTechs, input.productionMethods?.[id], current.level)
    const upgradedNet = projectFacilityNet(spec, upgradedAssigned, modifiers, workingTechs, input.productionMethods?.[id], current.level + 1)
    let strategicBonus = requiredTech ? overstockTechnologyBonus() : 0
    const annualGain = mergeBundles(upgradedNet)
    resourceOrder.forEach(key => {
      annualGain[key] = (upgradedNet[key] ?? 0) - (presentNet[key] ?? 0)
    })
    if (isHousingFacility(id)) {
      if ((input.population?.lifeSupportRatio ?? 1) < 1) return null
      const presentCapacity = input.population?.capacity ?? (['K', 'H', 'M'] as FacilityId[]).reduce((sum, facilityId) => sum + getHousingCapacity(facilityId, stateById[facilityId]?.level ?? 0), 0)
      const addedCapacity = getHousingCapacity(id, current.level + 1) - getHousingCapacity(id, current.level)
      const vacancy = presentCapacity - input.resources.population
      const potentialMigrants = Math.min(addedCapacity, Math.max(0, (input.population?.growthPotential ?? 0.5) * horizon - vacancy))
      annualGain.population = potentialMigrants / Math.min(horizon, 120)
      if (vacancy <= (input.population?.growthPotential ?? 0.5) * 90) {
        strategicBonus += addedCapacity * weights.population / 80 + overstockTechnologyBonus()
      }
    }

    const projectedResources = applyBundle(tradePlan.resources, cost, -1)
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)
    if (!meetsFloor(nextYearProjection, reserveFloors)) return null

    const weightedGain = weightedValue(annualGain, weights)
    const weightedCost = weightedValue(cost, weights) / horizon
    const score = weightedGain - weightedCost + spec.priority * 0.45 + strategicBonus
    if (!Number.isFinite(score)) return null

    return {
      kind: 'facility' as const,
      id,
      cost,
      trades: tradePlan.trades,
      technologyUnlocks: requiredTech ? [requiredTech.id] : undefined,
      projectedResources,
      weightedGain,
      weightedCost,
      score,
    }
  }

  const evaluateTechnology = (tech: TechnologySpec) => {
    if (hasTech(workingTechs, tech.id) || tech.category === 'construction') return null
    if (!hasTechnologyPrerequisites(tech.id, workingTechs)) return null
    const cost = projectTechnologyCost(tech, workingTechs)
    if (!canAfford(workingResources, cost)) return null
    const projectedResources = applyBundle(workingResources, cost, -1)
    if (!meetsFloor(projectedResources, reserveFloors)) return null

    const weightedGain = (tech.value ?? estimateTechnologyValue(tech)) / horizon + overstockTechnologyBonus()
    const weightedCost = weightedValue(cost, weights) / horizon
    const score = weightedGain - weightedCost
    if (!Number.isFinite(score)) return null

    return {
      kind: 'technology' as const,
      techId: tech.id,
      name: tech.name,
      cost,
      projectedResources,
      weightedGain,
      weightedCost,
      score,
      unlocksFacility: tech.unlocksFacility,
    }
  }

  while (true) {
    const ranked = [
      ...facilityOrder.map(evaluate),
      ...Object.values(technologyCatalog).map(evaluateTechnology),
    ]
      .filter((candidate): candidate is NonNullable<ReturnType<typeof evaluate> | ReturnType<typeof evaluateTechnology>> => Boolean(candidate))
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]
    if (!best || best.score <= 0) break

    if (best.kind === 'technology') {
      workingResources = applyBundle(workingResources, best.cost, -1)
      workingTechs = [...workingTechs, `${best.techId} ${best.name}`]
      weightedProfit += best.score
      technologyActions.push({
        techId: best.techId,
        name: best.name,
        score: best.score,
        weightedGain: best.weightedGain,
        weightedCost: best.weightedCost,
        cost: best.cost,
        unlocksFacility: best.unlocksFacility,
        projectedResources: best.projectedResources,
      })
      continue
    }

    const currentLevel = targetLevels[best.id]
    targetLevels[best.id] = currentLevel + 1
    best.trades.forEach(trade => {
      workingResources = applyBundle(applyBundle(workingResources, trade.input, -1), trade.output)
    })
    workingResources = applyBundle(workingResources, best.cost, -1)
    if (best.technologyUnlocks) {
      workingTechs = [...workingTechs, ...best.technologyUnlocks.map(techId => `${techId} ${technologyCatalog[techId].name}`)]
    }
    weightedProfit += best.score
    actions.push({
      id: best.id,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
      technologyUnlocks: best.technologyUnlocks,
      score: best.score,
      weightedGain: best.weightedGain,
      weightedCost: best.weightedCost,
      cost: best.cost,
      trades: best.trades.length ? best.trades : undefined,
      projectedResources: best.projectedResources,
    })
    stateById[best.id] = { id: best.id, level: currentLevel + 1 }
  }

  return {
    mode: 'auto',
    actions,
    technologyActions,
    targetLevels,
    weightedProfit,
    projectedResources: workingResources,
  }
}

export const buildFacilityModifiers = (
  habitatLevel: number,
  policy: 'ration' | 'mandate' | 'festival',
  workerBoost: number,
) => {
  const habitatBonus = 1 + habitatLevel * 0.04
  const policyBonus = policy === 'mandate' ? 1.16 : policy === 'festival' ? 1.06 : 1
  return {
    outputMultiplier: habitatBonus * policyBonus * workerBoost,
    upkeepMultiplier: 1,
  }
}
