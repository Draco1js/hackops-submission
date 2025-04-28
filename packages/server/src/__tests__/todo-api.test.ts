import request from 'supertest';
import { jest, describe, test, expect, beforeEach, afterEach, afterAll } from '@jest/globals';
// import { Todo } from 'shared';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock the socket.io instance
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn() // Add close method to the mock
    }))
  };
});

// Import the app after mocking dependencies
// Use more specific types instead of any
let app: Express.Application;
let httpServer: http.Server;
let io: SocketIO.Server;

// Add the necessary type imports
import Express from 'express';
import http from 'http';
import SocketIO from 'socket.io';

describe('Todo API', () => {
  beforeEach(async () => {
    // Clear the module cache to reset the in-memory todos array
    jest.resetModules();
    
    try {
      // Import the app for each test to get a fresh instance
      const appModule = await import('../index.js');
      app = appModule.app;
      httpServer = appModule.httpServer;
      io = appModule.io;
      
      if (!app) {
        console.error('App is undefined from the module');
      }
    } catch (error) {
      console.error('Error loading app module:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  });

  afterEach(() => {
    // Close the server after each test to release the port
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
    
    // Close Socket.IO connections
    if (io) {
      io.close();
    }
    
    // Clear any timers or intervals
    jest.clearAllTimers();
  });

  afterAll(done => {
    // Final cleanup after all tests
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
    
    // Add a small delay to allow resources to clean up
    setTimeout(done, 100);
  });

  test('GET /api/todos returns empty array initially', async () => {
    if (!app) {
      throw new Error('App is not defined');
    }
    
    const response = await request(app).get('/api/todos');
    
    expect(response.status).toBe(200);
    expect(response.body.todos).toEqual([]);
    expect(response.body.totalCount).toBe(0);
  });

  test('POST /api/todos creates a new todo', async () => {
    const todoText = 'Test todo';
    const response = await request(app)
      .post('/api/todos')
      .send({ text: todoText })
      .set('Accept', 'application/json');
    
    expect(response.status).toBe(201);
    expect(response.body.text).toBe(todoText);
    expect(response.body.completed).toBe(false);
    expect(response.body.id).toBeDefined();
  });
});
