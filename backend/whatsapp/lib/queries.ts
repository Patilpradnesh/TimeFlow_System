/**
 * ═══════════════════════════════════════════════════════════════════
 * SHARED QUERIES & RESOLVERS
 * ═══════════════════════════════════════════════════════════════════
 */

import { api } from './api.js';

export interface JobAppSummary {
  id: string;
  companyName: string;
  role: string;
  status: string;
  packageCtc?: string | null;
  applicationDate: string;
  nextActionDate?: string | null;
  studyNotes?: string | null;
  resumeUsed?: string | null;
  resumeFileId?: string | null;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string | null;
  priority: string;
  reason?: string | null;
}

export interface AlarmSummary {
  id: string;
  time: string;
  label: string;
  days: string[];
  isActive: boolean;
}

export interface NoteSummary {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
}

export interface GoalSummary {
  id: string;
  title: string;
  horizon: string;
  progress: number;
}

export const loadJobs = async (userId: string): Promise<JobAppSummary[]> => {
  return api.get<JobAppSummary[]>(userId, '/job-applications');
};

export const loadTasks = async (userId: string): Promise<TaskSummary[]> => {
  return api.get<TaskSummary[]>(userId, '/tasks');
};

export const loadAlarms = async (userId: string): Promise<AlarmSummary[]> => {
  return api.get<AlarmSummary[]>(userId, '/alarms');
};

export const loadNotes = async (userId: string): Promise<NoteSummary[]> => {
  return api.get<NoteSummary[]>(userId, '/notes');
};

export const loadGoals = async (userId: string): Promise<GoalSummary[]> => {
  return api.get<GoalSummary[]>(userId, '/goals');
};

/**
 * Resolves an item by 1-based index or matching name.
 */
export const resolveByRef = <T>(
  items: T[],
  ref: string,
  getName: (item: T) => string
): { item: T; index: number } | null => {
  const trimmed = ref.trim().toLowerCase();
  const num = parseInt(trimmed, 10);

  if (!isNaN(num) && num >= 1 && num <= items.length) {
    return { item: items[num - 1], index: num };
  }

  const foundIndex = items.findIndex((it) => getName(it).toLowerCase().includes(trimmed));
  if (foundIndex !== -1) {
    return { item: items[foundIndex], index: foundIndex + 1 };
  }

  return null;
};
