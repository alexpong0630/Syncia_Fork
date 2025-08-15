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
import { getCurrentSiteHostName } from '../../lib/getCurrentSiteHostName'


/**
 * Initializes the visual quick menu. (when the user selects text)
 * It is only initialized if the user has enabled it in the settings.
 * If the user has excluded the current site, it is not initialized.
 */
class TranslateService { 
  settings:Settings;
  maxTranslationThisMinute:number = 0;
  isTranslating = false;
  batchSize:number = 1000;
  toBeTranslateDomElements:string[] = [];
  inited = false;
  llm?:ChatOpenAI;
  controller?:AbortController;
  observer?:MutationObserver;
  translateTimer?:any;
  updatingSettings:boolean = false;
  
  tagsForTranslation = [
    'a', 'b', 'blockquote', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 
    'p', 'pre', 'strong', 'ul', 'td', 'th', 'div', 'span', 'text', 'strong', 'bold', 'article', 'react-partial',
    'turbo-frame', 'template', 'main', 'details', 'summary', 'section','article','nav', 'header','footer', 'dl','dt','dd'
  ];
  tagsForExtractText = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'b', 'a', 'li', 'td', 'summary'
  ];

  constructor(settings:Settings){
    this.settings = settings;
    this.updateSettings(settings,false);
  }

  updateSettings = (settings:Settings, autoStart:boolean = true) => {
    if(this.updatingSettings)
      return;
    this.updatingSettings = true;
    this.disposeAll();
    this.settings = settings;

    this.maxTranslationThisMinute = this.settings.autoTranslation.thread || 5;
    this.batchSize = this.settings.autoTranslation.batchSize || 1000
    this.llm = new ChatOpenAI({
      streaming: true,
      openAIApiKey: this.settings.chat.openAIKey!,
      modelName: this.settings.chat.model!,
      configuration: {
        baseURL:  this.settings.chat.openAiBaseUrl,
      },
      temperature: Number(this.settings.chat.mode)
    });

    if(autoStart)
      this.start();
    this.updatingSettings = false;

  }

  start =()=>{
    if(!this.settings.autoTranslation.enabled)
      return;
  
    if(this.settings.autoTranslation.autoTranslateForDomain.indexOf(window.location.hostname) == -1){
      return;
    }

    this.assignUUIDForDOMs(document.getElementsByTagName('body')[0].children);
    this.translate();

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === "childList") {
          this.assignUUIDForDOMs(Array.from(mutation.target.childNodes) as any);
        }
      });
    });
  
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.translateTimer = setInterval(this.translate,1000);
  }

  disposeAll = () =>{
    if(this.translateTimer)
      clearInterval(this.translateTimer);
    if(this.observer)
    {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }

  translationsThisMinute = () => {
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

  addTranslationsThisMinute = async () =>{
    let currentTranslations = await this.translationsThisMinute() as number;
    chrome.storage.local.set({ 'translationsThisMinute': currentTranslations + 1,'lastTranslationTime': Date.now() }, () => {
      contentScriptLog(`translationsThisMinute incremented to ${currentTranslations + 1}`);
    });
  }
  
  // Create a unique class identifier for DOM elements
  createUUIDClass = (tag:string) =>{
    return 'xxxx'.replace(/[x]/g, function() {
        var r = Math.floor(Math.random() * 16);
        return tag + "-" + r.toString(16);
    });
  }
  
  // Insert a new node after a reference node
  insertAfter = (newNode:HTMLElement, referenceNode:HTMLElement) =>{
    const parent = referenceNode.parentNode;
    if (parent)
      parent.insertBefore(newNode, referenceNode.nextSibling || null);
  }
  
  // Assigning UUIDs to DOM elements that need translation
  assignUUIDForDOMs =(domElements:HTMLCollection) => {
    for (var element of domElements) {
      if(!element.tagName) continue;
      var tag = element.tagName.toLowerCase();
      
      if (!element.classList || !this.tagsForTranslation.includes(tag) || element.classList.contains('autotrans-translated') || element.classList.contains('notranslate')) {
          continue;
      }

      //check element classlist contain autotrans prefix class
      if ((element.className || '').includes('autotrans-')) {
          continue;
      }

      var uuid = 'autotrans-' + this.createUUIDClass(tag);
      
      if (element.children.length > 0) {
        if (this.tagsForExtractText.includes(tag) && element.textContent && element.textContent.trim()) {
          element.classList.add(uuid);
          element.classList.add('autotrans-marked');
          this.toBeTranslateDomElements.push(uuid);
        } else {
          this.assignUUIDForDOMs(element.children);
        }
      } else {
        if (element.textContent && element.textContent.trim()) {
          element.classList.add(uuid);
          this.toBeTranslateDomElements.push(uuid);
        }
      }
    }
  }
  
  
  addTranslatedElement = (uuid:string, text:string)=> {
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
    this.insertAfter(translatedDiv, domElement);
  }
  
  callOpenAIChat = async (jsonContent:string)=>{
    const expandedQuery = "translate below text to " + this.settings.autoTranslation.language + ". do not add markdown. keep the order. do not explain the result.:\n" + jsonContent
    const messages = [
      new HumanMessage({
        content: expandedQuery,
      }),
    ];
    
    this.controller = new AbortController()
    const options = {
      signal: this.controller.signal,
      // callbacks: [{ handleLLMNewToken: updateAssistantMessage }],
    }
    return await this.llm!.invoke(messages, options)

  }
  
  callChatCompletion = async (toBeTranslateDomElementsBatch:any) => {
    var data = toBeTranslateDomElementsBatch.map((e:any) => e.value).join("|").replace(/[\n\r\t]/g, '');
    let response:any = await this.callOpenAIChat(data);
    let content = response.content;
    
    // Remove all content between <think></think>, <thinking></thinking>, and <reasoning></reasoning> tags
    content = content.replace(/<(?:think|thinking|reasoning)>.*?<\/(?:think|thinking|reasoning)>/gs, '');

    if (!content) return;
  
    content = content.replace(/[\n\r\t]/g, '');
    var translateTexts = content.split('|');

    for (var k = 0; k < translateTexts.length; k++) {
      if (toBeTranslateDomElementsBatch[k]) {
        this.addTranslatedElement(toBeTranslateDomElementsBatch[k].key, translateTexts[k]);
      }
    }
    
  }
  
  translate = async () =>{
    if(!this.settings.autoTranslation.enabled)
      return;
  
    if(this.settings.autoTranslation.autoTranslateForDomain.indexOf(window.location.hostname) == -1){
      return;
    }

    if (this.isTranslating || this.toBeTranslateDomElements.length === 0) return;
    this.isTranslating = true;
    //copy toBeTranslateDomElements
    var toBeTranslateDomElements_temp = JSON.parse(JSON.stringify(this.toBeTranslateDomElements));
    for (var i = 0; i < toBeTranslateDomElements_temp.length; i += this.batchSize) {
      var toBeTranslateDomElementsBatch = toBeTranslateDomElements_temp.slice(i, i + this.batchSize).map((uuid:string) => {
        var ele = document.getElementsByClassName(uuid)[0] as HTMLElement;
        return ele ? { key: uuid, value: ele.innerText } : null;
      }).filter((el:HTMLElement) => el);
      
      while (await this.translationsThisMinute() as number >= this.maxTranslationThisMinute) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await this.addTranslationsThisMinute();
      this.callChatCompletion(toBeTranslateDomElementsBatch);
    }

    //remove first N items from toBeTranslateDomElements
    this.toBeTranslateDomElements.splice(0, toBeTranslateDomElements_temp.length);
    this.isTranslating = false;
  }
  
}


const createTranslateServiceOnStorageChange = () => {
  chrome.storage.sync.onChanged.addListener(() => {
    updateTranslateService();
  })
}
let service:TranslateService;
const initTranslateService = () =>{
  if(!service)
  {
    chrome.storage.sync.get(['SETTINGS'], (result) => {
      const quickMenuSettings = result.SETTINGS?.quickMenu as Settings['quickMenu']
      if (quickMenuSettings) {
        if (quickMenuSettings.enabled) {
          if (quickMenuSettings.excludedSites.length === 0) 
          {
            service = new TranslateService(result.SETTINGS);
            service.start();
          }
          else {
            const whitelister = new Whitelister(
              quickMenuSettings.excludedSites || '*',
            )
            const isExcluded = whitelister.verify(window.location.href)
            if (!isExcluded) 
            {
              service = new TranslateService(result.SETTINGS);
              service.start();
            }
          }
        }
      }
    });
  }

  
}

const updateTranslateService = () =>{
  if(service)
  {
    chrome.storage.sync.get(['SETTINGS'], (result) => {
      const quickMenuSettings = result.SETTINGS?.quickMenu as Settings['quickMenu']
      if (quickMenuSettings) {
        if (quickMenuSettings.enabled) {
          if (quickMenuSettings.excludedSites.length === 0) 
          {
            service.updateSettings(result.SETTINGS);
          }
          else {
            const whitelister = new Whitelister(
              quickMenuSettings.excludedSites || '*',
            )
            const isExcluded = whitelister.verify(window.location.href)
            if (!isExcluded) 
            {
              service.updateSettings(result.SETTINGS);
            }
          }
        }
      }
    });
  }
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    const action = request.action;
    if (action === 'syncia_cancel_translate' || action === 'syncia_translate') {
      chrome.storage.sync.get(['SETTINGS'], async (result) => {
        let autoTranslationSetting = (result.SETTINGS as Settings).autoTranslation;
        const host =  request.payload.pageDomain;
        if (action === 'syncia_cancel_translate'){
          autoTranslationSetting.autoTranslateForDomain = autoTranslationSetting.autoTranslateForDomain.filter(domain => domain !== host);
          //remove all DOMs with class autotrans-translated
          let elements = document.querySelectorAll('.autotrans-translated'); 
          elements.forEach(element => {
            element.remove();
          });

          elements = document.querySelectorAll('.autotrans-marked'); 
          elements.forEach(element => {
            // remove element css class with 'autotrans-' prefix
            element.classList.forEach(className => {
              if (className.startsWith('autotrans-')) {
                element.classList.remove(className);
              }
            });
            element.classList.remove("autotrans-marked");
            
          });
        }else{
          autoTranslationSetting.autoTranslateForDomain.push(host);
        }
        // update storage
        chrome.storage.sync.set({ 'SETTINGS': { ...result.SETTINGS, autoTranslation: autoTranslationSetting } });
        updateTranslateService();
      })
    }
  }
);

initTranslateService();
createTranslateServiceOnStorageChange();

