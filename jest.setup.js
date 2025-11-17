// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// CRITICAL: Force React into development mode for tests (required for act() support)
// This must be set BEFORE React is imported anywhere
// Vercel sets NODE_ENV=production, so we override it here
process.env.NODE_ENV = 'test'

// Also set React's internal __DEV__ flag if it exists
if (typeof global !== 'undefined') {
  global.__DEV__ = true;
}

// Polyfill TextEncoder/TextDecoder for Node.js test environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next/server for API route testing
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
      this._formData = init.body instanceof FormData ? init.body : null;
      // Parse URL to support nextUrl
      try {
        this.nextUrl = new URL(url);
      } catch (e) {
        this.nextUrl = { searchParams: new URLSearchParams() };
      }
    }
    async json() {
      return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    async text() {
      return Promise.resolve(this.body || '');
    }
    async formData() {
      if (this._formData) {
        return Promise.resolve(this._formData);
      }
      // Try to parse body as FormData if it's a string
      if (typeof this.body === 'string') {
        // For test purposes, create a mock FormData
        const formData = new FormData();
        return Promise.resolve(formData);
      }
      return Promise.resolve(new FormData());
    }
  },
  NextResponse: {
    json: (body, init = {}) => ({
      json: async () => body,
      status: init.status || 200,
      headers: new Map(),
    }),
  },
}))

// Suppress console errors in tests (optional - remove if you want to see them)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// }


