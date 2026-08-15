import type { Resources } from './types'
import { shipProjectStages } from './facilities'
import { rareResourceKeys, resourceOrder } from './resources'

export type Difficulty = 'easy' | 'normal' | 'hard' | 'ultimate'

export interface DifficultyConfig {
  /** 升级成本倍率：应用于标准 scale */
  costScaleMultiplier: number
  /** 星舰阶段资源需求倍率 */
  shipResourceMultiplier: number
  /** 目标胜利天数 */
  targetWinDay: number
}

export const difficultyConfigs: Record<Difficulty, DifficultyConfig> = {
  easy: {
    costScaleMultiplier: 0.7,
    shipResourceMultiplier: 0.6,
    targetWinDay: 500,
  },
  normal: {
    costScaleMultiplier: 1.0,
    shipResourceMultiplier: 1.5,
    targetWinDay: 650,
  },
  hard: {
    costScaleMultiplier: 1.3,
    shipResourceMultiplier: 2.3,
    targetWinDay: 800,
  },
  ultimate: {
    costScaleMultiplier: 1.4,
    shipResourceMultiplier: 3.5,
    targetWinDay: 950,
  },
}

export const defaultDifficulty: Difficulty = 'normal'

/** 返回难度调整后的星舰阶段资源需求。稀有资源（量子核心/奢侈品）产能不随难度缩放，需求同样不缩放；大宗资源按 shipResourceMultiplier 缩放。 */
export const getDifficultyShipStages = (difficulty: Difficulty) => {
  const config = difficultyConfigs[difficulty]
  return shipProjectStages.map(stage => ({
    ...stage,
    input: Object.fromEntries(
      resourceOrder.map(key => [
        key,
        rareResourceKeys.includes(key) ? (stage.input[key] ?? 0) : (stage.input[key] ?? 0) * config.shipResourceMultiplier,
      ]),
    ) as Partial<Resources>,
  }))
}
