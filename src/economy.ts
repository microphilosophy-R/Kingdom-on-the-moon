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

export type FacilityPhase = {
  name: string
  note: string
}

export type FacilityEconomySpec = {
  id: FacilityId
  code: string
  name: string
  subtitle: string
  role: FacilityRole
  unlockYear: number
  maxLevel: number
  baseYield: Partial<Resources>
  baseUpgradeCost: Partial<Resources>
  yieldGrowth: number
  priority: number
  reserveFloor: Partial<Resources>
  interfaceDuty: string
  note: string
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
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
}

export type AutomationAction = {
  id: FacilityId
  fromLevel: number
  toLevel: number
  score: number
  weightedGain: number
  weightedCost: number
  cost: Partial<Resources>
  projectedResources: Resources
}

export type AutomationPlan = {
  mode: 'auto' | 'manual'
  reason?: string
  actions: AutomationAction[]
  targetLevels: Record<FacilityId, number>
  weightedProfit: number
  projectedResources: Resources
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

const emptyResources = (): Resources => ({
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

export const resourceMeta: Record<ResourceKey, ResourceSpec> = {
  power: {
    label: '电力',
    category: 'energy',
    source: 'E1 日冕能源署、E2 月冕能源署、E3 归元装置',
    coreUse: '维持所有设施的基础运转',
    deficit: '设施按优先级降载，供给与产出同步缩减',
    tradeRule: '不可交易，也不进入库存买卖',
    autoBuyRule: '不参与自动购买',
    tradable: false,
    storable: false,
    reserveFloor: 12,
    weight: 4.2,
  },
  water: {
    label: '水',
    category: 'life',
    source: 'C1 静海采掘署、C2 西海采掘署、R 月穹生态环、S 星海交易港',
    coreUse: '生命维持、生态改造与人口供给',
    deficit: '人口下降，相关建筑收缩，生态工程停摆',
    tradeRule: '可交易，可由交易港补足',
    autoBuyRule: '低于安全线时允许自动补入',
    tradable: true,
    storable: true,
    reserveFloor: 8,
    weight: 2.2,
  },
  oxygen: {
    label: '氧气',
    category: 'life',
    source: 'B 水培生态球、F 天工精炼署、E1 日冕能源署、R 月穹生态环、S 星海交易港',
    coreUse: '呼吸、制造与封闭生态循环',
    deficit: '人口下降，生产设施按比例减产',
    tradeRule: '可交易，可用于救急',
    autoBuyRule: '低于安全线时自动补足',
    tradable: true,
    storable: true,
    reserveFloor: 10,
    weight: 2.5,
  },
  biomass: {
    label: '生物质',
    category: 'life',
    source: 'B 水培生态球、P 伊犁河谷、R 月穹生态环、S 星海交易港',
    coreUse: '人口供给、食物链与生态维持',
    deficit: '人口下降，前线生产节奏放缓',
    tradeRule: '可交易，早期应保持克制',
    autoBuyRule: '低于安全线时允许交易港补充',
    tradable: true,
    storable: true,
    reserveFloor: 8,
    weight: 2.0,
  },
  regolith: {
    label: '月壤',
    category: 'matter',
    source: 'C1 静海采掘署、C2 西海采掘署、P 伊犁河谷、S 星海交易港',
    coreUse: '初级工业、基建与外壳铺设',
    deficit: '相关生产建筑停工，基础扩建受阻',
    tradeRule: '可交易，后期常转为进口项',
    autoBuyRule: '可由交易港按最低线补足',
    tradable: true,
    storable: true,
    reserveFloor: 12,
    weight: 1.2,
  },
  alloy: {
    label: '合金',
    category: 'matter',
    source: 'F 天工精炼署、C2 西海采掘署、P 伊犁河谷、S 星海交易港',
    coreUse: '中级工业、星舰与高级设施',
    deficit: '相关生产建筑停工，舰坞工程受阻',
    tradeRule: '可交易，是中期关键物资',
    autoBuyRule: '低于安全线时优先补足',
    tradable: true,
    storable: true,
    reserveFloor: 10,
    weight: 2.8,
  },
  quantumCore: {
    label: '量子计算核心',
    category: 'science',
    source: 'L 问天研究实验室、S 星海交易港',
    coreUse: '高级科研、终局设施与高阶研究',
    deficit: '相关高阶建筑停工，科研链路收缩',
    tradeRule: '可交易，是后期高价值物资',
    autoBuyRule: '仅在交易港有库存时补入',
    tradable: true,
    storable: true,
    reserveFloor: 2,
    weight: 4.8,
  },
  currency: {
    label: '星海货币',
    category: 'society',
    source: 'K 月面王城、F 天工精炼署',
    coreUse: '结算贸易、自动购买与税收体系',
    deficit: '自动购买暂停，市场交易冻结',
    tradeRule: '不作为普通商品流通，但可用于结算',
    autoBuyRule: '余额不足时暂停购买，恢复盈余后继续',
    tradable: false,
    storable: true,
    reserveFloor: 6,
    weight: 2.6,
  },
  population: {
    label: '人口',
    category: 'society',
    source: 'K 月面王城、H 翡翠宫、M 新月府、S 星海交易港',
    coreUse: '居住、劳动力与建筑承载',
    deficit: '建筑吞吐率按比例收缩，城市规模受限',
    tradeRule: '不可交易，按行政逻辑分配',
    autoBuyRule: '不自动购买，只能通过事件与建筑增长',
    tradable: false,
    storable: true,
    reserveFloor: 10,
    weight: 3.6,
  },
  knowledge: {
    label: '知识',
    category: 'science',
    source: 'L 问天研究实验室、S 星海交易港',
    coreUse: '解锁科技、政策与高阶配方',
    deficit: '不会直接崩盘，但会拖慢科技进度',
    tradeRule: '可通过事件与交易补充',
    autoBuyRule: '默认不自动购买，只有特殊事件会引入',
    tradable: false,
    storable: true,
    reserveFloor: 0,
    weight: 4.0,
  },
  luxury: {
    label: '艺术奢侈品',
    category: 'culture',
    source: 'H 翡翠宫、S 星海交易港',
    coreUse: '外星需求、声望与外交交换',
    deficit: '外交收益下降，部分事件回报变差',
    tradeRule: '可交易，偏向稀缺奢侈品',
    autoBuyRule: '低优先级自动购买，避免挤占生存资源',
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
  power: 4.2,
  water: 2.2,
  oxygen: 2.5,
  biomass: 2.0,
  regolith: 1.2,
  alloy: 2.8,
  quantumCore: 4.8,
  currency: 2.6,
  population: 3.6,
  knowledge: 4.0,
  luxury: 1.8,
}

export const facilityEconomySpecs: Record<FacilityId, FacilityEconomySpec> = {
  E1: {
    id: 'E1',
    code: 'E1',
    name: '日冕能源署',
    subtitle: '光伏发电 · 基地供电',
    role: 'energy',
    unlockYear: 0,
    maxLevel: 5,
    baseYield: { power: 6.0 },
    baseUpgradeCost: { regolith: 10, alloy: 8 },
    yieldGrowth: 0.06,
    priority: 10,
    reserveFloor: { power: 14 },
    interfaceDuty: '展示供电与效率科技，不提供独立库存。',
    note: '前期供电基座，负责最稳定的电力底盘。',
  },
  E2: {
    id: 'E2',
    code: 'E2',
    name: '月冕能源署',
    subtitle: '镜阵聚能 · 峰值供电',
    role: 'energy',
    unlockYear: 8,
    maxLevel: 5,
    baseYield: { power: 7.2, knowledge: 0.3 },
    baseUpgradeCost: { regolith: 12, alloy: 10, currency: 4 },
    yieldGrowth: 0.07,
    priority: 9,
    reserveFloor: { power: 16 },
    interfaceDuty: '展示峰值供电和镜阵效率。',
    note: '中期供电设施，偏向高峰稳定与效率提升。',
  },
  E3: {
    id: 'E3',
    code: 'E3',
    name: '归元装置',
    subtitle: '回收归流 · 余能整序',
    role: 'energy',
    unlockYear: 36,
    maxLevel: 4,
    baseYield: { power: 5.6, knowledge: 0.8, currency: 0.4 },
    baseUpgradeCost: { alloy: 18, quantumCore: 2, currency: 6 },
    yieldGrowth: 0.1,
    priority: 8,
    reserveFloor: { power: 12, quantumCore: 1 },
    interfaceDuty: '展示回收效率、余能整序与高阶效率科技。',
    note: '后期供能与回收设施，负责把杂乱资源重新导入秩序。',
  },
  C1: {
    id: 'C1',
    code: 'C1',
    name: '静海采掘署',
    subtitle: '月壤采掘 · 基础回填',
    role: 'extraction',
    unlockYear: 0,
    maxLevel: 5,
    baseYield: { regolith: 5.0, water: 1.2, oxygen: -0.3 },
    baseUpgradeCost: { power: 12, alloy: 4 },
    yieldGrowth: 0.05,
    priority: 9,
    reserveFloor: { power: 10, oxygen: 8 },
    interfaceDuty: '展示基础采掘配方与产量。',
    note: '前期经济支点，提供月壤与少量水。',
  },
  C2: {
    id: 'C2',
    code: 'C2',
    name: '西海采掘署',
    subtitle: '深层采掘 · 高纯回收',
    role: 'extraction',
    unlockYear: 10,
    maxLevel: 5,
    baseYield: { regolith: 4.8, alloy: 1.7, water: 0.9, oxygen: -0.4 },
    baseUpgradeCost: { power: 14, alloy: 6, currency: 3 },
    yieldGrowth: 0.06,
    priority: 8,
    reserveFloor: { power: 10, oxygen: 8 },
    interfaceDuty: '展示高纯采掘与矿物回收配方。',
    note: '比静海更深一层的采掘节点，兼顾月壤与合金来源。',
  },
  B: {
    id: 'B',
    code: 'B',
    name: '水培生态球',
    subtitle: '藻类循环 · 呼吸与食物',
    role: 'life',
    unlockYear: 4,
    maxLevel: 5,
    baseYield: { water: 1.8, oxygen: 3.2, biomass: 2.6, regolith: -0.4, power: -0.6 },
    baseUpgradeCost: { power: 16, water: 6, regolith: 8 },
    yieldGrowth: 0.07,
    priority: 10,
    reserveFloor: { water: 10, oxygen: 12, biomass: 8 },
    interfaceDuty: '展示生命维持配方与生态参数。',
    note: '把水、藻类与月壤转成可持续的呼吸与食物供给。',
  },
  F: {
    id: 'F',
    code: 'F',
    name: '天工精炼署',
    subtitle: '金属提纯 · 结算与回收',
    role: 'industry',
    unlockYear: 12,
    maxLevel: 5,
    baseYield: { alloy: 3.4, oxygen: 0.6, currency: 0.8, regolith: -0.8, power: -1.2 },
    baseUpgradeCost: { regolith: 10, power: 12, currency: 4 },
    yieldGrowth: 0.07,
    priority: 9,
    reserveFloor: { power: 10, alloy: 8 },
    interfaceDuty: '展示精炼配方与结算能力。',
    note: '工业中枢，负责把原矿转为合金，也承担部分货币产出。',
  },
  P: {
    id: 'P',
    code: 'P',
    name: '伊犁河谷',
    subtitle: '矿植混成 · 生态工田',
    role: 'ecology',
    unlockYear: 14,
    maxLevel: 5,
    baseYield: { biomass: 2.8, regolith: 1.2, alloy: 0.5, water: 0.4, power: -0.4 },
    baseUpgradeCost: { water: 8, regolith: 10, power: 6 },
    yieldGrowth: 0.05,
    priority: 7,
    reserveFloor: { water: 10, biomass: 8 },
    interfaceDuty: '展示生态工田的产出和物资转化。',
    note: '连接生态与工业的过渡节点，兼顾生物质与矿物回收。',
  },
  R: {
    id: 'R',
    code: 'R',
    name: '月穹生态环',
    subtitle: '分阶段改造 · 投资型项目',
    role: 'ecology',
    unlockYear: 18,
    maxLevel: 4,
    baseYield: { water: 2.6, oxygen: 2.4, biomass: 1.8, population: 0.8, power: -0.8 },
    baseUpgradeCost: { water: 10, biomass: 8, alloy: 10, power: 12 },
    yieldGrowth: 0.08,
    priority: 11,
    reserveFloor: { water: 12, oxygen: 12, biomass: 10 },
    interfaceDuty: '展示四阶段工程进度、投入与回报。',
    note: '生态改造主项目，前期吸收资源，中后期转为稳定供给。',
    phaseNotes: [
      { name: '气候改造', note: '投入合金与能源，没有产出。' },
      { name: '大气改造', note: '需要大量氧气。' },
      { name: '生态改造', note: '需要大量水、月壤与生物质。' },
      { name: '回报阶段', note: '停止主要消耗，逐步释放产出。' },
    ],
  },
  S: {
    id: 'S',
    code: 'S',
    name: '星海交易港',
    subtitle: '买卖结算 · 自动补给',
    role: 'trade',
    unlockYear: 20,
    maxLevel: 4,
    baseYield: { currency: 2.4, knowledge: 0.8, population: 0.4, power: -0.4 },
    baseUpgradeCost: { alloy: 18, currency: 10, power: 10 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { currency: 8, power: 10 },
    interfaceDuty: '展示买卖、自动购买与外星资源补充。',
    note: '经济的缓冲阀，负责交易、结算和应急补给。',
    phaseNotes: [
      { name: '结算', note: '承担普通贸易与库存清算。' },
      { name: '自动购买', note: '在货币充足时补足低线资源。' },
      { name: '外星通道', note: '解锁更多异星资源输入。' },
    ],
  },
  K: {
    id: 'K',
    code: 'K',
    name: '月面王城',
    subtitle: '税收 · 政策 · 人口中枢',
    role: 'government',
    unlockYear: 0,
    maxLevel: 3,
    baseYield: { currency: 2.2, population: 2.5, knowledge: 0.8, power: -0.8 },
    baseUpgradeCost: { regolith: 12, alloy: 10, power: 10 },
    yieldGrowth: 0.08,
    priority: 10,
    reserveFloor: { power: 10, population: 10 },
    interfaceDuty: '展示政策、税收和人口承载。',
    note: '前期行政核心，把统治转译为税收与秩序。',
    phaseNotes: [
      { name: '治安', note: '维持基础秩序与人口承载。' },
      { name: '税制', note: '提高结算与货币产出。' },
      { name: '政令', note: '解锁更高阶政策。' },
    ],
  },
  L: {
    id: 'L',
    code: 'L',
    name: '问天研究实验室',
    subtitle: '科技 · 核心 · 研究界面',
    role: 'research',
    unlockYear: 22,
    maxLevel: 5,
    baseYield: { knowledge: 4.0, quantumCore: 0.8, power: -1.4, water: -0.4, oxygen: -0.4, alloy: -0.8 },
    baseUpgradeCost: { power: 16, alloy: 16, currency: 8, population: 2 },
    yieldGrowth: 0.1,
    priority: 9,
    reserveFloor: { power: 10, quantumCore: 1 },
    interfaceDuty: '展示科技树、研究点与量子核心产出。',
    note: '前期研究中心，后期也是量子计算核心来源。',
    phaseNotes: [
      { name: '前期', note: '主要产出知识。' },
      { name: '后期', note: '解锁后可生产量子计算核心。' },
    ],
  },
  H: {
    id: 'H',
    code: 'H',
    name: '翡翠宫',
    subtitle: '人口 · 奢侈 · 声望',
    role: 'culture',
    unlockYear: 26,
    maxLevel: 4,
    baseYield: { population: 1.8, luxury: 1.6, knowledge: 0.4, power: -0.6, biomass: -0.6 },
    baseUpgradeCost: { alloy: 14, power: 12, biomass: 6 },
    yieldGrowth: 0.07,
    priority: 5,
    reserveFloor: { power: 8, biomass: 6 },
    interfaceDuty: '展示人口承载、奢侈品与声望。',
    note: '中期人口建筑，负责把消费转化为声望和奢侈品。',
  },
  M: {
    id: 'M',
    code: 'M',
    name: '新月府',
    subtitle: '后期居住 · 低耗承载',
    role: 'habitat',
    unlockYear: 30,
    maxLevel: 5,
    baseYield: { population: 2.6, oxygen: 0.8, knowledge: 0.6, power: -0.8, water: -0.4 },
    baseUpgradeCost: { alloy: 18, regolith: 16, water: 8, population: 1 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { power: 10, population: 10 },
    interfaceDuty: '展示低耗人口承载与居住效率。',
    note: '后期人口建筑，单位消耗更低，但依赖月穹生态环。',
  },
  D: {
    id: 'D',
    code: 'D',
    name: '冠冕星舰坞',
    subtitle: '终局工程 · 御座号',
    role: 'ship',
    unlockYear: 48,
    maxLevel: 5,
    baseYield: { power: -5.0, alloy: -3.0, quantumCore: -1.2, currency: -1.0, knowledge: 0.8 },
    baseUpgradeCost: { alloy: 40, quantumCore: 6, currency: 16, population: 4 },
    yieldGrowth: 0.1,
    priority: 12,
    reserveFloor: { power: 14, alloy: 12, quantumCore: 2, currency: 6 },
    interfaceDuty: '展示星舰工程进度、材料消耗和胜利条件。',
    note: 'Demo 版本的胜利目标建筑，所有资源最终汇入此处。',
    phaseNotes: [
      { name: '建造', note: '投入合金与能源，没有有效回报。' },
      { name: '装配', note: '需要量子计算核心与人口支持。' },
      { name: '启航', note: '星舰进度达成后结束试验。' },
    ],
  },
}

export const facilityOrder: FacilityId[] = ['E1', 'C1', 'K', 'B', 'E2', 'C2', 'F', 'P', 'R', 'L', 'H', 'M', 'S', 'E3', 'D']

export const resourceText = (bundle: Partial<Resources>) =>
  resourceOrder
    .map(key => (bundle[key] ? `${resourceMeta[key].label} ${bundle[key]}` : null))
    .filter(Boolean)
    .join('、')

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

export const weightedValue = (bundle: Partial<Resources>, weights: Resources = resourceWeights) =>
  resourceOrder.reduce((sum, key) => sum + (bundle[key] ?? 0) * weights[key], 0)

export function projectFacilityNet(
  spec: FacilityEconomySpec,
  level: number,
  modifiers: FacilityModifiers = {},
): Partial<Resources> {
  if (level <= 0) return {}
  const outputMultiplier = modifiers.outputMultiplier ?? 1
  const upkeepMultiplier = modifiers.upkeepMultiplier ?? 1
  const levelScale = level * (1 + Math.max(0, level - 1) * spec.yieldGrowth)
  const net: Partial<Resources> = {}

  resourceOrder.forEach(key => {
    const base = spec.baseYield[key] ?? 0
    if (!base) return
    const scale = base > 0 ? outputMultiplier : upkeepMultiplier
    net[key] = (net[key] ?? 0) + base * levelScale * scale
  })

  return net
}

export function projectFacilityCost(spec: FacilityEconomySpec, level: number): Partial<Resources> {
  const nextLevel = Math.max(1, level + 1)
  const cost: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const base = spec.baseUpgradeCost[key] ?? 0
    if (!base) return
    cost[key] = base * nextLevel
  })
  return cost
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

export function projectAnnualNet(context: AnnualContext): Resources {
  const total = emptyResources()

  facilityOrder.forEach(id => {
    const facility = context.facilities[id]
    if (!facility || facility.level <= 0) return
    const spec = facilityEconomySpecs[id]
    const modifiers = context.modifiers[id] ?? {}
    const contribution = projectFacilityNet(spec, facility.level, modifiers)
    resourceOrder.forEach(key => {
      total[key] += contribution[key] ?? 0
    })
  })

  if (context.globalBonus) {
    resourceOrder.forEach(key => {
      total[key] += context.globalBonus?.[key] ?? 0
    })
  }

  return total
}

export type PlanInput = {
  resources: Resources
  facilities: FacilityState[]
  modifiers?: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  reserveFloors?: Partial<Resources>
  weights?: Partial<Resources>
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
      targetLevels,
      weightedProfit: 0,
      projectedResources: { ...input.resources },
    }
  }

  let workingResources = { ...input.resources }
  let weightedProfit = 0
  const actions: AutomationAction[] = []

  const evaluate = (id: FacilityId) => {
    const current = stateById[id]
    const spec = facilityEconomySpecs[id]
    if (year < spec.unlockYear || current.level >= spec.maxLevel) return null

    const cost = projectFacilityCost(spec, current.level)
    if (!canAfford(workingResources, cost)) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const presentNet = projectFacilityNet(spec, current.level, modifiers)
    const upgradedNet = projectFacilityNet(spec, current.level + 1, modifiers)
    const annualGain = mergeBundles(upgradedNet)
    resourceOrder.forEach(key => {
      annualGain[key] = (upgradedNet[key] ?? 0) - (presentNet[key] ?? 0)
    })

    const projectedResources = applyBundle(workingResources, cost, -1)
    const nextYearProjection = applyBundle(projectedResources, upgradedNet)
    if (!meetsFloor(nextYearProjection, reserveFloors)) return null

    const weightedGain = weightedValue(annualGain, weights)
    const weightedCost = weightedValue(cost, weights) / horizon
    const score = weightedGain - weightedCost + spec.priority * 0.45
    if (!Number.isFinite(score)) return null

    return { id, cost, projectedResources, weightedGain, weightedCost, score }
  }

  while (true) {
    const ranked = facilityOrder
      .map(evaluate)
      .filter((candidate): candidate is NonNullable<ReturnType<typeof evaluate>> => Boolean(candidate))
      .sort((a, b) => b.score - a.score)

    const best = ranked[0]
    if (!best || best.score <= 0) break

    const currentLevel = targetLevels[best.id]
    targetLevels[best.id] = currentLevel + 1
    workingResources = applyBundle(workingResources, best.cost, -1)
    weightedProfit += best.score
    actions.push({
      id: best.id,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
      score: best.score,
      weightedGain: best.weightedGain,
      weightedCost: best.weightedCost,
      cost: best.cost,
      projectedResources: best.projectedResources,
    })
    stateById[best.id] = { id: best.id, level: currentLevel + 1 }
  }

  return {
    mode: 'auto',
    actions,
    targetLevels,
    weightedProfit,
    projectedResources: workingResources,
  }
}

export const buildResearchBonus = (techs: string[]) => ({
  power: techs.some(tech => tech.includes('日冕')) ? 2 : 0,
  water: techs.some(tech => tech.includes('生态')) ? 1 : 0,
})

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
