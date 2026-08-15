import { Coins, Gauge, Pause, Play } from 'lucide-react'
import { TabNav } from '../layout'
import type { AppView, Icon } from '../../types/game'

export interface CommandNavItem {
  id: AppView
  label: string
  icon: Icon
  color: string
}

interface CommandDeckProps {
  gdp: number
  navItems: CommandNavItem[]
  activeTabId: AppView
  day: number
  isRunning: boolean
  speed: 'normal' | 'fast'
  completed: boolean
  finalDay: number
  onSelectTab: (id: AppView) => void
  onToggleSpeed: () => void
  onToggleRunning: () => void
}

export function CommandDeck({
  gdp,
  navItems,
  activeTabId,
  day,
  isRunning,
  speed,
  completed,
  finalDay,
  onSelectTab,
  onToggleSpeed,
  onToggleRunning,
}: CommandDeckProps) {
  return (
    <footer className="command-deck bottom-tabs">
      <div className="footer-row footer-row-left">
        <div className="scoreline gdp-line"><span>GDP</span><strong>{gdp.toFixed(1)}</strong><small><Coins size={14} /></small></div>
      </div>
      <TabNav items={navItems} activeId={activeTabId} onSelect={onSelectTab} />
      <div className="footer-row footer-row-right">
        <div className="time-card" aria-label="时间控制">
          <div className="day-counter">
            <span>御日</span>
            <div><strong>{String(day).padStart(3, '0')}</strong></div>
            <small>/ {finalDay}</small>
          </div>
          <button className="time-control-btn" onClick={onToggleSpeed} aria-label="切换时间速度"><Gauge size={15} /><span>{speed === 'normal' ? '正常' : '加速'}</span></button>
          <button className="time-control-btn" onClick={onToggleRunning} aria-label={isRunning ? '暂停日历' : '恢复日历'} disabled={completed}>{isRunning ? <Pause size={15} /> : <Play size={15} />}<span>{isRunning ? '暂停' : '继续'}</span></button>
        </div>
      </div>
    </footer>
  )
}
