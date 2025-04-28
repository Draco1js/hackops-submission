import { useState, useEffect } from "react";
import { Todo } from "../../shared/src";
import TodoItem from "./components/TodoItem";
import CircleProgress from "./components/CircleProgress";
import { getTodos, createTodo, updateTodo, deleteTodo } from "./api/todoApi";

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch todos on component mount
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        setLoading(true);
        const data = await getTodos();
        setTodos(data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch todos. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      try {
        const newTodo = await createTodo(input.trim());
        setTodos((prev) => [...prev, newTodo]);
        setInput("");
      } catch (err) {
        setError("Failed to create todo. Please try again.");
        console.error(err);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      if (!todoToUpdate) return;
      
      const updatedTodo = await updateTodo(id, { completed: !todoToUpdate.completed });
      setTodos(todos.map(todo => todo.id === id ? updatedTodo : todo));
    } catch (err) {
      setError("Failed to update todo. Please try again.");
      console.error(err);
    }
  };

  const removeTodo = async (id: string) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      setError("Failed to delete todo. Please try again.");
      console.error(err);
    }
  };

  // Calculate stats
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const progressPercentage = totalTodos === 0 ? 0 : (completedTodos / totalTodos) * 100;

  return (
    <div className="min-h-screen bg-zinc-900 py-8">
      {/* Hero Section */}
      <div className="max-w-md mx-auto bg-zinc-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text2xl font-bold text-center text-white mb-6">The world's most complex todo app</h1>
          
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
            <div className="bg-red-900/50 border border-red-700 text-white p-3 rounded mb-4">
              {error}
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