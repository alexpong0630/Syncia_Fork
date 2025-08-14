export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log('convertBlobToBase64 called with blob:', blob)
    console.log('Blob size:', blob.size, 'Blob type:', blob.type)
    
    if (!blob || blob.size === 0) {
      reject(new Error('Invalid blob: empty or null'))
      return
    }
    
    const reader = new FileReader()
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      reject(error)
    }
    
    reader.onload = () => {
      console.log('FileReader onload triggered')
      const result = reader.result as string
      console.log('Base64 result length:', result.length)
      console.log('Base64 result preview:', result.substring(0, 100) + '...')
      resolve(result)
    }
    
    reader.onloadstart = () => {
      console.log('FileReader started reading')
    }
    
    reader.onloadend = () => {
      console.log('FileReader finished reading')
    }
    
    try {
      reader.readAsDataURL(blob) // Converts the blob to base64 and calls onload
      console.log('FileReader.readAsDataURL called')
    } catch (error) {
      console.error('Error calling readAsDataURL:', error)
      reject(error)
    }
  })
}
