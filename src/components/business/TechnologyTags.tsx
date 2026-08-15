import { Bot } from 'lucide-react'
import { facilityEconomySpecs, facilityOrder, resourceMeta, resourceOrder, technologyCatalog } from '../../economy'
import { regionLayout } from '../../data/regionLayout'
import { displayCopy } from '../../utils/format'
import { resourceUiMeta } from '../resources'
import type { TechnologyId } from '../../economy'
import styles from './TechnologyTags.module.css'

export interface TechnologyTagsProps {
  tech: (typeof technologyCatalog)[TechnologyId]
}

export function TechnologyTags({ tech }: TechnologyTagsProps) {
  const ScopeIcon = tech.scope === 'G' ? Bot : regionLayout[tech.scope].icon
  const facilityTags = facilityOrder.filter(id => tech.scope === id || displayCopy(tech.note).includes(facilityEconomySpecs[id].name)).slice(0, 2)
  const resourceTags = resourceOrder.filter(key => displayCopy(tech.note).includes(resourceMeta[key].label)).slice(0, 3)

  return (
    <div className={styles['tech-tags']}>
      <span><ScopeIcon size={13} />{tech.scope === 'G' ? '全局' : facilityEconomySpecs[tech.scope].name}</span>
      {facilityTags.filter(id => id !== tech.scope).map(id => {
        const TagIcon = regionLayout[id].icon
        return <span key={id}><TagIcon size={13} />{facilityEconomySpecs[id].name}</span>
      })}
      {resourceTags.map(key => {
        const ResourceIcon = resourceUiMeta[key].icon
        return <span key={key}><ResourceIcon className={resourceUiMeta[key].tone} size={13} />{resourceMeta[key].label}</span>
      })}
    </div>
  )
}
