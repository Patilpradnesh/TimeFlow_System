/**
 * COMMAND: LIST (Jobs, Tasks, Alarms) - Part 1
 */
import { api } from '../lib/api.js';
import { loadJobs, loadTasks, loadAlarms } from '../lib/queries.js';
import { STATUS_META, normalizeStatus, formatDateOnly, formatDateTime } from '../lib/format.js';
import { whatsappConfig } from '../config.js';

export const handleListJobs = async (userId: string, filterStage?: string): Promise<string> => {
  const jobs = await loadJobs(userId);
  if (!jobs.length) return '💼 No job applications found. Use `add job <Company> | <Role>` to add one!';

  let filtered = jobs;
  if (filterStage) {
    const norm = normalizeStatus(filterStage);
    if (norm) {
      filtered = jobs.filter((j) => j.status === norm);
    }
  }

  if (!filtered.length) {
    return `💼 No jobs matching stage "${filterStage}".`;
  }

  const lines = ['📋 *Job Applications:*', ''];
  const cap = Math.min(filtered.length, whatsappConfig.maxListItems);

  for (let i = 0; i < cap; i++) {
    const j = filtered[i];
    const meta = STATUS_META[j.status as keyof typeof STATUS_META] || { emoji: '📌', label: j.status };
    const nextStr = j.nextActionDate ? ` • Next: ${formatDateOnly(j.nextActionDate)}` : '';
    lines.push(`${i + 1}. *${j.companyName}* — ${j.role}`);
    lines.push(`   ${meta.emoji} ${meta.label}${nextStr}`);
  }

  if (filtered.length > cap) {
    lines.push('', `_...and ${filtered.length - cap} more._`);
  }

  return lines.join('\n');
};

export const handleListTasks = async (userId: string, filter?: string): Promise<string> => {
  const tasks = await loadTasks(userId);
  if (!tasks.length) return '📝 No tasks found. Use `add task <Title>` to create one!';

  let list = tasks;
  const f = filter?.toLowerCase();

  if (f === 'done') {
    list = tasks.filter((t) => t.status === 'DONE');
  } else if (f === 'todo' || !f) {
    list = tasks.filter((t) => t.status !== 'DONE');
  }

  if (!list.length) return `📝 No tasks matching "${filter}".`;

  const lines = [f === 'done' ? '✅ *Completed Tasks:*' : '📝 *Pending Tasks:*', ''];
  const cap = Math.min(list.length, whatsappConfig.maxListItems);

  for (let i = 0; i < cap; i++) {
    const t = list[i];
    const due = t.dueDate ? ` (due: ${formatDateTime(t.dueDate)})` : '';
    const statusIcon = t.status === 'DONE' ? '☑️' : '◻️';
    lines.push(`${i + 1}. ${statusIcon} *${t.title}*${due}`);
  }

  return lines.join('\n');
};

export const handleListAlarms = async (userId: string): Promise<string> => {
  const alarms = await loadAlarms(userId);
  if (!alarms.length) return '⏰ No alarms configured. Add one with `alarm 07:30 | Morning Standup`.';

  const lines = ['⏰ *Your Recurring Alarms:*', ''];
  alarms.forEach((a, i) => {
    const state = a.isActive ? '🔔 ON' : '🔕 OFF';
    const days = a.days && a.days.length ? a.days.join(',') : 'Daily';
    lines.push(`${i + 1}. *${a.time}* — ${a.label} [${days}] (${state})`);
  });

  return lines.join('\n');
};
import { loadNotes, loadGoals } from '../lib/queries.js';
import { getLocalTimeParts } from '../lib/format.js';

export const handleListNotes = async (userId: string): Promise<string> => {
  const notes = await loadNotes(userId);
  if (!notes.length) return '📓 No notes stored yet. Use `add note <Title> | <Content>`.';

  const lines = ['📓 *Saved Notes:*', ''];
  notes.slice(0, 10).forEach((n, i) => {
    const pin = n.isPinned ? '📌 ' : '';
    lines.push(`${i + 1}. ${pin}*${n.title}*: ${n.content.slice(0, 50)}...`);
  });

  return lines.join('\n');
};

export const handleListGoals = async (userId: string): Promise<string> => {
  const goals = await loadGoals(userId);
  if (!goals.length) return '🎯 No goals active. Use `add goal <Title> | <Horizon>`.';

  const lines = ['🎯 *Current Goals:*', ''];
  goals.forEach((g, i) => {
    lines.push(`${i + 1}. *${g.title}* [${g.horizon}] — ${g.progress}% done`);
  });

  return lines.join('\n');
};

export const handleTodayDigest = async (userId: string): Promise<string> => {
  const now = new Date();
  const timeInfo = getLocalTimeParts(now);

  const [tasks, jobs, alarms] = await Promise.all([
    loadTasks(userId),
    loadJobs(userId),
    loadAlarms(userId),
  ]);

  const pendingTasks = tasks.filter((t) => t.status !== 'DONE');
  const todayAlarms = alarms.filter(
    (a) => a.isActive && (a.days.length === 0 || a.days.includes(timeInfo.weekday))
  );

  const dueJobs = jobs.filter((j) => {
    if (!j.nextActionDate) return false;
    const d = new Date(j.nextActionDate);
    return d.toDateString() === now.toDateString();
  });

  const lines = [
    `📅 *Daily Overview — ${formatDateOnly(now)}*`,
    '',
    `⏰ *Alarms Today (${todayAlarms.length}):*`,
  ];

  if (todayAlarms.length) {
    todayAlarms.forEach((a) => lines.push(` • ${a.time} — ${a.label}`));
  } else {
    lines.push(' • No active alarms for today');
  }

  lines.push('', `📝 *Pending Tasks (${pendingTasks.length}):*`);
  if (pendingTasks.length) {
    pendingTasks.slice(0, 5).forEach((t) => {
      const due = t.dueDate ? ` (due: ${formatDateTime(t.dueDate)})` : '';
      lines.push(` • ${t.title}${due}`);
    });
  } else {
    lines.push(' • All tasks completed! 🎉');
  }

  lines.push('', `💼 *Job Next Actions Today (${dueJobs.length}):*`);
  if (dueJobs.length) {
    dueJobs.forEach((j) => lines.push(` • *${j.companyName}*: ${j.role}`));
  } else {
    lines.push(' • None scheduled for today');
  }

  return lines.join('\n');
};

export const handleJobStats = async (userId: string): Promise<string> => {
  const stats = await api.get<{
    total: number;
    funnel: Record<string, number>;
    upcomingIn3Days: number;
    overdue: number;
  }>(userId, '/job-applications/stats');

  const lines = [
    '📊 *Job Application Pipeline Stats*',
    '',
    `Total Applications: *${stats.total}*`,
    `Actions in Next 3 Days: *${stats.upcomingIn3Days}*`,
    `Overdue Follow-ups: *${stats.overdue}*`,
    '',
    '*Funnel Breakdown:*',
  ];

  for (const [st, count] of Object.entries(stats.funnel || {})) {
    const meta = STATUS_META[st as keyof typeof STATUS_META] || { emoji: '🔹', label: st };
    lines.push(`${meta.emoji} ${meta.label}: *${count}*`);
  }

  return lines.join('\n');
};

