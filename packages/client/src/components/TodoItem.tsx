import { Todo } from "../../../shared/src";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem = ({ todo, onToggle, onDelete }: TodoItemProps) => {
  return (
    <li className="py-3 flex items-center gap-3">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id={`todo-${todo.id}`}
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-zinc-600 bg-zinc-800 transition-colors checked:border-blue-500 checked:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <svg 
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 opacity-0 text-white peer-checked:opacity-100" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span className={`${todo.completed ? "line-through text-zinc-500" : "text-zinc-200"}`}>
        {todo.text}
      </span>
      <button 
        onClick={() => onDelete(todo.id)}
        className="ml-auto text-red-500 hover:text-red-400 transition-colors"
        aria-label="Delete todo"
      >
        Delete
      </button>
    </li>
  );
};

export default TodoItem;
