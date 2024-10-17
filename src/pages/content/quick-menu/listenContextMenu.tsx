import { findPrompt } from '../../../lib/findPrompt'
import { generatePromptInSidebar } from '../../../lib/generatePromptInSidebar'

/**
 * Background script sends
 * chrome.tabs.sendMessage(tab.id, { selectedText, id })
 *
 * We listen to this message and generate the prompt in the sidebar.
 */

chrome.runtime.onMessage.addListener(async (request) => {
  const { payload } = request
  const { selectedText, id, srcUrl } = payload || {}
  if (selectedText && id) {
    const prompt = (await findPrompt(id)).prompt
    if (prompt) {
      generatePromptInSidebar(prompt, selectedText)
    }
  }else if(srcUrl && id){
    const sideBarIframe = document.getElementById(
      'syncia_sidebar',
    ) as HTMLIFrameElement

    if(sideBarIframe){
      console.log(sideBarIframe);
      if (sideBarIframe.style.width === '0px') {
        sideBarIframe.style.width = '400px'
      }
      console.log("send to sideBarIframe:" + srcUrl);
      const image: HTMLImageElement = new Image()
      image.src = srcUrl;
      image.crossOrigin="anonymous"
      image.onload = async () => {
        const imageBlob = await new Promise((resolve) => {
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(image, 0, 0)
          canvas.toBlob(resolve, 'image/png')
        });
        sideBarIframe.contentWindow?.postMessage(
          {
            action: 'get-screenshot-image',
            payload: imageBlob,
          },
          '*',
        )
      };
    }
    
    
  }
})
