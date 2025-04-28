import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { Todo, CreateTodoDto, UpdateTodoDto } from 'shared';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// In-memory database
let todos: Todo[] = [];

// Routes
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body as CreateTodoDto;
  
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Todo text is required' });
  }
  
  const newTodo: Todo = {
    id: crypto.randomUUID(),
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.get('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === req.params.id);
  
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  res.json(todo);
});

app.patch('/api/todos/:id', (req, res) => {
  const { text, completed } = req.body as UpdateTodoDto;
  const todoIndex = todos.findIndex(t => t.id === req.params.id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  todos[todoIndex] = {
    ...todos[todoIndex],
    ...(text !== undefined && { text }),
    ...(completed !== undefined && { completed })
  };
  
  res.json(todos[todoIndex]);
});

app.delete('/api/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex(t => t.id === req.params.id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  const [deletedTodo] = todos.splice(todoIndex, 1);
  res.json(deletedTodo);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
