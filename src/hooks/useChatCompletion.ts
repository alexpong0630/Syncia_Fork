import endent from 'endent'
import { ChatOpenAI } from '@langchain/openai'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { useMemo, useState } from 'react'
import type { Mode } from '../config/settings'
import { getMatchedContent } from '../lib/getMatchedContent'
import { ChatRole, useCurrentChat } from './useCurrentChat'
import type { MessageDraft } from './useMessageDraft'

interface UseChatCompletionProps {
  model: string
  apiKey: string
  mode: Mode
  baseURL: string
}

let controller: AbortController

export const useChatCompletion = ({
  model,
  apiKey,
  mode,
  baseURL,
}: UseChatCompletionProps) => {
  const {
    messages,
    updateAssistantMessage,
    addNewMessage,
    commitToStoredMessages,
    clearMessages,
    removeMessagePair,
  } = useCurrentChat()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const llm = useMemo(() => {
    return new ChatOpenAI({
      streaming: true,
      openAIApiKey: apiKey,
      modelName: model,
      configuration: {
        baseURL: baseURL,
      },
      temperature: Number(mode),
    })
  }, [apiKey, model, mode, baseURL])

  const previousMessages = messages.map((msg) => {
    switch (msg.role) {
      case ChatRole.ASSISTANT:
        return new AIMessage(msg.content)
      case ChatRole.SYSTEM:
        return new SystemMessage(msg.content)
      case ChatRole.USER:
        return new HumanMessage(msg.content)
    }
  })

  const submitQuery = async (message: MessageDraft, context?: string) => {
    console.log('=== submitQuery Debug ===')
    console.log('submitQuery called with:', {
      messageText: message.text,
      hasContext: !!context,
      contextLength: context?.length || 0,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
      baseURL,
      baseURLType: typeof baseURL,
      baseURLLength: baseURL.length
    })
    
    // 檢查 Base URL 是否為空或預設值
    if (!baseURL || baseURL === '' || baseURL === 'https://api.openai.com/v1') {
      console.warn('⚠️ Base URL is empty or default in submitQuery!')
      console.warn('Expected Base URL should be:', 'https://api1.project-ax.party/v1')
    }
    
    await addNewMessage(ChatRole.USER, message)
    controller = new AbortController()
    const options = {
      signal: controller.signal,
      callbacks: [{ handleLLMNewToken: updateAssistantMessage }],
    }

    setError(null)
    setGenerating(true)

    try {
      let matchedContext: string | undefined
      if (context) {
        console.log('Calling getMatchedContent with baseURL:', baseURL)
        matchedContext = await getMatchedContent(
          message.text,
          context,
          apiKey,
          baseURL,
        )
      }

      const expandedQuery = matchedContext
        ? endent`
      ### Context
      ${matchedContext}
      ### Question:
      ${message.text}
    `
        : message.text

      const messages = [
        ...previousMessages,
        new HumanMessage({
          content:
            message.files.length > 0
              ? [
                  { type: 'text', text: expandedQuery },
                  ...(message.files.length > 0
                    ? await Promise.all(
                        message.files.map(async (file) => {
                          return {
                            type: 'image_url',
                            image_url: { url: file.src },
                          } as const
                        }),
                      )
                    : []),
                ]
              : expandedQuery,
        }),
      ]

      console.log(JSON.stringify(messages, null, 2))

      await llm.invoke(messages, options)
    } catch (e) {
      setError(e as Error)
    } finally {
      commitToStoredMessages()
      setGenerating(false)
    }
  }

  const cancelRequest = () => {
    controller.abort()
    commitToStoredMessages()
    setGenerating(false)
  }

  return {
    messages,
    submitQuery,
    generating,
    cancelRequest,
    clearMessages,
    removeMessagePair,
    error,
  }
}
