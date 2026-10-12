/**
 * ═══════════════════════════════════════════════════════════════════
 * COMMAND: ADD (Job, Task, Alarm, Note, Goal)
 * ═══════════════════════════════════════════════════════════════════
 */

import { api } from '../lib/api.js';
import { normalizeStatus, parseWhen } from '../lib/format.js';

export const handleAddJob = async (userId: string, args: string): Promise<string> => {
  // Format: <Company> | <Role> | [Stage] | [CTC] | [Link]
  const parts = args.split('|').map((s) => s.trim());
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return '❌ Usage: `add job <Company> | <Role> | [Stage] | [CTC] | [Link]`';
  }

  const [companyName, role, stageRaw, packageCtc, jobLink] = parts;
  const status = normalizeStatus(stageRaw) || 'APPLIED';

  const created = await api.post<{ id: string; companyName: string }>(userId, '/job-applications', {
    companyName,
    role,
    status,
    packageCtc: packageCtc || null,
    jobLink: jobLink || null,
    applicationDate: new Date().toISOString(),
  });

  return `✅ Added job application: *${created.companyName}* (${role})!`;
};

export const handleAddTask = async (userId: string, args: string): Promise<string> => {
  // Format: <Title> | [Reason] | [DueDate]
  const parts = args.split('|').map((s) => s.trim());
  if (!parts[0]) {
    return '❌ Usage: `add task <Title> | [Reason] | [DueDate/Time]`';
  }

  const [title, reason, dueRaw] = parts;
  const dueDate = dueRaw ? parseWhen(dueRaw) : null;

  const created = await api.post<{ id: string; title: string }>(userId, '/tasks', {
    title,
    reason: reason || 'Added via WhatsApp bot',
    dueDate: dueDate ? dueDate.toISOString() : null,
    priority: 'HIGH',
    importance: 'IMPORTANT_URGENT',
  });

  const dueStr = dueDate ? ` (due: ${dueDate.toLocaleString()})` : '';
  return `✅ Created task: *${created.title}*${dueStr}`;
};

export const handleAddAlarm = async (userId: string, args: string): Promise<string> => {
  // Format: HH:MM | [Label] | [Days e.g. MON,WED,FRI]
  const parts = args.split('|').map((s) => s.trim());
  const time = parts[0];

  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
    return '❌ Usage: `alarm 07:30 | Morning Routine | MON,TUE,WED`';
  }

  const [h, m] = time.split(':').map((s) => parseInt(s, 10));
  const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const label = parts[1] || 'Alarm';
  const daysRaw = parts[2] ? parts[2].split(',').map((d) => d.trim().toUpperCase().slice(0, 3)) : [];

  const created = await api.post<{ id: string; time: string; label: string }>(userId, '/alarms', {
    time: formattedTime,
    label,
    days: daysRaw.length ? daysRaw : ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  });

  return `⏰ Created alarm: *${created.time}* — ${created.label}`;
};

export const handleAddNote = async (userId: string, args: string): Promise<string> => {
  // Format: <Title> | <Content>
  const parts = args.split('|').map((s) => s.trim());
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return '❌ Usage: `add note <Title> | <Content>`';
  }

  const [title, content] = parts;
  const created = await api.post<{ id: string; title: string }>(userId, '/notes', {
    title,
    content,
    tags: ['whatsapp'],
  });

  return `📓 Saved note: *${created.title}*`;
};

export const handleAddGoal = async (userId: string, args: string): Promise<string> => {
  // Format: <Title> | [Horizon e.g. "Q4", "Year"]
  const parts = args.split('|').map((s) => s.trim());
  if (!parts[0]) {
    return '❌ Usage: `add goal <Title> | [Horizon]`';
  }

  const [title, horizon] = parts;
  const created = await api.post<{ id: string; title: string }>(userId, '/goals', {
    title,
    horizon: horizon || 'SHORT_TERM',
    progress: 0,
  });

  return `🎯 Set new goal: *${created.title}*`;
};
