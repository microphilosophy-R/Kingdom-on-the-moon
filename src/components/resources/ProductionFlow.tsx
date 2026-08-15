import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'
import styles from './ProductionFlow.module.css'

export interface FlowArrowSvgProps {
  className?: string
  kind?: 'arrow' | 'multiply' | 'equals'
}

export function FlowArrowSvg({ className = 'flow-arrow-svg', kind = 'arrow' }: FlowArrowSvgProps) {
  if (kind === 'multiply') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    )
  }
  if (kind === 'equals') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 9h14" />
        <path d="M5 15h14" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 56 18" aria-hidden="true" focusable="false">
      <path d="M0 9h48" />
      <path d="M42 3l12 6-12 6" />
    </svg>
  )
}

export interface ProductionFlowProps {
  input: Partial<Resources>
  output: Partial<Resources>
}

export function ProductionFlow({ input, output }: ProductionFlowProps) {
  return (
    <div className={styles['production-flow']}>
      <div>
        <small>输入</small>
        <ResourceBundle bundle={input} empty="无输入" />
      </div>
      <FlowArrowSvg />
      <div>
        <small>输出</small>
        <ResourceBundle bundle={output} empty="无输出" />
      </div>
    </div>
  )
}
