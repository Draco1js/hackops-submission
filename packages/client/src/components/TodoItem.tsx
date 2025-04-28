import { useState, useEffect } from "react";
import { Todo } from "../../../shared/src";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
  const [isNew, setIsNew] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  // Show animation when a todo is new or updated
  useEffect(() => {
    // Check if this is a new todo (created in the last 2 seconds)
    const createdAt = new Date(todo.createdAt).getTime();
    const now = Date.now();

    if (now - createdAt < 2000) {
      setIsNew(true);
      setTimeout(() => setIsNew(false), 2000);
    } else {
      // If not new, it might be an update
      setIsUpdated(true);
      setTimeout(() => setIsUpdated(false), 1000);
    }
  }, [todo]);

  return (
    <li
      className={`py-3 flex items-center justify-between transition-all duration-300 ${
        isNew ? "bg-green-900/20" : isUpdated ? "bg-blue-900/20" : ""
      }`}
    >
      <div className="flex items-center">
        <input
          type="checkbox"
          role="checkbox"
          aria-roledescription="toggle todo completion"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="h-5 w-5 rounded border-zinc-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-800"
        />
        <span
          className={`ml-3 text-white ${
            todo.completed ? "line-through text-zinc-500" : ""
          }`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-zinc-400 hover:text-red-500 transition-colors"
      >
        <label className="sr-only">Delete todo</label>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  );
};

export default TodoItem;
