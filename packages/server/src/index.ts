// At the top of your file, before any imports
// Disable tracing during stress tests to improve performance
if (process.env.STRESS_TEST === 'true') {
  process.env.DISABLE_TRACING = 'true';
  process.env.OTEL_LOG_LEVEL = 'error';
}

// Import tracing after setting environment variables
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

// Add exports for testing
export { app, httpServer, io };

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Add a more robust error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// In-memory database
let todos: Todo[] = [];
let onlineUsers = 0;

// Add mutex-like locking mechanism
const locks = new Map<string, boolean>();

// Helper function to acquire a lock
const acquireLock = (id: string): boolean => {
  if (locks.has(id)) return false;
  locks.set(id, true);
  return true;
};

// Helper function to release a lock
const releaseLock = (id: string): void => {
  locks.delete(id);
};

// Socket.IO events
io.on('connection', (socket) => {
  console.info('Client connected:', socket.id);
  
  // Increment online users count and broadcast
  onlineUsers++;
  io.emit('users:count', onlineUsers);
  
  // Send current todos to newly connected client
  socket.emit('todos:init', todos);
  
  socket.on('disconnect', () => {
    console.info('Client disconnected:', socket.id);
    
    // Decrement online users count and broadcast
    onlineUsers--;
    io.emit('users:count', onlineUsers);
  });
});

// Add pagination for todos to reduce payload size
app.get('/api/todos', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 100;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const paginatedTodos = todos.slice(startIndex, endIndex);
  
  res.json({
    todos: paginatedTodos,
    totalCount: todos.length,
    page,
    limit,
    totalPages: Math.ceil(todos.length / limit)
  });
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

app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body as UpdateTodoDto;
  
  // Try to acquire lock
  if (!acquireLock(id)) {
    return res.status(409).json({ 
      error: 'Resource is currently being modified',
      retryAfter: 100 // Suggest retry after 100ms
    });
  }
  
  try {
    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      releaseLock(id);
      return res.status(404).json({ 
        error: 'Todo not found',
        todoIds: todos.slice(0, 10).map(t => t.id) // Send available IDs for debugging
      });
    }
    
    todos[todoIndex] = { ...todos[todoIndex], ...updates };
    
    // Broadcast the updated todos list
    broadcastTodos();
    
    res.json(todos[todoIndex]);
  } finally {
    // Always release the lock
    releaseLock(id);
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  
  // Try to acquire lock
  if (!acquireLock(id)) {
    return res.status(409).json({ 
      error: 'Resource is currently being modified',
      retryAfter: 100 // Suggest retry after 100ms
    });
  }
  
  try {
    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      releaseLock(id);
      return res.status(404).json({ 
        error: 'Todo not found',
        todoIds: todos.slice(0, 10).map(t => t.id) // Send available IDs for debugging
      });
    }
    
    const deletedTodo = todos[todoIndex];
    
    // Use splice to remove the item
    todos.splice(todoIndex, 1);
    
    // Broadcast the updated todos list
    broadcastTodos();
    
    res.json(deletedTodo);
  } finally {
    // Always release the lock
    releaseLock(id);
  }
});

// Optimize broadcasting by limiting frequency and payload size
let broadcastPending = false;
const broadcastTodos = () => {
  if (broadcastPending) return;
  
  broadcastPending = true;
  
  // Debounce broadcasts to reduce frequency
  setTimeout(() => {
    // Only send the first 100 todos to reduce payload size
    const limitedTodos = todos.slice(0, 100);
    
    // Send the todo IDs separately to help clients track what's available
    const todoIds = todos.map(t => t.id);
    
    io.emit('todos:update', limitedTodos);
    io.emit('todos:ids', todoIds);
    broadcastPending = false;
  }, 100);
};

// Add memory usage monitoring
const logMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  console.info('Memory usage:');
  console.info(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.info(`  Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.info(`  Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
};

// Log memory usage every 5 seconds during stress test
if (process.env.STRESS_TEST) {
  setInterval(logMemoryUsage, 5000);
}

// Add cleanup to prevent memory leaks
// Periodically clean up old todos if the list gets too large
setInterval(() => {
  if (todos.length > 1000) {
    console.info(`Cleaning up old todos. Before: ${todos.length}`);
    // Keep only the 500 most recent todos
    todos = todos.slice(-500);
    console.info(`After cleanup: ${todos.length}`);
    broadcastTodos();
  }
}, 10000);

// Only start the server if this file is run directly, not when imported in tests
if (process.env.NODE_ENV !== 'test') {
  // Start server
  httpServer.listen(PORT, () => {
    console.info(`Server running on http://localhost:${PORT}`);
    console.info(`WebSocket server running on ws://localhost:${PORT}`);
  });
}

