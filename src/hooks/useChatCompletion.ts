import endent from 'endent'
import { ChatOpenAI } from '@langchain/openai'
import { Ollama } from '@langchain/community/llms/ollama'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { useMemo, useState } from 'react'
import { AvailableModels, type Mode } from '../config/settings'
import { getMatchedContent } from '../lib/getMatchedContent'
import { ChatRole, useCurrentChat } from './useCurrentChat'
import type { MessageDraft } from './useMessageDraft'

interface UseChatCompletionProps {
  model: AvailableModels
  apiKey: string
  mode: Mode
  systemPrompt: string
}

/**
 * This hook is responsible for managing the chat completion
 * functionality by using the useCurrentChat hook
 *
 * It adds functions for
 * - submitting a query to the chat
 * - cancelling a query
 *
 * And returns them along with useful state from useCurrentChat hook
 */
let controller: AbortController

export const useChatCompletion = ({
  model,
  apiKey,
  mode,
  systemPrompt,
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
    const isOpenAIModel = Object.values(AvailableModels).includes(model)
    if (isOpenAIModel) {
      return new ChatOpenAI({
        streaming: true,
        openAIApiKey: apiKey,
        modelName: model,
        temperature: Number(mode),
        maxTokens: 4_096,
      })
    }
    return new Ollama({ model: model.replace('ollama-', '') })
  }, [apiKey, model, mode])

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
    await addNewMessage(ChatRole.USER, message)
    controller = new AbortController()
    const options = {
      signal: controller.signal,
      callbacks: [{ handleLLMNewToken: updateAssistantMessage }],
    }

    setError(null)
    setGenerating(true)

    try {
      /**
       * If context is provided, we need to use the LLM to get the relevant documents
       * and then run the LLM on those documents. We use in memory vector store to
       * get the relevant documents
       */
      let matchedContext: string | undefined
      if (context) {
        matchedContext = await getMatchedContent(message.text, context, apiKey)
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
        new SystemMessage(systemPrompt),
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
