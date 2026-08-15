import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'
import styles from './ResourceDeltaRows.module.css'

export interface ResourceDeltaRowsProps {
  input: Partial<Resources>
  output: Partial<Resources>
  inputEmpty?: string
  outputEmpty?: string
  /** 额外类名，叠加到根元素（如 TradeBoard 的 recipe/summary 上下文样式） */
  className?: string
  /** 稀有资源按王月周期展示的粒度（如 50 御日） */
  periodDays?: number
}

export function ResourceDeltaRows({
  input,
  output,
  inputEmpty = '无输入',
  outputEmpty = '无产出',
  className,
  periodDays,
}: ResourceDeltaRowsProps) {
  return (
    <div className={`${styles['resource-delta-stack']}${className ? ` ${className}` : ''}`}>
      <div className={`${styles['resource-delta-row']} ${styles.consumption}`}>
        <span aria-hidden="true">-</span>
        <ResourceBundle bundle={input} empty={inputEmpty} signed={false} boxedEmpty periodDays={periodDays} />
      </div>
      <div className={`${styles['resource-delta-row']} ${styles.production}`}>
        <span aria-hidden="true">+</span>
        <ResourceBundle bundle={output} empty={outputEmpty} signed={false} boxedEmpty periodDays={periodDays} />
      </div>
    </div>
  )
}
