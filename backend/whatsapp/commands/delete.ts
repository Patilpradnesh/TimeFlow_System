/**
 * ═══════════════════════════════════════════════════════════════════
 * COMMAND: DELETE & ACTIONS (Complete Task, Delete Job/Task/Alarm/Note)
 * ═══════════════════════════════════════════════════════════════════
 */

import { api } from '../lib/api.js';
import {
  loadJobs,
  loadTasks,
  loadAlarms,
  loadNotes,
  resolveByRef,
} from '../lib/queries.js';

export const handleDoneTask = async (userId: string, ref: string): Promise<string> => {
  const tasks = await loadTasks(userId);
  const match = resolveByRef(tasks, ref, (t) => t.title);
  if (!match) return `❌ No task found matching "${ref}".`;

  await api.put(userId, `/tasks/${match.item.id}`, { status: 'DONE' });
  return `✅ Marked task as complete: *${match.item.title}* 🎉`;
};

export const handleDeleteJob = async (userId: string, ref: string): Promise<string> => {
  const jobs = await loadJobs(userId);
  const match = resolveByRef(jobs, ref, (j) => j.companyName);
  if (!match) return `❌ No job application found matching "${ref}".`;

  await api.delete(userId, `/job-applications/${match.item.id}`);
  return `🗑️ Deleted job application for *${match.item.companyName}*.`;
};

export const handleDeleteTask = async (userId: string, ref: string): Promise<string> => {
  const tasks = await loadTasks(userId);
  const match = resolveByRef(tasks, ref, (t) => t.title);
  if (!match) return `❌ No task found matching "${ref}".`;

  await api.delete(userId, `/tasks/${match.item.id}`);
  return `🗑️ Deleted task: *${match.item.title}*.`;
};

export const handleDeleteAlarm = async (userId: string, ref: string): Promise<string> => {
  const alarms = await loadAlarms(userId);
  const match = resolveByRef(alarms, ref, (a) => `${a.time} ${a.label}`);
  if (!match) return `❌ No alarm found matching "${ref}".`;

  await api.delete(userId, `/alarms/${match.item.id}`);
  return `🗑️ Deleted alarm: *${match.item.time}* (${match.item.label}).`;
};

export const handleToggleAlarm = async (userId: string, ref: string, active: boolean): Promise<string> => {
  const alarms = await loadAlarms(userId);
  const match = resolveByRef(alarms, ref, (a) => `${a.time} ${a.label}`);
  if (!match) return `❌ No alarm found matching "${ref}".`;

  await api.patch(userId, `/alarms/${match.item.id}`, { isActive: active });
  const status = active ? '🔔 ON' : '🔕 OFF';
  return `Alarm *${match.item.time}* (${match.item.label}) is now ${status}.`;
};

export const handleDeleteNote = async (userId: string, ref: string): Promise<string> => {
  const notes = await loadNotes(userId);
  const match = resolveByRef(notes, ref, (n) => n.title);
  if (!match) return `❌ No note found matching "${ref}".`;

  await api.delete(userId, `/notes/${match.item.id}`);
  return `🗑️ Deleted note: *${match.item.title}*.`;
};
