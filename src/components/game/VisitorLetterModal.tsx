import { X } from 'lucide-react'
import { canAfford, type PopulationProjection, type Resources } from '../../economy'
import type { Encounter } from '../../events'
import { Modal, LetterActions } from '../layout'
import { IconButton, PortraitSlot } from '../ui'
import { ResourceBundle } from '../resources'
import { visitorPortraits } from '../../data/visitorPortraits'

interface VisitorLetterModalProps {
  visitor: Encounter
  chainProgress: Record<string, number>
  populationProjection: PopulationProjection
  resources: Resources
  onDismiss: () => void
  onAccept: () => void
  onEmploy: () => void
}

export function VisitorLetterModal({
  visitor,
  chainProgress,
  populationProjection,
  resources,
  onDismiss,
  onAccept,
  onEmploy,
}: VisitorLetterModalProps) {
  return (
    <Modal scrimClassName="event-scrim" panelClassName="diplomatic-letter event-modal" ariaLabel="深空来讯" ariaLive="polite">
      <PortraitSlot src={visitorPortraits[visitor.id]} alt={visitor.name} aria-label="访客肖像" />
      <div className="letter-copy">
        <div className="event-transmission-head">
          <span>深空来讯</span>
          <small>{visitor.species} · {visitor.chain.arc === 'long' ? `链 ${Math.min((chainProgress[visitor.chain.id] ?? 0) + 1, visitor.chain.events.length)}/${visitor.chain.events.length}` : '偶遇'}</small>
        </div>
        <strong>{visitor.event.title}</strong>
        <p className="letter-body">{visitor.event.body}</p>
        <p className="letter-portrait-text">{visitor.portrait}</p>
        {visitor.event.note && <p className="letter-note">{visitor.event.note}</p>}
        {visitor.event.concealed ? <div className="event-exchange concealed"><div><b>隐含风险</b><span className="resource-empty">从来函文字判断</span></div><div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div></div> : <div className="event-exchange">
          <div><b>索取</b><ResourceBundle bundle={visitor.offer.take} /></div>
          <div><b>回赠</b><ResourceBundle bundle={visitor.offer.give} /></div>
          <div><b>留任</b><ResourceBundle bundle={visitor.retainerCost} /></div>
        </div>}
      </div>
      <LetterActions>
        <button onClick={onDismiss}>礼送</button>
        <button onClick={onAccept} disabled={!canAfford(resources, visitor.offer.take) || Boolean(visitor.offer.give.population && (populationProjection.availableCapacity < visitor.offer.give.population || populationProjection.lifeSupportRatio < 1))}>{visitor.event.interaction === 'gift' ? '收下' : visitor.event.interaction === 'accident' ? '接入' : visitor.event.interaction === 'request' ? '准许' : '交换'}</button>
        <button className="primary" onClick={onEmploy} disabled={!canAfford(resources, visitor.retainerCost)}>留任</button>
      </LetterActions>
      <IconButton className="letter-close" label="关闭来函" onClick={onDismiss}><X size={16} /></IconButton>
    </Modal>
  )
}
