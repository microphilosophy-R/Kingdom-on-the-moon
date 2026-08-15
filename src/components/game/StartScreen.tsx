import { StartGate, SettingsPanel, type SettingsPanelProps, type StartOptions } from '../business'
import type { Difficulty } from '../../economy'
import type { SaveSlotMeta } from '../../types/game'
import type { PlanetTexture } from '../../PlanetScene'

type SharedSettingsProps = Pick<SettingsPanelProps,
  'volume' | 'saveSlotMetas' | 'autoTradeProtectionEnabled' | 'onAutoTradeProtection' | 'onVolume' | 'onSave' | 'onLoad' | 'onRename'>

interface StartScreenProps extends SharedSettingsProps {
  planetTexture: PlanetTexture
  autoSave: { difficulty: Difficulty; observerMode: boolean; day: number } | null
  startSettingsOpen: boolean
  toastMessage: string | null
  onStart: (options: StartOptions) => void
  onContinue: (options: Pick<StartOptions, 'observerMode' | 'autoEventsEnabled'>) => void
  onOpenSettings: () => void
  onCloseSettings: () => void
}

export function StartScreen({
  planetTexture,
  autoSave,
  startSettingsOpen,
  toastMessage,
  onStart,
  onContinue,
  onOpenSettings,
  onCloseSettings,
  ...settings
}: StartScreenProps) {
  return (
    <>
      <StartGate
        planetTexture={planetTexture}
        autoSave={autoSave}
        onStart={onStart}
        onContinue={onContinue}
        onSettings={onOpenSettings}
      />
      {startSettingsOpen && (
        <SettingsPanel {...settings} onContinue={onCloseSettings} onExit={onCloseSettings} />
      )}
      {toastMessage && <div className="save-toast" role="status" aria-live="polite">{toastMessage}</div>}
    </>
  )
}
