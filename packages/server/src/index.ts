// Import tracing at the top of your entry file
import './tracing';
import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Todo, CreateTodoDto, UpdateTodoDto } from 'shared';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// In-memory database
const todos: Todo[] = [];
let onlineUsers = 0;

// Socket.IO events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Increment online users count and broadcast
  onlineUsers++;
  io.emit('users:count', onlineUsers);
  
  // Send current todos to newly connected client
  socket.emit('todos:init', todos);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Decrement online users count and broadcast
    onlineUsers--;
    io.emit('users:count', onlineUsers);
  });
});

// Helper function to broadcast todo updates
const broadcastTodos = () => {
  io.emit('todos:update', todos);
};

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
  
  // Broadcast the updated todos list
  broadcastTodos();
  
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
  const { id } = req.params;
  const updates = req.body as UpdateTodoDto;
  
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  todos[todoIndex] = { ...todos[todoIndex], ...updates };
  
  // Broadcast the updated todos list
  broadcastTodos();
  
  res.json(todos[todoIndex]);
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  const deletedTodo = todos[todoIndex];
  todos = todos.filter(t => t.id !== id);
  
  // Broadcast the updated todos list
  broadcastTodos();
  
  res.json(deletedTodo);
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
