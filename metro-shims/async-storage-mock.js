// Mock AsyncStorage for Node.js/SSR environments
const AsyncStorageMock = {
  getItem: async (key) => {
    return Promise.resolve(null);
  },
  setItem: async (key, value) => {
    return Promise.resolve();
  },
  removeItem: async (key) => {
    return Promise.resolve();
  },
  multiGet: async (keys) => {
    return Promise.resolve(keys.map(key => [key, null]));
  },
  multiSet: async (keyValuePairs) => {
    return Promise.resolve();
  },
  multiRemove: async (keys) => {
    return Promise.resolve();
  },
  getAllKeys: async () => {
    return Promise.resolve([]);
  },
  clear: async () => {
    return Promise.resolve();
  },
  mergeItem: async (key, value) => {
    return Promise.resolve();
  },
  multiRemove: async (keys) => {
    return Promise.resolve();
  }
};

module.exports = AsyncStorageMock;