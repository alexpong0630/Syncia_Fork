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

export enum Language {
  ALBANIAN = 'Albanian',
  ARABIC = 'Arabic',
  ARMENIAN = 'Armenian',
  AWADHI = 'Awadhi',
  AZERBAIJANI = 'Azerbaijani',
  BASHKIR = 'Bashkir',
  BASQUE = 'Basque',
  BELARUSIAN = 'Belarusian',
  BENGALI = 'Bengali',
  BHOJPURI = 'Bhojpuri',
  BOSNIAN = 'Bosnian',
  BRAZILIAN_PORTUGUESE = 'Brazilian Portuguese',
  BULGARIAN = 'Bulgarian',
  CANTONESE_YUE = 'Cantonese (Yue)',
  CATALAN = 'Catalan',
  CHHATTISGARHI = 'Chhattisgarhi',
  CHINESE = 'Chinese',
  CHINESE_TRADITIONAL = 'Chinese Traditional',
  CROATIAN = 'Croatian',
  CZECH = 'Czech',
  DANISH = 'Danish',
  DOGRI = 'Dogri',
  DUTCH = 'Dutch',
  ENGLISH = 'English',
  ESTONIAN = 'Estonian',
  FAROESE = 'Faroese',
  FINNISH = 'Finnish',
  FRENCH = 'French',
  GALICIAN = 'Galician',
  GEORGIAN = 'Georgian',
  GERMAN = 'German',
  GREEK = 'Greek',
  GUJARATI = 'Gujarati',
  HARYANVI = 'Haryanvi',
  HINDI = 'Hindi',
  HUNGARIAN = 'Hungarian',
  INDONESIAN = 'Indonesian',
  IRISH = 'Irish',
  ITALIAN = 'Italian',
  JAPANESE = 'Japanese',
  JAVANESE = 'Javanese',
  KANNADA = 'Kannada',
  KASHMIRI = 'Kashmiri',
  KAZAKH = 'Kazakh',
  KONKANI = 'Konkani',
  KOREAN = 'Korean',
  KYRGYZ = 'Kyrgyz',
  LATVIAN = 'Latvian',
  LITHUANIAN = 'Lithuanian',
  MACEDONIAN = 'Macedonian',
  MAITHILI = 'Maithili',
  MALAY = 'Malay',
  MALTESE = 'Maltese',
  MANDARIN = 'Mandarin',
  MANDARIN_CHINESE = 'Mandarin Chinese',
  MARATHI = 'Marathi',
  MARWARI = 'Marwari',
  MIN_NAN = 'Min Nan',
  MOLDAVAN = 'Moldovan',
  MONGOLIAN = 'Mongolian',
  MONTENEGRIN = 'Montenegrin',
  NEPALI = 'Nepali',
  NORWEGIAN = 'Norwegian',
  ORIYA = 'Oriya',
  PASHTO = 'Pashto',
  PERSIAN_FARSI = 'Persian (Farsi)',
  POLISH = 'Polish',
  PORTUGUESE = 'Portuguese',
  PUNJABI = 'Punjabi',
  RAJASTHANI = 'Rajasthani',
  ROMANIAN = 'Romanian',
  RUSSIAN = 'Russian',
  SANSKRIT = 'Sanskrit',
  SANTALI = 'Santali',
  SERBIAN = 'Serbian',
  SINDHI = 'Sindhi',
  SINHALA = 'Sinhala',
  SLOVAK = 'Slovak',
  SLOVENE = 'Slovene',
  SLOVENIAN = 'Slovenian',
  UKRAINIAN = 'Ukrainian',
  URDU = 'Urdu',
  UZBEK = 'Uzbek',
  VIETNAMESE = 'Vietnamese',
  WELSH = 'Welsh',
  WU = 'Wu',
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
    embeddingModel: string | null
    embeddingFormat: 'auto' | 'float' | 'base64' // 新增：embedding 格式偏好
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
    embeddingModel: null,
    embeddingFormat: 'auto', // 預設為自動檢測
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
