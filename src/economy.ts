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
  unlocksFacility?: FacilityId
  unlocks?: ProductionMethodId
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
  modifiers: Partial<Record<FacilityId, FacilityModifiers>>
  globalBonus?: Partial<Resources>
  techs?: string[]
  productionMethods?: Partial<Record<FacilityId, ProductionMethodId>>
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
    coreUse: '经济系统的基础资源，维持大部分设施运行。',
    deficit: '设施按优先级降载，投入与产出同步缩减。',
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
    source: 'C1 静海采掘署、C2 西海采掘署、R 月穹生态环、S 星海交易港',
    coreUse: '生命维持、人口供给与生态改造。',
    deficit: '人口下降，相关建筑重新调整直到恢复盈余。',
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
    source: 'B 水培生态球、F 天工精炼署、E1 日冕能源署、R 月穹生态环、S 星海交易港',
    coreUse: '生命维持与生产。',
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
    source: 'B 水培生态球、P 伊犁河谷、R 月穹生态环、S 星海交易港',
    coreUse: '生命维持、人口供给与生产。',
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
    source: 'C1 静海采掘署、C2 西海采掘署、P 伊犁河谷、S 星海交易港',
    coreUse: '初级工业品、前期贸易出口与基础建设。',
    deficit: '相关生产建筑停止运行，直到恢复盈余。',
    tradeRule: '可交易；后期可逐渐成为进口资源。',
    autoBuyRule: '可由交易港按最低线补足。',
    tradable: true,
    storable: true,
    reserveFloor: 12,
    weight: 1.2,
  },
  alloy: {
    label: '合金',
    category: 'matter',
    source: 'F 天工精炼署、C2 西海采掘署、P 伊犁河谷、S 星海交易港',
    coreUse: '中级工业品、星舰与后期高级设施材料。',
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
    source: 'L 问天研究实验室、S 星海交易港',
    coreUse: '高级工业品、后期高级建筑与星舰材料。',
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
    source: 'K 月面王城、F 天工精炼署',
    coreUse: '星海交易港结算货币。',
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
    source: 'K 月面王城、H 翡翠宫、M 新月府、S 星海交易港',
    coreUse: '居民总数与劳动力总量。',
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
    source: 'L 问天研究实验室、S 星海交易港',
    coreUse: '解锁更先进的科技。',
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
    source: 'H 翡翠宫、S 星海交易港',
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

export const technologyCatalog: Record<TechnologyId, TechnologySpec> = {
  'TE1-0': {
    id: 'TE1-0',
    name: '日冕能源署建造许可',
    scope: 'E1',
    unlocksFacility: 'E1',
    note: '解锁 E1 日冕能源署建造。初始默认具备。',
  },
  'TE1-1': {
    id: 'TE1-1',
    name: '纳米光催化剂',
    scope: 'E1',
    unlocks: 'ME1-2',
    note: '解锁 E1 日冕能源署可选生产方式：增加水资源输入与氧气输出。',
  },
  'TE2-0': {
    id: 'TE2-0',
    name: '月冕能源署建造许可',
    scope: 'E2',
    unlocksFacility: 'E2',
    note: '解锁 E2 月冕能源署建造。',
  },
  'TE3-0': {
    id: 'TE3-0',
    name: '外星科技：微型黑洞约束',
    scope: 'E3',
    unlocksFacility: 'E3',
    unlocks: 'ME3-1',
    note: '解锁 E3 归元装置建造与 ME3-1 生产方式；以微型黑洞压缩物质获取能量，不消耗资源。',
  },
  'TC1-0': {
    id: 'TC1-0',
    name: '静海采掘署建造许可',
    scope: 'C1',
    unlocksFacility: 'C1',
    note: '解锁 C1 静海采掘署建造。初始默认具备。',
  },
  'TC2-0': {
    id: 'TC2-0',
    name: '西海采掘署建造许可',
    scope: 'C2',
    unlocksFacility: 'C2',
    note: '解锁 C2 西海采掘署建造。',
  },
  'TB-0': {
    id: 'TB-0',
    name: '水培生态球建造许可',
    scope: 'B',
    unlocksFacility: 'B',
    note: '解锁 B 水培生态球建造。',
  },
  'TF-0': {
    id: 'TF-0',
    name: '天工精炼署建造许可',
    scope: 'F',
    unlocksFacility: 'F',
    note: '解锁 F 天工精炼署建造。',
  },
  'TF-1': {
    id: 'TF-1',
    name: '重原子炼金术',
    scope: 'F',
    unlocks: 'MF-2',
    note: '解锁 F 天工精炼署可选生产方式，使其后期可获得星海货币。',
  },
  'TP-0': {
    id: 'TP-0',
    name: '伊犁河谷建造许可',
    scope: 'P',
    unlocksFacility: 'P',
    note: '解锁 P 伊犁河谷建造。',
  },
  'TR-0': {
    id: 'TR-0',
    name: '月穹生态环建造许可',
    scope: 'R',
    unlocksFacility: 'R',
    note: '解锁 R 月穹生态环建造。',
  },
  'TS-0': {
    id: 'TS-0',
    name: '星海交易港建造许可',
    scope: 'S',
    unlocksFacility: 'S',
    note: '解锁 S 星海交易港建造。',
  },
  'TK-0': {
    id: 'TK-0',
    name: '月面王城建造许可',
    scope: 'K',
    unlocksFacility: 'K',
    note: '解锁 K 月面王城建造。初始默认具备。',
  },
  'TL-0': {
    id: 'TL-0',
    name: '问天研究实验室建造许可',
    scope: 'L',
    unlocksFacility: 'L',
    note: '解锁 L 问天研究实验室建造。',
  },
  'TL-1': {
    id: 'TL-1',
    name: '原子阵列光刻机',
    scope: 'L',
    unlocks: 'ML-2',
    note: '解锁 L 问天研究实验室可选生产方式，使其可生产量子计算核心。',
  },
  'TH-0': {
    id: 'TH-0',
    name: '翡翠宫建造许可',
    scope: 'H',
    unlocksFacility: 'H',
    note: '解锁 H 翡翠宫建造。',
  },
  'TM-0': {
    id: 'TM-0',
    name: '新月府建造许可',
    scope: 'M',
    unlocksFacility: 'M',
    note: '解锁 M 新月府建造；该科技应在月穹生态环完成后取得。',
  },
  'TD-0': {
    id: 'TD-0',
    name: '冠冕星舰坞建造许可',
    scope: 'D',
    unlocksFacility: 'D',
    note: '解锁 D 冠冕星舰坞建造。',
  },
  'TS-1': {
    id: 'TS-1',
    name: '星际劳工',
    scope: 'S',
    note: '解锁星海交易港处理其它星域人力资源的双向贸易。',
  },
  'TS-2': {
    id: 'TS-2',
    name: '知识传输协议',
    scope: 'S',
    note: '解锁星海交易港处理知识的双向贸易。',
  },
  'TS-3': {
    id: 'TS-3',
    name: '玫瑰星球',
    scope: 'S',
    note: '解锁星海交易港处理艺术奢侈品的双向贸易。',
  },
}

export const defaultStartingTechs = [
  'TE1-0 日冕能源署建造许可',
  'TC1-0 静海采掘署建造许可',
  'TK-0 月面王城建造许可',
]

const methodNet = (input: Partial<Resources>, output: Partial<Resources>): Partial<Resources> => {
  const net: Partial<Resources> = {}
  resourceOrder.forEach(key => {
    const value = (output[key] ?? 0) - (input[key] ?? 0)
    if (value) net[key] = value
  })
  return net
}

export const hasTech = (techs: string[] = [], techId?: TechnologyId) => {
  if (!techId) return true
  const tech = technologyCatalog[techId]
  return techs.some(item => item.includes(techId) || (tech && item.includes(tech.name)))
}

export const hasRequiredFacilityTech = (spec: FacilityEconomySpec, techs: string[] = []) =>
  hasTech(techs, spec.requiredTech)

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

export const facilityEconomySpecs: Record<FacilityId, FacilityEconomySpec> = {
  E1: {
    id: 'E1',
    code: 'E1',
    name: '日冕能源署',
    subtitle: '电力来源 · 光伏发电',
    role: 'energy',
    unlockYear: 0,
    requiredTech: 'TE1-0',
    maxLevel: 5,
    baseUpgradeCost: { regolith: 10, alloy: 8 },
    yieldGrowth: 0.06,
    priority: 10,
    reserveFloor: { power: 14 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '电力来源之一。ME1-1 为光伏发电，无输入、输出电力。',
    productionMethods: [
      { id: 'ME1-1', name: '光伏发电', input: {}, output: { power: 6 }, note: '无资源输入，输出电力。' },
      { id: 'ME1-2', name: '纳米光催化发电', input: { water: 0.6 }, output: { power: 6, oxygen: 1.2 }, unlockedBy: 'TE1-1', note: 'TE1-1 解锁后增加水资源输入和氧气输出。' },
    ],
  },
  E2: {
    id: 'E2',
    code: 'E2',
    name: '月冕能源署',
    subtitle: '电力来源 · He3 聚变',
    role: 'energy',
    unlockYear: 8,
    requiredTech: 'TE2-0',
    maxLevel: 5,
    baseUpgradeCost: { regolith: 12, alloy: 10, currency: 4 },
    yieldGrowth: 0.07,
    priority: 9,
    reserveFloor: { power: 16, regolith: 10 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '电力来源之一。He3 聚变发电需要消耗月壤。',
    productionMethods: [
      { id: 'ME2-1', name: 'He3 聚变发电', input: { regolith: 1.4 }, output: { power: 8 }, note: '消耗月壤，输出电力。' },
    ],
  },
  E3: {
    id: 'E3',
    code: 'E3',
    name: '归元装置',
    subtitle: '电力来源 · 外星科技解锁',
    role: 'energy',
    unlockYear: 36,
    requiredTech: 'TE3-0',
    maxLevel: 4,
    baseUpgradeCost: { alloy: 18, quantumCore: 2, currency: 6 },
    yieldGrowth: 0.1,
    priority: 8,
    reserveFloor: { power: 12, quantumCore: 1 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '电力来源之一。由外星科技解锁，以微型黑洞压缩物质获取能量，不消耗资源。',
    productionMethods: [
      { id: 'ME3-1', name: '微型黑洞压缩', input: {}, output: { power: 10 }, unlockedBy: 'TE3-0', note: 'TE3-0 解锁；不消耗资源，输出电力。' },
    ],
  },
  C1: {
    id: 'C1',
    code: 'C1',
    name: '静海采掘署',
    subtitle: '水 · 月壤',
    role: 'extraction',
    unlockYear: 0,
    requiredTech: 'TC1-0',
    maxLevel: 5,
    baseUpgradeCost: { power: 12, alloy: 4 },
    yieldGrowth: 0.05,
    priority: 8,
    reserveFloor: { power: 10 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '本地月面开采设施，水与月壤来源之一。采掘运行消耗电力。',
    productionMethods: [
      { id: 'MC1-1', name: '静海月面采掘', input: { power: 1 }, output: { water: 1.1, regolith: 4.2 }, note: '静海表示在本地月面开采；消耗电力，产出水与月壤。' },
    ],
  },
  C2: {
    id: 'C2',
    code: 'C2',
    name: '西海采掘署',
    subtitle: '小行星带 · 水 · 月壤 · 合金',
    role: 'extraction',
    unlockYear: 10,
    requiredTech: 'TC2-0',
    maxLevel: 5,
    baseUpgradeCost: { power: 14, alloy: 6, currency: 3 },
    yieldGrowth: 0.06,
    priority: 8,
    reserveFloor: { power: 10, water: 6, oxygen: 6, biomass: 4 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '小行星带开采设施，水、月壤与合金来源之一。远征采掘消耗电力、水、氧气和生物质。',
    productionMethods: [
      { id: 'MC2-1', name: '西海小行星带采掘', input: { power: 1.4, water: 0.3, oxygen: 0.4, biomass: 0.2 }, output: { water: 0.8, regolith: 3.4, alloy: 1.2 }, note: '西海表示在小行星带开采；额外消耗水、氧气和生物质，产出水、月壤与合金。' },
    ],
  },
  B: {
    id: 'B',
    code: 'B',
    name: '水培生态球',
    subtitle: '氧气 · 生物质',
    role: 'life',
    unlockYear: 4,
    requiredTech: 'TB-0',
    maxLevel: 5,
    baseUpgradeCost: { power: 16, water: 6, regolith: 8 },
    yieldGrowth: 0.07,
    priority: 10,
    reserveFloor: { water: 10, oxygen: 12, biomass: 8 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '氧气与生物质来源之一。生产方式消耗水资源。',
    productionMethods: [
      { id: 'MB-1', name: '水培生态循环', input: { water: 0.8 }, output: { oxygen: 2.6, biomass: 1.8 }, note: '消耗水，产出氧气与生物质。' },
    ],
  },
  F: {
    id: 'F',
    code: 'F',
    name: '天工精炼署',
    subtitle: '氧气 · 合金 · 星海货币',
    role: 'industry',
    unlockYear: 12,
    requiredTech: 'TF-0',
    maxLevel: 5,
    baseUpgradeCost: { regolith: 10, power: 12, currency: 4 },
    yieldGrowth: 0.07,
    priority: 8,
    reserveFloor: { power: 10, regolith: 10 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '氧气、合金与后期星海货币来源之一。生产方式消耗电力和月壤。',
    productionMethods: [
      { id: 'MF-1', name: '天工精炼', input: { power: 1.2, regolith: 1.6 }, output: { alloy: 2.2, oxygen: 0.4 }, note: '消耗电力与月壤，产出合金与氧气。' },
      { id: 'MF-2', name: '重原子炼金', input: { power: 1.6, regolith: 1.4 }, output: { alloy: 1.8, oxygen: 0.3, currency: 1.0 }, unlockedBy: 'TF-1', note: 'TF-1 解锁后获得星海货币产出。' },
    ],
  },
  P: {
    id: 'P',
    code: 'P',
    name: '伊犁河谷',
    subtitle: '水 · 生物质 · 月壤 · 合金',
    role: 'ecology',
    unlockYear: 14,
    requiredTech: 'TP-0',
    maxLevel: 5,
    baseUpgradeCost: { water: 8, regolith: 10, power: 6 },
    yieldGrowth: 0.05,
    priority: 7,
    reserveFloor: { water: 10, biomass: 8 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '水、生物质、月壤与合金来源之一；当前文档未定义额外输入。',
    productionMethods: [
      { id: 'MP-1', name: '河谷综合产出', input: {}, output: { water: 0.4, biomass: 1.8, regolith: 0.8, alloy: 0.3 }, note: '暂按文档来源表实现为综合产出。' },
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
    maxLevel: 4,
    baseUpgradeCost: { water: 10, biomass: 8, alloy: 10, power: 12 },
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
    maxLevel: 4,
    baseUpgradeCost: { alloy: 18, currency: 10, power: 10 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { currency: 8, power: 10 },
    interfaceDuty: '特殊设施页展示双向贸易、手动补充与自动购买状态。',
    note: '贸易建筑，不需要消耗人力运行；已解锁的星港科技均按双向贸易处理。',
    productionMethods: [
      { id: 'MS-1', name: '贸易结算', input: {}, output: {}, note: '不产生固定年净值；双向贸易由市场与自动购买规则处理。' },
    ],
    phaseNotes: [
      { name: '双向贸易', note: '星港科技解锁的贸易品类均可双向处理。' },
      { name: '手动补充', note: '可以手动补充已开放贸易品类。' },
      { name: '自动购买', note: '星海货币赤字时暂停，恢复盈余后继续。' },
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
    maxLevel: 3,
    baseUpgradeCost: { regolith: 12, alloy: 10, power: 10 },
    yieldGrowth: 0.08,
    priority: 10,
    reserveFloor: { population: 10 },
    interfaceDuty: '特殊设施页展示人口、税收与政策界面。',
    note: '可以容纳人口、提供税收、制定政策，并显示政策界面。',
    productionMethods: [
      { id: 'MK-1', name: '王城人口与税收', input: { water: 0.3, oxygen: 0.3, biomass: 0.3 }, output: { population: 1.2, currency: 0.8 }, note: '前期人口建筑；税收与人口成正比。' },
    ],
    phaseNotes: [
      { name: '人口', note: '月面王城是前期人口建筑。' },
      { name: '税收', note: '通过征税获得铸币权，星海货币与人口成正比。' },
      { name: '政策', note: '显示政策界面，并允许制定政策。' },
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
    maxLevel: 5,
    baseUpgradeCost: { power: 16, alloy: 16, currency: 8, population: 2 },
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
    subtitle: '人口 · 艺术奢侈品',
    role: 'culture',
    unlockYear: 26,
    requiredTech: 'TH-0',
    maxLevel: 4,
    baseUpgradeCost: { alloy: 14, power: 12, biomass: 6 },
    yieldGrowth: 0.07,
    priority: 5,
    reserveFloor: { biomass: 6 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '中期人口建筑，单位人口资源消耗更高，但会产出艺术奢侈品。',
    productionMethods: [
      { id: 'MH-1', name: '宫廷供养', input: { water: 0.5, oxygen: 0.5, biomass: 0.8 }, output: { population: 1, luxury: 0.9 }, note: '更高单位人口消耗，产出艺术奢侈品。' },
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
    maxLevel: 5,
    baseUpgradeCost: { alloy: 18, regolith: 16, water: 8, population: 1 },
    yieldGrowth: 0.05,
    priority: 6,
    reserveFloor: { population: 10 },
    interfaceDuty: '一般设施页展示配方与产量。',
    note: '后期人口建筑，单位人口资源消耗更低，但需要完成月穹生态环。',
    productionMethods: [
      { id: 'MM-1', name: '新月府居住', input: { water: 0.2, oxygen: 0.2, biomass: 0.3 }, output: { population: 1.2 }, note: '低单位消耗的人口建筑；需要完成月穹生态环。' },
    ],
  },
  D: {
    id: 'D',
    code: 'D',
    name: '冠冕星舰坞',
    subtitle: '胜利目标 · 远洋星舰项目',
    role: 'ship',
    unlockYear: 48,
    requiredTech: 'TD-0',
    maxLevel: 5,
    baseUpgradeCost: { alloy: 40, quantumCore: 6, currency: 16, population: 4 },
    yieldGrowth: 0.1,
    priority: 12,
    reserveFloor: { power: 14, alloy: 12, quantumCore: 2, currency: 6 },
    interfaceDuty: '特殊设施页展示星舰项目进度、物资与人力供应。',
    note: 'Demo 版本的胜利目标建筑；默认运行一个远洋星舰项目。',
    productionMethods: [
      { id: 'MD-1', name: '远洋星舰建造', input: { power: 4, alloy: 3, quantumCore: 1, currency: 1, population: 0.5 }, output: {}, note: '扩大规模、解锁科技、保证物资与人力供应都可以加速项目推进。' },
    ],
    phaseNotes: [
      { name: '项目', note: '默认运行一个远洋星舰项目。' },
      { name: '加速', note: '扩大建筑规模、解锁科技、保证物资与人力供应都可以加速推进。' },
      { name: '目标', note: '作为 Demo 版本游戏的胜利目标建筑。' },
    ],
  },
}

export const facilityOrder: FacilityId[] = ['E1', 'C1', 'K', 'B', 'E2', 'C2', 'F', 'P', 'R', 'L', 'H', 'M', 'S', 'E3', 'D']

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

export const weightedValue = (bundle: Partial<Resources>, weights: Resources = resourceWeights) =>
  resourceOrder.reduce((sum, key) => sum + (bundle[key] ?? 0) * weights[key], 0)

export function projectFacilityNet(
  spec: FacilityEconomySpec,
  level: number,
  modifiers: FacilityModifiers = {},
  techs: string[] = [],
  selectedMethodId?: ProductionMethodId,
): Partial<Resources> {
  if (level <= 0) return {}
  if (!hasRequiredFacilityTech(spec, techs)) return {}
  const method = selectProductionMethod(spec.productionMethods, techs, selectedMethodId)
  if (!canUseProductionMethod(method, techs)) return {}
  const baseYield = methodNet(method.input, method.output)
  const outputMultiplier = modifiers.outputMultiplier ?? 1
  const upkeepMultiplier = modifiers.upkeepMultiplier ?? 1
  const levelScale = level * (1 + Math.max(0, level - 1) * spec.yieldGrowth)
  const net: Partial<Resources> = {}

  resourceOrder.forEach(key => {
    const base = baseYield[key] ?? 0
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
    const contribution = projectFacilityNet(spec, facility.level, modifiers, context.techs, context.productionMethods?.[id])
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
    if (!canBuildFacility(spec, year, input.techs) || current.level >= spec.maxLevel) return null

    const cost = projectFacilityCost(spec, current.level)
    if (!canAfford(workingResources, cost)) return null

    const modifiers = input.modifiers?.[id] ?? {}
    const presentNet = projectFacilityNet(spec, current.level, modifiers, input.techs, input.productionMethods?.[id])
    const upgradedNet = projectFacilityNet(spec, current.level + 1, modifiers, input.techs, input.productionMethods?.[id])
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
