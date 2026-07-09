import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useState } from 'react';
import {
  fetchAllTasks,
  fetchAllSections,
  createTask as apiCreateTask,
  closeTask as apiCloseTask,
  reopenTask as apiReopenTask,
  deleteTask as apiDeleteTask,
  TodoistTask,
  todoistPriorityToDisplay,
  displayPriorityToTodoist,
  extractDateFromDue,
} from '../api/todoist';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Priority = 'p1' | 'p2' | 'p3' | 'p4';

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  completed: boolean;
  createdAt: string;
  labels: string[];
  isRecurring: boolean;
  sectionId: string | null;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type TaskAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'LOAD_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'OPTIMISTIC_COMPLETE'; payload: string }
  | { type: 'OPTIMISTIC_DELETE'; payload: string }
  | { type: 'REVERT_COMPLETE'; payload: string };

interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  shoppingSectionIds: Set<string>;
  refreshTasks: () => Promise<void>;
  addTask: (task: { title: string; description: string; dueDate: string; priority: Priority }) => Promise<void>;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  getTasksByDate: (date: string) => Task[];
  getTaskDates: () => Set<string>;
}

// ─── Map API response ────────────────────────────────────────────────────────

function mapTodoistTask(t: TodoistTask): Task {
  return {
    id: t.id,
    title: t.content,
    description: t.description || '',
    dueDate: extractDateFromDue(t.due),
    priority: todoistPriorityToDisplay(t.priority),
    completed: t.checked,
    createdAt: t.added_at,
    labels: t.labels || [],
    isRecurring: t.due?.is_recurring || false,
    sectionId: t.section_id ?? null,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'LOAD_TASKS':
      return { tasks: action.payload, loading: false, error: null };
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };
    case 'OPTIMISTIC_COMPLETE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: true } : t
        ),
      };
    case 'REVERT_COMPLETE':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: false } : t
        ),
      };
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        ),
      };
    case 'OPTIMISTIC_DELETE':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
      };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TaskContext = createContext<TaskContextValue | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: [],
    loading: true,
    error: null,
  });
  const [shoppingSectionIds, setShoppingSectionIds] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const [todoistTasks, sections] = await Promise.all([
        fetchAllTasks(),
        fetchAllSections().catch(() => []),
      ]);

      // Find all sections whose name contains 'shopping' (case-insensitive)
      const shoppingIds = new Set(
        sections
          .filter((s) => /shopping/i.test(s.name))
          .map((s) => s.id)
      );
      setShoppingSectionIds(shoppingIds);

      // Filter out deleted tasks, map to our format
      const mapped = todoistTasks
        .filter((t) => !t.is_deleted)
        .map(mapTodoistTask);

      // Sort: by date then priority
      mapped.sort((a, b) => {
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && !b.dueDate) return -1;
        if (a.dueDate && b.dueDate) {
          const dateComp = a.dueDate.localeCompare(b.dueDate);
          if (dateComp !== 0) return dateComp;
        }
        return a.priority.localeCompare(b.priority);
      });
      dispatch({ type: 'LOAD_TASKS', payload: mapped });
    } catch (e: any) {
      console.error('Failed to load tasks:', e);
      dispatch({ type: 'SET_ERROR', payload: e.message || 'Failed to load tasks' });
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = useCallback(
    async (task: { title: string; description: string; dueDate: string; priority: Priority }) => {
      try {
        const created = await apiCreateTask({
          content: task.title,
          description: task.description,
          due_date: task.dueDate || undefined,
          priority: displayPriorityToTodoist(task.priority),
        });
        dispatch({ type: 'ADD_TASK', payload: mapTodoistTask(created) });
      } catch (e: any) {
        console.error('Failed to create task:', e);
      }
    },
    []
  );

  const toggleTask = useCallback((id: string) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    if (!task.completed) {
      dispatch({ type: 'OPTIMISTIC_COMPLETE', payload: id });
      apiCloseTask(id).catch(() => {
        dispatch({ type: 'REVERT_COMPLETE', payload: id });
      });
    } else {
      dispatch({ type: 'TOGGLE_TASK', payload: id });
      apiReopenTask(id).catch(() => {
        dispatch({ type: 'TOGGLE_TASK', payload: id });
      });
    }
  }, [state.tasks]);

  const deleteTaskFn = useCallback((id: string) => {
    dispatch({ type: 'OPTIMISTIC_DELETE', payload: id });
    apiDeleteTask(id).catch((e) => {
      console.error('Failed to delete:', e);
    });
  }, []);

  const getTasksByDate = useCallback(
    (date: string) => state.tasks.filter((t) => t.dueDate === date),
    [state.tasks]
  );

  const getTaskDates = useCallback(
    () => new Set(state.tasks.filter((t) => !t.completed).map((t) => t.dueDate)),
    [state.tasks]
  );

  return (
    <TaskContext.Provider
      value={{
        tasks: state.tasks,
        loading: state.loading,
        error: state.error,
        shoppingSectionIds,
        refreshTasks: loadTasks,
        addTask,
        toggleTask,
        deleteTask: deleteTaskFn,
        getTasksByDate,
        getTaskDates,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used inside TaskProvider');
  return ctx;
}
