/**
 * 科技树按设施研究线分组数据。
 * 每条研究线对应一个或多个设施（scope）的完整科技链，线内按前置依赖拓扑序排列。
 */
import { hasTech, technologyCatalog } from '../economy'
import type { TechnologyId } from '../economy'

export type ResearchLineId =
  | 'energy'
  | 'extraction'
  | 'life'
  | 'refining'
  | 'research'
  | 'population'
  | 'trade'
  | 'starship'
  | 'global'

export interface ResearchLine {
  id: ResearchLineId
  /** 列标题，如 '能源' */
  label: string
  /** 列说明 */
  note: string
  /** scope 徽章源数据；'G' 由渲染层转 '全局' */
  scopes: string[]
  /** 线内拓扑序（前置在前） */
  techIds: TechnologyId[]
}

export const researchLines: ResearchLine[] = [
  { id: 'energy', label: '能源', note: '光伏、聚变与外星能源，逐级支撑电力体系。', scopes: ['E1', 'E2', 'E3'], techIds: ['TE1-0', 'TE1-1', 'TE1-2', 'TE2-0', 'TE3-0'] },
  { id: 'extraction', label: '采掘', note: '从月面采掘到小行星带远征。', scopes: ['C1', 'C2'], techIds: ['TC1-0', 'TC1-1', 'TC2-0', 'TC2-1', 'TC2-2'] },
  { id: 'life', label: '生命维持', note: '水培、生态培育与月穹生态改造。', scopes: ['B', 'P', 'R'], techIds: ['TB-0', 'TB-1', 'TB-2', 'TP-0', 'TP-1', 'TR-0'] },
  { id: 'refining', label: '精炼', note: '合金精炼与星海货币附产。', scopes: ['F'], techIds: ['TF-0', 'TF-1'] },
  { id: 'research', label: '研究', note: '知识产出、量子核心与科研吞吐。', scopes: ['L'], techIds: ['TL-0', 'TL-2', 'TL-1', 'TL-3'] },
  { id: 'population', label: '人口', note: '王城、宫廷与新月府的居住与税收体系。', scopes: ['K', 'H', 'M'], techIds: ['TK-0', 'TH-0', 'TM-0'] },
  { id: 'trade', label: '贸易', note: '星港许可证与三条外星贸易线。', scopes: ['S'], techIds: ['TS-0', 'TS-1', 'TS-2', 'TS-3'] },
  { id: 'starship', label: '星舰', note: '御座号建造的三阶段推进。', scopes: ['D'], techIds: ['TD-0', 'TD-1', 'TD-2'] },
  { id: 'global', label: '全局', note: '跨设施的生产、能耗、建筑与交易规则。', scopes: ['G'], techIds: ['TG-1', 'TG-2', 'TG-3', 'TG-4'] },
]

export const researchLineById: Record<ResearchLineId, ResearchLine> =
  Object.fromEntries(researchLines.map(line => [line.id, line])) as Record<ResearchLineId, ResearchLine>

/** 每条线的完成度（供列头徽章展示）。techs 与全局 hasTech 同口径。 */
export const researchLineProgress = (techs: string[] = []): Record<ResearchLineId, { completed: number; total: number }> =>
  Object.fromEntries(researchLines.map(line => [
    line.id,
    { total: line.techIds.length, completed: line.techIds.filter(id => hasTech(techs, id)).length },
  ])) as Record<ResearchLineId, { completed: number; total: number }>

// 开发期完整性校验：id 存在、覆盖无重叠无遗漏、线内前置必在依赖之前
const covered = new Set<string>()
for (const line of researchLines) {
  const seen = new Set<TechnologyId>()
  for (const id of line.techIds) {
    if (!technologyCatalog[id]) throw new Error(`researchLines: 未知科技 ${id}`)
    for (const prereq of technologyCatalog[id].prerequisites ?? []) {
      if (line.techIds.includes(prereq) && !seen.has(prereq)) {
        throw new Error(`researchLines: ${line.id} 线内前置 ${prereq} 排在 ${id} 之后`)
      }
    }
    covered.add(id)
    seen.add(id)
  }
}
const catalogIds = Object.keys(technologyCatalog)
if (catalogIds.some(id => !covered.has(id)) || covered.size !== catalogIds.length) {
  throw new Error('researchLines: 与 technologyCatalog 覆盖不一致')
}
