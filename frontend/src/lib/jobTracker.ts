/**
 * ═══════════════════════════════════════════════════════════════════
 * JOB APPLICATION TRACKER — shared frontend model
 * ═══════════════════════════════════════════════════════════════════
 * Single source of truth for:
 *   • the ordered pipeline stages (mirrors the JobApplicationStatus enum)
 *   • per-stage presentation (label, colours, emoji)
 *   • the TypeScript shapes returned by /api/job-applications
 *   • date helpers that power the "next action in 3 days" alert badges
 *
 * Keeping all of this in one file means the Kanban board, the table, the
 * detail modal and the funnel chart can never drift out of sync.
 */

// ──────────────────────────────────────────────────────────────────
// Pipeline stages
// ──────────────────────────────────────────────────────────────────

export type JobApplicationStatus =
  | 'BOOKMARKED'
  | 'APPLIED'
  | 'ONLINE_ASSESSMENT'
  | 'TECHNICAL_INTERVIEW'
  | 'HR_INTERVIEW'
  | 'OFFERED'
  | 'REJECTED';

export interface JobStatusMeta {
  value: JobApplicationStatus;
  label: string;
  /** Short label for the tight Kanban column headers. */
  short: string;
  emoji: string;
  /** Tailwind classes — badge/dot/border are tuned for the app's dark UI. */
  badgeClass: string;
  dotClass: string;
  columnClass: string;
  hint: string;
}

/**
 * Ordered exactly like the enum in prisma/schema.prisma: index 0 is the
 * earliest stage. REJECTED is intentionally last (it is a terminal state, not
 * a progression stage) — use `PROGRESSION_ORDER` when computing "next stage".
 */
export const JOB_STATUS_META: JobStatusMeta[] = [
  {
    value: 'BOOKMARKED',
    label: 'Bookmarked',
    short: 'Saved',
    emoji: '🔖',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dotClass: 'bg-slate-400',
    columnClass: 'border-slate-800',
    hint: 'Saved opening — not applied yet.',
  },
  {
    value: 'APPLIED',
    label: 'Applied',
    short: 'Applied',
    emoji: '📨',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-500',
    columnClass: 'border-blue-500/40',
    hint: 'Application submitted. Track the resume version you used.',
  },
  {
    value: 'ONLINE_ASSESSMENT',
    label: 'Online Assessment',
    short: 'OA',
    emoji: '💻',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dotClass: 'bg-violet-500',
    columnClass: 'border-violet-500/40',
    hint: 'Coding test / aptitude round scheduled.',
  },
  {
    value: 'TECHNICAL_INTERVIEW',
    label: 'Technical Interview',
    short: 'Tech',
    emoji: '🛠️',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-500',
    columnClass: 'border-amber-500/40',
    hint: 'DSA / system design / core subject rounds.',
  },
  {
    value: 'HR_INTERVIEW',
    label: 'HR Interview',
    short: 'HR',
    emoji: '🤝',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    dotClass: 'bg-fuchsia-500',
    columnClass: 'border-fuchsia-500/40',
    hint: 'Behavioural & culture-fit round.',
  },
  {
    value: 'OFFERED',
    label: 'Offered',
    short: 'Offer',
    emoji: '🏆',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
    columnClass: 'border-emerald-500/50',
    hint: 'Offer received. 🎉',
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    short: 'Closed',
    emoji: '🚫',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
    dotClass: 'bg-red-500',
    columnClass: 'border-red-500/40',
    hint: 'Closed out. Keep the notes — they help next time.',
  },
];

/** Stage order used for "next stage" / "previous stage" progression (excludes REJECTED). */
export const PROGRESSION_ORDER: JobApplicationStatus[] = [
  'BOOKMARKED',
  'APPLIED',
  'ONLINE_ASSESSMENT',
  'TECHNICAL_INTERVIEW',
  'HR_INTERVIEW',
  'OFFERED',
];

/** Stages that mean the process is finished. */
export const CLOSED_STATUSES: JobApplicationStatus[] = ['OFFERED', 'REJECTED'];

export const getStatusMeta = (status: JobApplicationStatus): JobStatusMeta =>
  JOB_STATUS_META.find((meta) => meta.value === status) ?? JOB_STATUS_META[0];

/** The stage a student would normally move to next (null at the end / closed). */
export const getNextStatus = (status: JobApplicationStatus): JobApplicationStatus | null => {
  const index = PROGRESSION_ORDER.indexOf(status);
  if (index === -1 || index === PROGRESSION_ORDER.length - 1) return null;
  return PROGRESSION_ORDER[index + 1];
};

/** The previous stage (null when already at the start / closed). */
export const getPreviousStatus = (status: JobApplicationStatus): JobApplicationStatus | null => {
  const index = PROGRESSION_ORDER.indexOf(status);
  if (index <= 0) return null;
  return PROGRESSION_ORDER[index - 1];
};

export const isClosedStatus = (status: JobApplicationStatus): boolean =>
  CLOSED_STATUSES.includes(status);

/** Stages shown while filtering, in a friendly grouping for the filter dropdown. */
export const ACTIVE_PIPELINE_STATUSES = PROGRESSION_ORDER.filter(
  (status) => status !== 'BOOKMARKED',
);

// ──────────────────────────────────────────────────────────────────
// API shapes — these mirror the Prisma model field-for-field
// ──────────────────────────────────────────────────────────────────

/** One hop in the status audit trail (`statusHistory` Json column). */
export interface JobStatusHistoryEntry {
  status: JobApplicationStatus;
  /** ISO timestamp */
  at: string;
}

/**
 * Metadata for an uploaded resume document (PDF / DOC / DOCX).
 * Mirrors the `ResumeFile` model; the bytes themselves are never sent to the
 * browser in a listing — they are streamed by
 * GET /api/job-applications/resumes/:id.
 */
export interface ResumeFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  companyName: string;
  role: string;
  /** Free-form: "12 LPA", "18 LPA + ESOP" */
  packageCtc: string | null;
  jobLink: string | null;
  status: JobApplicationStatus;
  statusUpdatedAt: string | null;
  statusHistory: JobStatusHistoryEntry[];
  applicationDate: string | null;
  resumeUsed: string | null;
  /** The stored document behind `resumeUsed`, when one was uploaded. */
  resumeFileId: string | null;
  resumeFile?: ResumeFile | null;
  /** Markdown text — rendered by lib/markdown.ts */
  studyNotes: string | null;
  nextActionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted by POST/PATCH /api/job-applications */
export interface JobApplicationInput {
  companyName: string;
  role: string;
  packageCtc?: string | null;
  jobLink?: string | null;
  status?: JobApplicationStatus;
  applicationDate?: string | null;
  resumeUsed?: string | null;
  /** Id returned by POST /api/job-applications/resumes. */
  resumeFileId?: string | null;
  studyNotes?: string | null;
  nextActionDate?: string | null;
}

/** Response of GET /api/job-applications/stats */
export interface JobApplicationStats {
  total: number;
  funnel: Record<JobApplicationStatus, number>;
  submitted: number;
  active: number;
  upcomingIn3Days: number;
  overdue: number;
  staleFor14Days: number;
  conversion: {
    toAssessment: number;
    toInterview: number;
    toOffer: number;
  };
}

// ──────────────────────────────────────────────────────────────────
// Date helpers — these drive the alert badges
// ──────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'none' | 'overdue' | 'today' | 'soon' | 'upcoming';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Anything inside this window gets a visual alert badge. */
export const ALERT_WINDOW_DAYS = 3;

/** Whole days from today to `date` (negative = in the past). Rounded down. */
export const daysUntil = (date: string | null): number | null => {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);

  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / DAY_MS);
};

/**
 * Classifies a next-action date for the UI:
 *   overdue  → red, "3 days late"
 *   today    → amber, "today"
 *   soon     → amber, "in 2 days"   (inside the 3-day alert window)
 *   upcoming → neutral date
 */
export const getUrgency = (date: string | null): UrgencyLevel => {
  const days = daysUntil(date);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= ALERT_WINDOW_DAYS) return 'soon';
  return 'upcoming';
};

/** True when the badge should be visible (<= 3 days away or already late). */
export const needsAttention = (date: string | null): boolean => {
  const urgency = getUrgency(date);
  return urgency === 'overdue' || urgency === 'today' || urgency === 'soon';
};

/** Human sentence for a next-action date: "in 2 days", "3 days late", "today". */
export const describeDeadline = (date: string | null): string => {
  const days = daysUntil(date);
  if (days === null) return 'No upcoming action';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  return `In ${days} days`;
};

/** Alert styling per urgency level (badge background + text). */
export const URGENCY_CLASS: Record<UrgencyLevel, string> = {
  none: 'bg-slate-800/60 text-slate-400 border-slate-700',
  overdue: 'bg-red-500/15 text-red-300 border-red-500/40',
  today: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  soon: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  upcoming: 'bg-slate-800/60 text-slate-300 border-slate-700',
};

/** "24 Sep 2026" — compact, locale-independent enough for a dashboard. */
export const formatDate = (date: string | null): string => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "24 Sep, 14:30" — used in the status timeline. */
export const formatDateTime = (date: string | null): string => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Converts an ISO string into the "yyyy-MM-dd" format required by
 * `<input type="date">` values.
 */
export const toDateInputValue = (date: string | null): string => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
};

/** Days a card has sat in its current stage — powers the "stuck" hint. */
export const daysInCurrentStage = (statusUpdatedAt: string | null): number | null => {
  if (!statusUpdatedAt) return null;
  return daysUntil(statusUpdatedAt) === null ? null : Math.abs(daysUntil(statusUpdatedAt)!);
};

// ──────────────────────────────────────────────────────────────────
// Resume files — limits shared by the upload field and the API client
// ──────────────────────────────────────────────────────────────────

/** Files a student may attach as a resume. */
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

/** Kept in step with RESUME_MIME_TYPES / MAX_RESUME_BYTES in the Zod validator. */
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/**
 * `accept` for the resume file picker. The MIME list matters as much as the
 * extensions: some browsers will hide a file whose reported type is not listed.
 */
export const RESUME_ACCEPT = [...RESUME_EXTENSIONS, ...RESUME_MIME_TYPES].join(',');

/** Rejected on the client so an 8 MB mistake never becomes an 11 MB upload. */
export const MAX_RESUME_BYTES = 8 * 1024 * 1024;

/** "238 KB", "1.4 MB" — sized for the file chip, not for a spreadsheet. */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
};

/** "PDF" / "DOC" / "DOCX" — the badge on the attached-file chip. */
export const resumeFileKind = (fileName: string): string => {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1);
  return extension ? extension.toUpperCase() : 'FILE';
};

/**
 * Client-side guard run before a byte is uploaded.
 *
 * Returns a human-readable problem, or `null` when the file is acceptable.
 * The backend repeats every one of these checks — this exists purely so the
 * student gets feedback instantly instead of after a failed round trip.
 */
export const validateResumeFile = (file: File): string | null => {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = RESUME_EXTENSIONS.some((extension) => lowerName.endsWith(extension));

  if (!hasAllowedExtension) {
    return 'That file type is not supported. Upload a PDF, DOC or DOCX.';
  }

  // Some browsers report an empty type for .doc / .docx; only reject a type
  // that is present *and* wrong.
  if (file.type && !(RESUME_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'That file type is not supported. Upload a PDF, DOC or DOCX.';
  }

  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_RESUME_BYTES) {
    return `That file is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_RESUME_BYTES)}.`;
  }

  return null;
};

/** True when this application has a stored document (not just a file name). */
export const hasResumeFile = (
  application: Pick<JobApplication, 'resumeFileId' | 'resumeFile'>
): boolean => Boolean(application.resumeFileId ?? application.resumeFile?.id);
