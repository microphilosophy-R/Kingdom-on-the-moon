import { ResourceBundle } from './ResourceBundle'
import type { Resources } from '../../economy'

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
    <div className="resource-delta-stack">
      <div className="resource-delta-row consumption">
        <span aria-hidden="true">-</span>
        <ResourceBundle bundle={input} empty={inputEmpty} signed={false} boxedEmpty />
      </div>
      <div className="resource-delta-row production">
        <span aria-hidden="true">+</span>
        <ResourceBundle bundle={output} empty={outputEmpty} signed={false} boxedEmpty />
      </div>
    </div>
  )
}
