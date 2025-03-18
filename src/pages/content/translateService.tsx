import { contentScriptLog } from '../../logs'
import Whitelister from 'redirect-whitelister'
import type { Settings } from '../../config/settings'
import { type Mode } from '../../config/settings'
import { ChatOpenAI } from '@langchain/openai'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'


/**
 * Initializes the visual quick menu. (when the user selects text)
 * It is only initialized if the user has enabled it in the settings.
 * If the user has excluded the current site, it is not initialized.
 */
const TranslateService = (settings:Settings) => {
  contentScriptLog('TranslateService');
  const tagsForTranslation = [
    'a', 'b', 'blockquote', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 
    'p', 'pre', 'strong', 'ul', 'td', 'th', 'div', 'span', 'text', 'strong', 'bold', 'article', 'react-partial',
    'turbo-frame', 'template', 'main', 'details', 'summary', 'section'
  ];
  const tagsForExtractText = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'b', 'a', 'li', 'td', 'summary'
  ];

  if(!settings.autoTranslation.enabled)
    return;
  
  const maxTranslationThisMinute = settings.autoTranslation.thread || 5;
  
  
  let isTranslating = false;
  let batchSize = settings.autoTranslation.batchSize || 1000;
  let toBeTranslateDomElements:string[] = [];
  let inited = false;
  
  let controller: AbortController;

  let llm = new ChatOpenAI({
    streaming: true,
    openAIApiKey: settings.chat.openAIKey!,
    modelName: settings.chat.model!,
    configuration: {
      baseURL:  settings.chat.openAiBaseUrl,
    },
    temperature: Number(settings.chat.mode)
  });

  const translationsThisMinute = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['translationsThisMinute', 'lastTranslationTime'], (result) => {
        let translations = result.translationsThisMinute || 0;
        const lastTranslationTime = result.lastTranslationTime;
        if (lastTranslationTime) {
          const lastTranslationDate = new Date(lastTranslationTime);
          const currentDate = new Date();
          if (lastTranslationDate.getFullYear() !== currentDate.getFullYear() ||
              lastTranslationDate.getMonth() !== currentDate.getMonth() ||
              lastTranslationDate.getDate() !== currentDate.getDate() ||
              lastTranslationDate.getMinutes() !== currentDate.getMinutes()
              ) {
            translations = 0;
            chrome.storage.local.set({ 'translationsThisMinute': 0,'lastTranslationTime': Date.now()}, () => {
              contentScriptLog('translationsThisMinute reset to 0 due to minute change');
            });
          }
        }
        resolve(translations);
      });
    });
  }

  const addTranslationsThisMinute = async () =>{
    let currentTranslations = await translationsThisMinute() as number;
    chrome.storage.local.set({ 'translationsThisMinute': currentTranslations + 1,'lastTranslationTime': Date.now() }, () => {
      contentScriptLog(`translationsThisMinute incremented to ${currentTranslations + 1}`);
    });
  }
  
  // Create a unique class identifier for DOM elements
  const createUUIDClass = (tag:string) =>{
    return 'xxxx'.replace(/[x]/g, function() {
        var r = Math.floor(Math.random() * 16);
        return tag + "-" + r.toString(16);
    });
  }
  
  // Insert a new node after a reference node
  const insertAfter = (newNode:HTMLElement, referenceNode:HTMLElement) =>{
    const parent = referenceNode.parentNode;
    if (parent)
      parent.insertBefore(newNode, referenceNode.nextSibling || null);
  }
  
  // Assigning UUIDs to DOM elements that need translation
  const assignUUIDForDOMs =(domElements:HTMLCollection) => {
    for (var element of domElements) {
      if(!element.tagName) continue;
      var tag = element.tagName.toLowerCase();
      
      if (!element.classList || !tagsForTranslation.includes(tag) || element.classList.contains('autotrans-translated') || element.classList.contains('notranslate')) {
          continue;
      }

      //check element classlist contain autotrans prefix class
      if ((element.className || '').includes('autotrans-')) {
          continue;
      }

      var uuid = 'autotrans-' + createUUIDClass(tag);
      
      if (element.children.length > 0) {
        if (tagsForExtractText.includes(tag) && element.textContent && element.textContent.trim()) {
          element.classList.add(uuid);
          toBeTranslateDomElements.push(uuid);
        } else {
          assignUUIDForDOMs(element.children);
        }
      } else {
        if (element.textContent && element.textContent.trim()) {
          element.classList.add(uuid);
          toBeTranslateDomElements.push(uuid);
        }
      }
    }
  }
  
  
  const addTranslatedElement = (uuid:string, text:string)=> {
    var domElements = document.getElementsByClassName(uuid);
    if (domElements.length === 0) return;
    if (domElements[0].textContent === text) return;
    let domElement = domElements[0] as HTMLElement;

    var translatedDiv = document.createElement(domElement.tagName.toLowerCase());
    translatedDiv.classList.add('autotrans-translated');
    // Set the style for the translated element
    Object.assign(translatedDiv.style, {
        fontSize: domElement.style.fontSize,
        backgroundColor: '#e5e4e4',
        borderRadius: '2px',
        padding: '3px 0px'
    });

    translatedDiv.innerText = text;
    insertAfter(translatedDiv, domElement);
  }
  
  const callOpenAIChat = async (jsonContent:string)=>{
    const expandedQuery = "translate below text to " + settings.autoTranslation.language + ". do not add markdown. keep the order. do not explain the result.:\n" + jsonContent
    const messages = [
      new HumanMessage({
        content: expandedQuery,
      }),
    ];
    
    controller = new AbortController()
    const options = {
      signal: controller.signal,
      // callbacks: [{ handleLLMNewToken: updateAssistantMessage }],
    }
    return await llm.invoke(messages, options)

  }
  
  const callChatCompletion = async (toBeTranslateDomElementsBatch:any) => {
    var data = toBeTranslateDomElementsBatch.map((e:any) => e.value).join("|").replace(/[\n\r\t]/g, '');
    let response:any = await callOpenAIChat(data);
    let content = response.content;

    if (!content) return;
  
    content = content.replace(/[\n\r\t]/g, '');
    var translateTexts = content.split('|');

    for (var k = 0; k < translateTexts.length; k++) {
      if (toBeTranslateDomElementsBatch[k]) {
        addTranslatedElement(toBeTranslateDomElementsBatch[k].key, translateTexts[k]);
      }
    }
    
  }
  
  const translate = async () =>{
    if (isTranslating || toBeTranslateDomElements.length === 0) return;
    isTranslating = true;
    //copy toBeTranslateDomElements
    var toBeTranslateDomElements_temp = JSON.parse(JSON.stringify(toBeTranslateDomElements));
    console.log("API call in this minute:", await translationsThisMinute(), "Batch Size:", batchSize);
    for (var i = 0; i < toBeTranslateDomElements_temp.length; i += batchSize) {
      var toBeTranslateDomElementsBatch = toBeTranslateDomElements_temp.slice(i, i + batchSize).map((uuid:string) => {
        var ele = document.getElementsByClassName(uuid)[0] as HTMLElement;
        return ele ? { key: uuid, value: ele.innerText } : null;
      }).filter((el:HTMLElement) => el);
      
      while (await translationsThisMinute() as number >= maxTranslationThisMinute) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await addTranslationsThisMinute();
      callChatCompletion(toBeTranslateDomElementsBatch);
    }

    //remove first N items from toBeTranslateDomElements
    toBeTranslateDomElements.splice(0, toBeTranslateDomElements_temp.length);
    isTranslating = false;
  }
  

  assignUUIDForDOMs(document.getElementsByTagName('body')[0].children);
  translate();

  const observer = new MutationObserver((mutations) => {
    console.log("DOM changed, assigning UUIDs and translating");
    mutations.forEach(mutation => {
      if (mutation.type === "childList") {
        assignUUIDForDOMs(Array.from(mutation.target.childNodes) as any);
      }
    });
    translate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  setInterval(translate, 1000);
  
}


export const createTranslateServiceOnStorageChange = () => {
  chrome.storage.onChanged.addListener(() => {
    console.log('📝 Storage changed. Re-init translate service')
    initTranslateService();
  })
}

export const initTranslateService = () =>{
  chrome.storage.sync.get(['SETTINGS'], (result) => {
    const quickMenuSettings = result.SETTINGS?.quickMenu as Settings['quickMenu']
    if (quickMenuSettings) {
      if (quickMenuSettings.enabled) {
        if (quickMenuSettings.excludedSites.length === 0) TranslateService(result.SETTINGS)
        else {
          const whitelister = new Whitelister(
            quickMenuSettings.excludedSites || '*',
          )
          const isExcluded = whitelister.verify(window.location.href)
          if (!isExcluded) 
            TranslateService(result.SETTINGS)
        }
      }
    }
  })
}

initTranslateService();
createTranslateServiceOnStorageChange();