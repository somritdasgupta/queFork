type ProcessorMessage = {
  type: 'processResponse';
  data: any;
};

type ProcessorResponse = {
  type: 'processedData';
  data: any;
};

const ctx: Worker = self as any;

// Main worker message handler
ctx.onmessage = (event: MessageEvent<ProcessorMessage>) => {
  const { type, data } = event.data;
  
  if (type === 'processResponse') {
    // Process the data
    const processedData = processData(data);
    
    // Send back the processed data
    ctx.postMessage({
      type: 'processedData',
      data: processedData
    } as ProcessorResponse);
  }
};

function processData(data: any) {
  return data;
}

export {};
