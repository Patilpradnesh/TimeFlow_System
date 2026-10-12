/**
 * ═══════════════════════════════════════════════════════════════════
 * COMMAND: SEARCH
 * ═══════════════════════════════════════════════════════════════════
 */

import { loadJobs, loadTasks, loadNotes } from '../lib/queries.js';

export const handleSearch = async (userId: string, query: string): Promise<string> => {
  const q = query.trim().toLowerCase();
  if (!q) return '❌ Please provide a keyword to search: `search google`';

  const [jobs, tasks, notes] = await Promise.all([
    loadJobs(userId),
    loadTasks(userId),
    loadNotes(userId),
  ]);

  const matchedJobs = jobs.filter(
    (j) => j.companyName.toLowerCase().includes(q) || j.role.toLowerCase().includes(q)
  );
  const matchedTasks = tasks.filter((t) => t.title.toLowerCase().includes(q));
  const matchedNotes = notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );

  if (!matchedJobs.length && !matchedTasks.length && !matchedNotes.length) {
    return `🔍 No matches found for "${query}".`;
  }

  const lines = [`🔍 *Search Results for "${query}":*`, ''];

  if (matchedJobs.length) {
    lines.push(`💼 *Jobs (${matchedJobs.length}):*`);
    matchedJobs.slice(0, 3).forEach((j) => lines.push(` • ${j.companyName} (${j.role}) [${j.status}]`));
  }

  if (matchedTasks.length) {
    lines.push('', `📝 *Tasks (${matchedTasks.length}):*`);
    matchedTasks.slice(0, 3).forEach((t) => lines.push(` • ${t.title} [${t.status}]`));
  }

  if (matchedNotes.length) {
    lines.push('', `📓 *Notes (${matchedNotes.length}):*`);
    matchedNotes.slice(0, 3).forEach((n) => lines.push(` • ${n.title}`));
  }

  return lines.join('\n');
};
