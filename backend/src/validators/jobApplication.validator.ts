import { z } from 'zod';

/**
 * Job Application Tracker — request validation (Zod v4).
 *
 * Every field the client can send is validated here before it reaches Prisma.
 * The project already depends on Zod (see src/config/env.ts) and the master
 * plan mandates "validate every payload with Zod", so this is the first
 * feature to actually rely on it end-to-end.
 */

/**
 * Mirrors the `JobApplicationStatus` enum in prisma/schema.prisma.
 *
 * NOTE: the order is meaningful — it is the pipeline order used for
 * progression ("next stage") and for the funnel chart. The frontend keeps a
 * mirrored copy in frontend/src/lib/jobTracker.ts because the two apps are
 * separate packages with no shared workspace library.
 */
export const JOB_APPLICATION_STATUSES = [
  'BOOKMARKED',
  'APPLIED',
  'ONLINE_ASSESSMENT',
  'TECHNICAL_INTERVIEW',
  'HR_INTERVIEW',
  'OFFERED',
  'REJECTED',
] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

/** Runtime guard — useful when parsing CSV query params like `?status=APPLIED,OFFERED`. */
export const isJobApplicationStatus = (value: unknown): value is JobApplicationStatus =>
  typeof value === 'string' && (JOB_APPLICATION_STATUSES as readonly string[]).includes(value);

/**
 * A date coming from a browser `<input type="date">` looks like "2026-09-24".
 * We accept any ISO-8601 string, plus "" / null to explicitly clear a date.
 *
 * The transform only normalises; the conversion to a real `Date` happens in
 * the controller via `toDate()` so validation stays side-effect free.
 */
const optionalDateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === undefined || value === null || !Number.isNaN(new Date(value).getTime()), {
    message: 'Must be a valid date (ISO 8601, e.g. 2026-09-24)',
  });

/** Fields the client may set when creating an application. */
export const createJobApplicationSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(120, 'Company name is too long'),
  role: z.string().trim().min(1, 'Role is required').max(120, 'Role is too long'),
  // String or Number is allowed per spec; the controller normalises to String.
  packageCtc: z.union([z.string(), z.number()]).nullish(),
  jobLink: z.string().trim().max(500, 'Job link is too long').nullish(),
  status: z.enum(JOB_APPLICATION_STATUSES).optional(),
  applicationDate: optionalDateString,
  resumeUsed: z.string().trim().max(200, 'Resume reference is too long').nullish(),
  /** Id of an uploaded ResumeFile to attach (ownership re-checked in the controller). */
  resumeFileId: z.string().trim().max(40, 'Invalid resume reference').nullish(),
  studyNotes: z.string().max(20000, 'Study notes are too long').nullish(),
  nextActionDate: optionalDateString,
});

/** Update accepts any subset of the create fields (`PATCH` semantics). */
export const updateJobApplicationSchema = createJobApplicationSchema.partial();

/** Dedicated status-progression payload (used by drag-and-drop on the Kanban board). */
export const updateJobApplicationStatusSchema = z.object({
  status: z.enum(JOB_APPLICATION_STATUSES),
});

/** Query params for the list endpoint: filtering + sorting. */
export const listJobApplicationsQuerySchema = z.object({
  // Single stage ("APPLIED") or CSV ("APPLIED,ONLINE_ASSESSMENT")
  status: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
  sort: z
    .enum(['nextActionDate', 'applicationDate', 'createdAt', 'updatedAt', 'statusUpdatedAt', 'companyName', 'status'])
    .optional(),
  order: z.enum(['asc', 'desc']).optional(),
  /** Only return applications whose nextActionDate falls inside the next N days. */
  upcomingInDays: z.coerce.number().int().min(0).max(365).optional(),
  /** "true" => only applications whose nextActionDate has already passed. */
  overdue: z.enum(['true', 'false']).optional(),
  /** "false" => hide OFFERED / REJECTED to show the active pipeline only. */
  includeClosed: z.enum(['true', 'false']).optional(),
});

export type CreateJobApplicationInput = z.infer<typeof createJobApplicationSchema>;
export type UpdateJobApplicationInput = z.infer<typeof updateJobApplicationSchema>;
export type ListJobApplicationsQuery = z.infer<typeof listJobApplicationsQuerySchema>;

// ──────────────────────────────────────────────────────────────────
// RESUME UPLOAD — real files (PDF / DOC / DOCX), not just a file name
// ──────────────────────────────────────────────────────────────────

/**
 * MIME types a resume may have. Deliberately narrow: a placement portfolio
 * never needs anything else, and an allow-list is the only reliable way to
 * stop someone uploading an executable disguised as a document.
 *
 * `.docx` is the OOXML type; `application/msword` covers the legacy `.doc`
 * files that many college placement cells still hand out.
 */
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type ResumeMimeType = (typeof RESUME_MIME_TYPES)[number];

/** Extensions offered to the browser's file picker (`accept` attribute). */
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

/** 8 MB — generous for a two-page CV, small enough to keep a JSON body sane. */
export const MAX_RESUME_BYTES = 8 * 1024 * 1024;

/**
 * Upper bound for the base64 string: 4 characters per 3 bytes, plus padding
 * and a little slack so the size check (not the string-length check) is what
 * actually rejects an oversized file.
 */
export const MAX_RESUME_BASE64_CHARS = Math.ceil(MAX_RESUME_BYTES / 3) * 4 + 64;

export const isResumeMimeType = (value: unknown): value is ResumeMimeType =>
  typeof value === 'string' && (RESUME_MIME_TYPES as readonly string[]).includes(value);

/** True when the file name ends with one of the accepted extensions. */
export const hasResumeExtension = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return RESUME_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

/**
 * POST /api/job-applications/resumes payload.
 *
 * The bytes travel as plain base64 (no `data:` prefix) because the server is
 * already configured to accept a 50 MB JSON body — that keeps the whole
 * feature free of a multipart parser dependency.
 */
export const uploadResumeSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, 'A file name is required')
    .max(200, 'File name is too long'),
  mimeType: z.enum(RESUME_MIME_TYPES, {
    message: 'Only PDF, DOC or DOCX files are supported',
  }),
  dataBase64: z
    .string()
    .min(1, 'The file appears to be empty')
    .max(MAX_RESUME_BASE64_CHARS, 'That file is larger than the 8 MB limit'),
});

export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
