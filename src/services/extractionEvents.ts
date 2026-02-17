type ExtractionEventCallback = () => void;

let listeners: ExtractionEventCallback[] = [];

export const extractionEvents = {
  subscribe(callback: ExtractionEventCallback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },
  emit() {
    listeners.forEach(cb => cb());
  },
};
