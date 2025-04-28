// Basic socket service
const socketService = {
  connect: () => {
    // Implementation will be mocked in tests
  },
  disconnect: () => {
    // Implementation will be mocked in tests
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  on: (_event: string, _callback: (...args: any[]) => void) => {
    // Implementation will be mocked in tests
    return () => {}; // Unsubscribe function
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  emit: (_event: string, ..._args: any[]) => {
    // Implementation will be mocked in tests
  },
  isTodoValid: (id: string): boolean => {
    // Simple implementation to validate todo IDs
    return id !== undefined && typeof id === 'string' && id.length > 0;
  }
};

export default socketService;
