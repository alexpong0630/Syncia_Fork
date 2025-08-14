import { useState } from 'react'
import { getUUID } from '../lib/getUUID'
import { convertBlobToBase64 } from '../lib/convertBlobToBase64'

export interface MessageFile {
  id: string
  type: string
  src: string
}

export interface MessageDraft {
  text: string
  files: MessageFile[]
}

export const useMessageDraft = () => {
  const [messageDraft, setMessageDraft] = useState<MessageDraft>({
    text: '',
    files: [],
  })

  const setMessageDraftText = (text: string) => {
    setMessageDraft((p) => ({ ...p, text }))
  }

  const addMessageDraftFile = async (blob: Blob) => {
    console.log('addMessageDraftFile called with blob:', blob)
    console.log('Blob size:', blob.size, 'Blob type:', blob.type)
    
    try {
      const file = {
        id: getUUID(),
        type: blob.type || 'image/png',
        src: await convertBlobToBase64(blob),
      }
      console.log('File object created:', file)
      console.log('Base64 string length:', file.src.length)
      
      setMessageDraft((p) => {
        const newDraft = { ...p, files: [...p.files, file] }
        console.log('Message draft updated:', newDraft)
        return newDraft
      })
      
      console.log('File successfully added to message draft')
    } catch (error) {
      console.error('Error in addMessageDraftFile:', error)
      throw error
    }
  }

  const removeMessageDraftFile = (id: string) => {
    setMessageDraft((p) => ({
      ...p,
      files: p.files.filter((f) => f.id !== id),
    }))
  }

  const resetMessageDraft = () => {
    setMessageDraft({
      text: '',
      files: [],
    })
  }

  return {
    messageDraft,
    setMessageDraftText,
    addMessageDraftFile,
    removeMessageDraftFile,
    resetMessageDraft,
  }
}
