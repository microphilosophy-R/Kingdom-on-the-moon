/**
 * LEGACY —— 政策定义（演示阶段不引入政策功能）
 *
 * 演示阶段确定不提供「政策」玩法：App.tsx 将 policy 固定为 'ration'
 * （`const policy = 'ration'`），无运行时切换界面。
 * 本文件仅作为遗留定义保留，供后续版本引入政策功能时参考/扩展，不参与当前构建。
 *
 * 已接入游戏循环的相关逻辑（与政策数值联动，勿删）：
 * - `src/economy/types.ts` 的 `PopulationPolicy` 类型
 * - `src/economy/production.ts` / `src/economy/population.ts` 的 policy 倍率
 * - `src/App.tsx` 固定 policy 与 `globalBonus`
 */

import { Bot, Leaf, Theater, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

export type PolicyId = 'ration' | 'mandate' | 'festival'

export type PolicyDefinition = {
  id: PolicyId
  name: string
  level: number
  detail: string
  icon: ComponentType<LucideProps>
}

export const policyDefinitions: PolicyDefinition[] = [
  { id: 'ration', name: '配给法典', level: 1, detail: '生物质 +1/日', icon: Leaf },
  { id: 'mandate', name: '机令总动员', level: 2, detail: '正向产出 +16%', icon: Bot },
  { id: 'festival', name: '失重庆典', level: 3, detail: '正向产出 +6%', icon: Theater },
]
