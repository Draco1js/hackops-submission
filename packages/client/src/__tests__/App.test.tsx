
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../api/todoApi';
import socketService from '../services/socketService';
import { Todo } from '../../../shared/src';

// Mock the API functions
jest.mock('../api/todoApi');
jest.mock('../services/socketService', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((event, callback) => {
      // Store callbacks for testing
      if (event === 'todos:update') {
        mockSocketCallbacks.todosUpdate = callback;
      } else if (event === 'users:count') {
        mockSocketCallbacks.usersCount = callback;
      }
      return jest.fn(); // Return unsubscribe function
    }),
    emit: jest.fn(),
    isTodoValid: jest.fn().mockReturnValue(true)
  }
}));

// Mock socket callbacks storage
const mockSocketCallbacks: {
  todosUpdate?: (todos: Todo[]) => void;
  usersCount?: (count: number) => void;
} = {};

// Sample todos for testing
const sampleTodos: Todo[] = [
  { id: '1', text: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
  { id: '2', text: 'Test Todo 2', completed: true, createdAt: new Date().toISOString() }
];

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock callbacks
    Object.keys(mockSocketCallbacks).forEach(key => {
      delete mockSocketCallbacks[key as keyof typeof mockSocketCallbacks];
    });
    
    // Setup default API responses
    (getTodos as jest.Mock).mockResolvedValue(sampleTodos);
    (createTodo as jest.Mock).mockResolvedValue({ id: '3', text: 'New Todo', completed: false, createdAt: new Date().toISOString() });
    (updateTodo as jest.Mock).mockResolvedValue({ id: '1', text: 'Test Todo 1', completed: true, createdAt: new Date().toISOString() });
    (deleteTodo as jest.Mock).mockResolvedValue({ success: true });
  });

  test('renders the app title', async () => {
    render(<App />);
    expect(screen.getByText("The world's most complex todo app")).toBeInTheDocument();
  });

  test('shows loading state initially', () => {
    render(<App />);
    expect(screen.getByText('Loading todos...')).toBeInTheDocument();
  });

  test('renders todos after loading', async () => {
    render(<App />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with todos
    if (mockSocketCallbacks.todosUpdate) {
      mockSocketCallbacks.todosUpdate(sampleTodos);
    }
    
    // Check if todos are rendered
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
  });

  test('shows correct progress information', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with todos (1 completed, 1 not completed)
    if (mockSocketCallbacks.todosUpdate) {
      mockSocketCallbacks.todosUpdate(sampleTodos);
    }
    
    // Check progress display
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('1 remaining')).toBeInTheDocument();
  });

  test('shows online users count', async () => {
    render(<App />);
    
    // Wait for component to fully render
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with user count
    if (mockSocketCallbacks.usersCount) {
      mockSocketCallbacks.usersCount(3);
    }
    
    // Wait for the user count to update
    await waitFor(() => {
      expect(screen.getByText('3 users online')).toBeInTheDocument();
    });
  });

  test('adds a new todo', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Type in the input field
    const input = screen.getByPlaceholderText('Add a new todo');
    fireEvent.change(input, { target: { value: 'New Todo Item' } });
    
    // Submit the form
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);
    
    // Check if createTodo was called with the correct text
    expect(createTodo).toHaveBeenCalledWith('New Todo Item');
    
    // The input might not be cleared immediately in the test environment
    // So we'll wait for it to be cleared
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  test('toggles todo completion status', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with todos
    if (mockSocketCallbacks.todosUpdate) {
      mockSocketCallbacks.todosUpdate(sampleTodos);
    }
    
    // Find and click the checkbox for the first todo
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Check if updateTodo was called with the correct parameters
    expect(updateTodo).toHaveBeenCalledWith('1', { completed: true });
  });

  test('deletes a todo', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with todos
    if (mockSocketCallbacks.todosUpdate) {
      mockSocketCallbacks.todosUpdate(sampleTodos);
    }
    
    // Find and click the delete button
    // Using a more reliable selector since the label might not be properly associated
    const deleteButtons = screen.getAllByRole('button', { name: /delete todo/i });
    fireEvent.click(deleteButtons[0]);
    
    // Check if deleteTodo was called with the correct id
    expect(deleteTodo).toHaveBeenCalledWith('1');
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    (getTodos as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<App />);
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch todos. Please try again.')).toBeInTheDocument();
    });
  });

  test('connects to socket service on mount and disconnects on unmount', () => {
    const { unmount } = render(<App />);
    
    // Check if connect was called
    expect(socketService.connect).toHaveBeenCalled();
    
    // Unmount the component
    unmount();
    
    // Check if disconnect was called
    expect(socketService.disconnect).toHaveBeenCalled();
  });

  test('shows empty state when no todos exist', async () => {
    // Mock empty todos response
    (getTodos as jest.Mock).mockResolvedValue([]);
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Check if empty state message is displayed
    expect(screen.getByText('No todos yet. Add one above!')).toBeInTheDocument();
  });

  test('shows "All done!" message when all todos are completed', async () => {
    // Mock all completed todos
    const allCompletedTodos = [
      { id: '1', text: 'Test Todo 1', completed: true, createdAt: new Date().toISOString() },
      { id: '2', text: 'Test Todo 2', completed: true, createdAt: new Date().toISOString() }
    ];
    
    (getTodos as jest.Mock).mockResolvedValue(allCompletedTodos);
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading todos...')).not.toBeInTheDocument();
    });
    
    // Simulate socket update with all completed todos
    if (mockSocketCallbacks.todosUpdate) {
      mockSocketCallbacks.todosUpdate(allCompletedTodos);
    }
    
    // Check if "All done!" message is displayed
    expect(screen.getByText('All done! 🎉')).toBeInTheDocument();
  });
});

