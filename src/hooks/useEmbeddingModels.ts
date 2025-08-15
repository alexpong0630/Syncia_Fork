import { useCallback, useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import axios from 'axios'

type OpenAIModel = {
  id: string
  object: string
  created: number
  owned_by: string
}

type EmbeddingFormat = 'auto' | 'float' | 'base64'

export const useEmbeddingModels = () => {
  const [settings, setSettings] = useSettings()
  const [models, setModels] = useState<OpenAIModel[]>([])
  const [isTestingFormat, setIsTestingFormat] = useState(false)
  const chatSettings = settings.chat
  const activeEmbeddingModel = chatSettings.embeddingModel

  const fetchAvailableModels = useCallback(async () => {
    if (chatSettings.openAIKey) {
      try {
        const baseUrl =
          chatSettings.openAiBaseUrl || 'https://api.openai.com/v1'
        const { data } = await axios.get(`${baseUrl}/models`, {
          headers: {
            Authorization: `Bearer ${chatSettings.openAIKey}`,
          },
        })

        const embeddingModels = data.data.filter((model: OpenAIModel) =>
          model.id.includes('embedding') || model.id.includes('bge'),
        )
        setModels(embeddingModels)
      } catch (error) {
        setModels([])
      }
    }
  }, [chatSettings.openAIKey, chatSettings.openAiBaseUrl])

  // 測試 embedding model 的響應格式
  const testEmbeddingFormat = useCallback(async (modelId: string): Promise<EmbeddingFormat> => {
    if (!chatSettings.openAIKey) {
      throw new Error('No API key available')
    }

    const baseUrl = chatSettings.openAiBaseUrl || 'https://api.openai.com/v1'
    const endpoint = `${baseUrl}/embeddings`
    
    // 測試用的簡單文本
    const testText = 'Hello world'
    
    try {
      // 先嘗試 float 格式
      const floatResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chatSettings.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: testText,
          model: modelId,
          encoding_format: 'float'
        })
      })

      if (floatResponse.ok) {
        const data = await floatResponse.json()
        if (data.data && data.data[0] && Array.isArray(data.data[0].embedding)) {
          const embedding = data.data[0].embedding
          return 'float'
        }
      }
    } catch (error) {
      // Float format test failed
    }

    try {
      // 再嘗試 base64 格式
      const base64Response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chatSettings.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: testText,
          model: modelId,
          encoding_format: 'base64'
        })
      })

      if (base64Response.ok) {
        const data = await base64Response.json()
        if (data.data && data.data[0] && typeof data.data[0].embedding === 'string') {
          const embedding = data.data[0].embedding
          return 'base64'
        }
      }
    } catch (error) {
      // Base64 format test failed
    }

    try {
      // 最後嘗試不指定格式（讓 API 自己決定）
      const defaultResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chatSettings.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: testText,
          model: modelId
        })
      })

      if (defaultResponse.ok) {
        const data = await defaultResponse.json()
        if (data.data && data.data[0] && data.data[0].embedding) {
          const embedding = data.data[0].embedding
          if (Array.isArray(embedding)) {
            return 'float'
          } else if (typeof embedding === 'string') {
            return 'base64'
          }
        }
      }
    } catch (error) {
      // Default format test failed
    }

    // 如果都不支援，預設使用 auto
    return 'auto'
  }, [chatSettings.openAIKey, chatSettings.openAiBaseUrl])

  const setActiveEmbeddingModel = async (modelId: string) => {
    setIsTestingFormat(true)
    
    try {
      // 自動檢測模型支援的格式
      const detectedFormat = await testEmbeddingFormat(modelId)
      
      // 更新設定，包括模型和檢測到的格式
      await setSettings({
        ...settings,
        chat: {
          ...chatSettings,
          embeddingModel: modelId,
          embeddingFormat: detectedFormat,
        },
      })
    } catch (error) {
      console.error('Failed to test embedding format:', error)
      // 如果檢測失敗，仍然設定模型但使用 auto 格式
      await setSettings({
        ...settings,
        chat: {
          ...chatSettings,
          embeddingModel: modelId,
          embeddingFormat: 'auto',
        },
      })
    } finally {
      setIsTestingFormat(false)
    }
  }

  useEffect(() => {
    fetchAvailableModels()
  }, [fetchAvailableModels])

  return {
    models,
    activeEmbeddingModel,
    setActiveEmbeddingModel,
    fetchAvailableModels,
    isTestingFormat,
  }
}
