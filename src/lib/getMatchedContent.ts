import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { createSHA256Hash } from './createSHA256Hash'
import { getStoredSettings } from './getStoredSettings'
import { readStorage, setStorage } from '../hooks/useStorage'

// 自定義 Embedding 處理器，支援多種格式
class FlexibleEmbeddings extends OpenAIEmbeddings {
  private embeddingFormat: 'auto' | 'float' | 'base64'
  private customBaseURL: string | undefined
  private customApiKey: string | undefined

  constructor(config: any) {
    super(config)
    this.embeddingFormat = config.embeddingFormat || 'auto'

    this.customBaseURL = config.configuration?.baseURL
    this.customApiKey = config.openAIApiKey
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      // 如果格式偏好是 'float'，直接使用 fallback 方法
      if (this.embeddingFormat === 'float') {
        return await this.embedDocumentsWithFallback(texts, 'float')
      }
      
      // 如果格式偏好是 'base64'，嘗試使用 base64 格式
      if (this.embeddingFormat === 'base64') {
        try {
          return await this.embedDocumentsWithFallback(texts, 'base64')
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return await this.embedDocumentsWithFallback(texts, 'float')
        }
      }
      
      // 如果是 'auto'，先嘗試標準格式，失敗則嘗試 float
      try {
        const result = await super.embedDocuments(texts)
        return result
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return await this.embedDocumentsWithFallback(texts, 'float')
      }
    } catch (error) {
      console.error('All embedding methods failed:', error)
      throw error
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const result = await this.embedDocuments([text])
      if (result && result.length > 0) {
        return result[0]
      } else {
        throw new Error('No embedding returned from embedDocuments')
      }
    } catch (error) {
      console.error('embedQuery failed:', error)
      throw error
    }
  }

  private async embedDocumentsWithFallback(texts: string[], preferredFormat: 'float' | 'base64'): Promise<number[][]> {
    const { modelName } = this as any
    
    // 使用存儲的 API key 和 Base URL
    const apiKey = this.customApiKey
    const baseURL = this.customBaseURL || 'https://api.openai.com/v1'
    const endpoint = `${baseURL}/embeddings`
    
    // 檢查 API key 是否存在
    if (!apiKey) {
      throw new Error('No API key available for embedding request')
    }
    
    const requestBody: any = {
      input: texts,
      model: modelName || 'text-embedding-ada-002',
    }
    
    // 根據偏好設定 encoding_format
    if (preferredFormat === 'float') {
      requestBody.encoding_format = 'base64'
    } else if (preferredFormat === 'base64') {
      requestBody.encoding_format = 'base64'
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText)
      console.error(`Request URL: ${endpoint}`)
      console.error(`Request body:`, requestBody)
      console.error(`API key used: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'none'}`)
      throw new Error(`Embedding API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // 處理不同的響應格式
    if (data.data && Array.isArray(data.data)) {
      const embeddings = data.data.map((item: any, index: number) => {
        if (item.embedding) {
          // 如果是 base64 格式，解碼為 float 陣列
          if (typeof item.embedding === 'string') {
            return this.decodeBase64Embedding(item.embedding)
          }
          // 如果已經是 float 陣列，直接返回
          if (Array.isArray(item.embedding)) {
            return item.embedding
          }
        }
        console.error(`Item ${index}: invalid embedding format:`, item)
        throw new Error(`Invalid embedding format in response item ${index}`)
      })
      
      return embeddings
    }
    
    throw new Error('Invalid response format from embedding API')
  }

  private decodeBase64Embedding(base64String: string): number[] {
    try {
      // 將 base64 字串轉換為 Uint8Array
      const binaryString = atob(base64String)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // 將 bytes 轉換為 float32 陣列
      const floatArray = new Float32Array(bytes.buffer)
      const result = Array.from(floatArray)
      
      return result
    } catch (error) {
      console.error('Failed to decode base64 embedding:', error)
      throw new Error('Invalid base64 embedding format')
    }
  }
}

export const getMatchedContent = async (
  query: string,
  context: string,
  apiKey: string,
  baseURL: string,
) => {
  // 檢查 Base URL 是否為空或預設值
  if (!baseURL || baseURL === '' || baseURL === 'https://api.openai.com/v1') {
    console.warn('⚠️ Base URL is empty or default, this might cause issues!')
    console.warn('Expected Base URL should be:', 'https://api1.project-ax.party/v1')
  }
  
  try {
    const vectorStore = await getContextVectorStore(context, apiKey, baseURL)
    
    const retriever = vectorStore.asRetriever()
    
    const relevantDocs = await retriever.getRelevantDocuments(query)
    
    const result = relevantDocs.map((doc) => doc.pageContent).join('\n')
    
    return result
  } catch (error) {
    console.error('Error in getMatchedContent:', error)
    
    // 如果出現錯誤，返回一個預設的上下文而不是拋出錯誤
    // 這樣可以防止無限循環
    return context.substring(0, Math.min(context.length, 1000)) // 限制長度
  }
}

const getContextVectorStore = async (
  context: string,
  apiKey: string,
  baseURL: string,
) => {
  const {
    chat: { embeddingModel, embeddingFormat },
  } = await getStoredSettings()
  
  // 使用自定義的 FlexibleEmbeddings 而不是標準的 OpenAIEmbeddings
  const embeddingsConfig = {
    openAIApiKey: apiKey,
    modelName: embeddingModel || undefined,
    embeddingFormat: embeddingFormat || 'auto', // 傳遞格式偏好
    configuration: {
      baseURL: baseURL,
    },
  }
  
  const embeddings = new FlexibleEmbeddings(embeddingsConfig)
  
  const hashKey = `SYNCIA_STORE_EMBEDDINGS_${await createSHA256Hash(context)}`
  
  try {
    const memoryVectors = await readStorage<any[]>(hashKey, 'indexedDB')

    if (!memoryVectors) {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      })
      const docs = await textSplitter.createDocuments([context])
      
      const store = await MemoryVectorStore.fromDocuments(docs, embeddings)
      
      // 儲存到 IndexedDB
      await setStorage(hashKey, store.memoryVectors, 'indexedDB')
      
      return store
    }

    const store = new MemoryVectorStore(embeddings)
    store.memoryVectors = memoryVectors
    
    // 驗證存儲的向量格式
    if (memoryVectors && memoryVectors.length > 0) {
      const firstVector = memoryVectors[0]
      
      // 如果向量格式不正確，重新創建
      if (!Array.isArray(firstVector) || firstVector.length === 0) {
        throw new Error('Invalid vector format in storage')
      }
    }
    
    return store
  } catch (error) {
    console.error('Error in getContextVectorStore:', error)
    
    // 如果出現錯誤，嘗試重新創建向量存儲
    try {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      })
      const docs = await textSplitter.createDocuments([context])
      const store = await MemoryVectorStore.fromDocuments(docs, embeddings)
      
      // 清除可能有問題的舊數據
      await setStorage(hashKey, store.memoryVectors, 'indexedDB')
      
      return store
    } catch (retryError) {
      console.error('Failed to recreate vector store:', retryError)
      throw retryError
    }
  }
}
