/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP MESSAGE ROUTER & HANDLER - Part 1
 * ═══════════════════════════════════════════════════════════════════
 */

import { toDigits, log, logError } from './config.js';
import {
  resolveUserByPhone,
  linkAccount,
  unlinkAccount,
  isRateLimited,
  type BotUser,
} from './auth.js';
import { handleHelp } from './commands/help.js';
import {
  handleListJobs,
  handleListTasks,
  handleListAlarms,
  handleListNotes,
  handleListGoals,
  handleTodayDigest,
  handleJobStats,
} from './commands/list.js';
import {
  handleJobDetail,
  handleMoveJob,
  handleEditJob,
  handleGetResume,
} from './commands/jobs.js';
import {
  handleAddJob,
  handleAddTask,
  handleAddAlarm,
  handleAddNote,
  handleAddGoal,
} from './commands/add.js';
import { handleSearch } from './commands/search.js';
import {
  handleDoneTask,
  handleDeleteJob,
  handleDeleteTask,
  handleDeleteAlarm,
  handleToggleAlarm,
  handleDeleteNote,
} from './commands/delete.js';
import { extractErrorMessage } from './lib/api.js';

export interface IncomingMessageLike {
  from: string;
  body: string;
  hasMedia: boolean;
  fromMe: boolean;
  isStatus?: boolean;
  reply(text: string): Promise<unknown>;
  getContact?(): Promise<{ number?: string }>;
}

export const handleIncomingMessage = async (msg: IncomingMessageLike): Promise<void> => {
  if (msg.fromMe || msg.isStatus || msg.from.endsWith('@g.us')) {
    return; // Ignore bot's own messages, status broadcasts, and groups
  }

  let digits = toDigits(msg.from.split('@')[0]);
  if (!digits && msg.getContact) {
    try {
      const contact = await msg.getContact();
      digits = toDigits(contact.number);
    } catch {
      // ignore
    }
  }

  if (!digits) return;

  if (isRateLimited(digits)) {
    log(`Rate-limited message from ${digits}`);
    return;
  }

  const rawBody = (msg.body || '').trim();
  const lower = rawBody.toLowerCase();

  // Public: Help / Greeting
  if (lower === 'hi' || lower === 'hello' || lower === 'start' || lower === 'help' || lower === 'menu') {
    const text = await handleHelp();
    await msg.reply(text);
    return;
  }

  // Public: Account Linking
  if (lower.startsWith('link ')) {
    const parts = rawBody.slice(5).trim().split(/\s+/);
    if (parts.length < 2) {
      await msg.reply('❌ Usage: `link <email> <password>`');
      return;
    }
    const [email, ...pwParts] = parts;
    const res = await linkAccount(digits, email, pwParts.join(' '));
    await msg.reply(res.message);
    return;
  }

  // Account Unlinking
  if (lower === 'unlink') {
    const unlinked = await unlinkAccount(digits);
    if (unlinked) {
      await msg.reply('👋 Your WhatsApp has been unlinked from TimeFlow.');
    } else {
      await msg.reply('ℹ️ This number is not linked to any account.');
    }
    return;
  }

  // Authenticated Context Check
const routeCommand = async (
  user: BotUser,
  digits: string,
  rawBody: string,
  msg: IncomingMessageLike
): Promise<void> => {
  const lower = rawBody.toLowerCase();

  // 1. JOBS
  if (lower === 'jobs') {
    await msg.reply(await handleListJobs(user.id));
    return;
  }
  if (lower.startsWith('jobs ')) {
    const stage = rawBody.slice(5).trim();
    await msg.reply(await handleListJobs(user.id, stage));
    return;
  }
  if (lower.startsWith('job ')) {
    const ref = rawBody.slice(4).trim();
    await msg.reply(await handleJobDetail(user.id, ref));
    return;
  }
  if (lower.startsWith('add job ')) {
    await msg.reply(await handleAddJob(user.id, rawBody.slice(8).trim()));
    return;
  }
  if (lower.startsWith('edit job ')) {
    const rest = rawBody.slice(9).trim();
    const [ref, ...fields] = rest.split('|');
    await msg.reply(await handleEditJob(user.id, ref.trim(), fields.join('|').trim()));
    return;
  }
  if (lower.startsWith('move ')) {
    const [ref, stage] = rawBody.slice(5).trim().split('|');
    if (!stage) {
      await msg.reply('❌ Usage: `move <n|company> | <new stage>` (e.g. `move 1 | OA`)');
      return;
    }
    await msg.reply(await handleMoveJob(user.id, ref.trim(), stage.trim()));
    return;
  }
  if (lower.startsWith('del job ') || lower.startsWith('delete job ')) {
    const ref = rawBody.replace(/^(del job|delete job)\s+/i, '').trim();
    await msg.reply(await handleDeleteJob(user.id, ref));
    return;
  }
  if (lower.startsWith('resume ')) {
    const ref = rawBody.slice(7).trim();
    await msg.reply(await handleGetResume(user.id, digits, ref));
    return;
  }
  if (lower === 'funnel' || lower === 'stats') {
    await msg.reply(await handleJobStats(user.id));
    return;
  }

  // 2. TASKS
  if (lower === 'tasks' || lower === 'todo') {
    await msg.reply(await handleListTasks(user.id, 'todo'));
    return;
  }
  if (lower === 'done') {
    await msg.reply(await handleListTasks(user.id, 'done'));
    return;
  }
  if (lower.startsWith('done ')) {
    const ref = rawBody.slice(5).trim();
    await msg.reply(await handleDoneTask(user.id, ref));
    return;
  }
  if (lower.startsWith('add task ')) {
    await msg.reply(await handleAddTask(user.id, rawBody.slice(9).trim()));
    return;
  }
  if (lower.startsWith('del task ') || lower.startsWith('delete task ')) {
    const ref = rawBody.replace(/^(del task|delete task)\s+/i, '').trim();
    await msg.reply(await handleDeleteTask(user.id, ref));
    return;
  }

  // 3. ALARMS
  if (lower === 'alarms') {
    await msg.reply(await handleListAlarms(user.id));
    return;
  }
  if (lower.startsWith('alarm on ')) {
    await msg.reply(await handleToggleAlarm(user.id, rawBody.slice(9).trim(), true));
    return;
  }
  if (lower.startsWith('alarm off ')) {
    await msg.reply(await handleToggleAlarm(user.id, rawBody.slice(10).trim(), false));
    return;
  }
  if (lower.startsWith('del alarm ') || lower.startsWith('delete alarm ')) {
    const ref = rawBody.replace(/^(del alarm|delete alarm)\s+/i, '').trim();
    await msg.reply(await handleDeleteAlarm(user.id, ref));
    return;
  }
  if (lower.startsWith('alarm ') || lower.startsWith('add alarm ')) {
    const rest = rawBody.replace(/^(add alarm|alarm)\s+/i, '').trim();
    await msg.reply(await handleAddAlarm(user.id, rest));
    return;
  }

  // 4. NOTES & GOALS
  if (lower === 'notes') {
    await msg.reply(await handleListNotes(user.id));
    return;
  }
  if (lower.startsWith('add note ')) {
    await msg.reply(await handleAddNote(user.id, rawBody.slice(9).trim()));
    return;
  }
  if (lower.startsWith('del note ') || lower.startsWith('delete note ')) {
    const ref = rawBody.replace(/^(del note|delete note)\s+/i, '').trim();
    await msg.reply(await handleDeleteNote(user.id, ref));
    return;
  }
  if (lower === 'goals') {
    await msg.reply(await handleListGoals(user.id));
    return;
  }
  if (lower.startsWith('add goal ')) {
    await msg.reply(await handleAddGoal(user.id, rawBody.slice(9).trim()));
    return;
  }

  // 5. DIGEST & SEARCH
  if (lower === 'today' || lower === 'overview' || lower === 'due') {
    await msg.reply(await handleTodayDigest(user.id));
    return;
  }
  if (lower.startsWith('search ') || lower.startsWith('find ')) {
    const q = rawBody.replace(/^(search|find)\s+/i, '').trim();
    await msg.reply(await handleSearch(user.id, q));
    return;
  }

  await msg.reply('❓ Unknown command. Type `help` to see the available list of commands.');
};

  const user = await resolveUserByPhone(digits);
  if (!user) {
    await msg.reply(
      '🔒 You are not authenticated with TimeFlow.\n\nPlease link your account using:\n`link <email> <password>`\n\nOr send `help` for general commands.'
    );
    return;
  }

  // Profile check
  if (lower === 'whoami') {
    await msg.reply(`👤 *Linked Profile:*\n• Name: ${user.name}\n• Email: ${user.email}\n• Phone: ${digits}`);
    return;
  }

  try {
    await routeCommand(user, digits, rawBody, msg);
  } catch (err) {
    logError(`Error processing command "${rawBody}" from ${digits}:`, err);
    await msg.reply(`⚠️ Error: ${extractErrorMessage(err)}`);
  }
};
