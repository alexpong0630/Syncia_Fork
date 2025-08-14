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
    console.log('FlexibleEmbeddings initialized with:', {
      format: this.embeddingFormat,
      baseURL: this.customBaseURL,
      hasApiKey: !!this.customApiKey
    })
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    console.log(`FlexibleEmbeddings.embedDocuments called with ${texts.length} texts, format: ${this.embeddingFormat}`)
    
    try {
      // 如果格式偏好是 'float'，直接使用 fallback 方法
      if (this.embeddingFormat === 'float') {
        console.log('Using float format for embeddings')
        return await this.embedDocumentsWithFallback(texts, 'float')
      }
      
      // 如果格式偏好是 'base64'，嘗試使用 base64 格式
      if (this.embeddingFormat === 'base64') {
        console.log('Using base64 format for embeddings')
        try {
          return await this.embedDocumentsWithFallback(texts, 'base64')
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log('Base64 format failed, falling back to float:', errorMessage)
          return await this.embedDocumentsWithFallback(texts, 'float')
        }
      }
      
      // 如果是 'auto'，先嘗試標準格式，失敗則嘗試 float
      console.log('Using auto format, trying standard OpenAI method first')
      try {
        const result = await super.embedDocuments(texts)
        console.log(`Standard OpenAI method succeeded, returned ${result.length} embeddings`)
        return result
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.log('Standard embedding format failed, trying float format:', errorMessage)
        return await this.embedDocumentsWithFallback(texts, 'float')
      }
    } catch (error) {
      console.error('All embedding methods failed:', error)
      throw error
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    console.log(`FlexibleEmbeddings.embedQuery called with text: "${text}", format: ${this.embeddingFormat}`)
    
    try {
      const result = await this.embedDocuments([text])
      if (result && result.length > 0) {
        console.log(`embedQuery succeeded, returned embedding with length: ${result[0].length}`)
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
    
    console.log(`Making direct API call to ${endpoint} with format: ${preferredFormat}`)
    console.log(`Using custom baseURL: ${this.customBaseURL || 'default'}`)
    console.log(`Using API key: ${apiKey ? `${apiKey.substring(0, 10)}...` : 'none'}`)
    
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
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
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
    console.log('API response received:', JSON.stringify(data, null, 2))
    
    // 處理不同的響應格式
    if (data.data && Array.isArray(data.data)) {
      const embeddings = data.data.map((item: any, index: number) => {
        if (item.embedding) {
          // 如果是 base64 格式，解碼為 float 陣列
          if (typeof item.embedding === 'string') {
            console.log(`Item ${index}: base64 string, length: ${item.embedding.length}`)
            return this.decodeBase64Embedding(item.embedding)
          }
          // 如果已經是 float 陣列，直接返回
          if (Array.isArray(item.embedding)) {
            console.log(`Item ${index}: float array, length: ${item.embedding.length}`)
            return item.embedding
          }
        }
        console.error(`Item ${index}: invalid embedding format:`, item)
        throw new Error(`Invalid embedding format in response item ${index}`)
      })
      
      console.log(`Successfully processed ${embeddings.length} embeddings`)
      return embeddings
    }
    
    throw new Error('Invalid response format from embedding API')
  }

  private decodeBase64Embedding(base64String: string): number[] {
    try {
      console.log('Decoding base64 embedding, length:', base64String.length)
      
      // 將 base64 字串轉換為 Uint8Array
      const binaryString = atob(base64String)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // 將 bytes 轉換為 float32 陣列
      const floatArray = new Float32Array(bytes.buffer)
      const result = Array.from(floatArray)
      
      console.log('Successfully decoded base64 to float array, length:', result.length)
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
  console.log('=== getMatchedContent Debug ===')
  console.log('getMatchedContent called with:', {
    queryLength: query.length,
    contextLength: context.length,
    hasApiKey: !!apiKey,
    baseURL,
    baseURLType: typeof baseURL,
    baseURLLength: baseURL.length
  })
  
  // 檢查 Base URL 是否為空或預設值
  if (!baseURL || baseURL === '' || baseURL === 'https://api.openai.com/v1') {
    console.warn('⚠️ Base URL is empty or default, this might cause issues!')
    console.warn('Expected Base URL should be:', 'https://api1.project-ax.party/v1')
  }
  
  try {
    const vectorStore = await getContextVectorStore(context, apiKey, baseURL)
    console.log('Vector store retrieved successfully')
    
    const retriever = vectorStore.asRetriever()
    console.log('Retriever created, getting relevant documents...')
    
    const relevantDocs = await retriever.getRelevantDocuments(query)
    console.log(`Retrieved ${relevantDocs.length} relevant documents`)
    
    const result = relevantDocs.map((doc) => doc.pageContent).join('\n')
    console.log('Final result length:', result.length)
    
    return result
  } catch (error) {
    console.error('Error in getMatchedContent:', error)
    
    // 如果出現錯誤，返回一個預設的上下文而不是拋出錯誤
    // 這樣可以防止無限循環
    console.log('Returning fallback context due to error')
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
  
  console.log('Creating vector store with:', {
    model: embeddingModel,
    format: embeddingFormat,
    baseURL,
    contextLength: context.length
  })
  
  // 檢查關鍵參數
  console.log('Parameter validation:')
  console.log('- API Key exists:', !!apiKey)
  console.log('- API Key length:', apiKey?.length || 0)
  console.log('- Base URL:', baseURL)
  console.log('- Base URL type:', typeof baseURL)
  console.log('- Base URL length:', baseURL?.length || 0)
  
  // 使用自定義的 FlexibleEmbeddings 而不是標準的 OpenAIEmbeddings
  const embeddingsConfig = {
    openAIApiKey: apiKey,
    modelName: embeddingModel || undefined,
    embeddingFormat: embeddingFormat || 'auto', // 傳遞格式偏好
    configuration: {
      baseURL: baseURL,
    },
  }
  
  console.log('Embeddings config:', {
    ...embeddingsConfig,
    openAIApiKey: embeddingsConfig.openAIApiKey ? `${embeddingsConfig.openAIApiKey.substring(0, 10)}...` : 'none'
  })
  
  const embeddings = new FlexibleEmbeddings(embeddingsConfig)
  
  console.log('Using embedding model:', embeddingModel, 'with format preference:', embeddingFormat);
  const hashKey = `SYNCIA_STORE_EMBEDDINGS_${await createSHA256Hash(context)}`
  
  try {
    const memoryVectors = await readStorage<any[]>(hashKey, 'indexedDB')
    console.log('Retrieved stored vectors:', memoryVectors ? 'found' : 'not found')

    if (!memoryVectors) {
      console.log('No stored vectors found, creating new ones...')
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      })
      const docs = await textSplitter.createDocuments([context])
      console.log(`Created ${docs.length} documents from context`)
      
      console.log('Creating vector store from documents...')
      const store = await MemoryVectorStore.fromDocuments(docs, embeddings)
      console.log('Vector store created successfully')
      
      // 儲存到 IndexedDB
      console.log('Saving vectors to IndexedDB...')
      await setStorage(hashKey, store.memoryVectors, 'indexedDB')
      console.log('Vectors saved to IndexedDB')
      
      return store
    }

    console.log('Using existing stored vectors...')
    const store = new MemoryVectorStore(embeddings)
    store.memoryVectors = memoryVectors
    
    // 驗證存儲的向量格式
    if (memoryVectors && memoryVectors.length > 0) {
      const firstVector = memoryVectors[0]
      console.log('First vector format check:', {
        hasVector: !!firstVector,
        vectorType: typeof firstVector,
        isArray: Array.isArray(firstVector),
        length: Array.isArray(firstVector) ? firstVector.length : 'N/A'
      })
      
      // 如果向量格式不正確，重新創建
      if (!Array.isArray(firstVector) || firstVector.length === 0) {
        console.log('Stored vectors have invalid format, recreating...')
        throw new Error('Invalid vector format in storage')
      }
    }
    
    console.log('Vector store restored from storage')
    return store
  } catch (error) {
    console.error('Error in getContextVectorStore:', error)
    
    // 如果出現錯誤，嘗試重新創建向量存儲
    console.log('Attempting to recreate vector store due to error...')
    try {
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      })
      const docs = await textSplitter.createDocuments([context])
      const store = await MemoryVectorStore.fromDocuments(docs, embeddings)
      
      // 清除可能有問題的舊數據
      await setStorage(hashKey, store.memoryVectors, 'indexedDB')
      console.log('Vector store recreated successfully after error')
      
      return store
    } catch (retryError) {
      console.error('Failed to recreate vector store:', retryError)
      throw retryError
    }
  }
}
