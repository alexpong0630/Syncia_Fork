import { useCallback, useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import axios from 'axios'

type OpenAIModel = {
  id: string
  object: string
  created: number
  owned_by: string
}

export const useEmbeddingModels = () => {
  const [settings, setSettings] = useSettings()
  const [models, setModels] = useState<OpenAIModel[]>([])
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
          model.id.includes('embedding'),
        )
        setModels(embeddingModels)
      } catch (error) {
        console.log('Failed to fetch models:', error)
        setModels([])
      }
    }
  }, [chatSettings.openAIKey, chatSettings.openAiBaseUrl])

  useEffect(() => {
    fetchAvailableModels()
  }, [fetchAvailableModels])

  const setActiveEmbeddingModel = async (modelId: string) => {
    await setSettings({
      ...settings,
      chat: {
        ...chatSettings,
        embeddingModel: modelId,
      },
    })
  }

  return {
    models,
    activeEmbeddingModel,
    setActiveEmbeddingModel,
    fetchAvailableModels,
  }
}
