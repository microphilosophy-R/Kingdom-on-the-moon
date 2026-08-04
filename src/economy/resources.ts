import type { ProductionMethod, ResourceKey, Resources, ResourceSpec } from './types'
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

export const nonStorableResourceKeys = resourceOrder.filter(key => !resourceMeta[key].storable)

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
  water: 2.0,
  oxygen: 2.0,
  biomass: 3.0,
  regolith: 1.0,
  alloy: 5.0,
  quantumCore: 36.0,
  currency: 1.0,
  population: 1200.0,
  knowledge: 3.0,
  luxury: 6.0,
}

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
  resourceOrder.every(key => {
    const required = price[key] ?? 0
    return required <= 0 || bank[key] >= required
  })

export const applyBundle = (bank: Resources, change: Partial<Resources>, direction = 1): Resources => {
  const next = { ...bank }
  resourceOrder.forEach(key => {
    const delta = change[key] ?? 0
    next[key] = next[key] + direction * delta
  })
  return next
}

export const settleDailyResources = (bank: Resources, dailyNet: Partial<Resources>): Resources => {
  const next = applyBundle(bank, dailyNet)
  nonStorableResourceKeys.forEach(key => {
    next[key] = dailyNet[key] ?? 0
  })
  return next
}

export const weightedValue = (bundle: Partial<Resources>, weights: Resources = resourceWeights) =>
  resourceOrder.reduce((sum, key) => sum + (bundle[key] ?? 0) * weights[key], 0)
