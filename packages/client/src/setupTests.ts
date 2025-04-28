// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

// Mock the import.meta.env
// We can't use 'import' as a variable name as it's a reserved keyword
// Instead, we'll use a different approach
Object.defineProperty(globalThis, 'importMeta', {
  value: {
    env: {
      PROD: false,
      VITE_API_URL: 'http://localhost:3001',
    }
  },
  writable: true
});

// Make the mock available as import.meta
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: (globalThis as unknown as {importMeta: Window['importMeta']}).importMeta
  },
  writable: true
});

// Add the importMeta property to the global object type
declare global {
  // Use interface instead of var to avoid ESLint no-var warning
  interface Window {
    importMeta: {
      env: {
        PROD: boolean;
        VITE_API_URL: string;
        [key: string]: string | boolean | undefined;
      }
    };
  }
}

// Silence console errors during tests
console.error = jest.fn();
