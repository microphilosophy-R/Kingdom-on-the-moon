/**
 * localStorage 持久化工具：自动存档、多槽位元数据、音量与引导标记键。
 * 从 App.tsx 拆分而来（原模块级代码），纯函数、无副作用调用点。
 */
import { gameCalendar } from '../economy'
import type { GameSaveState, SaveSlotMeta } from '../types/game'

export const saveKey = (slotIndex: number) => `lunar-crown-save-v4-${slotIndex}`
export const saveMetaKey = (slotIndex: number) => `lunar-crown-save-meta-${slotIndex}`
export const maxSaveSlots = 6
export const musicVolumeKey = 'lunar-crown-music-volume'
export const tutorialSeenKey = 'lunar-crown-tutorial-seen'
export const autoSaveKey = 'lunar-crown-autosave-v6'

export const readAutoSave = (): GameSaveState | null => {
  try {
    const raw = window.localStorage.getItem(autoSaveKey)
    if (!raw) return null
    return JSON.parse(raw) as GameSaveState
  } catch {
    return null
  }
}

export const writeAutoSave = (save: GameSaveState) => {
  window.localStorage.setItem(autoSaveKey, JSON.stringify(save))
}

export const clearAutoSave = () => {
  window.localStorage.removeItem(autoSaveKey)
}

export const readSaveSlotMeta = (slotIndex: number): SaveSlotMeta | null => {
  try {
    const raw = window.localStorage.getItem(saveMetaKey(slotIndex))
    if (!raw) return null
    return JSON.parse(raw) as SaveSlotMeta
  } catch {
    return null
  }
}

export const readAllSaveSlotMetas = (): (SaveSlotMeta | null)[] =>
  Array.from({ length: maxSaveSlots }, (_, i) => readSaveSlotMeta(i))

export const writeSaveSlotMeta = (slotIndex: number, meta: SaveSlotMeta) => {
  window.localStorage.setItem(saveMetaKey(slotIndex), JSON.stringify(meta))
}

export const formatSaveSlotDay = (day: number) => {
  const monthNumber = Math.max(1, Math.ceil(day / gameCalendar.reignMonthDays))
  return `第 ${monthNumber} 个${gameCalendar.monthName}·御日 ${day}`
}

export const loadStoredMusicVolume = () => {
  if (typeof window === 'undefined') return 0.42
  const stored = window.localStorage.getItem(musicVolumeKey)
  const parsed = stored === null ? 0.42 : Number(stored)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.42
}
