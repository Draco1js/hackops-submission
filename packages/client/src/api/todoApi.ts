import axios from 'axios';
import { Todo } from '../../../shared/src';

const api = axios.create({
  baseURL: '/api'
});

export const getTodos = async (): Promise<Todo[] | { todos: Todo[], totalCount: number, page: number, limit: number, totalPages: number }> => {
  const response = await api.get('/todos');
  return response.data;
};

export const createTodo = async (text: string): Promise<Todo> => {
  const response = await api.post('/todos', { text });
  return response.data;
};

export const updateTodo = async (id: string, data: { text?: string; completed?: boolean }): Promise<Todo> => {
  const response = await api.patch(`/todos/${id}`, data);
  return response.data;
};

export const deleteTodo = async (id: string): Promise<Todo> => {
  const response = await api.delete(`/todos/${id}`);
  return response.data;
};
