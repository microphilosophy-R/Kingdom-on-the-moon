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
    ...plan.methodActions.map(action => ({
      score: action.score,
      text: `切换${facilityEconomySpecs[action.facilityId].name}生产方式，改用更适配当前局势的配方。`,
    })),
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

export interface PhaseGuidance {
  title: string
  description: string
  goals: string[]
}

export const getPhaseGuidance = (day: number): PhaseGuidance | null => {
  if (day <= 100) {
    return {
      title: '奠基阶段',
      description: '月面殖民地刚刚起步，基础设施是一切发展的根基。',
      goals: [
        '启动水、氧气、电力三类基础资源的生产线',
        '建造第一座居住设施，为人口增长提供空间',
        '解锁至少一项初阶科技，打开后续研究通道',
      ],
    }
  }
  if (day <= 250) {
    return {
      title: '成形阶段',
      description: '殖民地开始成形，产业链需要从基础资源向加工材料延伸。',
      goals: [
        '扩大合金与建材产能，支撑后续设施扩建',
        '启动星海贸易港，用盈余资源交换稀缺物资',
        '留意深空来讯中的异客，合适的角色可留任入职',
      ],
    }
  }
  if (day <= 450) {
    return {
      title: '攀登阶段',
      description: '殖民地进入快速成长期，规模与复杂度同时上升。',
      goals: [
        '各设施等级均衡推进，避免单一设施畸高畸低',
        '启动御座号星舰坞建设，为终局目标打下基础',
        '解锁中阶科技与新的生产方式，提升资源转化效率',
      ],
    }
  }
  if (day <= 650) {
    return {
      title: '深耕阶段',
      description: '千日试验已过半程，需要从粗放扩张转向精细经营。',
      goals: [
        '评估 GDP 增速与人口承载力是否匹配星舰需求',
        '补齐科技树中的关键缺口，尤其是效率修正类科技',
        '确保星舰三阶段物资储备稳步推进，避免后期追补',
      ],
    }
  }
  if (day <= 800) {
    return {
      title: '推进阶段',
      description: '时间逐渐紧迫，需要收束力量聚焦核心目标。',
      goals: [
        '审视每期王月报告中的优化建议，逐一补齐短板',
        '把控生命维持与工业产能的平衡，防止链式崩溃',
        '逐步将贸易和建设重心向星舰材料倾斜',
      ],
    }
  }
  if (day <= 1000) {
    return {
      title: '决胜阶段',
      description: '千日试验进入最后倒计时，御座号的命运将决定国祚。',
      goals: [
        '御座号星舰完成度是评分的最大权重，确保不低于 50%',
        '所有扩建、科技、贸易以星舰进度为最高优先级',
        '检查是否有遗漏的科技或设施可瞬间提升最终国祚评分',
      ],
    }
  }
  return null
}
