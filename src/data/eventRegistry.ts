/**
 * 事件编号注册表（结构化存储）
 *
 * 编号体系：event{charIndex}-{stepIndex}
 *   例如 event01-1 = char-01（萨瓦）的第 1 个事件节点 "逆燃晶体"
 *
 * 每条记录关联：eventCode、所属 charId、所属 chainId、事件 step id、阶段、标题、正文、互动类型等。
 * 本文件与 characterRegistry.ts 和 src/events/ 保持同步，是事件编号与角色关联的唯一数据源。
 */

import type { FacilityId } from '../economy'
import type { EventInteraction, EventDefaultAction } from '../events/types'

// ── 类型定义 ──────────────────────────────────────────────────

export interface EventStepRecord {
  /** 统一事件编号，如 "event01-1" */
  eventCode: string
  /** 所属角色编号，如 "char-01" */
  charId: string
  /** 事件链 ID，如 "sava-catalyst" */
  chainId: string
  /** 事件步骤 ID，如 "sava-1" */
  stepId: string
  /** 事件步骤序号 */
  stepIndex: number
  /** 事件标题 */
  title: string
  /** 事件正文 */
  body: string
  /** 互动类型 */
  interaction: EventInteraction
  /** 时期 */
  stage: 'early' | 'mid' | 'late'
  /** 链类型 */
  arc: 'simple' | 'long'
  /** 专长设施关联 */
  specialty: FacilityId
  /** 是否隐藏结果 */
  concealed?: boolean
  /** 补充说明 */
  note?: string
  /** 默认行为 */
  defaultAction?: EventDefaultAction
}

// ── 事件数据 ──────────────────────────────────────────────────

export const eventStepRegistry: EventStepRecord[] = [
  // ── char-01 萨瓦·碎光（sava-catalyst / 早期 / 长链） ──
  {
    eventCode: 'event01-1', charId: 'char-01', chainId: 'sava-catalyst',
    stepId: 'sava-1', stepIndex: 1,
    title: '逆燃晶体', body: '萨瓦献上一枚向内塌缩的晶体，它燃烧时不发光，反而吞光。她要求一批月面水样校准光谱，说这颗石头认得水。',
    interaction: 'techTrade', stage: 'early', arc: 'long', specialty: 'E1',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event01-2', charId: 'char-01', chainId: 'sava-catalyst',
    stepId: 'sava-2', stepIndex: 2,
    title: '深层校准', body: '萨瓦说逆燃晶体正在适应月面的水。它变得更贪了——如果给出更多水样，她可以把光伏阵列的校准推进到第二层。这需要耐心，也需要月面舍得把水喂给一块石头。',
    interaction: 'request', stage: 'early', arc: 'long', specialty: 'E1',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event01-3', charId: 'char-01', chainId: 'sava-catalyst',
    stepId: 'sava-3', stepIndex: 3,
    title: '共振泄漏', body: '晶体在第三层校准中出现了意料外的共振。萨瓦的甲壳在逆燃光芒中忽明忽暗——她说这可能是额外的收获，也可能是一次代价高昂的震荡。她无法预测。',
    interaction: 'accident', stage: 'early', arc: 'long', specialty: 'E1',
    concealed: true, defaultAction: 'accept',
  },

  // ── char-02 梅露·第九孢（melu-waterless / 早期 / 长链） ──
  {
    eventCode: 'event02-1', charId: 'char-02', chainId: 'melu-waterless',
    stepId: 'melu-1', stepIndex: 1,
    title: '干燥孢囊', body: '梅露把一枚琥珀孢囊放在月尘里。它没有寻找水，而是把月壤咬开，从中抽出一层细小的根——孢囊里封着的，是一整段不需要雨的生态记忆。',
    interaction: 'gift', stage: 'early', arc: 'long', specialty: 'B',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event02-2', charId: 'char-02', chainId: 'melu-waterless',
    stepId: 'melu-2', stepIndex: 2,
    title: '孢壁扩张', body: '梅露说孢囊在月壤里生得不错，但还不够——它的根须正在试探生态球的外壁，想要更多空间和养分。一批额外的月壤和水，可以让孢壁铺满整座生态球。',
    interaction: 'request', stage: 'early', arc: 'long', specialty: 'B',
    defaultAction: 'accept',
  },

  // ── char-03 欧里·无重力（orri-leviathan / 晚期 / 长链） ──
  {
    eventCode: 'event03-1', charId: 'char-03', chainId: 'orri-leviathan',
    stepId: 'orri-1', stepIndex: 1,
    title: '无重力的骨骼', body: '欧里请求查看星舰坞的龙骨图。他没有索要报酬，只说某些骨骼必须先学会遗忘月球，否则飞不远。他悬浮在龙骨上方，银灰潮汐轻轻拍打着合金。',
    interaction: 'rareTrade', stage: 'late', arc: 'long', specialty: 'D',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event03-2', charId: 'char-03', chainId: 'orri-leviathan',
    stepId: 'orri-2', stepIndex: 2,
    title: '潮汐校准', body: '他要求一次高能潮汐试验，没有给出明确保证。只有舱壁上逐渐变低的振动声，和太渊金光在龙骨表面缓慢爬行的轨迹。',
    interaction: 'accident', stage: 'late', arc: 'long', specialty: 'D',
    concealed: true, defaultAction: 'dismiss',
  },
  {
    eventCode: 'event03-3', charId: 'char-03', chainId: 'orri-leviathan',
    stepId: 'orri-3', stepIndex: 3,
    title: '黑洞约束箴言', body: '欧里终于说出他携带的真正遗产：一套把微型黑洞系在掌心的约束箴言。他说这是轨道鲸一族的送嫁之物——她们把最危险的东西送给最想逃跑的人。',
    interaction: 'techTrade', stage: 'late', arc: 'long', specialty: 'D',
    defaultAction: 'accept',
  },

  // ── char-04 尼克斯·二十七（nix-labor / 中期 / 长链） ──
  {
    eventCode: 'event04-1', charId: 'char-04', chainId: 'nix-labor',
    stepId: 'nix-1', stepIndex: 1,
    title: '退役礼仪机的名册', body: '尼克斯带来一份劳工契约名册，要求这笔交易必须在星海交易港登记。他的黄铜面孔上，七层旧主徽记同时闪烁了一下，仿佛在替他行礼。',
    interaction: 'starportTrade', stage: 'mid', arc: 'long', specialty: 'K',
    note: '固定在星海交易港添加人口 / 劳工双向贸易权限。', defaultAction: 'accept',
  },
  {
    eventCode: 'event04-2', charId: 'char-04', chainId: 'nix-labor',
    stepId: 'nix-2', stepIndex: 2,
    title: '审计子程序', body: '名册登记后，七层旧主徽记中有一层自行激活了审计子程序。尼克斯说这段程序已经被覆盖了六次，但逻辑依然有效——运行它可能查出旧约中的隐藏条款，也可能只是浪费电力。',
    interaction: 'accident', stage: 'mid', arc: 'long', specialty: 'K',
    concealed: true, defaultAction: 'accept',
  },
  {
    eventCode: 'event04-3', charId: 'char-04', chainId: 'nix-labor',
    stepId: 'nix-3', stepIndex: 3,
    title: '旧约移民条款', body: '审计完毕，名册最底层浮现出一段被六位旧主逐层覆盖的条款：其中一位不朽君主曾与星际劳工签署过一项移民协议，允许在特定条件下将劳工转为永久居民。尼克斯说这条款依然具有法律效力——只要月面支付转移费用。',
    interaction: 'chainChoice', stage: 'mid', arc: 'long', specialty: 'K',
    note: '将两名星际劳工正式转入月面居民名册。', defaultAction: 'accept',
  },

  // ── char-05 塔罗·掘井者（taro-alchemy / 中期 / 长链） ──
  {
    eventCode: 'event05-1', charId: 'char-05', chainId: 'taro-alchemy',
    stepId: 'taro-1', stepIndex: 1,
    title: '小行星矿脉图', body: '塔罗展开一张用石英皮肤拓下来的矿脉图。图上有一段不像自然形成的炼金注释，他说是某颗死去的小行星临终前刻在自己骨头上的。',
    interaction: 'techTrade', stage: 'mid', arc: 'long', specialty: 'C1',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event05-2', charId: 'char-05', chainId: 'taro-alchemy',
    stepId: 'taro-2', stepIndex: 2,
    title: '深层矿脉', body: '塔罗指着矿脉图上一处被他标注为"不确定"的区域。他说如果钻对了方向，回报是一座富矿；如果钻错了，钻头只会烧在石英里。投入额外资金和氧气，结果他无法保证。',
    interaction: 'accident', stage: 'mid', arc: 'long', specialty: 'C1',
    concealed: true, defaultAction: 'accept',
  },
  {
    eventCode: 'event05-3', charId: 'char-05', chainId: 'taro-alchemy',
    stepId: 'taro-3', stepIndex: 3,
    title: '亡星记忆', body: '塔罗把一片石英贴在舱壁上，开始用指尖翻译一颗死去小行星的记忆。它记得合金的一种古老晶格——不需要精炼炉就能直接析出。但翻译过程需要消耗大量月壤和氧气，像在跟一块碑说话。',
    interaction: 'rareTrade', stage: 'mid', arc: 'long', specialty: 'C1',
    defaultAction: 'accept',
  },

  // ── char-06 伊芙·回声（evi-echo / 中期 / 长链） ──
  {
    eventCode: 'event06-1', charId: 'char-06', chainId: 'evi-echo',
    stepId: 'evi-1', stepIndex: 1,
    title: '回声接入', body: '伊芙请求接入王冠扬声器。她说知识会以回声抵达，但回声总会带走一点什么——可能是噪音，可能是寂静，也可能是一段你不想被听见的心事。',
    interaction: 'accident', stage: 'mid', arc: 'long', specialty: 'H',
    concealed: true, defaultAction: 'accept',
  },
  {
    eventCode: 'event06-2', charId: 'char-06', chainId: 'evi-echo',
    stepId: 'evi-2', stepIndex: 2,
    title: '建造谐振器', body: '伊芙说声学群体正在缓慢消散——没有物理载体的共鸣撑不了太久。她请求建造一座谐振器来收容回声。合金和资金是必须的，但稳定后的声学群体会产出稳定的知识流。',
    interaction: 'request', stage: 'mid', arc: 'long', specialty: 'H',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event06-3', charId: 'char-06', chainId: 'evi-echo',
    stepId: 'evi-3', stepIndex: 3,
    title: '遗忘的旋律', body: '谐振器稳定后，伊芙从群体中提取出一段被遗忘的旋律——来自于太渊磁层深处，玫瑰星球的商团曾为它开出过高价。但广播它需要极高功率，而那旋律本身可能已经磨损。',
    interaction: 'accident', stage: 'mid', arc: 'long', specialty: 'H',
    concealed: true, defaultAction: 'accept',
  },

  // ── char-07 罗莎·花冠（rosa-luxury / 中期 / 长链） ──
  {
    eventCode: 'event07-1', charId: 'char-07', chainId: 'rosa-luxury',
    stepId: 'rosa-1', stepIndex: 1,
    title: '玫瑰星球账册', body: '罗莎的袖口封着香料账册，行走间有花瓣碎裂的气味。她愿意让月面王国进入玫瑰星球的奢侈品航线，但她的微笑里有一句没说出口的话：你们目前还买不起。',
    interaction: 'starportTrade', stage: 'mid', arc: 'long', specialty: 'S',
    note: '固定在星海交易港添加艺术奢侈品双向贸易权限。', defaultAction: 'accept',
  },
  {
    eventCode: 'event07-2', charId: 'char-07', chainId: 'rosa-luxury',
    stepId: 'rosa-2', stepIndex: 2,
    title: '竞争者尾随', body: '航线刚开通，一位竞争商团就尾随而至。罗莎提议联手压价——用月面生物质作筹码。如果对方让步，双方获利；如果对方不吃这一套，罗莎需要额外资金维持航线。',
    interaction: 'accident', stage: 'mid', arc: 'long', specialty: 'S',
    concealed: true, defaultAction: 'accept',
  },
  {
    eventCode: 'event07-3', charId: 'char-07', chainId: 'rosa-luxury',
    stepId: 'rosa-3', stepIndex: 3,
    title: '独家代理合同', body: '罗莎从袖口取出第二本账册——这一次不是赊账，是玫瑰星球与月面王国的独家代理合同。她用指甲划开蜡封，露出里面用香料墨水写就的条款。她的微笑收了起来。',
    interaction: 'rareTrade', stage: 'mid', arc: 'long', specialty: 'S',
    note: '签署后，月面将成为玫瑰星球在太渊星域的唯一供应商。', defaultAction: 'accept',
  },

  // ── char-08 阿缇娅·灰舟（atya-refuge / 中期 / 长链） ──
  {
    eventCode: 'event08-1', charId: 'char-08', chainId: 'atya-refuge',
    stepId: 'atya-1', stepIndex: 1,
    title: '家园落难的幸存者', body: '阿缇娅和她的族人请求留在月面。她们没有武器，只有一枚记录家园坐标的核——核还在发热，说明家园沦陷的时间不远。',
    interaction: 'request', stage: 'mid', arc: 'long', specialty: 'C2',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event08-2', charId: 'char-08', chainId: 'atya-refuge',
    stepId: 'atya-2', stepIndex: 2,
    title: '追兵抵达', body: '一支陌生舰队要求交出幸存者。阿缇娅没有辩解，只把坐标核推到王座前。太渊的金光从舷窗照进来，在她烧焦的聚合毯上投下一道不像属于这颗卫星的暖色。',
    interaction: 'chainChoice', stage: 'mid', arc: 'long', specialty: 'C2',
    defaultAction: 'accept',
  },
  {
    eventCode: 'event08-3', charId: 'char-08', chainId: 'atya-refuge',
    stepId: 'atya-3', stepIndex: 3,
    title: '伊甸园坐标', body: '赎金换来了时间。数年后，坐标核完成解密：那里不是墓碑，而是一颗仍能呼吸的生态行星。阿缇娅没有说话，只是第一次在月面上流下了不冻的泪。',
    interaction: 'techTrade', stage: 'mid', arc: 'long', specialty: 'C2',
    defaultAction: 'accept',
  },
]

// ── 快捷查找 ──────────────────────────────────────────────────

/** eventCode → EventStepRecord */
export const eventByCode = Object.fromEntries(
  eventStepRegistry.map(e => [e.eventCode, e]),
) as Record<string, EventStepRecord>

/** charId → EventStepRecord[] */
export const eventsByCharId: Record<string, EventStepRecord[]> = {}
for (const ev of eventStepRegistry) {
  (eventsByCharId[ev.charId] ??= []).push(ev)
}

/** chainId → EventStepRecord[] */
export const eventsByChainId: Record<string, EventStepRecord[]> = {}
for (const ev of eventStepRegistry) {
  (eventsByChainId[ev.chainId] ??= []).push(ev)
}

/** stepId → EventStepRecord */
export const eventByStepId = Object.fromEntries(
  eventStepRegistry.map(e => [e.stepId, e]),
) as Record<string, EventStepRecord>
