/**
 * 角色编号注册表（结构化存储）
 *
 * 编号体系：
 *   char-00 = 陈林（月面王 / 主角）
 *   char-01–char-08 = 外星访客
 *
 * 每个角色记录：charId、内部 id、名称、物种、glyph、专长设施、加成、留任成本、肖像图片路径。
 * 本文件是角色图片与事件关联的唯一数据源，所有组件通过此注册表获取角色信息。
 */

import type { FacilityId, Resources } from '../economy'

// ── 图片导入 ──────────────────────────────────────────────────
import imgChar00 from '../assets/char-00.jpg'
import imgChar01 from '../assets/char-01.png'
import imgChar02 from '../assets/char-02.png'
import imgChar03 from '../assets/char-03.png'
import imgChar04 from '../assets/char-04.png'
import imgChar05 from '../assets/char-05.png'
import imgChar06 from '../assets/char-06.png'
import imgChar07 from '../assets/char-07.png'
import imgChar08 from '../assets/char-08.png'

// ── 类型定义 ──────────────────────────────────────────────────

export interface CharacterRecord {
  /** 统一编号，如 "char.01" */
  charId: string
  /** 内部代号，如 "sava" */
  id: string
  /** 显示名称 */
  name: string
  /** 物种 / 来源 */
  species: string
  /** 视觉占位 glyph */
  glyph: string
  /** 文本肖像描述 */
  portraitText: string
  /** 专长设施 ID */
  specialty: FacilityId
  /** 雇佣加成（比例） */
  boost: number
  /** 留任成本 */
  retainerCost: Partial<Resources>
  /** 代表台词 */
  quote: string
  /** 肖像图片路径（import 过的资源 URL） */
  portraitImage: string
}

// ── 角色数据 ──────────────────────────────────────────────────

export const characterRegistry: CharacterRecord[] = [
  {
    charId: 'char.00',
    id: 'chenlin',
    name: '陈林',
    species: '人类 / 地球拓殖署基层公务员',
    glyph: '♔',
    portraitText: '中等身形，肩背因长期案牍略前倾；普通东亚中年面孔，眉头微蹙，眼神清醒而无奈',
    specialty: 'K',
    boost: 0,
    retainerCost: {},
    quote: '“我什么也没签。你们说我是王，那就先告诉我——我还能走吗？”',
    portraitImage: imgChar00,
  },
  {
    charId: 'char-01',
    id: 'sava',
    name: '萨瓦·碎光',
    species: '折光甲壳人 / 来自太渊内侧第三轨道',
    glyph: '◈',
    portraitText: '冰裂色甲壳在太渊金光下折射出冷蓝纹路，掌中托着一枚向内塌缩燃烧的晶体',
    specialty: 'E1',
    boost: 0.05,
    retainerCost: { water: 2, currency: 4 },
    quote: '“你们把恒星装进了贡箱，我可以让它少吃一点——但别指望它感恩。”',
    portraitImage: imgChar01,
  },
  {
    charId: 'char.02',
    id: 'melu',
    name: '梅露·第九孢',
    species: '浮游菌落使节 / 来自太渊环带孢子云',
    glyph: '❋',
    portraitText: '以琥珀孢囊维持人形，靠近时能听见孢壁内细密的雨声，像一颗被封装的生态',
    specialty: 'B',
    boost: 0.06,
    retainerCost: { biomass: 3, currency: 3 },
    quote: '“土壤记得每一位被埋葬的王。你们的还很年轻——年轻到仍然以为活着是理所当然。”',
    portraitImage: imgChar02,
  },
  {
    charId: 'char-03',
    id: 'orri',
    name: '欧里·无重力',
    species: '轨道鲸后裔 / 来自太渊引力阱外缘',
    glyph: '☾',
    portraitText: '一团悬浮的银灰潮汐，没有固定骨骼，发声时舱壁会随其低频共振而微微颤抖',
    specialty: 'D',
    boost: 0.06,
    retainerCost: { alloy: 8, quantumCore: 1 },
    quote: '“星舰的骨骼不该只记得重力，也要记得离开它。你那位王，他的脚记得太牢了。”',
    portraitImage: imgChar03,
  },
  {
    charId: 'char-04',
    id: 'nix',
    name: '尼克斯·二十七',
    species: '退役礼仪机 / 产地不明，太渊星域旧制式',
    glyph: '⌘',
    portraitText: '黄铜面孔上七位旧主徽记层层覆盖，最底层的王徽仍在缓慢闪烁，像不肯熄灭的效忠',
    specialty: 'K',
    boost: 0.04,
    retainerCost: { currency: 6 },
    quote: '“我曾侍奉过七位不朽君主，结果都差不多。你看上去比他们清醒，这未必是好事。”',
    portraitImage: imgChar04,
  },
  {
    charId: 'char-05',
    id: 'taro',
    name: '塔罗·掘井者',
    species: '硅酸盐游牧民 / 来自太渊外环碎屑带',
    glyph: '◇',
    portraitText: '石英皮肤上刻满失落小行星的矿脉图，指尖触地时能感知月面深处缓慢的应力',
    specialty: 'C1',
    boost: 0.05,
    retainerCost: { regolith: 10, oxygen: 2 },
    quote: '“月亮不是死的，只是它把话说得很慢。你们踩在上面，却从来没弯下耳朵听过。”',
    portraitImage: imgChar05,
  },
  {
    charId: 'char.06',
    id: 'evi',
    name: '伊芙·回声',
    species: '声学群体 / 来自太渊磁层共振腔',
    glyph: '≈',
    portraitText: '数十条细小波纹在王冠形扬声器中彼此回答，没有身体，只有被器物收容的共鸣',
    specialty: 'H',
    boost: 0.04,
    retainerCost: { knowledge: 6, luxury: 2 },
    quote: '“我听见你们把孤独叫作秩序，所以来收集一点。孤独是会回声的，你们知道吗？”',
    portraitImage: imgChar06,
  },
  {
    charId: 'char-07',
    id: 'rosa',
    name: '罗莎·花冠',
    species: '玫瑰星球商团 / 来自太渊跃迁走廊另一端',
    glyph: '✦',
    portraitText: '礼服像一层会呼吸的薄雾，袖口封着来自玫瑰星球的香料账册，行走间有花瓣碎裂的气味',
    specialty: 'S',
    boost: 0.05,
    retainerCost: { luxury: 4, currency: 8 },
    quote: '“奢侈品不是多余之物。它们是文明愿意承认自己仍有余裕——你治下的月面，目前还没有这个余裕。”',
    portraitImage: imgChar07,
  },
  {
    charId: 'char-08',
    id: 'atya',
    name: '阿缇娅·灰舟',
    species: '流亡栖居者 / 原籍伊甸星系，家园已沦陷',
    glyph: '✧',
    portraitText: '披着烧焦的聚合毯，怀中抱着一枚仍在发热的家园坐标核，眼底有被追了很久的人特有的警觉',
    specialty: 'C2',
    boost: 0.04,
    retainerCost: { oxygen: 6, biomass: 6 },
    quote: '“请别把我们交回黑夜。我们知道一颗还活着的行星在哪里——它比这颗石头温柔得多。”',
    portraitImage: imgChar08,
  },
]

// ── 快捷查找 ──────────────────────────────────────────────────

/** charId → CharacterRecord */
export const charById = Object.fromEntries(
  characterRegistry.map(c => [c.charId, c]),
) as Record<string, CharacterRecord>

/** 内部 id → CharacterRecord */
export const charByInternalId = Object.fromEntries(
  characterRegistry.map(c => [c.id, c]),
) as Record<string, CharacterRecord>

/** 内部 id → 肖像图片 URL */
export const portraitByInternalId: Record<string, string> = Object.fromEntries(
  characterRegistry.map(c => [c.id, c.portraitImage]),
)

/** 访客角色（排除 char.00 陈林） */
export const visitorCharacters = characterRegistry.filter(c => c.charId !== 'char-00')
