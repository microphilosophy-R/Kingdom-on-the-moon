import { Crown, Settings } from 'lucide-react'

interface GameHeaderProps {
  /** 提供时渲染「设置」按钮（主游戏界面），否则仅显示品牌栏（新手引导界面）。 */
  onOpenSettings?: () => void
}

export function GameHeader({ onOpenSettings }: GameHeaderProps) {
  return (
    <header className="site-header">
      <div className="brand-block">
        <div className="brand-seal"><Crown size={23} /></div>
        <div><p>月面主权局 · 1000御日试验</p><h1>月冠纪元</h1></div>
      </div>
      {onOpenSettings && <button className="settings-button" onClick={onOpenSettings}><Settings size={16} />设置</button>}
    </header>
  )
}
