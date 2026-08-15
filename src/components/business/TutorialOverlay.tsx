import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui'
import styles from './TutorialOverlay.module.css'

interface TutorialStep {
  targetSelector: string
  title: string
  body: string
  placement: 'top' | 'bottom' | 'left' | 'right'
}

const tutorialSteps: TutorialStep[] = [
  {
    targetSelector: '.bottom-tabs',
    title: '底部导航栏',
    body: '切换设施、王城、科技、生态、星海贸易、星舰进度和异客名录七个视图。核心玩法是建造并扩建建筑生产资源，最终用于建造御座号星舰。',
    placement: 'top',
  },
  {
    targetSelector: '.resource-rail',
    title: '资源库存栏',
    body: '监控11种资源的实时库存与每日净变化。净变化由各建筑的产出与消耗决定，是判断产业链是否健康的关键。点击三角形按钮可展开或收起此栏。',
    placement: 'bottom',
  },
  {
    targetSelector: '.facility-ledger',
    title: '设施名录',
    body: '点击「展开设施名录」查看全部建筑卡片。建造与扩建建筑是生产资源的核心手段——每位执政官可从15座设施中选择扩建方向。',
    placement: 'top',
  },
  {
    targetSelector: '.page-content',
    title: '资源分配',
    body: '选中一座设施后，在详情面板调整人口分配（staffing）。不同设施的人口投入决定各类资源的产出速率，合理分配是优化产能的关键。',
    placement: 'top',
  },
  {
    targetSelector: '.tab-nav button[data-tab="research"]',
    title: '科研计划',
    body: '点击「科技」标签进入科研树。指定科研计划可解锁新的生产方式与效率修正，是扩大建筑产能、推进星舰建造的引擎。',
    placement: 'bottom',
  },
  {
    targetSelector: '.tab-nav button[data-tab="ship"]',
    title: '建造星舰',
    body: '点击「星舰」标签查看御座号建造进度。星舰是千日试验的终局目标，完成度是国祚评分的最大权重——需储备三阶段物资持续推进。',
    placement: 'bottom',
  },
  {
    targetSelector: '.tab-nav button[data-tab="starport"]',
    title: '星海贸易',
    body: '点击「贸易」标签进入星海贸易港。用盈余资源交换稀缺物资，可补齐产业链缺口，为星舰建造加速。',
    placement: 'bottom',
  },
  {
    targetSelector: '.tab-nav button[data-tab="visitors"]',
    title: '外星人事件',
    body: '点击「异客」标签查看深空来讯。应对外星人事件、招募合适的异客角色入职，可带来设施加成与额外产能优势。',
    placement: 'bottom',
  },
  {
    targetSelector: '.time-dock',
    title: '时间控制',
    body: '暂停以从容决策，恢复则日历自动推进。点击可切换正常/加速。1000御日后试验终止。',
    placement: 'top',
  },
  {
    targetSelector: '.scoreline:nth-child(2)',
    title: '国祚评分',
    body: '右侧实时显示当前评分。最终国祚由星舰完成度（权重最高）、设施规模、招募角色和知识储量共同决定。',
    placement: 'top',
  },
]

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

const PADDING = 12
const TOOLTIP_GAP = 16

interface TooltipStyle {
  left: number
  top: number
  arrowClass: string
}

function computeTooltip(target: Rect, placement: TutorialStep['placement']): TooltipStyle {
  const viewW = window.innerWidth
  const viewH = window.innerHeight
  const estW = 320
  const estH = 140

  let left = 0
  let top = 0
  let arrowClass = ''

  switch (placement) {
    case 'top': {
      left = target.x + target.w / 2 - estW / 2
      top = target.y - estH - TOOLTIP_GAP
      arrowClass = 'arrow-bottom'
      break
    }
    case 'bottom': {
      left = target.x + target.w / 2 - estW / 2
      top = target.y + target.h + TOOLTIP_GAP
      arrowClass = 'arrow-top'
      break
    }
    case 'left': {
      left = target.x - estW - TOOLTIP_GAP
      top = target.y + target.h / 2 - estH / 2
      arrowClass = 'arrow-right'
      break
    }
    case 'right': {
      left = target.x + target.w + TOOLTIP_GAP
      top = target.y + target.h / 2 - estH / 2
      arrowClass = 'arrow-left'
      break
    }
  }

  left = Math.max(16, Math.min(left, viewW - estW - 16))
  top = Math.max(16, Math.min(top, viewH - estH - 16))

  return { left, top, arrowClass }
}

export interface TutorialOverlayProps {
  onComplete: () => void
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0)
  const stepRef = useRef(step)
  stepRef.current = step

  const current = tutorialSteps[step]
  const isLast = step === tutorialSteps.length - 1

  // Re-measure on resize
  const [, setTick] = useState(0)
  useEffect(() => {
    const onResize = () => setTick(t => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete()
      if (e.key === 'Enter' || e.key === ' ') {
        if (isLast) onComplete()
        else setStep(s => Math.min(s + 1, tutorialSteps.length - 1))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isLast, onComplete])

  const targetRect = getTargetRect(current.targetSelector)
  if (!targetRect) {
    // If target not found (rare), skip to complete
    onComplete()
    return null
  }

  const highlight = {
    left: targetRect.x - PADDING,
    top: targetRect.y - PADDING,
    width: targetRect.w + PADDING * 2,
    height: targetRect.h + PADDING * 2,
  }

  const tooltip = computeTooltip(targetRect, current.placement)

  return createPortal(
    <div className={styles['tutorial-overlay']} role="dialog" aria-modal="true" aria-label="新手引导">
      {/* Scrim with cutout */}

      {/* Scrim top area */}
      <div className={styles['tutorial-scrim-block']} style={{ top: 0, left: 0, right: 0, height: highlight.top }} />
      {/* Scrim bottom area */}
      <div className={styles['tutorial-scrim-block']} style={{ top: highlight.top + highlight.height, left: 0, right: 0, bottom: 0 }} />
      {/* Scrim left area */}
      <div className={styles['tutorial-scrim-block']} style={{ top: highlight.top, left: 0, width: highlight.left, height: highlight.height }} />
      {/* Scrim right area */}
      <div className={styles['tutorial-scrim-block']} style={{ top: highlight.top, left: highlight.left + highlight.width, right: 0, height: highlight.height }} />

      {/* Highlight box */}
      <div
        className={styles['tutorial-highlight']}
        style={{
          left: highlight.left,
          top: highlight.top,
          width: highlight.width,
          height: highlight.height,
        }}
      />

      {/* Tooltip */}
      <div
        className={`${styles['tutorial-tooltip']} ${styles[tooltip.arrowClass]}`}
        style={{ left: tooltip.left, top: tooltip.top }}
      >
        <span className={styles['tutorial-step-badge']}>{step + 1} / {tutorialSteps.length}</span>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
        <div className={styles['tutorial-actions']}>
          <button className={styles['tutorial-skip']} onClick={onComplete}>跳过</button>
          {isLast ? (
            <Button variant="primary" onClick={onComplete}>开始执政</Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(s => s + 1)}>下一步</Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
