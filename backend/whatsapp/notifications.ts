/**
 * ═══════════════════════════════════════════════════════════════════
 * NOTIFICATION & ALARM SCHEDULER (node-cron) - Part 1
 * ═══════════════════════════════════════════════════════════════════
 */

import cron from 'node-cron';
import { prisma } from '../src/lib/prisma.js';
import { sendText, isSenderReady } from './lib/sender.js';
import { getLocalTimeParts, formatDateTime } from './lib/format.js';
import { whatsappConfig, log, logError } from './config.js';

// In-memory deduplication tracking
const sentJobAlerts = new Set<string>(); // key: `${jobId}|${dateKey}`
const sentOverdueTasks = new Set<string>(); // key: `${taskId}|${dateKey}`
let lastDigestDateKey: string | null = null;

export const startNotificationScheduler = (): void => {
  log('Starting WhatsApp background notification scheduler (1-minute intervals)...');

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    if (!isSenderReady()) return;
    try {
      await processAlarmTicks();
      await processTaskReminders();
      await processJobActionReminders();
      await processDailyDigest();
    } catch (err) {
      logError('Scheduler tick error:', err);
    }
  });
};

/**
 * Checks and fires recurring alarms defined in the Alarm table.
 */
const processAlarmTicks = async (): Promise<void> => {
  const now = new Date();
  const timeInfo = getLocalTimeParts(now);

  // Find all active alarms matching current time
  const matchingAlarms = await prisma.alarm.findMany({
    where: {
      isActive: true,
      time: timeInfo.time,
    },
    include: {
      user: {
        select: {
          id: true,
          phoneNumber: true,
          name: true,
        },
      },
    },
  });

  for (const alarm of matchingAlarms) {
    if (!alarm.user.phoneNumber) continue;

    // Check weekday filter if specified
    if (alarm.days.length > 0 && !alarm.days.includes(timeInfo.weekday)) {
      continue;
    }

    // Check if alarm already fired today
    if (alarm.lastSentAt) {
      const lastSentInfo = getLocalTimeParts(alarm.lastSentAt);
      if (lastSentInfo.dateKey === timeInfo.dateKey) {
        continue;
      }
    }

    const message = `⏰ *ALARM:* ${alarm.label} (${alarm.time})\nTime to focus!`;
    const sent = await sendText(alarm.user.phoneNumber, message);

    if (sent) {
      log(`Fired alarm "${alarm.label}" to ${alarm.user.phoneNumber}`);
      await prisma.alarm.update({
        where: { id: alarm.id },
        data: { lastSentAt: now },
      });
    }
  }
};

/**
 * Task 10-minute alert and daily overdue reminders
 */
const processTaskReminders = async (): Promise<void> => {
  const now = new Date();
  const timeInfo = getLocalTimeParts(now);
  const tenMinutesAhead = new Date(now.getTime() + 10 * 60 * 1000);

  // 1. Tasks due in the next 10 minutes that haven't been alerted yet
  const upcomingTasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      isAlerted: false,
      dueDate: {
        gte: now,
        lte: tenMinutesAhead,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          phoneNumber: true,
        },
      },
    },
  });

  for (const task of upcomingTasks) {
    if (!task.user.phoneNumber) continue;

    const msg = `⏳ *Task Due Soon:*\n"${task.title}" is due at ${formatDateTime(task.dueDate)}!`;
    const sent = await sendText(task.user.phoneNumber, msg);

    if (sent) {
      await prisma.task.update({
        where: { id: task.id },
        data: { isAlerted: true },
      });
      log(`Sent upcoming task alert for "${task.title}" to ${task.user.phoneNumber}`);
    }
  }

  // 2. Overdue tasks (sent once per day)
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      dueDate: {
        lt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          phoneNumber: true,
        },
      },
    },
  });

  for (const task of overdueTasks) {
    if (!task.user.phoneNumber) continue;
    const dedupeKey = `${task.id}|${timeInfo.dateKey}`;
    if (sentOverdueTasks.has(dedupeKey)) continue;

    const msg = `⚠️ *Task Overdue:*\n"${task.title}" was due on ${formatDateTime(task.dueDate)}. Complete it via \`done ${task.title}\`!`;
    const sent = await sendText(task.user.phoneNumber, msg);

    if (sent) {
      sentOverdueTasks.add(dedupeKey);
    }
  }
};

/**
 * Job next-action date reminders (day-of and 3-day notice)
 */
const processJobActionReminders = async (): Promise<void> => {
  const now = new Date();
  const timeInfo = getLocalTimeParts(now);

  const jobsWithActions = await prisma.jobApplication.findMany({
    where: {
      nextActionDate: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          phoneNumber: true,
        },
      },
    },
  });

  for (const job of jobsWithActions) {
    if (!job.user.phoneNumber || !job.nextActionDate) continue;

    const actionInfo = getLocalTimeParts(job.nextActionDate);
    const dedupeKey = `${job.id}|${timeInfo.dateKey}`;
    if (sentJobAlerts.has(dedupeKey)) continue;

    // Day of action
    if (actionInfo.dateKey === timeInfo.dateKey) {
      const msg = `💼 *Job Action Today:*\nFollow-up or milestone due for *${job.companyName}* (${job.role})!`;
      const sent = await sendText(job.user.phoneNumber, msg);
      if (sent) sentJobAlerts.add(dedupeKey);
    }
  }
};

/**
 * Daily digest scheduled at configured time (e.g., 08:00)
 */
const processDailyDigest = async (): Promise<void> => {
  if (!whatsappConfig.dailyDigestAt) return;
  const now = new Date();
  const timeInfo = getLocalTimeParts(now);

  if (timeInfo.time !== whatsappConfig.dailyDigestAt) return;
  if (lastDigestDateKey === timeInfo.dateKey) return;

  const usersWithPhone = await prisma.user.findMany({
    where: {
      phoneNumber: { not: null },
    },
  });

  for (const u of usersWithPhone) {
    if (!u.phoneNumber) continue;

    const pendingCount = await prisma.task.count({
      where: { userId: u.id, status: { not: 'DONE' } },
    });

    const msg = `🌅 *Good Morning, ${u.name}!* Here is your TimeFlow daily digest:\n• You have ${pendingCount} pending task(s).\n• Send \`today\` to see full tasks and alarms for today.`;
    await sendText(u.phoneNumber, msg);
  }

  lastDigestDateKey = timeInfo.dateKey;
};

