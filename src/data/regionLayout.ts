import {
  ArrowLeftRight,
  CircleDot,
  Crown,
  Factory,
  FlaskConical,
  House,
  Leaf,
  Orbit,
  Pickaxe,
  Rocket,
  Sparkles,
  Sprout,
  Sun,
  Waves,
} from 'lucide-react'
import type { RegionId } from '../types/game'
import type { Icon } from '../types/game'

export const regionLayout: Record<RegionId, { icon: Icon; parentIds: RegionId[]; position: { x: number; y: number } }> = {
  E1: { icon: Sun, parentIds: [], position: { x: 8, y: 12 } },
  C1: { icon: Pickaxe, parentIds: [], position: { x: 8, y: 32 } },
  K: { icon: Crown, parentIds: [], position: { x: 8, y: 52 } },
  B: { icon: Sprout, parentIds: ['E1', 'C1'], position: { x: 26, y: 18 } },
  E2: { icon: CircleDot, parentIds: ['E1'], position: { x: 26, y: 38 } },
  C2: { icon: Pickaxe, parentIds: ['C1', 'B'], position: { x: 26, y: 60 } },
  F: { icon: Factory, parentIds: ['C2', 'E2'], position: { x: 44, y: 20 } },
  P: { icon: Leaf, parentIds: ['C1', 'B'], position: { x: 44, y: 42 } },
  R: { icon: Waves, parentIds: ['B', 'P'], position: { x: 44, y: 64 } },
  L: { icon: FlaskConical, parentIds: ['K', 'F'], position: { x: 62, y: 14 } },
  H: { icon: Sparkles, parentIds: ['K', 'B'], position: { x: 62, y: 34 } },
  M: { icon: House, parentIds: ['R', 'K'], position: { x: 62, y: 56 } },
  S: { icon: ArrowLeftRight, parentIds: ['K', 'L', 'H'], position: { x: 62, y: 78 } },
  E3: { icon: Orbit, parentIds: ['E2', 'F', 'R'], position: { x: 80, y: 32 } },
  D: { icon: Rocket, parentIds: ['L', 'F', 'S', 'M'], position: { x: 80, y: 72 } },
}
