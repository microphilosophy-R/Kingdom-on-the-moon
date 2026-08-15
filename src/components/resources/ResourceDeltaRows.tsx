import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'
import styles from './ResourceDeltaRows.module.css'

export interface ResourceDeltaRowsProps {
  input: Partial<Resources>
  output: Partial<Resources>
  inputEmpty?: string
  outputEmpty?: string
}

export function ResourceDeltaRows({
  input,
  output,
  inputEmpty = '无输入',
  outputEmpty = '无产出',
}: ResourceDeltaRowsProps) {
  return (
    <div className={styles['resource-delta-stack']}>
      <div className={`${styles['resource-delta-row']} ${styles.consumption}`}>
        <span aria-hidden="true">-</span>
        <ResourceBundle bundle={input} empty={inputEmpty} signed={false} boxedEmpty />
      </div>
      <div className={`${styles['resource-delta-row']} ${styles.production}`}>
        <span aria-hidden="true">+</span>
        <ResourceBundle bundle={output} empty={outputEmpty} signed={false} boxedEmpty />
      </div>
    </div>
  )
}
