import type { Prompt } from '../../../hooks/usePrompts'
import { getStoredPrompts } from '../../../lib/getStoredPrompts'

/**
 * Creates the native context menu for the quick menu.
 * This will allow users to right click on any selected text and see the prompt
 * actions on the text.
 *
 * @see https://developer.chrome.com/docs/extensions/reference/contextMenus/
 *
 * It performs the following steps:
 * 1. Get the prompts from storage
 * 2. Create the text actions at start
 * 3. Remove all the existing context menus
 * 4. Create the menu for rest of the items
 */

export const createContextMenu = async () => {
  const prompts = await getStoredPrompts()
  const contextMenuItems: chrome.contextMenus.CreateProperties[] = []

  // Create text actions context menu
  const createChildContextMenu = (prompts: Prompt[], parentId?: string) => {
    for (const prompt of prompts) {
      contextMenuItems.push({
        id: prompt.id,
        title: prompt.name,
        contexts: ['selection'],
        parentId,
      })
      if (prompt.children) createChildContextMenu(prompt.children, prompt.id)
    }
  }
  createChildContextMenu(prompts)

  // Create Settings context menu
  contextMenuItems.push(
    {
      id: 'separator',
      type: 'separator',
      contexts: ['selection'],
    },
    {
      id: 'settings',
      title: 'Settings',
      contexts: ['selection'],
    },
  )

  // Before creating the context menu, remove all the existing context menus
  chrome.contextMenus.removeAll()

  // Create context menu
  for (const item of contextMenuItems) {
    chrome.contextMenus.create(item)
  }

  
  chrome.contextMenus.create({
    id: "syncia_translate",
    title: "Syncia - Translate",
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: "syncia_cancel_translate",
    title: "Syncia - Cancel Translate",
    contexts: ['page'],
  });

  // Create image context menu for adding images to chat
  chrome.contextMenus.create({
    id: "syncia_add_image_to_chat",
    title: "Syncia - Add Image to Chat",
    contexts: ['image'],
  });
}

/**
 * Creates the context menu on storage change.
 * This will allow users to see the changes in the context menu when user
 * change the prompts.
 */
export const createContextMenuOnStorageChange = () => {
  chrome.storage.onChanged.addListener(() => {
    createContextMenu()
  })
}
