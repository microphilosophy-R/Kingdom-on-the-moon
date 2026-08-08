import { Crown, Landmark, Orbit, Play, Rocket } from 'lucide-react'
import { Button } from '../ui'
import { PlanetScene, planetTextures } from '../../PlanetScene'

export interface StartGateProps {
  planetTexture: typeof planetTextures[number]
  onStart: () => void
}

export function StartGate({ planetTexture, onStart }: StartGateProps) {
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
        <div className="start-facts">
          <span><Orbit size={14} />{planetTexture.name}</span>
          <span><Rocket size={14} />终局星舰</span>
          <span><Landmark size={14} />政务舱</span>
        </div>
        <Button variant="primary" onClick={onStart}><Play size={16} />开始执政</Button>
      </section>
    </main>
  )
}
