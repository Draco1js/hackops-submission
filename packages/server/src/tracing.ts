// Basic tracing module
console.info('Initializing tracing module');

// Simple no-op implementation
const sdk = {
  start: () => {
    console.info('Tracing started');
  },
  shutdown: () => {
    console.info('Tracing shutdown');
    return Promise.resolve();
  }
};

export default sdk;

// Initialize tracing
sdk.start();
