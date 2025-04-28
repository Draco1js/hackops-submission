/* eslint-disable @typescript-eslint/no-unused-vars */
// Basic API service for todos
export const apiService = {
  getTodos: async () => {
    // Implementation will be mocked in tests
    return [];
  },
  createTodo: async (text: string) => {
    // Implementation will be mocked in tests
    return { id: '', text, completed: false };
  },
  updateTodo: async (id: string, updates: Partial<{ completed: boolean }>) => {
    // Implementation will be mocked in tests
    return { id, ...updates };
  },
  deleteTodo: async (_id: string) => {
    // Implementation will be mocked in tests
    return { success: true };
  }
};
