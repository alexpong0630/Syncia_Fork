import { type Settings, defaultSettings } from '../config/settings'

export const getStoredSettings = async () => {
  const storedSettings = await getStoredSyncSettings()
  if (!storedSettings) {
    chrome.storage.sync.set({ SETTINGS: defaultSettings }, () => {
      console.log('ℹ️ Default settings stored from getStoredSettings.ts')
    })
  }
  return storedSettings || defaultSettings
}

const getStoredSyncSettings = async () => {
  const storedSyncSettings = await new Promise((resolve) => {
    chrome.storage.sync.get('SETTINGS', (result) => {
      resolve(result.SETTINGS)
    })
  })
  return storedSyncSettings as Settings | null
}
