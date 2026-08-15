import styles from './ProgressLine.module.css'

export interface ProgressLineProps {
  value: number
  label: string
}

export function ProgressLine({ value, label }: ProgressLineProps) {
  const width = `${Math.max(0, Math.min(100, value))}%`
  return (
    <div className={styles['detail-progress-line']}>
      <span style={{ width }} />
      <small>{label}</small>
    </div>
  )
}
