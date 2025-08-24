export const forwardContextMenuClicks = () => {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const url = new URL(info.pageUrl);
    const pageDomain = url.hostname;

    if (info.menuItemId === 'settings') {
      chrome.tabs.create({
        url: chrome.runtime.getURL('/src/pages/settings/index.html'),
      })
    } else if(info.menuItemId === 'syncia_translate' || info.menuItemId === 'syncia_cancel_translate' ){
      if (tab?.id){
        chrome.tabs.sendMessage(tab.id, {
          action: info.menuItemId,
          payload: {pageDomain },
        })
      }
    } else if (info.menuItemId === 'syncia_add_image_to_chat') {
      // Handle adding image to chat
      if (tab?.id && info.srcUrl) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'add-image-to-chat',
          payload: { imageUrl: info.srcUrl },
        })
      } else {
        console.error('Missing tab ID or image URL:', { tabId: tab?.id, srcUrl: info.srcUrl })
      }
    } else {
      const selectedText = info.selectionText
      const id = info.menuItemId
      if (tab?.id)
        chrome.tabs.sendMessage(tab.id, {
          action: 'forward-context-menu-click',
          payload: { selectedText, id },
        })
    }
  })
}
