import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'
import { Mode } from '../../../config/settings'
import { useChatModels } from '../../../hooks/useChatModels'
import { useEmbeddingModels } from '../../../hooks/useEmbeddingModels'
import { useSettings } from '../../../hooks/useSettings'
import { capitalizeText } from '../../../lib/capitalizeText'
import { validateApiKey } from '../../../lib/validApiKey'
import FieldWrapper from '../Elements/FieldWrapper'
import SectionHeading from '../Elements/SectionHeading'

const ChatSettings = () => {
  const [settings, setSettings] = useSettings()
  const [showPassword, setShowPassword] = useState(false)
  const [formatDetectionResult, setFormatDetectionResult] = useState<string | null>(null)
  const {
    models,
    setActiveChatModel,
    fetchAvailableModels: fetchAvailableChatModels,
  } = useChatModels()
  const {
    models: embeddingModels,
    setActiveEmbeddingModel,
    fetchAvailableModels: fetchAvailableEmbeddingModels,
    isTestingFormat,
  } = useEmbeddingModels()
  const OpenAiApiKeyInputRef = React.useRef<HTMLInputElement>(null)
  const OpenAiBaseUrlInputRef = React.useRef<HTMLInputElement>(null)

  const chatSettings = settings.chat

  const [isValidating, setIsValidating] = useState(false)
  
  // 自定義的 embedding model 設定函數，包含格式檢測結果通知
  const handleEmbeddingModelChange = async (modelId: string) => {
    try {
      await setActiveEmbeddingModel(modelId)
      
      // 顯示格式檢測結果
      const detectedFormat = settings.chat.embeddingFormat || 'auto'
      setFormatDetectionResult(`✅ Model "${modelId}" format detected: ${detectedFormat}`)
      
      // 3秒後自動清除通知
      setTimeout(() => {
        setFormatDetectionResult(null)
      }, 3000)
    } catch (error) {
      setFormatDetectionResult(`❌ Failed to set model "${modelId}": ${error}`)
      setTimeout(() => {
        setFormatDetectionResult(null)
      }, 5000)
    }
  }

  const handleOpenAiKeySubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    const apiKeyValue = OpenAiApiKeyInputRef.current?.value || ''
    const baseurlValue = OpenAiBaseUrlInputRef.current?.value || ''

    if (OpenAiApiKeyInputRef.current) {
      setIsValidating(true)
      const isOpenAiKeyValid: boolean = await validateApiKey(
        apiKeyValue,
        baseurlValue,
      )
      if (isOpenAiKeyValid) {
        await setSettings({
          ...settings,
          chat: {
            ...chatSettings,
            openAIKey: apiKeyValue,
            openAiBaseUrl: baseurlValue,
          },
        })
        fetchAvailableChatModels()
        fetchAvailableEmbeddingModels()
      }
      setIsValidating(false)
      const inputStyles = isOpenAiKeyValid
        ? { classname: 'input-success', value: `✅  ${apiKeyValue}` }
        : { classname: 'input-failed', value: `❌  ${apiKeyValue}` }

      OpenAiApiKeyInputRef.current.classList.add(inputStyles.classname)
      OpenAiApiKeyInputRef.current.value = inputStyles.value
      setTimeout(() => {
        if (!OpenAiApiKeyInputRef.current) return
        OpenAiApiKeyInputRef.current?.classList.remove(inputStyles.classname)
        OpenAiApiKeyInputRef.current.value = apiKeyValue
      }, 2000)
    }

    if (OpenAiBaseUrlInputRef.current) {
      OpenAiBaseUrlInputRef.current.classList.add('input-success')
      OpenAiBaseUrlInputRef.current.value = `✅ ${baseurlValue}`
      setTimeout(() => {
        if (!OpenAiBaseUrlInputRef.current) return
        OpenAiBaseUrlInputRef.current?.classList.remove('input-success')
        OpenAiBaseUrlInputRef.current.value = baseurlValue
      }, 2000)
    }
  }

  return (
    <div className="cdx-w-full cdx-flex-shrink-0 cdx-rounded-md">
      <SectionHeading title="Chat" />
      <FieldWrapper
        title="Open AI Key"
        description="You can get your Open AI key from https://platform.openai.com/api-keys"
        onSubmit={handleOpenAiKeySubmit}
      >
        <div className="cdx-flex cdx-gap-2 cdx-items-center">
          <div className="cdx-relative cdx-w-full">
            <input
              required
              ref={OpenAiApiKeyInputRef}
              name="openAiApiKey"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              defaultValue={chatSettings.openAIKey || ''}
              type={showPassword ? 'text' : 'password'}
              className="input"
            />
            <button
              type="button"
              className="cdx-absolute cdx-right-4 cdx-top-1/2 cdx-transform cdx--translate-y-1/2 cdx-text-neutral-500 dark:cdx-text-neutral-200 cdx-bg-transparent cdx-outline-none cdx-cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible size={18} />
              ) : (
                <AiOutlineEye size={18} />
              )}
            </button>
          </div>
          <button type="submit" className="btn">
            Update
          </button>
        </div>
      </FieldWrapper>
      <FieldWrapper
        title="OpenAI Base URL"
        description="Enter your custom OpenAI API base URL (optional)"
        onSubmit={handleOpenAiKeySubmit}
      >
        <div className="cdx-flex cdx-gap-2 cdx-items-center">
          <input
            ref={OpenAiBaseUrlInputRef}
            name="openAiBaseUrl"
            defaultValue={chatSettings.openAiBaseUrl || ''}
            placeholder="Enter your OpenAI Base URL"
            className="input cdx-w-full"
          />
          <button type="submit" className="btn">
            Update
          </button>
        </div>
      </FieldWrapper>
      <FieldWrapper
        title="Model"
        description="Choose between available chat models"
        row={true}
      >
        <select
          value={chatSettings.model || ''}
          className="input cdx-w-44"
          onChange={(e) => setActiveChatModel(e.target.value)}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
      </FieldWrapper>
      {embeddingModels.length > 0 && (
        <>
          <FieldWrapper
            title="Embedding Model"
            description="Choose between available embedding models (format will be automatically detected)"
            row={true}
          >
            <div className="cdx-flex cdx-gap-2 cdx-items-center">
              <select
                value={chatSettings.embeddingModel || ''}
                className="input cdx-w-44"
                onChange={(e) => handleEmbeddingModelChange(e.target.value)}
                disabled={isTestingFormat}
              >
                <option value="">Select a model</option>
                {embeddingModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
              {isTestingFormat && (
                <div className="cdx-flex cdx-items-center cdx-gap-2 cdx-text-sm cdx-text-blue-600 dark:cdx-text-blue-400">
                  <div className="cdx-w-4 cdx-h-4 cdx-border-2 cdx-border-blue-600 cdx-border-t-transparent cdx-rounded-full cdx-animate-spin"></div>
                  Testing format...
                </div>
              )}
            </div>
            {formatDetectionResult && (
              <div className="cdx-mt-2 cdx-p-2 cdx-text-sm cdx-rounded cdx-bg-blue-50 dark:cdx-bg-blue-900/20 cdx-text-blue-700 dark:cdx-text-blue-300 cdx-border cdx-border-blue-200 dark:cdx-border-blue-800">
                {formatDetectionResult}
              </div>
            )}
          </FieldWrapper>
          <FieldWrapper
            title="Embedding Format"
            description={`Automatically detected: ${chatSettings.embeddingFormat || 'auto'} (you can manually override if needed)`}
            row={true}
          >
            <select
              value={chatSettings.embeddingFormat || 'auto'}
              className="input cdx-w-44"
              onChange={(e) => setSettings({
                ...settings,
                chat: {
                  ...chatSettings,
                  embeddingFormat: e.target.value as 'auto' | 'float' | 'base64',
                },
              })}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="float">Float Array</option>
              <option value="base64">Base64</option>
            </select>
          </FieldWrapper>
        </>
      )}
      <FieldWrapper
        title="Mode"
        description="Tweak temperature of response. Creative will generate more non deterministic responses, Precise will generate more deterministic responses."
        row={true}
      >
        <select
          value={chatSettings.mode}
          onChange={async (e) => {
            await setSettings({
              ...settings,
              chat: {
                ...chatSettings,
                mode: e.target.value as unknown as Mode,
              },
            })
          }}
          className="input cdx-w-36"
        >
          {Object.entries(Mode)
            .filter(([, v]) => !Number.isNaN(Number(v)))
            .map(([key, value]) => (
              <option key={key} value={value}>
                {capitalizeText(key.replace('_', ' ').toLowerCase())}
              </option>
            ))}
        </select>
      </FieldWrapper>
    </div>
  )
}

export default ChatSettings
