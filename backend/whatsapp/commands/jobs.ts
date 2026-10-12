/**
 * ═══════════════════════════════════════════════════════════════════
 * COMMAND: JOBS (Detail, Move, Edit, Resume)
 * ═══════════════════════════════════════════════════════════════════
 */

import { api } from '../lib/api.js';
import { loadJobs, resolveByRef, type JobAppSummary } from '../lib/queries.js';
import { STATUS_META, normalizeStatus, formatDateOnly, parseWhen } from '../lib/format.js';
import { sendDocument } from '../lib/sender.js';

export const handleJobDetail = async (userId: string, ref: string): Promise<string> => {
  const jobs = await loadJobs(userId);
  const match = resolveByRef(jobs, ref, (j) => j.companyName);

  if (!match) return `❌ No application found matching "${ref}".`;
  const j = match.item;
  const meta = STATUS_META[j.status as keyof typeof STATUS_META] || { emoji: '📌', label: j.status };

  return [
    `💼 *${j.companyName}* — ${j.role}`,
    '',
    `Status: ${meta.emoji} *${meta.label}*`,
    `CTC: ${j.packageCtc || 'Not specified'}`,
    `Applied: ${formatDateOnly(j.applicationDate)}`,
    `Next Action: ${formatDateOnly(j.nextActionDate)}`,
    `Resume Attached: ${j.resumeUsed || (j.resumeFileId ? 'Yes' : 'None')}`,
    j.studyNotes ? `Notes: ${j.studyNotes}` : '',
  ].filter(Boolean).join('\n');
};

export const handleMoveJob = async (userId: string, ref: string, newStage: string): Promise<string> => {
  const norm = normalizeStatus(newStage);
  if (!norm) {
    return `❌ Unknown stage "${newStage}". Valid stages: Applied, OA, Tech, HR, Offered, Rejected, Bookmarked.`;
  }

  const jobs = await loadJobs(userId);
  const match = resolveByRef(jobs, ref, (j) => j.companyName);
  if (!match) return `❌ No application found matching "${ref}".`;

  await api.patch(userId, `/job-applications/${match.item.id}/status`, { status: norm });
  const meta = STATUS_META[norm];
  return `✅ Moved *${match.item.companyName}* to ${meta.emoji} *${meta.label}*.`;
};

export const handleEditJob = async (userId: string, ref: string, fieldsRaw: string): Promise<string> => {
  const jobs = await loadJobs(userId);
  const match = resolveByRef(jobs, ref, (j) => j.companyName);
  if (!match) return `❌ No application found matching "${ref}".`;

  const pairs = fieldsRaw.split(',').map((p) => p.trim());
  const patchData: Record<string, unknown> = {};

  for (const pair of pairs) {
    const [keyRaw, ...valParts] = pair.split('=');
    const key = keyRaw?.trim().toLowerCase();
    const val = valParts.join('=').trim();
    if (!key || !val) continue;

    if (key === 'role') patchData.role = val;
    else if (key === 'ctc' || key === 'package') patchData.packageCtc = val;
    else if (key === 'notes' || key === 'note') patchData.studyNotes = val;
    else if (key === 'link') patchData.jobLink = val;
    else if (key === 'next' || key === 'action') {
      const parsedDate = parseWhen(val);
      if (parsedDate) patchData.nextActionDate = parsedDate.toISOString();
    }
  }

  if (Object.keys(patchData).length === 0) {
    return '❌ No valid fields to update. Example: `edit job 1 | ctc=15 LPA, next=tomorrow`';
  }

  await api.patch(userId, `/job-applications/${match.item.id}`, patchData);
  return `✅ Updated *${match.item.companyName}* successfully.`;
};

export const handleGetResume = async (userId: string, phone: string, ref: string): Promise<string> => {
  const jobs = await loadJobs(userId);
  const match = resolveByRef(jobs, ref, (j) => j.companyName);
  if (!match) return `❌ No application found matching "${ref}".`;

  const j = match.item;
  if (!j.resumeFileId) {
    return `📄 *${j.companyName}* has no resume file uploaded.`;
  }

  try {
    const { buffer, mimeType } = await api.downloadBuffer(userId, `/job-applications/resumes/${j.resumeFileId}`);
    const fileName = j.resumeUsed || `${j.companyName}_Resume.pdf`;
    await sendDocument(phone, {
      buffer,
      fileName,
      mimeType,
      caption: `📄 Resume for *${j.companyName}*`,
    });
    return `📄 Sent resume for *${j.companyName}*.`;
  } catch {
    return `❌ Could not retrieve resume for *${j.companyName}*.`;
  }
};
