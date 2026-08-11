import bldgB from './bldg-b.png'
import bldgC1 from './bldg-c1.png'
import bldgC2 from './bldg-c2.png'
import bldgD from './bldg-d.png'
import bldgE1 from './bldg-e1.png'
import bldgE2 from './bldg-e2.png'
import bldgE3 from './bldg-e3.png'
import bldgF from './bldg-f.png'
import bldgH from './bldg-h.jpg'
import bldgL from './bldg-l.png'
import bldgM from './bldg-m.jpg'
import bldgP from './bldg-p.png'
import bldgR from './bldg-r.png'
import bldgS from './bldg-s.png'
import buildingKing from './building-king.png'
import type { FacilityId } from '../economy'

/**
 * 设施代号 → 主视觉图映射（style-guide §7 命名：bldg-<代号>）。
 * 15 座建筑均已生成主视觉图；K 月面王城沿用既有 building-king.png。
 */
const facilityArtById: Record<string, string> = {
  E1: bldgE1,
  C1: bldgC1,
  K: buildingKing,
  B: bldgB,
  E2: bldgE2,
  C2: bldgC2,
  F: bldgF,
  P: bldgP,
  R: bldgR,
  L: bldgL,
  H: bldgH,
  M: bldgM,
  S: bldgS,
  E3: bldgE3,
  D: bldgD,
}

export function getFacilityArt(id: FacilityId): string {
  return facilityArtById[id] ?? buildingKing
}
