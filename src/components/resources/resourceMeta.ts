import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  CircleDot,
  Coins,
  Droplet,
  Factory,
  FlaskConical,
  Mountain,
  Orbit,
  Sparkles,
  Sprout,
  Users,
  Zap,
} from 'lucide-react'
import { resourceMeta, type ResourceKey } from '../../economy'

export type Icon = ComponentType<LucideProps>

export const resourceUiMeta: Record<ResourceKey, { label: string; icon: Icon; tone: string }> = {
  power: { label: resourceMeta.power.label, icon: Zap, tone: 'gold' },
  water: { label: resourceMeta.water.label, icon: Droplet, tone: 'cyan' },
  oxygen: { label: resourceMeta.oxygen.label, icon: CircleDot, tone: 'cyan' },
  biomass: { label: resourceMeta.biomass.label, icon: Sprout, tone: 'green' },
  regolith: { label: resourceMeta.regolith.label, icon: Mountain, tone: 'ochre' },
  alloy: { label: resourceMeta.alloy.label, icon: Factory, tone: 'slate' },
  quantumCore: { label: '核心', icon: Orbit, tone: 'violet' },
  currency: { label: '货币', icon: Coins, tone: 'gold' },
  population: { label: resourceMeta.population.label, icon: Users, tone: 'coral' },
  knowledge: { label: resourceMeta.knowledge.label, icon: FlaskConical, tone: 'violet' },
  luxury: { label: '奢侈', icon: Sparkles, tone: 'violet' },
}
