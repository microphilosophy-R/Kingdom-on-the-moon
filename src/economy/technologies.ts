import { resourceOrder } from './resources'
import type { FacilityEconomySpec, ProductionMethod, ProductionMethodId, ResourceKey, Resources, TechnologyId, TechnologySpec } from './types'
const eraPopulationScale: Record<NonNullable<TechnologySpec['era']>, number> = {
  early: 8,
  mid: 24,
  late: 60,
}

const globalTechnologyScale: Record<NonNullable<TechnologySpec['era']>, number> = {
  early: 40,
  mid: 300,
  late: 1000,
}

const tradeTechnologyScale: Record<NonNullable<TechnologySpec['era']>, number> = {
  early: 20,
  mid: 150,
  late: 500,
}

const technologyMagnitude = (tech: TechnologySpec) => {
  if (tech.category === 'construction') return 0
  if (tech.category === 'global') return 0.02
  if (tech.category === 'facility-efficiency') return 0.06
  if (tech.category === 'production-method') return 0.10
  if (tech.category === 'trade') return 0.04
  return 0.03
}

const technologyBaseScale = (tech: TechnologySpec) => {
  const era = tech.era ?? 'early'
  if (tech.scope === 'G') return globalTechnologyScale[era]
  if (tech.scope === 'S') return tradeTechnologyScale[era]
  return eraPopulationScale[era]
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
    note: 'E1 日冕能源署电力输出 +5%，水消耗 +5%。把光伏阵列的角度校准到太渊的光路——多产一点电，多喝一口水。',
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
    note: 'C1 静海采掘署月壤输出 +5%，电力消耗 +5%。钻头阵列排得更密，月面少了一块皮，电表也转得更急。',
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
    note: 'B 水培生态球生物质输出 +5%，水消耗 +5%。藻膜闭环更密，长得更快，也喝得更急。',
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
    note: '全局生产吞吐 +1%（输入与输出同步 +1%）；建筑扩大/缩小时间 -5%。天工软件让机器更勤快一点——进得多，出得多。',
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

export const applyTechnologyToMethod = (
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
      scaleBundleResource(input, key, 1.01)
    })
  }

  if (hasTech(techs, 'TG-2')) scaleBundleResource(input, 'power', 0.95)

  if (spec.id === 'E1' && hasTech(techs, 'TE1-2')) {
    scaleBundleResource(output, 'power', 1.05)
    scaleBundleResource(input, 'water', 1.05)
  }
  if (spec.id === 'C1' && method.id === 'MC1-1' && hasTech(techs, 'TC1-1')) {
    scaleBundleResource(output, 'regolith', 1.05)
    scaleBundleResource(input, 'power', 1.05)
  }
  if (spec.id === 'C2' && method.id === 'MC2-1' && hasTech(techs, 'TC2-1')) {
    scaleBundleResource(output, 'alloy', 1.05)
    scaleBundleResource(input, 'oxygen', 1.05)
  }
  if (spec.id === 'B' && method.id === 'MB-1' && hasTech(techs, 'TB-1')) {
    scaleBundleResource(output, 'biomass', 1.05)
    scaleBundleResource(input, 'water', 1.05)
  }
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
