import { io, Socket } from 'socket.io-client';

// Get the server URL from environment or use default
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};

  connect(): void {
    if (this.socket) return;
    
    this.socket = io(SERVER_URL);
    
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    // Re-register any existing event handlers after reconnection
    Object.entries(this.eventHandlers).forEach(([event, handlers]) => {
      handlers.forEach(handler => {
        this.socket?.on(event, handler);
      });
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    
    this.socket.disconnect();
    this.socket = null;
    console.log('Socket disconnected');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    
    this.eventHandlers[event].push(callback);
    this.socket?.on(event, callback);
    
    return () => {
      this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
      this.socket?.off(event, callback);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, ...args: any[]): void {
    this.socket?.emit(event, ...args);
  }

  isTodoValid(id: string): boolean {
    return id !== undefined && typeof id === 'string' && id.length > 0;
  }
}

export default new SocketService();
