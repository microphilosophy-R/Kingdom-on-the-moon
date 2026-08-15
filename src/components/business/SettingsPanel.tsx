import { Check, FolderOpen, LogOut, Pencil, Play, Save, Trash2, Volume2, X } from 'lucide-react'
import { useState } from 'react'
import { Button, IconButton } from '../ui'
import type { SaveSlotMeta } from '../../types/game'
import styles from './SettingsPanel.module.css'

export interface SettingsPanelProps {
  volume: number
  saveSlotMetas: (SaveSlotMeta | null)[]
  autoTradeProtectionEnabled: boolean
  onAutoTradeProtection: (enabled: boolean) => void
  onVolume: (volume: number) => void
  onContinue: () => void
  onSave: (slotIndex: number, name?: string) => void
  onLoad: (slotIndex: number) => void
  onRename: (slotIndex: number, name: string) => void
  onExit: () => void
  onSaveAndExit?: () => void
  onClearAndExit?: () => void
}

const formatSlotTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SettingsPanel({
  volume,
  saveSlotMetas,
  autoTradeProtectionEnabled,
  onAutoTradeProtection,
  onVolume,
  onContinue,
  onSave,
  onLoad,
  onRename,
  onExit,
  onSaveAndExit,
  onClearAndExit,
}: SettingsPanelProps) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const startRename = (slotIndex: number, currentName: string) => {
    setEditingSlot(slotIndex)
    setEditName(currentName)
  }

  const confirmRename = () => {
    if (editingSlot === null) return
    const trimmed = editName.trim()
    if (trimmed) {
      onRename(editingSlot, trimmed)
    }
    setEditingSlot(null)
    setEditName('')
  }

  return (
    <div className={styles['settings-scrim']} role="presentation" onPointerDown={onContinue}>
      <aside className={`${styles['settings-panel']} ${styles['settings-panel-wide']}`} role="dialog" aria-modal="true" aria-label="游戏设置" onPointerDown={event => event.stopPropagation()}>
        <header>
          <div><span className="eyebrow">系统</span><h2>设置</h2></div>
          <IconButton label="关闭设置" onClick={onContinue}><X size={16} /></IconButton>
        </header>

        <section className={styles['settings-section']}>
          <div className={styles['settings-section-title']}><Volume2 size={16} /><span>音乐</span><strong>{Math.round(volume * 100)}%</strong></div>
          <input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={event => onVolume(Number(event.target.value) / 100)} aria-label="游戏音乐音量" />
        </section>

        <section className={styles['settings-section']}>
          <label className={styles['settings-toggle']}>
            <span><Volume2 size={16} />自动购入保护</span>
            <input type="checkbox" checked={autoTradeProtectionEnabled} onChange={event => onAutoTradeProtection(event.target.checked)} />
            <i aria-hidden="true" />
          </label>
          <small>{autoTradeProtectionEnabled ? '赤字时允许星海交易港限量信用采购。' : '已关闭赤字兜底，库存短缺将交给玩家或优化器处理。'}</small>
        </section>

        <section className={styles['settings-section']}>
          <div className={styles['settings-section-title']}><Save size={16} /><span>存档管理（{saveSlotMetas.filter(Boolean).length}/{saveSlotMetas.length}）</span></div>
          <div className={styles['save-slots-grid']}>
            {saveSlotMetas.map((meta, i) => (
              <div key={i} className={`${styles['save-slot-card']}${meta ? ` ${styles.occupied}` : ''}`}>
                {meta ? (
                  editingSlot === i ? (
                    <div className={styles['save-slot-rename']}>
                      <input
                        type="text"
                        className={styles['save-slot-input']}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setEditingSlot(null) }}
                        maxLength={20}
                        autoFocus
                        aria-label="存档名称"
                      />
                      <button className={styles['save-slot-rename-confirm']} onClick={confirmRename} title="确认"><Check size={14} /></button>
                    </div>
                  ) : (
                    <div className={styles['save-slot-name-row']}>
                      <span className={styles['save-slot-name']}>{meta.name}</span>
                      <button className={styles['save-slot-rename-btn']} onClick={() => startRename(i, meta.name)} title="重命名"><Pencil size={11} /></button>
                    </div>
                  )
                ) : (
                  <span className={`${styles['save-slot-name']} ${styles['save-slot-empty']}`}>空槽位 {i + 1}</span>
                )}
                {meta ? (
                  <div className={styles['save-slot-info']}>
                    <span>御日 {meta.day} · 评分 {meta.score}</span>
                    <small>{formatSlotTime(meta.savedAt)}</small>
                  </div>
                ) : (
                  <div className={styles['save-slot-info']}>
                    <small>暂无存档</small>
                  </div>
                )}
                <div className={styles['save-slot-actions']}>
                  {meta ? (
                    <>
                      <button onClick={() => onSave(i, meta.name)} title="覆盖存档"><Save size={12} />覆盖</button>
                      <button className={styles['save-slot-load']} onClick={() => onLoad(i)} title="读取存档"><FolderOpen size={12} />读取</button>
                    </>
                  ) : (
                    <button onClick={() => onSave(i)} title="新建存档"><Save size={12} />存档</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles['settings-actions']} ${styles['settings-main-actions']}`}>
          <Button variant="primary" onClick={onContinue}><Play size={15} />继续游戏</Button>
          {onSaveAndExit ? (
            <Button variant="continue" onClick={onSaveAndExit}><Save size={15} />保存并退出</Button>
          ) : (
            <Button onClick={onExit}><LogOut size={15} />退出游戏</Button>
          )}
          {onClearAndExit && (
            <Button variant="danger" onClick={onClearAndExit}><Trash2 size={15} />清除并退出</Button>
          )}
        </section>
      </aside>
    </div>
  )
}
