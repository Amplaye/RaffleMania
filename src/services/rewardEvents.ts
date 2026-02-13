type RewardEventCallback = () => void;

let listeners: RewardEventCallback[] = [];

export const rewardEvents = {
  subscribe(callback: RewardEventCallback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },
  emit() {
    listeners.forEach(cb => cb());
  },
};
