export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
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
      const result = reader.result as string
      resolve(result)
    }
    
    try {
      reader.readAsDataURL(blob) // Converts the blob to base64 and calls onload
    } catch (error) {
      console.error('Error calling readAsDataURL:', error)
      reject(error)
    }
  })
}
