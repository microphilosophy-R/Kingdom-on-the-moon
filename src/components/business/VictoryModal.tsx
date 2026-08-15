import { Crown, Rocket, Building2, Users, BookOpen } from 'lucide-react'
import { Button } from '../ui'
import { fmtAmount } from '../../utils/format'
import styles from './VictoryModal.module.css'

interface VictoryModalProps {
  score: number
  shipProgress: number
  facilityTotalLevel: number
  roleCount: number
  knowledge: number
  day: number
  onRestart: () => void
}

function getRating(score: number): { title: string; subtitle: string } {
  if (score >= 2000) return { title: '星海传奇', subtitle: '御座号翱翔星海，月面国祚永载史册。' }
  if (score >= 1500) return { title: '月面霸主', subtitle: '殖民地繁荣昌盛，足以傲视星域。' }
  if (score >= 1000) return { title: '御座使徒', subtitle: '星舰建造顺利，月面根基稳固。' }
  if (score >= 500) return { title: '殖民地总督', subtitle: '勉强维系生存，前路漫漫。' }
  return { title: '月面先驱', subtitle: '首次执政征途，每一次尝试都是荣耀。' }
}

export function VictoryModal({
  score,
  shipProgress,
  facilityTotalLevel,
  roleCount,
  knowledge,
  day,
  onRestart,
}: VictoryModalProps) {
  const rating = getRating(score)
  const shipScore = Math.round(shipProgress * 8)
  const facilityScore = facilityTotalLevel * 12
  const roleScore = roleCount * 25
  const knowledgeScore = Math.round(knowledge * 2)

  return (
    <div className={styles['victory-scrim']} role="presentation">
      <section className={styles['victory-modal']} role="dialog" aria-modal="true" aria-label="国祚评定">
        <header className={styles['victory-header']}>
          <div className={`brand-seal ${styles['victory-seal']}`}><Crown size={28} /></div>
          <span className="eyebrow">千日试验终结 · 御日 {day}</span>
          <h1>国祚评定</h1>
        </header>

        <div className={styles['victory-score-area']}>
          <span className={styles['victory-number']}>{score}</span>
          <span className={styles['victory-rating']}>{rating.title}</span>
          <p className={styles['victory-flavor']}>{rating.subtitle}</p>
        </div>

        <div className={styles['victory-breakdown']}>
          <div className={styles['victory-dim']}>
            <Rocket size={18} />
            <span>御座号星舰完成度</span>
            <strong>{shipProgress}% × 8</strong>
            <b>{shipScore}</b>
          </div>
          <div className={styles['victory-dim']}>
            <Building2 size={18} />
            <span>设施总等级</span>
            <strong>{facilityTotalLevel} × 12</strong>
            <b>{facilityScore}</b>
          </div>
          <div className={styles['victory-dim']}>
            <Users size={18} />
            <span>招募异客角色</span>
            <strong>{roleCount} × 25</strong>
            <b>{roleScore}</b>
          </div>
          <div className={styles['victory-dim']}>
            <BookOpen size={18} />
            <span>知识储量</span>
            <strong>{fmtAmount(knowledge)} × 2</strong>
            <b>{knowledgeScore}</b>
          </div>
        </div>

        <footer className={styles['victory-footer']}>
          <Button variant="primary" onClick={onRestart}>重返起点</Button>
        </footer>
      </section>
    </div>
  )
}
