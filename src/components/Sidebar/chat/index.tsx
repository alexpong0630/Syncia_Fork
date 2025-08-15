import React, { useEffect } from 'react'
import ChatList from './ChatList'
import { SidebarInput } from './ChatInput'
import { useChatCompletion } from '../../../hooks/useChatCompletion'
import type { Settings } from '../../../config/settings'
import { useMessageDraft } from '../../../hooks/useMessageDraft'

interface ChatProps {
  settings: Settings
}

const Chat = ({ settings }: ChatProps) => {
  // 檢查 Base URL 是否為空或預設值
  if (!settings.chat.openAiBaseUrl || settings.chat.openAiBaseUrl === '') {
    console.warn('⚠️ Base URL is empty in Chat component!')
    console.warn('Expected Base URL should be:', 'https://api1.project-ax.party/v1')
  }
  
  const {
    messages,
    submitQuery,
    clearMessages,
    generating,
    cancelRequest,
    removeMessagePair,
    error,
  } = useChatCompletion({
    model: settings.chat.model!,
    apiKey: settings.chat.openAIKey!,
    mode: settings.chat.mode,
    baseURL: settings.chat.openAiBaseUrl || '',
  })

  const {
    messageDraft,
    setMessageDraftText,
    resetMessageDraft,
    addMessageDraftFile,
    removeMessageDraftFile,
  } = useMessageDraft()

  // Debug: Log messageDraft changes
  useEffect(() => {
    // MessageDraft updated
  }, [messageDraft])

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      const { action, prompt, payload } = event.data as {
        action: string
        prompt?: string
        payload?: any
      }
      
      if (action === 'generate') {
        submitQuery({ text: prompt!, files: [] })
      } else if (action === 'add-image-to-chat') {
        // Handle adding image to chat from right-click context menu
        const { imageUrl } = payload as { imageUrl: string }
        
        if (imageUrl) {
          // Method 1: Try to fetch the image with different CORS settings
          fetch(imageUrl, { 
            mode: 'no-cors',
            credentials: 'omit'
          })
            .then(response => {
              return response.blob()
            })
            .then(blob => {
              if (blob && blob.size > 0) {
                return addMessageDraftFile(blob)
              } else {
                throw new Error('Empty blob received')
              }
            })
            .catch(error => {
              // Method 2: Use canvas to capture the image
              const img = new Image()
              img.crossOrigin = 'anonymous'
              
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas')
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    canvas.width = img.naturalWidth || img.width
                    canvas.height = img.naturalHeight || img.height
                    ctx.drawImage(img, 0, 0)
                    
                    canvas.toBlob((blob) => {
                      if (blob && blob.size > 0) {
                        addMessageDraftFile(blob)
                          .catch(err => console.error('Canvas fallback failed:', err))
                      } else {
                        console.error('Canvas created empty blob')
                      }
                    }, 'image/png', 0.9)
                  }
                } catch (canvasError) {
                  console.error('Canvas error:', canvasError)
                }
              }
              
              img.onerror = (error) => {
                console.error('Failed to load image for canvas fallback:', error)
                
                // Method 3: Try to create a blob directly from the URL
                try {
                  const xhr = new XMLHttpRequest()
                  xhr.open('GET', imageUrl, true)
                  xhr.responseType = 'blob'
                  xhr.onload = function() {
                    if (this.status === 200) {
                      const blob = this.response
                      addMessageDraftFile(blob)
                        .catch(err => console.error('XHR method failed:', err))
                    } else {
                      console.error('XHR failed with status:', this.status)
                    }
                  }
                  xhr.onerror = function() {
                    console.error('XHR request failed')
                  }
                  xhr.send()
                } catch (xhrError) {
                  console.error('XHR method error:', xhrError)
                }
              }
              
              // Set a timeout for image loading
              setTimeout(() => {
                if (!img.complete) {
                  console.error('Image loading timeout')
                }
              }, 10000)
              
              img.src = imageUrl
            })
        }
      }
    }
    window.addEventListener('message', handleWindowMessage)

    return () => {
      window.removeEventListener('message', handleWindowMessage)
    }
  }, [submitQuery, addMessageDraftFile])

  return (
    <>
      <ChatList
        messages={messages}
        removeMessagePair={removeMessagePair}
        generating={generating}
        error={error}
      />
      <SidebarInput
        loading={generating}
        submitMessage={submitQuery}
        chatIsEmpty={messages.length <= 1}
        clearMessages={clearMessages}
        cancelRequest={cancelRequest}
        isWebpageContextOn={settings.general.webpageContext}
        isVisionModel={true}
        messageDraft={messageDraft}
        setMessageDraftText={setMessageDraftText}
        resetMessageDraft={resetMessageDraft}
        addMessageDraftFile={addMessageDraftFile}
        removeMessageDraftFile={removeMessageDraftFile}
      />
    </>
  )
}

export default Chat
