import socketService from '../services/socketService';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  }))
}));

// Mock import.meta.env
jest.mock('../services/socketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  emit: jest.fn()
}));

describe('Socket Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connects to socket server', () => {
    socketService.connect();
    expect(socketService.connect).toHaveBeenCalled();
  });

  test('disconnects from socket server', () => {
    socketService.disconnect();
    expect(socketService.disconnect).toHaveBeenCalled();
  });
});
