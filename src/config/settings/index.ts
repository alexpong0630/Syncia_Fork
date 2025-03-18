import { defaultPrompts } from '../prompts/default'

export enum ThemeOptions {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum Mode {
  HIGHLY_PRECISE = 0,
  PRECISE = 0.5,
  BALANCED = 1,
  CREATIVE = 1.5,
}

export enum Language{
  ENGLISH = 'ENGLISH',
  CHINESE = 'Chinese'
}

export type Settings = {
  quickMenu: {
    enabled: boolean
    items: typeof defaultPrompts
    excludedSites: string[]
  }
  chat: {
    openAIKey: string | null
    model: string | null
    mode: Mode
    openAiBaseUrl: string | null
  }
  general: {
    theme: ThemeOptions
    webpageContext: boolean
  },
  autoTranslation: {
    enabled: boolean
    language: string
    autoTranslateForDomain: string[]
    batchSize: number,
    thread: number
  }
}

export const defaultSettings: Settings = {
  quickMenu: {
    enabled: true,
    items: defaultPrompts,
    excludedSites: [],
  },
  chat: {
    openAIKey: null,
    model: null,
    mode: Mode.BALANCED,
    openAiBaseUrl: null,
  },
  general: {
    theme: ThemeOptions.SYSTEM,
    webpageContext: false,
  },
  autoTranslation: {
    enabled: true,
    language: 'Chinese(Traditional)',
    autoTranslateForDomain: [],
    batchSize:50,
    thread: 5
  }
}
