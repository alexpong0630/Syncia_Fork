import { Dispatch, SetStateAction } from 'react'
import { useStorage } from './useStorage'
import { defaultPrompts } from '../prompts/list'

export enum AvailableModels {
  GPT_4 = 'gpt-4',
  GPT_4_0314 = 'gpt-4-0314',
  GPT_4_32K = 'gpt-4-32k',
  GPT_4_32K_0314 = 'gpt-4-32k-0314',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_3_5_TURBO_0301 = 'gpt-3.5-turbo-0301',
}

export enum Mode {
  BALANCED = '1',
  CREATIVE = '0.5',
  HIGHLY_CREATIVE = '0',
  PRECISE = '1.5',
  HIGHLY_PRECISE = '2',
}

export type Settings = {
  quickMenu: {
    enabled: boolean
    items: typeof defaultPrompts
    excludedSites: string[]
  }
  chat: {
    openAIKey: string | null
    modal: AvailableModels
    mode: Mode
  }
}

const defaultSettings: Settings = {
  quickMenu: {
    enabled: true,
    items: defaultPrompts,
    excludedSites: [],
  },
  chat: {
    openAIKey: null,
    modal: AvailableModels.GPT_3_5_TURBO,
    mode: Mode.BALANCED,
  },
}

export function useSettings(): [Settings, Dispatch<SetStateAction<Settings>>] {
  return useStorage<Settings>('SETTINGS', defaultSettings, 'sync')
}