import { useState, useEffect } from "react";
import { Todo } from "../../shared/src";
import TodoItem from "./components/TodoItem";
import CircleProgress from "./components/CircleProgress";
import { getTodos, createTodo, updateTodo, deleteTodo } from "./api/todoApi";
import socketService from "./services/socketService";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState<number>(1);

  // Function to handle errors with counter
  const handleError = (errorMessage: string) => {
    if (error === errorMessage) {
      // Same error occurred again, increment counter
      setErrorCount(prev => prev + 1);
    } else {
      // New error, reset counter and set new error
      setError(errorMessage);
      setErrorCount(1);
    }
  };

  // Calculate progress
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const progressPercentage = totalTodos === 0 ? 0 : (completedTodos / totalTodos) * 100;

  // Connect to WebSocket on component mount
  useEffect(() => {
    // Initial fetch of todos
    const fetchTodos = async () => {
      try {
        setLoading(true);
        const data = await getTodos();
        // Check if the response is an object with a todos property
        setTodos(Array.isArray(data) ? data : (data.todos || []));
        setError(null);
        setErrorCount(1);
      } catch (err) {
        handleError("Failed to fetch todos. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
    
    // Connect to WebSocket
    socketService.connect();
    
    // Listen for todo updates
    const unsubscribeTodos = socketService.on('todos:update', (updatedTodos: Todo[] | { todos: Todo[] }) => {
      console.log('Received todos update:', updatedTodos);
      if (Array.isArray(updatedTodos)) {
        setTodos(updatedTodos);
      } else if (updatedTodos && 'todos' in updatedTodos) {
        setTodos(updatedTodos.todos);
      }
    });
    
    // Listen for user count updates
    const unsubscribeUsers = socketService.on('users:count', (count: number) => {
      console.log('Received users count update:', count);
      setOnlineUsers(count);
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribeTodos();
      unsubscribeUsers();
      socketService.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      try {
        await createTodo(input.trim());
        setInput("");
      } catch (err) {
        handleError("Failed to create todo. Please try again.");
        console.error(err);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      // Check if the todo ID is valid before attempting to update
      if (!socketService.isTodoValid(id)) {
        console.warn(`Attempted to toggle invalid todo ID: ${id}`);
        // Refresh todos list to get the latest state
        const data = await getTodos();
        setTodos(Array.isArray(data) ? data : (data.todos || []));
        return;
      }

      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;
      
      await updateTodo(id, { completed: !todoToUpdate.completed });
    } catch (err) {
      handleError("Failed to update todo. Please try again.");
      console.error(err);
    }
  };

  const removeTodo = async (id: string) => {
    try {
      await deleteTodo(id);
    } catch (err) {
      handleError("Failed to delete todo. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 py-8">
      {/* Hero Section */}
      <div className="max-w-md mx-auto bg-zinc-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-center text-white mb-6">The world's most complex todo app</h1>
          
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-zinc-400">Your Progress</p>
              <div className="text-2xl font-semibold text-white">
                {completedTodos} / {totalTodos}
              </div>
              <p className="text-zinc-400">
                {totalTodos === 0 
                  ? "No tasks yet" 
                  : completedTodos === totalTodos 
                    ? "All done! 🎉" 
                    : `${totalTodos - completedTodos} remaining`}
              </p>
              <div className="text-xs text-zinc-500 mt-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                {onlineUsers} user{onlineUsers !== 1 ? 's' : ''} online
              </div>
            </div>
            
            <CircleProgress percentage={progressPercentage} />
          </div>
        </div>
      </div>

      {/* Todo List Section */}
      <div className="max-w-md mx-auto bg-zinc-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-white">Your Tasks</h2>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-white p-3 rounded mb-4 flex justify-between items-center">
              <span>{error}</span>
              {errorCount > 1 && (
                <span className="bg-red-700 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {errorCount}
                </span>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex mb-6">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a new todo"
              className="flex-grow p-2 border border-zinc-700 rounded-l bg-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r transition-colors"
            >
              Add
            </button>
          </form>
          
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-zinc-400">Loading todos...</p>
            </div>
          ) : todos.length === 0 ? (
            <p className="text-zinc-400 text-center py-6">No todos yet. Add one above!</p>
          ) : (
            <ul className="divide-y divide-zinc-700">
              {todos.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggleTodo}
                  onDelete={removeTodo}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
