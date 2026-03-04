import axios from 'axios';
import type { Task } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchTasks = async (startDate: string, endDate: string, search?: string): Promise<Task[]> => {
  const params: Record<string, string> = { startDate, endDate };
  if (search) params.search = search;
  const { data } = await api.get<Task[]>('/tasks', { params });
  return data;
};

export const createTask = async (title: string, date: string): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', { title, date });
  return data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${id}`, updates);
  return data;
};

export const reorderTask = async (id: string, date: string, order: number): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${id}/reorder`, { date, order });
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};
