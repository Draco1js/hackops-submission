import { render, screen, fireEvent } from '@testing-library/react';
import TodoItem from '../components/TodoItem';
import { Todo } from '../../../shared/src';

describe('TodoItem Component', () => {
  const mockTodo: Todo = {
    id: '1',
    text: 'Test Todo',
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const mockToggle = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders todo text correctly', () => {
    render(
      <TodoItem 
        todo={mockTodo} 
        onToggle={mockToggle} 
        onDelete={mockDelete} 
      />
    );
    
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
  });

  test('calls onToggle when checkbox is clicked', () => {
    render(
      <TodoItem 
        todo={mockTodo} 
        onToggle={mockToggle} 
        onDelete={mockDelete} 
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockToggle).toHaveBeenCalledWith('1');
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <TodoItem 
        todo={mockTodo} 
        onToggle={mockToggle} 
        onDelete={mockDelete} 
      />
    );
    
    const deleteButton = screen.getByRole('button');
    fireEvent.click(deleteButton);
    
    expect(mockDelete).toHaveBeenCalledWith('1');
  });

  test('shows completed styling when todo is completed', () => {
    const completedTodo = { ...mockTodo, completed: true };
    
    render(
      <TodoItem 
        todo={completedTodo} 
        onToggle={mockToggle} 
        onDelete={mockDelete} 
      />
    );
    
    const todoText = screen.getByText('Test Todo');
    expect(todoText).toHaveClass('line-through');
  });
});
