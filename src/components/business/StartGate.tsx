import { Crown, Play, Settings } from 'lucide-react'
import { Button } from '../ui'
import { PlanetScene, planetTextures } from '../../PlanetScene'

export interface StartGateProps {
  planetTexture: typeof planetTextures[number]
  onStart: () => void
  onSettings: () => void
}

export function StartGate({ planetTexture, onStart, onSettings }: StartGateProps) {
  return (
    <main className="start-gate">
      <section className="start-orbit" aria-label="殖民星球预览">
        <PlanetScene texture={planetTexture} onActivate={onStart} />
      </section>
      <section className="start-console" aria-label="开始游戏">
        <div className="brand-seal"><Crown size={25} /></div>
        <span className="eyebrow">月面主权局 · 1000御日试验</span>
        <h1>月冠纪元</h1>
        <p>在第一个御日签发殖民诏令。资源会自动结算，设施、科技、贸易、王月报告与星舰共同决定国祚。</p>
        <div className="start-actions">
          <Button variant="primary" onClick={onStart}><Play size={16} />开始执政</Button>
          <button className="settings-secondary-btn" onClick={onSettings} title="存档管理 / 设置"><Settings size={16} /><span>设置</span></button>
        </div>
      </section>
    </main>
  )
}
