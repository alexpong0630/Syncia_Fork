export const forwardContextMenuClicks = () => {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const url = new URL(info.pageUrl)
    const pageDomain = url.hostname

    if (info.menuItemId === 'settings') {
      chrome.tabs.create({
        url: chrome.runtime.getURL('/src/pages/settings/index.html'),
      })
    } else if (
      info.menuItemId === 'syncia_translate' ||
      info.menuItemId === 'syncia_cancel_translate'
    ) {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: info.menuItemId,
          payload: { pageDomain },
        })
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
