import { Info } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface InfoToggleProps {
  title: string
  children: ReactNode
  autoCloseMs?: number
}

export function InfoToggle({ title, children, autoCloseMs = 7200 }: InfoToggleProps) {
  const [open, setOpen] = useState(false)
  const hostRef = useRef<HTMLSpanElement | null>(null)
  const closeTimer = useRef<number | null>(null)

  const clearCloseTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => setOpen(false), autoCloseMs)
  }

  useEffect(() => {
    if (!open) {
      clearCloseTimer()
      return undefined
    }

    scheduleClose()
    const handlePointerDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      clearCloseTimer()
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, autoCloseMs])

  return (
    <span ref={hostRef} className={`info-toggle ${open ? 'open' : ''}`} onPointerDownCapture={() => open && scheduleClose()}>
      <button type="button" aria-label={title} aria-expanded={open} title={title} onClick={() => setOpen(previous => !previous)}><Info size={13} /></button>
      {open && <div role="tooltip">{children}</div>}
    </span>
  )
}
