// 測試腳本：調試 embedding 問題
export const testEmbeddingDebug = async () => {
  console.log('=== Embedding Debug Test ===')
  
  // 測試 1: 檢查 FlexibleEmbeddings 是否正確實現
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    console.log('Current settings:', {
      embeddingModel: settings.chat.embeddingModel,
      embeddingFormat: settings.chat.embeddingFormat,
      hasApiKey: !!settings.chat.openAIKey,
      baseURL: settings.chat.openAiBaseUrl,
      baseURLType: typeof settings.chat.openAiBaseUrl,
      baseURLLength: settings.chat.openAiBaseUrl?.length || 0
    })
    
    // 檢查 Base URL 設定
    if (!settings.chat.openAiBaseUrl || settings.chat.openAiBaseUrl === '') {
      console.error('❌ Base URL is empty or undefined!')
      console.error('This will cause embedding requests to use default OpenAI URL')
    } else if (settings.chat.openAiBaseUrl === 'https://api.openai.com/v1') {
      console.warn('⚠️ Base URL is set to default OpenAI URL')
    } else {
      console.log('✅ Base URL is set to:', settings.chat.openAiBaseUrl)
    }
  } catch (error) {
    console.error('Failed to get settings:', error)
  }
  
  // 測試 2: 檢查 IndexedDB 中的向量數據
  try {
    const { readStorage } = await import('../hooks/useStorage')
    const testKey = 'SYNCIA_STORE_EMBEDDINGS_TEST'
    const testData = await readStorage<any[]>(testKey, 'indexedDB')
    console.log('Test IndexedDB data:', testData)
  } catch (error) {
    console.error('Failed to test IndexedDB:', error)
  }
  
  // 測試 3: 檢查是否有無限循環的跡象
  const performanceMark = performance.mark('embedding-test-start')
  console.log('Performance mark created:', performanceMark)
  
  console.log('=== Debug Test Complete ===')
}

// 測試 Base URL 設定
export const testBaseURL = async () => {
  console.log('=== Base URL Test ===')
  
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    
    console.log('Base URL test results:')
    console.log('- Raw value:', settings.chat.openAiBaseUrl)
    console.log('- Type:', typeof settings.chat.openAiBaseUrl)
    console.log('- Length:', settings.chat.openAiBaseUrl?.length || 0)
    console.log('- Is empty:', !settings.chat.openAiBaseUrl || settings.chat.openAiBaseUrl === '')
    console.log('- Is default:', settings.chat.openAiBaseUrl === 'https://api.openai.com/v1')
    
    if (settings.chat.openAiBaseUrl && settings.chat.openAiBaseUrl !== 'https://api.openai.com/v1') {
      console.log('✅ Base URL is properly set')
    } else {
      console.error('❌ Base URL is not properly set')
    }
  } catch (error) {
    console.error('Failed to test Base URL:', error)
  }
}

// 測試 API key 和 Base URL 傳遞
export const testApiKeyAndBaseURL = async () => {
  console.log('=== API Key and Base URL Test ===')
  
  try {
    const { getStoredSettings } = await import('./getStoredSettings')
    const settings = await getStoredSettings()
    
    console.log('Settings check:')
    console.log('- API Key exists:', !!settings.chat.openAIKey)
    console.log('- API Key length:', settings.chat.openAIKey?.length || 0)
    console.log('- API Key starts with sk-:', settings.chat.openAIKey?.startsWith('sk-') || false)
    console.log('- Base URL:', settings.chat.openAiBaseUrl)
    console.log('- Base URL type:', typeof settings.chat.openAiBaseUrl)
    console.log('- Base URL length:', settings.chat.openAiBaseUrl?.length || 0)
    
    // 檢查 API key 格式
    if (settings.chat.openAIKey) {
      if (settings.chat.openAIKey.startsWith('sk-')) {
        console.log('✅ API Key format is correct')
      } else {
        console.error('❌ API Key format is incorrect (should start with sk-)')
      }
    } else {
      console.error('❌ No API Key found')
    }
    
    // 檢查 Base URL
    if (settings.chat.openAiBaseUrl && settings.chat.openAiBaseUrl !== 'https://api.openai.com/v1') {
      console.log('✅ Base URL is set to custom value')
    } else if (settings.chat.openAiBaseUrl === 'https://api.openai.com/v1') {
      console.warn('⚠️ Base URL is set to default OpenAI URL')
    } else {
      console.error('❌ Base URL is empty or undefined')
    }
    
    // 模擬 getMatchedContent 調用
    console.log('\nSimulating getMatchedContent call:')
    const mockApiKey = settings.chat.openAIKey || 'test-key'
    const mockBaseURL = settings.chat.openAiBaseUrl || 'https://api.openai.com/v1'
    
    console.log('Mock parameters:')
    console.log('- API Key:', mockApiKey ? `${mockApiKey.substring(0, 10)}...` : 'none')
    console.log('- Base URL:', mockBaseURL)
    
    // 檢查這些參數是否會正確傳遞
    if (mockApiKey && mockBaseURL && mockBaseURL !== 'https://api.openai.com/v1') {
      console.log('✅ Parameters should work correctly')
    } else {
      console.error('❌ Parameters have issues')
    }
    
  } catch (error) {
    console.error('Failed to test API key and Base URL:', error)
  }
}

// 導出測試函數
export default testEmbeddingDebug
