import { HumanMessage } from '@langchain/core/messages'
import { OpenAIClient, ChatOpenAI } from '@langchain/openai'
import { useSettings } from '../hooks/useSettings'

export const validateApiKey = async (
  openAIApiKey: string,
  baseURL: string
): Promise<boolean> => {
  const model = new ChatOpenAI({ openAIApiKey:openAIApiKey,configuration: {
    baseURL:  baseURL || "https://api.openai.com/v1",
  },})
  
  const client = new OpenAIClient({ apiKey:openAIApiKey, baseURL:  baseURL || "https://api.openai.com/v1",dangerouslyAllowBrowser: true})
  try {
    const models = await client.models.list();
    
    console.log(models);
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}
