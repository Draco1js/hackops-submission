import { io, Socket } from 'socket.io-client';
import { Todo } from '../../../shared/src';

// Determine the WebSocket URL based on environment
const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin.replace(/^http/, 'ws')
  : 'ws://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private validTodoIds: Set<string> = new Set();

  connect(): void {
    if (this.socket) return;

    this.socket = io(SOCKET_URL);
    
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    // Set up listeners for todo events
    this.socket.on('todos:init', (todos: Todo[]) => {
      this.notifyListeners('todos:update', todos);
    });
    
    this.socket.on('todos:update', (todos: Todo[]) => {
      this.notifyListeners('todos:update', todos);
    });

    this.socket.on('users:count', (count: number) => {
      this.notifyListeners('users:count', count);
    });

    // Add a new event handler for todo IDs
    this.socket.on('todos:ids', (todoIds: string[]) => {
      // Store the valid todo IDs to avoid operations on deleted todos
      this.validTodoIds = new Set(todoIds);
      this.notifyListeners('todos:ids', todoIds);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return a function to remove this listener
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  private notifyListeners(event: string, data: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        callback(data);
      });
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;
