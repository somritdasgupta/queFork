window.queForkExtension = {
  isAvailable: true,
  interceptRequest: (request) => {
    return new Promise((resolve, reject) => {
      const requestId = 'request_' + Date.now();
      window.postMessage({ 
        type: 'FROM_QUEFORK', 
        action: 'executeRequest', 
        id: requestId, 
        ...request 
      }, '*');

      const handleResponse = (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'FROM_EXTENSION' && 
            event.data.action === 'executeResponse' && 
            event.data.id === requestId) {
          window.removeEventListener('message', handleResponse);
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.response);
          }
        }
      };

      window.addEventListener('message', handleResponse);

      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        reject(new Error('Request timed out'));
      }, 30000);
    });
  }
};
