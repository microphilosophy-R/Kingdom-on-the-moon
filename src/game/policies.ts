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
