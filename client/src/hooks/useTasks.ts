import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types';
import * as taskApi from '../api/tasks';

export const useTasks = (startDate: string, endDate: string, search: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskApi.fetchTasks(startDate, endDate, search || undefined);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, search]);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async (title: string, date: string) => {
    const task = await taskApi.createTask(title, date);
    setTasks((prev) => [...prev, task]);
    return task;
  };

  const editTask = async (id: string, updates: Partial<Task>) => {
    const updated = await taskApi.updateTask(id, updates);
    setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
  };

  const removeTask = async (id: string) => {
    await taskApi.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t._id !== id));
  };

  const moveTask = async (id: string, newDate: string, newOrder: number) => {
    const updated = await taskApi.reorderTask(id, newDate, newOrder);
    await load(); // reload to get correct orders
    return updated;
  };

  return { tasks, loading, addTask, editTask, removeTask, moveTask, reload: load };
};
