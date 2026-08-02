import type { FacilityId, Resources } from './economy'

export type Role = {
  id: string
  name: string
  species: string
  glyph: string
  portrait: string
  specialty: FacilityId
  boost: number
  retainerCost: Partial<Resources>
  quote: string
}

export type EventEffect = { give: Partial<Resources>; take: Partial<Resources>; tech?: string }
export type EventInteraction = 'techTrade' | 'starportTrade' | 'hire' | 'gift' | 'request' | 'accident' | 'rareTrade' | 'chainChoice'

export type EventStep = {
  id: string
  title: string
  body: string
  interaction: EventInteraction
  offer?: EventEffect
  rolls?: EventEffect[]
  hireCost?: Partial<Resources>
  concealed?: boolean
  note?: string
}

export type EventChain = {
  id: string
  roleId: string
  arc: 'simple' | 'long'
  stage: 'early' | 'mid' | 'late'
  events: EventStep[]
}

export type Encounter = Role & {
  chain: EventChain
  event: EventStep
  offer: EventEffect
}

export const roles: Role[] = [
  {
    id: 'sava',
    name: '萨瓦·碎光',
    species: '折光甲壳人 / 来自太渊内侧第三轨道',
    glyph: '◈',
    portrait: '冰裂色甲壳在太渊金光下折射出冷蓝纹路，掌中托着一枚向内塌缩燃烧的晶体',
    specialty: 'E1',
    boost: 0.42,
    retainerCost: { water: 2, currency: 4 },
    quote: '“你们把恒星装进了贡箱，我可以让它少吃一点——但别指望它感恩。”',
  },
  {
    id: 'melu',
    name: '梅露·第九孢',
    species: '浮游菌落使节 / 来自太渊环带孢子云',
    glyph: '❋',
    portrait: '以琥珀孢囊维持人形，靠近时能听见孢壁内细密的雨声，像一颗被封装的生态',
    specialty: 'B',
    boost: 0.48,
    retainerCost: { biomass: 3, currency: 3 },
    quote: '“土壤记得每一位被埋葬的王。你们的还很年轻——年轻到仍然以为活着是理所当然。”',
  },
  {
    id: 'orri',
    name: '欧里·无重力',
    species: '轨道鲸后裔 / 来自太渊引力阱外缘',
    glyph: '☾',
    portrait: '一团悬浮的银灰潮汐，没有固定骨骼，发声时舱壁会随其低频共振而微微颤抖',
    specialty: 'D',
    boost: 0.55,
    retainerCost: { alloy: 8, quantumCore: 1 },
    quote: '“星舰的骨骼不该只记得重力，也要记得离开它。你那位王，他的脚记得太牢了。”',
  },
  {
    id: 'nix',
    name: '尼克斯·二十七',
    species: '退役礼仪机 / 产地不明，太渊星域旧制式',
    glyph: '⌘',
    portrait: '黄铜面孔上七位旧主徽记层层覆盖，最底层的王徽仍在缓慢闪烁，像不肯熄灭的效忠',
    specialty: 'K',
    boost: 0.4,
    retainerCost: { currency: 6 },
    quote: '“我曾侍奉过七位不朽君主，结果都差不多。你看上去比他们清醒，这未必是好事。”',
  },
  {
    id: 'taro',
    name: '塔罗·掘井者',
    species: '硅酸盐游牧民 / 来自太渊外环碎屑带',
    glyph: '◇',
    portrait: '石英皮肤上刻满失落小行星的矿脉图，指尖触地时能感知月面深处缓慢的应力',
    specialty: 'C1',
    boost: 0.46,
    retainerCost: { regolith: 10, oxygen: 2 },
    quote: '“月亮不是死的，只是它把话说得很慢。你们踩在上面，却从来没弯下耳朵听过。”',
  },
  {
    id: 'evi',
    name: '伊芙·回声',
    species: '声学群体 / 来自太渊磁层共振腔',
    glyph: '≈',
    portrait: '数十条细小波纹在王冠形扬声器中彼此回答，没有身体，只有被器物收容的共鸣',
    specialty: 'H',
    boost: 0.5,
    retainerCost: { power: 6, luxury: 2 },
    quote: '“我听见你们把孤独叫作秩序，所以来收集一点。孤独是会回声的，你们知道吗？”',
  },
  {
    id: 'rosa',
    name: '罗莎·花冠',
    species: '玫瑰星球商团 / 来自太渊跃迁走廊另一端',
    glyph: '✦',
    portrait: '礼服像一层会呼吸的薄雾，袖口封着来自玫瑰星球的香料账册，行走间有花瓣碎裂的气味',
    specialty: 'S',
    boost: 0.44,
    retainerCost: { luxury: 4, currency: 8 },
    quote: '“奢侈品不是多余之物。它们是文明愿意承认自己仍有余裕——你治下的月面，目前还没有这个余裕。”',
  },
  {
    id: 'atya',
    name: '阿缇娅·灰舟',
    species: '流亡栖居者 / 原籍伊甸星系，家园已沦陷',
    glyph: '✧',
    portrait: '披着烧焦的聚合毯，怀中抱着一枚仍在发热的家园坐标核，眼底有被追了很久的人特有的警觉',
    specialty: 'C2',
    boost: 0.38,
    retainerCost: { oxygen: 6, biomass: 6 },
    quote: '“请别把我们交回黑夜。我们知道一颗还活着的行星在哪里——它比这颗石头温柔得多。”',
  },
]

export const eventChains: EventChain[] = [
  {
    id: 'sava-catalyst',
    roleId: 'sava',
    arc: 'simple',
    stage: 'early',
    events: [{
      id: 'sava-1',
      title: '逆燃晶体',
      body: '萨瓦献上一枚向内塌缩的晶体，它燃烧时不发光，反而吞光。她要求一批月面水样校准光谱，说这颗石头认得水。',
      interaction: 'techTrade',
      offer: { give: { quantumCore: 3, knowledge: 6 }, take: { water: 6 }, tech: 'TE1-1 纳米光催化剂' },
    }],
  },
  {
    id: 'melu-waterless',
    roleId: 'melu',
    arc: 'simple',
    stage: 'early',
    events: [{
      id: 'melu-1',
      title: '干燥孢囊',
      body: '梅露把一枚琥珀孢囊放在月尘里。它没有寻找水，而是把月壤咬开，从中抽出一层细小的根——孢囊里封着的，是一整段不需要雨的生态记忆。',
      interaction: 'gift',
      offer: { give: { oxygen: 12, biomass: 8 }, take: {}, tech: 'TB-2 无水栽培技术' },
    }],
  },
  {
    id: 'orri-leviathan',
    roleId: 'orri',
    arc: 'long',
    stage: 'late',
    events: [
      {
        id: 'orri-1',
        title: '无重力的骨骼',
        body: '欧里请求查看星舰坞的龙骨图。他没有索要报酬，只说某些骨骼必须先学会遗忘月球，否则飞不远。他悬浮在龙骨上方，银灰潮汐轻轻拍打着合金。',
        interaction: 'rareTrade',
        offer: { give: { alloy: 22, quantumCore: 2 }, take: { regolith: 8, power: 12 } },
      },
      {
        id: 'orri-2',
        title: '潮汐校准',
        body: '他要求一次高能潮汐试验，没有给出明确保证。只有舱壁上逐渐变低的振动声，和太渊金光在龙骨表面缓慢爬行的轨迹。',
        interaction: 'accident',
        concealed: true,
        rolls: [
          { give: { quantumCore: 1 }, take: { power: 10 } },
          { give: {}, take: { alloy: 8, power: 6 } },
        ],
      },
      {
        id: 'orri-3',
        title: '黑洞约束箴言',
        body: '欧里终于说出他携带的真正遗产：一套把微型黑洞系在掌心的约束箴言。他说这是轨道鲸一族的送嫁之物——她们把最危险的东西送给最想逃跑的人。',
        interaction: 'techTrade',
        offer: { give: { quantumCore: 2 }, take: { alloy: 12, power: 12 }, tech: 'TE3-0 外星科技：微型黑洞约束' },
      },
    ],
  },
  {
    id: 'nix-labor',
    roleId: 'nix',
    arc: 'simple',
    stage: 'mid',
    events: [{
      id: 'nix-1',
      title: '退役礼仪机的名册',
      body: '尼克斯带来一份劳工契约名册，要求这笔交易必须在星海交易港登记。他的黄铜面孔上，七层旧主徽记同时闪烁了一下，仿佛在替他行礼。',
      interaction: 'starportTrade',
      offer: { give: { knowledge: 14, currency: 8 }, take: { alloy: 10 }, tech: 'TS-1 星际劳工' },
      note: '固定在星海交易港添加人口 / 劳工双向贸易权限。',
    }],
  },
  {
    id: 'taro-alchemy',
    roleId: 'taro',
    arc: 'simple',
    stage: 'mid',
    events: [{
      id: 'taro-1',
      title: '小行星矿脉图',
      body: '塔罗展开一张用石英皮肤拓下来的矿脉图。图上有一段不像自然形成的炼金注释，他说是某颗死去的小行星临终前刻在自己骨头上的。',
      interaction: 'techTrade',
      offer: { give: { regolith: 30, alloy: 9 }, take: { oxygen: 7 }, tech: 'TF-1 重原子炼金术' },
    }],
  },
  {
    id: 'evi-echo',
    roleId: 'evi',
    arc: 'simple',
    stage: 'mid',
    events: [{
      id: 'evi-1',
      title: '回声接入',
      body: '伊芙请求接入王冠扬声器。她说知识会以回声抵达，但回声总会带走一点什么——可能是噪音，可能是寂静，也可能是一段你不想被听见的心事。',
      interaction: 'accident',
      concealed: true,
      rolls: [
        { give: { biomass: 10, luxury: 8 }, take: { power: 9 }, tech: 'TS-2 知识传输协议' },
        { give: { knowledge: 16 }, take: { power: 12 }, tech: 'TS-2 知识传输协议' },
      ],
    }],
  },
  {
    id: 'rosa-luxury',
    roleId: 'rosa',
    arc: 'simple',
    stage: 'mid',
    events: [{
      id: 'rosa-1',
      title: '玫瑰星球账册',
      body: '罗莎的袖口封着香料账册，行走间有花瓣碎裂的气味。她愿意让月面王国进入玫瑰星球的奢侈品航线，但她的微笑里有一句没说出口的话：你们目前还买不起。',
      interaction: 'starportTrade',
      offer: { give: { luxury: 12, currency: 12 }, take: { biomass: 8, knowledge: 4 }, tech: 'TS-3 玫瑰星球' },
      note: '固定在星海交易港添加艺术奢侈品双向贸易权限。',
    }],
  },
  {
    id: 'atya-refuge',
    roleId: 'atya',
    arc: 'long',
    stage: 'mid',
    events: [
      {
        id: 'atya-1',
        title: '家园落难的幸存者',
        body: '阿缇娅和她的族人请求留在月面。她们没有武器，只有一枚记录家园坐标的核——核还在发热，说明家园沦陷的时间不远。',
        interaction: 'request',
        offer: { give: { population: 1 }, take: { oxygen: 4, biomass: 4 } },
      },
      {
        id: 'atya-2',
        title: '追兵抵达',
        body: '一支陌生舰队要求交出幸存者。阿缇娅没有辩解，只把坐标核推到王座前。太渊的金光从舷窗照进来，在她烧焦的聚合毯上投下一道不像属于这颗卫星的暖色。',
        interaction: 'chainChoice',
        offer: { give: {}, take: { currency: 10, alloy: 8 } },
      },
      {
        id: 'atya-3',
        title: '伊甸园坐标',
        body: '赎金换来了时间。数年后，坐标核完成解密：那里不是墓碑，而是一颗仍能呼吸的生态行星。阿缇娅没有说话，只是第一次在月面上流下了不冻的泪。',
        interaction: 'techTrade',
        offer: { give: { water: 8, biomass: 8 }, take: {}, tech: 'TC2-2 发现伊甸园' },
      },
    ],
  },
]

export const emptyEffect: EventEffect = { give: {}, take: {} }
export const rolesById = Object.fromEntries(roles.map(role => [role.id, role])) as Record<string, Role>

export const rollEventEffect = (event: EventStep): EventEffect => {
  if (event.rolls?.length) return event.rolls[Math.floor(Math.random() * event.rolls.length)]
  return event.offer ?? emptyEffect
}

export const buildEncounter = (chain: EventChain, progress = 0): Encounter => {
  const role = rolesById[chain.roleId]
  const event = chain.events[Math.min(progress, chain.events.length - 1)]
  return { ...role, chain, event, offer: rollEventEffect(event) }
}

export const getAvailableEventChains = (progress: Record<string, number>) =>
  eventChains.filter(chain => (progress[chain.id] ?? 0) < chain.events.length)
