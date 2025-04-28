// Disable OpenTelemetry verbose logging during stress tests
process.env.OTEL_LOG_LEVEL = 'error';

import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import fs from 'fs';

const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'ws://localhost:3001';
const NUM_USERS = 500; // Reduced from 100
const OPERATIONS_PER_USER = 30; // Reduced from 20
const DELAY_BETWEEN_OPS_MS = 100; // Increased from 200
const LOG_FILE = 'stress-test-results.log';
const BATCH_SIZE = 20;

// Add a flag to control verbosity
const VERBOSE_LOGGING = false;

// Add a conditional logging function
function conditionalLog(message: string): void {
  if (VERBOSE_LOGGING) {
    console.info(message);
  }
}

// Enhanced error tracking
const errorStats = {
  createErrors: 0,
  toggleErrors: 0,
  deleteErrors: 0,
  socketErrors: 0,
  totalOperations: 0,
  successfulOperations: 0,
  retryAttempts: 0,
  retrySuccesses: 0
};

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// Add environment variable to signal stress test mode
process.env.STRESS_TEST = 'true';

class User {
  private socket: Socket;
  private todos: Todo[] = [];
  private id: number;

  constructor(id: number) {
    this.id = id;
    this.socket = io(SOCKET_URL);
    
    this.socket.on('connect', () => {
      conditionalLog(`User ${this.id} connected with socket ID: ${this.socket.id}`);
    });
    
    this.socket.on('connect_error', (error) => {
      errorStats.socketErrors++;
      console.error(`User ${this.id} socket connection error:`, error.message);
    });
    
    // Update to handle the new todos format (paginated)
    this.socket.on('todos:update', (todosData: Todo[] | { todos: Todo[] }) => {
      if (Array.isArray(todosData)) {
        this.todos = todosData;
      } else if (todosData && 'todos' in todosData) {
        this.todos = todosData.todos;
      }
    });
  }

  async createTodo(): Promise<void> {
    errorStats.totalOperations++;
    try {
      const response = await axios.post(`${API_URL}/todos`, {
        text: `Todo from user ${this.id} at ${new Date().toISOString()}`
      });
      conditionalLog(`User ${this.id} created todo: ${response.data.id}`);
      errorStats.successfulOperations++;
    } catch (error) {
      errorStats.createErrors++;
      if (axios.isAxiosError(error)) {
        console.error(`User ${this.id} failed to create todo: ${error.message} (${error.response?.status || 'unknown status'})`);
      } else {
        console.error(`User ${this.id} failed to create todo:`, error);
      }
    }
  }

  // Improve the toggleRandomTodo method with better retry logic
  async toggleRandomTodo(): Promise<void> {
    errorStats.totalOperations++;
    if (this.todos.length === 0) {
      console.info(`User ${this.id} has no todos to toggle`);
      errorStats.successfulOperations++;
      return;
    }
    
    // Get a random todo, but prefer ones created by this user
    const randomIndex = Math.floor(Math.random() * this.todos.length);
    const todo = this.todos[randomIndex];
    
    // Implement exponential backoff for retries
    const maxRetries = 3;
    let retryCount = 0;
    let lastError;
    
    while (retryCount <= maxRetries) {
      try {
        await axios.patch(`${API_URL}/todos/${todo.id}`, {
          completed: !todo.completed
        });
        console.info(`User ${this.id} toggled todo: ${todo.id}`);
        errorStats.successfulOperations++;
        errorStats.retrySuccesses += retryCount > 0 ? 1 : 0;
        return;
      } catch (error) {
        lastError = error;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 409) {
            // Resource conflict - retry with exponential backoff
            retryCount++;
            errorStats.retryAttempts++;
            const retryAfter = error.response.data?.retryAfter || 50;
            const delay = retryAfter * Math.pow(1.5, retryCount) + Math.random() * 50;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (error.response?.status === 404) {
            // Todo not found - it was probably deleted by another user
            // Remove it from our local list and try a different todo if available
            this.todos = this.todos.filter(t => t.id !== todo.id);
            console.info(`User ${this.id} tried to toggle non-existent todo: ${todo.id}`);
            
            // Try to refresh todos list from server
            try {
              const response = await axios.get(`${API_URL}/todos`);
              if (response.data && response.data.todos) {
                this.todos = response.data.todos;
              }
            } catch (refreshError) {
              console.error(`User ${this.id} failed to refresh todos:`, refreshError);
            }
            
            // If we still have todos after refresh, try again with a different todo
            if (this.todos.length > 0) {
              retryCount++;
              errorStats.retryAttempts++;
              continue;
            } else {
              // No todos left, consider this a success (nothing to toggle)
              errorStats.successfulOperations++;
              return;
            }
          } else {
            break; // Other error, don't retry
          }
        } else {
          break; // Non-axios error, don't retry
        }
      }
    }
    
    // If we get here, all retries failed
    errorStats.toggleErrors++;
    if (axios.isAxiosError(lastError)) {
      console.error(`User ${this.id} failed to toggle todo after ${retryCount} retries: ${lastError.message}`);
    } else {
      console.error(`User ${this.id} failed to toggle todo:`, lastError);
    }
  }

  // Apply similar improvements to deleteRandomTodo
  async deleteRandomTodo(): Promise<void> {
    errorStats.totalOperations++;
    if (this.todos.length === 0) {
      console.info(`User ${this.id} has no todos to delete`);
      errorStats.successfulOperations++;
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * this.todos.length);
    const todo = this.todos[randomIndex];
    
    // Implement exponential backoff for retries
    const maxRetries = 3;
    let retryCount = 0;
    let lastError;
    
    while (retryCount <= maxRetries) {
      try {
        await axios.delete(`${API_URL}/todos/${todo.id}`);
        console.info(`User ${this.id} deleted todo: ${todo.id}`);
        errorStats.successfulOperations++;
        errorStats.retrySuccesses += retryCount > 0 ? 1 : 0;
        
        // Remove the todo from our local list to avoid trying to use it again
        this.todos = this.todos.filter(t => t.id !== todo.id);
        return;
      } catch (error) {
        lastError = error;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 409) {
            // Resource conflict - retry with exponential backoff
            retryCount++;
            errorStats.retryAttempts++;
            const retryAfter = error.response.data?.retryAfter || 50;
            const delay = retryAfter * Math.pow(1.5, retryCount) + Math.random() * 50;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (error.response?.status === 404) {
            // Todo not found - it was probably deleted by another user
            // Remove it from our local list and consider this a success
            this.todos = this.todos.filter(t => t.id !== todo.id);
            console.info(`User ${this.id} tried to delete already deleted todo: ${todo.id}`);
            errorStats.successfulOperations++;
            return;
          } else {
            break; // Other error, don't retry
          }
        } else {
          break; // Non-axios error, don't retry
        }
      }
    }
    
    // If we get here, all retries failed
    errorStats.deleteErrors++;
    if (axios.isAxiosError(lastError)) {
      console.error(`User ${this.id} failed to delete todo after ${retryCount} retries: ${lastError.message}`);
    } else {
      console.error(`User ${this.id} failed to delete todo:`, lastError);
    }
  }

  async performRandomOperation(): Promise<void> {
    const operations = [
      this.createTodo.bind(this),
      this.toggleRandomTodo.bind(this),
      this.deleteRandomTodo.bind(this)
    ];
    
    const randomOp = operations[Math.floor(Math.random() * operations.length)];
    await randomOp();
  }

  disconnect(): void {
    this.socket.disconnect();
    console.info(`User ${this.id} disconnected`);
  }
}

function writeResultsToFile(results: string): void {
  fs.writeFileSync(LOG_FILE, results);
  console.info(`Detailed results written to ${LOG_FILE}`);
}

// Add graceful shutdown to clean up resources
let users: User[] = []; // Declare users at the module level

process.on('SIGINT', async () => {
  console.info('Stress test interrupted, cleaning up...');
  // Disconnect all users
  for (const user of users) {
    user.disconnect();
  }
  
  // Give time for disconnections to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  process.exit(0);
});

// Add memory usage tracking to the stress test
function logMemoryUsage(): void {
  const memoryUsage = process.memoryUsage();
  console.info('Stress test memory usage:');
  console.info(`  RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.info(`  Heap total: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.info(`  Heap used: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
}

async function runStressTest() {
  console.info(`Starting stress test with ${NUM_USERS} users...`);
  console.info(`Each user will perform ${OPERATIONS_PER_USER} operations`);
  console.info(`Total operations: ${NUM_USERS * OPERATIONS_PER_USER}`);
  
  // Log initial memory usage
  logMemoryUsage();
  
  const startTime = Date.now();
  
  // Create users in batches to avoid overwhelming the server
  users = []; // Reset the users array
  
  for (let i = 0; i < NUM_USERS; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, NUM_USERS - i);
    const batch = Array.from({ length: batchSize }, (_, j) => new User(i + j + 1));
    users.push(...batch);
    
    // Wait a bit between batches
    await new Promise(resolve => setTimeout(resolve, 500));
    console.info(`Created users ${i + 1} to ${i + batch.length}`);
  }
  
  // Wait for connections to establish
  console.info('Establishing connections...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Log memory after connections
  logMemoryUsage();
  
  console.info('Running operations...');
  // Run operations for each user with staggered starts
  const userPromises = users.map(async (user, index) => {
    // Stagger the start of operations for each user
    await new Promise(resolve => setTimeout(resolve, index * 100));
    
    for (let i = 0; i < OPERATIONS_PER_USER; i++) {
      await user.performRandomOperation();
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_OPS_MS));
    }
    return user;
  });
  
  // Wait for all operations to complete
  const completedUsers = await Promise.all(userPromises);
  
  // Log memory after operations
  logMemoryUsage();
  
  // Disconnect all users
  completedUsers.forEach(user => user.disconnect());
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Generate summary
  const summary = `
=== STRESS TEST SUMMARY ===
Test completed in: ${duration.toFixed(2)} seconds
Total users: ${NUM_USERS}
Operations per user: ${OPERATIONS_PER_USER}
Total operations: ${errorStats.totalOperations}
Successful operations: ${errorStats.successfulOperations}
Success rate: ${((errorStats.successfulOperations / errorStats.totalOperations) * 100).toFixed(2)}%

ERROR BREAKDOWN:
- Create todo errors: ${errorStats.createErrors}
- Toggle todo errors: ${errorStats.toggleErrors}
- Delete todo errors: ${errorStats.deleteErrors}
- Socket connection errors: ${errorStats.socketErrors}

Operations per second: ${(errorStats.totalOperations / duration).toFixed(2)}
`;

  console.info(summary);
  writeResultsToFile(summary);
  
  // Final memory usage
  logMemoryUsage();
  
  console.info('Stress test completed!');
}

runStressTest().catch(error => {
  console.error('Stress test failed with error:', error);
  process.exit(1);
});
