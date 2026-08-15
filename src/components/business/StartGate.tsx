import { useState } from 'react'
import { Crown, Play, Settings } from 'lucide-react'
import { Button } from '../ui'
import { PlanetScene, planetTextures } from '../../PlanetScene'
import { defaultDifficulty, difficultyConfigs, type Difficulty } from '../../economy'
import styles from './StartGate.module.css'

export interface StartOptions {
  difficulty: Difficulty
  tutorialEnabled: boolean
  observerMode: boolean
  /** L3 观察者模式下由内置优化署按事件默认取向自动结算；手动模式（L1/L2）下玩家自行决策，此开关不生效 */
  autoEventsEnabled: boolean
}

export interface StartGateProps {
  planetTexture: typeof planetTextures[number]
  autoSave: { difficulty: Difficulty; observerMode: boolean; day: number } | null
  onStart: (options: StartOptions) => void
  onContinue: (options: Pick<StartOptions, 'observerMode' | 'autoEventsEnabled'>) => void
  onSettings: () => void
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: '宽裕',
  normal: '常规',
  hard: '严峻',
  ultimate: '极限',
}

export function StartGate({ planetTexture, autoSave, onStart, onContinue, onSettings }: StartGateProps) {
  const hasAutoSave = autoSave !== null
  const [difficulty, setDifficulty] = useState<Difficulty>(autoSave?.difficulty ?? defaultDifficulty)
  const [tutorialEnabled, setTutorialEnabled] = useState(() => !window.localStorage.getItem('lunar-crown-tutorial-seen'))
  const [observerMode, setObserverMode] = useState(autoSave?.observerMode ?? false)
  const [autoEventsEnabled, setAutoEventsEnabled] = useState(false)

  const begin = () => onStart({ difficulty, tutorialEnabled, observerMode, autoEventsEnabled })

  return (
    <main className={styles['start-gate']}>
      <section className={styles['start-orbit']} aria-label="殖民星球预览">
        <PlanetScene texture={planetTexture} onActivate={hasAutoSave ? () => onContinue({ observerMode, autoEventsEnabled }) : begin} />
      </section>
      <section className={styles['start-console']} aria-label="开始游戏">
        <div className="brand-seal"><Crown size={25} /></div>
        <span className="eyebrow">月面主权局 · 1000御日试验</span>
        <h1>月冠纪元</h1>
        <p>在第一个御日签发殖民诏令。资源会自动结算，设施、科技、贸易、王月报告与星舰共同决定国祚。</p>
        <div className={styles['start-options']}>
          <div className={styles['start-option-row']}>
            <span className={styles['start-option-label']}>难度{hasAutoSave && <small>已有自动存档，难度已锁定</small>}</span>
            <div className={styles['difficulty-picker']} role="radiogroup" aria-label="难度">
              {(Object.keys(difficultyConfigs) as Difficulty[]).map(level => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === level}
                  className={`${styles['difficulty-chip']}${difficulty === level ? ` ${styles.active}` : ''}`}
                  disabled={hasAutoSave}
                  onClick={() => setDifficulty(level)}
                >{difficultyLabels[level]}</button>
              ))}
            </div>
          </div>
          <label className={`${styles['start-option-row']} ${styles['toggle-row']}`}>
            <span className={styles['start-option-label']}>新手教程</span>
            <input type="checkbox" checked={tutorialEnabled} disabled={hasAutoSave} onChange={e => setTutorialEnabled(e.target.checked)} />
          </label>
          <label className={`${styles['start-option-row']} ${styles['toggle-row']}`}>
            <span className={styles['start-option-label']}>观察者模式<small>内置优化署接管决策，玩家仅旁观</small></span>
            <input type="checkbox" checked={observerMode} onChange={e => setObserverMode(e.target.checked)} />
          </label>
          <label className={`${styles['start-option-row']} ${styles['toggle-row']}`}>
            <span className={styles['start-option-label']}>自动处理事件<small>观察者模式下按事件默认取向自动结算</small></span>
            <input type="checkbox" checked={autoEventsEnabled} disabled={!observerMode} onChange={e => setAutoEventsEnabled(e.target.checked)} />
          </label>
          {hasAutoSave && <p className={styles['start-autosave-hint']}>检测到自动存档（御日 {autoSave.day}），继续执政将接续此进度。</p>}
        </div>
        <div className={styles['start-actions']}>
          {hasAutoSave ? (
            <Button variant="continue" onClick={() => onContinue({ observerMode, autoEventsEnabled })}><Play size={16} />继续执政</Button>
          ) : (
            <Button variant="primary" onClick={begin}><Play size={16} />开始执政</Button>
          )}
          <button className={styles['settings-secondary-btn']} onClick={onSettings} title="存档管理 / 设置"><Settings size={16} /><span>设置</span></button>
        </div>
      </section>
    </main>
  )
}
