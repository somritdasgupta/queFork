window.addEventListener("message",(e=>{e.source===window&&("DETECT_EXTENSION"===e.data.type?window.postMessage({type:"EXTENSION_DETECTED",id:e.data.id},"*"):"FROM_QUEFORK"===e.data.type?chrome.runtime.sendMessage(e.data,(t=>{window.postMessage({type:"FROM_EXTENSION",...t,id:e.data.id},"*")})):"INTERCEPTOR_TOGGLE"===e.data.type&&chrome.runtime.sendMessage({action:"toggleInterceptor",enabled:e.data.enabled}))})),chrome.runtime.onMessage.addListener(((e,t,n)=>{if("TO_QUEFORK"===e.type)return window.postMessage({type:"FROM_EXTENSION",...e},"*"),!0})),window.addEventListener("message",(e=>{if(e.source===window)return"FROM_QUEFORK"===e.data.type&&"executeRequest"===e.data.action?(console.debug("Content script received request:",e.data),chrome.runtime.sendMessage(e.data,(t=>{if(console.debug("Content script received response:",t),chrome.runtime.lastError)return console.error("Chrome runtime error:",chrome.runtime.lastError),void window.postMessage({type:"FROM_EXTENSION",action:"executeResponse",id:e.data.id,error:chrome.runtime.lastError.message},"*");window.postMessage({type:"FROM_EXTENSION",action:"executeResponse",id:e.data.id,...t},"*")})),!0):void 0}));const injectScript=()=>{const e=document.createElement("script");e.src=chrome.runtime.getURL("inject.js"),(document.head||document.documentElement).appendChild(e),e.onload=()=>e.remove()};injectScript(),chrome.runtime.onMessage.addListener(((e,t,n)=>{"INTERCEPTOR_STATE_CHANGED"===e.type&&window.postMessage({type:"INTERCEPTOR_STATE_CHANGED",enabled:e.enabled},"*")})),window.addEventListener("message",(e=>{"INTERCEPTOR_TOGGLE"===e.data.type&&chrome.runtime.sendMessage({action:"toggleInterceptor",enabled:e.data.enabled})}));