import { ArrowLeftRight, FolderOpen, LogOut, Play, Save, Volume2, X } from 'lucide-react'
import { Button, IconButton } from '../ui'

export interface SettingsPanelProps {
  volume: number
  saveStatus: string
  autoTradeProtectionEnabled: boolean
  onAutoTradeProtection: (enabled: boolean) => void
  onVolume: (volume: number) => void
  onContinue: () => void
  onSave: () => void
  onLoad: () => void
  onExit: () => void
}

export function SettingsPanel({
  volume,
  saveStatus,
  autoTradeProtectionEnabled,
  onAutoTradeProtection,
  onVolume,
  onContinue,
  onSave,
  onLoad,
  onExit,
}: SettingsPanelProps) {
  return (
    <div className="settings-scrim" role="presentation" onPointerDown={onContinue}>
      <aside className="settings-panel" role="dialog" aria-modal="true" aria-label="游戏设置" onPointerDown={event => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">系统</span><h2>设置</h2></div>
          <IconButton label="关闭设置" onClick={onContinue}><X size={16} /></IconButton>
        </header>

        <section className="settings-section">
          <div className="settings-section-title"><Volume2 size={16} /><span>音乐</span><strong>{Math.round(volume * 100)}%</strong></div>
          <input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={event => onVolume(Number(event.target.value) / 100)} aria-label="游戏音乐音量" />
        </section>

        <section className="settings-section">
          <label className="settings-toggle">
            <span><ArrowLeftRight size={16} />自动购入保护</span>
            <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onAutoTradeProtection(event.target.checked)} />
            <i aria-hidden="true" />
          </label>
          <small>{autoTradeProtectionEnabled ? '赤字时允许星海交易港限量信用采购。' : '已关闭赤字兜底，库存短缺将交给玩家或优化器处理。'}</small>
        </section>

        <section className="settings-section">
          <div className="settings-section-title"><Save size={16} /><span>存档读档</span></div>
          <div className="settings-actions">
            <button onClick={onSave}><Save size={15} />存档</button>
            <button onClick={onLoad}><FolderOpen size={15} />读档</button>
          </div>
          <small>{saveStatus}</small>
        </section>

        <section className="settings-actions settings-main-actions">
          <Button variant="primary" onClick={onContinue}><Play size={15} />继续游戏</Button>
          <button onClick={onExit}><LogOut size={15} />退出游戏</button>
        </section>
      </aside>
    </div>
  )
}
