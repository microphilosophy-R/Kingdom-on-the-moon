import { facilityEconomySpecs, hasTech, isHousingFacility, technologyCatalog } from '../economy'
import type { AutomationPlan, FacilityId, PopulationProjection, TechnologyId } from '../economy'

export const technologyCategoryLabel: Record<NonNullable<(typeof technologyCatalog)[TechnologyId]['category']>, string> = {
  construction: '建造许可',
  'production-method': '生产方式',
  'facility-efficiency': '效率修正',
  global: '全局规则',
  trade: '贸易权限',
}

export const completedTechnologyIds = (techs: string[]): TechnologyId[] =>
  Object.values(technologyCatalog).filter(tech => hasTech(techs, tech.id)).map(tech => tech.id)

export const hasResearchPrerequisites = (techId: TechnologyId, techs: string[]) =>
  (technologyCatalog[techId].prerequisites ?? []).every(prerequisite => hasTech(techs, prerequisite))

export const techLabel = (techId: TechnologyId) => technologyCatalog[techId]?.name ?? techId

export const throughputClass = (rate: number) => rate >= 1.1 ? 'surged' : rate >= 0.8 ? 'steady' : rate > 0 ? 'thin' : 'idle'

export const orderLabel = (mode: string) => {
  if (mode === 'expand-continuous') return '持续增加'
  if (mode === 'expand') return '增加一级'
  if (mode === 'shrink-continuous') return '持续收缩'
  if (mode === 'shrink') return '降低一级'
  return '保持不变'
}

export const directionForFacility = (id: FacilityId) => {
  const role = facilityEconomySpecs[id].role
  if (isHousingFacility(id)) return '扩大居住容量，给人口增长预留空间。'
  if (role === 'life' || role === 'ecology') return '补强生命维持，优先稳住水、氧气和生物质。'
  if (role === 'energy') return '提高能源供给，让后续工业扩张不被电力拖住。'
  if (role === 'extraction' || role === 'industry') return '强化材料链，尤其关注合金与基础建材。'
  if (role === 'research') return '投入研究能力，为建筑解锁和新生产方式铺路。'
  if (role === 'trade') return '利用星港贸易，把盈余换成当前短缺的关键材料。'
  if (role === 'ship') return '保留星舰工程材料，等核心供应稳定后推进终局。'
  return '维持核心设施升级，优先选择能改善瓶颈的方向。'
}

export const directionForTechnology = (category?: string) => {
  if (category === 'construction') return '补齐建筑许可，把新设施与首级建设一起规划。'
  if (category === 'production-method') return '研究新的生产方式，再手动切换到更合适的配方。'
  if (category === 'trade') return '完善星港协议，让贸易成为合金和知识的缓冲器。'
  if (category === 'global') return '推进通用工程科技，提高整个王国的扩张效率。'
  return '选择一项能解除当前资源瓶颈的科技。'
}

export const summarizeOptimizerDirections = (plan: AutomationPlan, population: PopulationProjection): string[] => {
  const ranked = [
    ...plan.actions.map(action => ({ score: action.score, text: directionForFacility(action.id) })),
    ...plan.technologyActions.map(action => ({ score: action.score, text: directionForTechnology(technologyCatalog[action.techId]?.category) })),
  ].sort((a, b) => b.score - a.score)
  const suggestions: string[] = []
  for (const item of ranked) {
    if (suggestions.length >= 3) break
    if (!suggestions.includes(item.text)) suggestions.push(item.text)
  }
  if (suggestions.length < 3 && population.lifeSupportRatio < 1.15) suggestions.push('生命维持余量偏薄，先别让住房扩张跑在水氧之前。')
  if (suggestions.length < 3) suggestions.push('观察库存盈余，把长期过剩资源转化为建筑或研究进度。')
  return suggestions.slice(0, 3)
}
