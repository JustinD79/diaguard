// Mock window object for Node.js/SSR environments
const windowMock = {
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  navigator: {
    userAgent: 'Node.js',
    onLine: true,
    language: 'en-US',
    cookieEnabled: false
  },
  document: {
    createElement: () => ({}),
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  innerWidth: 1024,
  innerHeight: 768,
  screen: {
    width: 1024,
    height: 768
  },
  history: {
    pushState: () => {},
    replaceState: () => {},
    back: () => {},
    forward: () => {},
    go: () => {}
  }
};

module.exports = windowMock;