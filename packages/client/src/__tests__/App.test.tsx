import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../api/todoApi';
import { expect, jest, test, describe, beforeEach } from '@jest/globals';
import { Todo } from '../../../shared/src';

// Mock the API functions
jest.mock('../api/todoApi');
// Mock the socket service
jest.mock('../services/socketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn((event: string, callback: (data: unknown) => void) => {
    // Store the callback to trigger it in tests
    if (event === 'todos:update') {
      mockCallbacks.todosUpdate = callback as (todos: Todo[]) => void;
    }
    if (event === 'users:count') {
      mockCallbacks.usersCount = callback as (count: number) => void;
    }
    return jest.fn(); // Return unsubscribe function
  }),
  emit: jest.fn(),
  isTodoValid: jest.fn().mockReturnValue(true)
}));

// Store callbacks for testing
interface MockCallbacks {
  todosUpdate?: (todos: unknown) => void;
  usersCount?: (count: number) => void;
  [key: string]: ((...args: unknown[]) => void) | undefined;
}

const mockCallbacks: MockCallbacks = {};

// Define the mock types explicitly
const mockGetTodos = getTodos as jest.MockedFunction<typeof getTodos>;
const mockCreateTodo = createTodo as jest.MockedFunction<typeof createTodo>;
const mockUpdateTodo = updateTodo as jest.MockedFunction<typeof updateTodo>;
const mockDeleteTodo = deleteTodo as jest.MockedFunction<typeof deleteTodo>;

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockGetTodos.mockResolvedValue([
      { id: '1', text: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
      { id: '2', text: 'Test Todo 2', completed: false, createdAt: new Date().toISOString() }
    ]);

    mockCreateTodo.mockResolvedValue({ 
      id: '3', 
      text: 'New Todo', 
      completed: false,
      createdAt: new Date().toISOString()
    });

    mockUpdateTodo.mockResolvedValue({ 
      id: '1',
      text: 'Test Todo 1', // Add the text property
      completed: true,
      createdAt: new Date().toISOString()
    });

    // For deleteTodo, it should return a Todo object, not a success object
    mockDeleteTodo.mockResolvedValue({ 
      id: '1', 
      text: 'Test Todo 1', 
      completed: false,
      createdAt: new Date().toISOString() 
    });

    // Trigger the users:count callback with a default value
    if (mockCallbacks.usersCount) {
      mockCallbacks.usersCount(1);
    }
  });

  test('renders loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading todos...')).toBeTruthy();
  });

  test('adds a new todo', async () => {
    render(<App />);
    
    // Wait for todos to load
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).toBe(null);
    });
    
    // Simulate successful todo loading
    if (mockCallbacks.todosUpdate) {
      mockCallbacks.todosUpdate([
        { id: '1', text: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
        { id: '2', text: 'Test Todo 2', completed: false, createdAt: new Date().toISOString() }
      ]);
    }
    
    // Add a new todo
    const input = screen.getByPlaceholderText('Add a new todo');
    fireEvent.change(input, { target: { value: 'New Todo' } });
    
    // Submit the form - select by tag name instead of role
    const form = screen.getByText('Add').closest('form');
    fireEvent.submit(form);
    
    // Check if createTodo was called with the right argument
    expect(mockCreateTodo).toHaveBeenCalledWith('New Todo');
  });

  test('toggles todo completion', async () => {
    render(<App />);
    
    // Wait for todos to load
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).toBe(null);
    });
    
    // Simulate successful todo loading
    if (mockCallbacks.todosUpdate) {
      mockCallbacks.todosUpdate([
        { id: '1', text: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
        { id: '2', text: 'Test Todo 2', completed: false, createdAt: new Date().toISOString() }
      ]);
    }
    
    // Find and click the todo item to toggle completion
    const todoItem = screen.getByText('Test Todo 1');
    const toggleButton = todoItem.closest('div')?.querySelector('input[type="checkbox"]');
    if (toggleButton) {
      fireEvent.click(toggleButton);
    }
    
    // Check if updateTodo was called with the right arguments
    expect(mockUpdateTodo).toHaveBeenCalledWith('1', { completed: true });
  });

  test('deletes a todo', async () => {
    render(<App />);
    
    // Wait for todos to load
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).toBe(null);
    });
    
    // Simulate successful todo loading
    if (mockCallbacks.todosUpdate) {
      mockCallbacks.todosUpdate([
        { id: '1', text: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
        { id: '2', text: 'Test Todo 2', completed: false, createdAt: new Date().toISOString() }
      ]);
    }
    
    // Find and click the delete button for the first todo
    const deleteButton = screen.getAllByText('Delete todo')[0];
    fireEvent.click(deleteButton);
    
    // Check if deleteTodo was called with the right argument
    expect(mockDeleteTodo).toHaveBeenCalledWith('1');
  });
});
