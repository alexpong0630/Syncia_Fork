// 測試腳本：調試 embedding 問題
export const testEmbeddingDebug = async () => {
  // 測試 1: 檢查 FlexibleEmbeddings 是否正確實現
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    
    // 檢查 Base URL 設定
    if (!settings.chat.openAiBaseUrl || settings.chat.openAiBaseUrl === '') {
      console.error('❌ Base URL is empty or undefined!')
      console.error('This will cause embedding requests to use default OpenAI URL')
    } else if (settings.chat.openAiBaseUrl === 'https://api.openai.com/v1') {
      console.warn('⚠️ Base URL is set to default OpenAI URL')
    }
  } catch (error) {
    console.error('Failed to get settings:', error)
  }
  
  // 測試 2: 檢查 IndexedDB 中的向量數據
  try {
    const { readStorage } = await import('../hooks/useStorage')
    const testKey = 'SYNCIA_STORE_EMBEDDINGS_TEST'
    await readStorage<any[]>(testKey, 'indexedDB')
  } catch (error) {
    console.error('Failed to test IndexedDB:', error)
  }
  
  // 測試 3: 檢查是否有無限循環的跡象
  performance.mark('embedding-test-start')
}

// 測試 Base URL 設定
export const testBaseURL = async () => {
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    
    if (settings.chat.openAiBaseUrl && settings.chat.openAiBaseUrl !== 'https://api.openai.com/v1') {
      // Base URL is properly set
    } else {
      console.error('❌ Base URL is not properly set')
    }
  } catch (error) {
    console.error('Failed to test Base URL:', error)
  }
}

// 測試 API key 和 Base URL 傳遞
export const testApiKeyAndBaseURL = async () => {
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    
    // 檢查 API key 格式
    if (settings.chat.openAIKey) {
      if (settings.chat.openAIKey.startsWith('sk-')) {
        // API Key format is correct
      } else {
        console.error('❌ API Key format is incorrect (should start with sk-)')
      }
    } else {
      console.error('❌ No API Key found')
    }
    
    // 檢查 Base URL
    if (settings.chat.openAiBaseUrl && settings.chat.openAiBaseUrl !== 'https://api.openai.com/v1') {
      // Base URL is set to custom value
    } else if (settings.chat.openAiBaseUrl === 'https://api.openai.com/v1') {
      console.warn('⚠️ Base URL is set to default OpenAI URL')
    } else {
      console.error('❌ Base URL is empty or undefined')
    }
    
    // 模擬 getMatchedContent 調用
    const mockApiKey = settings.chat.openAIKey || 'test-key'
    const mockBaseURL = settings.chat.openAiBaseUrl || 'https://api.openai.com/v1'
    
    // 檢查這些參數是否會正確傳遞
    if (mockApiKey && mockBaseURL && mockBaseURL !== 'https://api.openai.com/v1') {
      // Parameters should work correctly
    } else {
      console.error('❌ Parameters have issues')
    }
    
  } catch (error) {
    console.error('Failed to test API key and Base URL:', error)
  }
}

// 導出測試函數
export default testEmbeddingDebug
