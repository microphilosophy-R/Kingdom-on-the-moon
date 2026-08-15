import { TutorialOverlay, SettingsPanel, type SettingsPanelProps } from '../business'
import { GameHeader } from './GameHeader'

type SharedSettingsProps = Pick<SettingsPanelProps,
  'volume' | 'saveSlotMetas' | 'autoTradeProtectionEnabled' | 'onAutoTradeProtection' | 'onVolume' | 'onSave' | 'onLoad' | 'onRename'>

interface TutorialScreenProps extends SharedSettingsProps {
  settingsOpen: boolean
  toastMessage: string | null
  onCompleteTutorial: () => void
  onCloseSettings: () => void
  onExit: () => void
  onSaveAndExit: () => void
  onClearAndExit: () => void
}

export function TutorialScreen({
  settingsOpen,
  toastMessage,
  onCompleteTutorial,
  onCloseSettings,
  onExit,
  onSaveAndExit,
  onClearAndExit,
  ...settings
}: TutorialScreenProps) {
  return (
    <>
      <main className="app-shell">
        {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
        <GameHeader />
        <TutorialOverlay onComplete={onCompleteTutorial} />
      </main>
      {settingsOpen && (
        <SettingsPanel
          {...settings}
          onContinue={onCloseSettings}
          onExit={onExit}
          onSaveAndExit={onSaveAndExit}
          onClearAndExit={onClearAndExit}
        />
      )}
    </>
  )
}
