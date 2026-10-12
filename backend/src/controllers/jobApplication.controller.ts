import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { emitToUser, JOB_APPLICATION_EVENTS } from '../lib/realtime.js';
import { formatZodError } from '../utils/validate.js';
import {
  createJobApplicationSchema,
  updateJobApplicationSchema,
  updateJobApplicationStatusSchema,
  listJobApplicationsQuerySchema,
  uploadResumeSchema,
  isJobApplicationStatus,
  hasResumeExtension,
  MAX_RESUME_BYTES,
  type JobApplicationStatus,
} from '../validators/jobApplication.validator.js';

/**
 * ═══════════════════════════════════════════════════════════════════
 * JOB APPLICATION TRACKER — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════
 * Real-time student placement pipeline.
 *
 * Design rules followed by every handler below:
 *  1. OBJECT-LEVEL AUTHORISATION — every query is scoped by `userId`, so a
 *     crafted id can never touch another student's applications.
 *  2. VALIDATE, THEN WRITE — Zod parses the payload before Prisma sees it.
 *  3. PUSH, DON'T POLL — every mutation emits a socket event to the owner's
 *     room so open tabs stay in sync without refetching.
 *  4. FEED THE BEHAVIOUR ENGINE — creates/status changes also write a
 *     `BehaviorEvent`, so the existing behavioural analytics layer can reason
 *     about placement stress too.
 *
 * NOTE ON STATUS TRANSITIONS: we deliberately do NOT hard-block "backwards"
 * moves. Real placement season is messy — a student may be rejected mid-loop,
 * or re-open a bookmark after reconsidering. The API accepts any valid stage
 * and records every hop in `statusHistory` instead of policing the student.
 */

// ──────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────

/** Normalises any incoming value to a trimmed string, or null when empty. */
const toNullableString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Normalises a validated ISO date string to a Date, or null. */
const toNullableDate = (value: unknown): Date | null => {
  const raw = toNullableString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * One entry of the audit trail stored in `JobApplication.statusHistory`.
 * Declared as a type alias (not an interface) so it is assignable to
 * Prisma's `InputJsonValue` — interfaces do not get implicit index signatures.
 */
type StatusHistoryEntry = {
  status: JobApplicationStatus;
  at: string;
};

/** Safely reads the Json column back into a typed array (it may be legacy/null). */
const readStatusHistory = (value: unknown): StatusHistoryEntry[] =>
  Array.isArray(value) ? (value as StatusHistoryEntry[]) : [];

/** Sort fields that are nullable in the DB — these need NULLS LAST handling. */
const NULLABLE_SORT_FIELDS = new Set(['nextActionDate', 'applicationDate', 'statusUpdatedAt']);

// ──────────────────────────────────────────────────────────────────
// Shared resume-file plumbing
// ──────────────────────────────────────────────────────────────────

/**
 * Columns of `ResumeFile` that are safe to return to the client.
 *
 * `data` (the blob) is intentionally excluded: the board, the table and the
 * detail modal only ever need to *describe* the file, and a listing that
 * pulled every resume's bytes would be enormous. The bytes are streamed by
 * `GET /api/job-applications/resumes/:id`.
 */
const RESUME_META_SELECT: Prisma.ResumeFileSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
};

/** Attaches resume metadata to every application we hand back. */
const RESUME_INCLUDE: Prisma.JobApplicationInclude = {
  resumeFile: { select: RESUME_META_SELECT },
};

/**
 * Resolves a client-supplied `resumeFileId` against the caller's own uploads.
 *
 *   • `undefined` → the field was not part of the payload, so a PATCH must
 *     leave the existing relation untouched.
 *   • `null`      → the field was cleared, or points at a file that is not
 *     this user's (we treat "someone else's id" exactly like "no id": the
 *     row is never linked, so ids cannot be used to probe other accounts).
 *   • object      → a file this user really owns.
 */
const resolveResumeFile = async (
  userId: string,
  value: unknown
): Promise<{ id: string; fileName: string } | null | undefined> => {
  if (value === undefined) return undefined;
  const id = toNullableString(value);
  if (!id) return null;
  return prisma.resumeFile.findFirst({
    where: { id, userId },
    select: { id: true, fileName: true },
  });
};

/** Strips characters that would break a Content-Disposition header or a path. */
const sanitizeFileName = (fileName: string): string =>
  fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 200) || 'resume';

/**
 * Builds an RFC 6266 Content-Disposition value: an ASCII fallback for old
 * clients plus the UTF-8 form, so "resumé_final.pdf" keeps its accents.
 */
const contentDisposition = (fileName: string, download: boolean): string => {
  const safe = sanitizeFileName(fileName);
  const asciiFallback = safe.replace(/[^\x20-\x7e]/g, '_');
  const utf8 = encodeURIComponent(safe);
  return `${download ? 'attachment' : 'inline'}; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
};

/** A resume is previewable in the browser only when it is a PDF. */
const isPreviewable = (mimeType: string): boolean => mimeType === 'application/pdf';

// ──────────────────────────────────────────────────────────────────
// READ — list with filtering + sorting
// ──────────────────────────────────────────────────────────────────

/**
 * GET /api/job-applications
 *
 * Query params:
 *   ?status=APPLIED                   → single stage
 *   ?status=APPLIED,ONLINE_ASSESSMENT → several stages (CSV)
 *   ?search=google                    → matches company, role or resume name
 *   ?sort=nextActionDate&order=asc    → prioritise what to study next
 *   ?upcomingInDays=3                 → "what do I need to do this week?"
 *   ?overdue=true                     → deadlines already missed
 *   ?includeClosed=false              → active pipeline only (no Offer/Rejected)
 */
export const listJobApplications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const parsed = listJobApplicationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: formatZodError(parsed.error),
      });
    }

    const { status, search, sort, order, upcomingInDays, overdue, includeClosed } = parsed.data;

    const where: Prisma.JobApplicationWhereInput = { userId };

    // 1. Stage filter (supports a single value or a CSV list)
    const requestedStatuses = (status ?? '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(isJobApplicationStatus);

    if (requestedStatuses.length > 0) {
      where.status = { in: requestedStatuses };
    } else if (includeClosed === 'false') {
      where.status = { notIn: ['OFFERED', 'REJECTED'] };
    }

    // 2. Free-text search across the fields a student actually remembers
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
        { resumeUsed: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Deadline window
    const now = new Date();
    if (upcomingInDays !== undefined) {
      const horizon = new Date(now.getTime() + upcomingInDays * 24 * 60 * 60 * 1000);
      where.nextActionDate = { gte: now, lte: horizon };
    } else if (overdue === 'true') {
      where.nextActionDate = { lt: now };
    }

    // 4. Ordering — defaults to "what needs my attention soonest"
    const sortField = sort ?? 'nextActionDate';
    const direction: Prisma.SortOrder = order ?? (sortField === 'companyName' ? 'asc' : 'desc');

    const primarySort = NULLABLE_SORT_FIELDS.has(sortField)
      ? { [sortField]: { sort: direction, nulls: 'last' as const } }
      : { [sortField]: direction };

    const applications = await prisma.jobApplication.findMany({
      where,
      // Secondary sort keeps the list stable when many rows share a date
      orderBy: [
        primarySort as Prisma.JobApplicationOrderByWithRelationInput,
        { createdAt: 'desc' },
      ],
      include: RESUME_INCLUDE,
    });

    res.status(200).json(applications);
  } catch (error: any) {
    console.error('List Job Applications Error:', error);
    res.status(500).json({ message: 'Failed to fetch job applications', error: error.message });
  }
};

/**
 * GET /api/job-applications/:id
 * Returns one application with its resume reference and study notes intact.
 */
export const getJobApplicationById = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    const application = await prisma.jobApplication.findFirst({
      where: { id, userId },
      include: RESUME_INCLUDE,
    });
    if (!application) {
      return res.status(404).json({ message: 'Job application not found' });
    }

    res.status(200).json(application);
  } catch (error: any) {
    console.error('Get Job Application Error:', error);
    res.status(500).json({ message: 'Failed to fetch job application', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────

/**
 * POST /api/job-applications
 *
 * Creates an application and seeds the status audit trail.
 * Smart defaults:
 *  - status defaults to BOOKMARKED (a saved opening, not yet applied)
 *  - if the student creates it at a later stage, we assume it was applied today
 */
export const createJobApplication = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const parsed = createJobApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid job application payload',
        errors: formatZodError(parsed.error),
      });
    }

    const data = parsed.data;
    const now = new Date();
    const status = (data.status ?? 'BOOKMARKED') as JobApplicationStatus;

    // An uploaded resume may be attached in the same request. Verifying
    // ownership here means a crafted id can never link somebody else's file,
    // and when the student picks a real file we can default the human-readable
    // "resume used" label to that file's name.
    const resumeFile = await resolveResumeFile(userId, data.resumeFileId);

    const application = await prisma.jobApplication.create({
      data: {
        userId,
        companyName: data.companyName,
        role: data.role,
        packageCtc: toNullableString(data.packageCtc),
        jobLink: toNullableString(data.jobLink),
        status,
        statusUpdatedAt: now,
        statusHistory: [{ status, at: now.toISOString() }] as Prisma.InputJsonValue,
        applicationDate:
          toNullableDate(data.applicationDate) ?? (status === 'BOOKMARKED' ? null : now),
        resumeUsed: toNullableString(data.resumeUsed) ?? resumeFile?.fileName ?? null,
        resumeFileId: resumeFile?.id ?? null,
        studyNotes: toNullableString(data.studyNotes),
        nextActionDate: toNullableDate(data.nextActionDate),
      },
      include: RESUME_INCLUDE,
    });

    // Behavioural integration — the AI/analytics layer reads this same stream.
    await prisma.behaviorEvent.create({
      data: {
        userId,
        type: 'CREATED',
        metadata: {
          source: 'job-application',
          applicationId: application.id,
          companyName: application.companyName,
          status,
        },
      },
    });

    emitToUser(userId, JOB_APPLICATION_EVENTS.CREATED, {
      application,
      message: `${application.companyName} added to your tracker`,
    });

    res.status(201).json(application);
  } catch (error: any) {
    console.error('Create Job Application Error:', error);
    res.status(500).json({ message: 'Failed to create job application', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// UPDATE (partial — PATCH semantics)
// ──────────────────────────────────────────────────────────────────

/**
 * PATCH /api/job-applications/:id
 *
 * Only the keys present in the payload are written, which lets the UI save a
 * single field (e.g. just the study notes) without wiping the rest.
 * If `status` is included here we also append to the audit trail.
 */
export const updateJobApplication = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    const parsed = updateJobApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid job application payload',
        errors: formatZodError(parsed.error),
      });
    }

    // Ownership check first — returns 404 (not 403) so ids cannot be probed.
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: 'Job application not found' });
    }

    const data = parsed.data;
    // NOTE: typed as the *unchecked* variant because `resumeFileId` is a
    // relation scalar, which `JobApplicationUpdateManyMutationInput` prunes.
    // The unchecked shape carries the same scalars plus the foreign key, and
    // `updateMany` accepts either.
    const patch: Prisma.JobApplicationUncheckedUpdateManyInput = {};

    if (data.companyName !== undefined) patch.companyName = data.companyName;
    if (data.role !== undefined) patch.role = data.role;
    if (data.packageCtc !== undefined) patch.packageCtc = toNullableString(data.packageCtc);
    if (data.jobLink !== undefined) patch.jobLink = toNullableString(data.jobLink);
    if (data.resumeUsed !== undefined) patch.resumeUsed = toNullableString(data.resumeUsed);
    if (data.studyNotes !== undefined) patch.studyNotes = toNullableString(data.studyNotes);
    if (data.applicationDate !== undefined) patch.applicationDate = toNullableDate(data.applicationDate);
    if (data.nextActionDate !== undefined) patch.nextActionDate = toNullableDate(data.nextActionDate);

    // Attaching / detaching an uploaded resume. `undefined` means "not sent",
    // so a PATCH that only edits notes never disturbs the attachment.
    const resumeFile = await resolveResumeFile(userId, data.resumeFileId);
    if (resumeFile !== undefined) {
      patch.resumeFileId = resumeFile ? resumeFile.id : null;
      // Keep the display label in step with the real file unless the student
      // typed their own reference on purpose.
      if (resumeFile && data.resumeUsed === undefined) {
        patch.resumeUsed = resumeFile.fileName;
      }
    }

    // Status changed through the generic update? Keep the audit trail consistent.
    if (data.status !== undefined && data.status !== existing.status) {
      applyStatusChange(patch, existing, data.status, data.applicationDate);
    }

    await prisma.jobApplication.updateMany({ where: { id, userId }, data: patch });

    // id already verified as owned by this user, so a unique lookup is safe
    const application = await prisma.jobApplication.findUniqueOrThrow({
      where: { id },
      include: RESUME_INCLUDE,
    });

    emitToUser(userId, JOB_APPLICATION_EVENTS.UPDATED, {
      application,
      previousStatus: existing.status,
      message: `${application.companyName} updated`,
    });

    res.status(200).json(application);
  } catch (error: any) {
    console.error('Update Job Application Error:', error);
    res.status(500).json({ message: 'Failed to update job application', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// STATUS PROGRESSION
// ──────────────────────────────────────────────────────────────────

type ExistingApplication = Awaited<ReturnType<typeof prisma.jobApplication.findFirstOrThrow>>;

/**
 * Mutates `patch` so a status change is always fully recorded:
 *  - the new stage
 *  - `statusUpdatedAt` (lets the UI show "stuck for 12 days")
 *  - `statusHistory` (append-only audit trail powering the timeline UI)
 *  - `applicationDate` auto-fill: moving out of BOOKMARKED means they applied,
 *    so we stamp today unless the client explicitly supplied a date.
 */
const applyStatusChange = (
  patch: Prisma.JobApplicationUpdateManyMutationInput,
  existing: ExistingApplication,
  nextStatus: JobApplicationStatus,
  explicitApplicationDate?: unknown
): void => {
  const now = new Date();

  patch.status = nextStatus;
  patch.statusUpdatedAt = now;
  // Typed as InputJsonArray so the audit trail keeps its shape without casting.
  const history: Prisma.InputJsonArray = [
    ...readStatusHistory(existing.statusHistory),
    { status: nextStatus, at: now.toISOString() },
  ];
  patch.statusHistory = history;

  if (nextStatus !== 'BOOKMARKED' && !existing.applicationDate && explicitApplicationDate === undefined) {
    patch.applicationDate = now;
  }
};

/**
 * PATCH /api/job-applications/:id/status
 *
 * The single, tiny endpoint the Kanban board calls on every drop.
 * Idempotent: dropping a card on the column it already belongs to is a no-op
 * (so we never spam the audit trail with duplicate hops).
 */
export const updateJobApplicationStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    const parsed = updateJobApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid status payload',
        errors: formatZodError(parsed.error),
      });
    }

    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: 'Job application not found' });
    }

    // Same stage -> nothing to record.
    if (existing.status === parsed.data.status) {
      return res.status(200).json(existing);
    }

    const patch: Prisma.JobApplicationUpdateManyMutationInput = {};
    applyStatusChange(patch, existing, parsed.data.status);

    await prisma.jobApplication.updateMany({ where: { id, userId }, data: patch });
    const application = await prisma.jobApplication.findUniqueOrThrow({
      where: { id },
      include: RESUME_INCLUDE,
    });

    await prisma.behaviorEvent.create({
      data: {
        userId,
        type: 'COMPLETED',
        metadata: {
          source: 'job-application',
          applicationId: id,
          companyName: application.companyName,
          from: existing.status,
          to: application.status,
        },
      },
    });

    emitToUser(userId, JOB_APPLICATION_EVENTS.UPDATED, {
      application,
      previousStatus: existing.status,
      message: `${application.companyName}: ${existing.status} → ${application.status}`,
    });

    res.status(200).json(application);
  } catch (error: any) {
    console.error('Update Job Application Status Error:', error);
    res.status(500).json({ message: 'Failed to update application status', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────────────

/**
 * DELETE /api/job-applications/:id
 * Hard delete — placement data is transient by nature and students expect
 * a deleted card to actually disappear from their board.
 */
export const deleteJobApplication = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    // Read first so we can include the company name in the socket payload
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ message: 'Job application not found' });
    }

    await prisma.jobApplication.deleteMany({ where: { id, userId } });

    emitToUser(userId, JOB_APPLICATION_EVENTS.DELETED, {
      id,
      companyName: existing.companyName,
      message: `${existing.companyName} removed from your tracker`,
    });

    res.status(200).json({ message: 'Job application deleted successfully', id });
  } catch (error: any) {
    console.error('Delete Job Application Error:', error);
    res.status(500).json({ message: 'Failed to delete job application', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// ANALYTICS — application funnel
// ──────────────────────────────────────────────────────────────────

/**
 * GET /api/job-applications/stats
 *
 * Powers the "Application Funnel" widget: 50 Applied → 10 Assessments →
 * 3 Interviews → 1 Offer, plus the alert counters the dashboard badges use.
 *
 * ASSUMPTION: a student moves a card FORWARD as they progress, so the current
 * stage implies every earlier stage was passed. Hence "reached assessment" is
 * the count of everything at assessment-or-beyond. This keeps the query at a
 * single GROUP BY instead of replaying the whole status history.
 */
export const getJobApplicationStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const staleBefore = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [total, grouped, upcomingIn3Days, overdue, stale] = await Promise.all([
      prisma.jobApplication.count({ where: { userId } }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      // The alert window that drives the "3 days" badge
      prisma.jobApplication.count({
        where: { userId, nextActionDate: { gte: now, lte: in3Days } },
      }),
      prisma.jobApplication.count({
        where: { userId, nextActionDate: { lt: now } },
      }),
      // Cards that have not moved stage in two weeks — the "chase this up" list
      prisma.jobApplication.count({
        where: {
          userId,
          status: { notIn: ['OFFERED', 'REJECTED'] },
          statusUpdatedAt: { lt: staleBefore },
        },
      }),
    ]);

    // Zero-fill every stage so the funnel always renders all columns
    const funnel: Record<JobApplicationStatus, number> = {
      BOOKMARKED: 0,
      APPLIED: 0,
      ONLINE_ASSESSMENT: 0,
      TECHNICAL_INTERVIEW: 0,
      HR_INTERVIEW: 0,
      OFFERED: 0,
      REJECTED: 0,
    };
    for (const row of grouped) {
      funnel[row.status as JobApplicationStatus] = row._count;
    }

    // Funnel aggregates
    const submitted = total - funnel.BOOKMARKED;
    const reachedAssessment =
      funnel.ONLINE_ASSESSMENT + funnel.TECHNICAL_INTERVIEW + funnel.HR_INTERVIEW + funnel.OFFERED;
    const reachedInterview = funnel.TECHNICAL_INTERVIEW + funnel.HR_INTERVIEW + funnel.OFFERED;

    const percentage = (part: number, whole: number): number =>
      whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

    res.status(200).json({
      total,
      funnel,
      submitted,
      active: total - funnel.OFFERED - funnel.REJECTED,
      upcomingIn3Days,
      overdue,
      staleFor14Days: stale,
      // Conversion rates, rounded to 1 decimal
      conversion: {
        toAssessment: percentage(reachedAssessment, submitted),
        toInterview: percentage(reachedInterview, submitted),
        toOffer: percentage(funnel.OFFERED, submitted),
      },
    });
  } catch (error: any) {
    console.error('Job Application Stats Error:', error);
    res.status(500).json({ message: 'Failed to compute job application stats', error: error.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// RESUME FILES — storing the real document, not just its name
// ──────────────────────────────────────────────────────────────────
//
// The tracker originally only recorded a *file name* ("resume_backend_v2.pdf")
// which is easy to get wrong and impossible to reopen later. These four
// handlers let a student upload the actual PDF / DOC / DOCX, keep it attached
// to the application it was sent to, and reopen it months later.
//
// Storage model: the bytes are kept in Postgres (see the ResumeFile model in
// prisma/schema.prisma) because this project has no object storage and no
// multipart parser dependency. The client sends base64 JSON, which the server
// already accepts up to 50 MB.

/** POST /api/job-applications/resumes — stores one PDF / DOC / DOCX. */
export const uploadResumeFile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const parsed = uploadResumeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: 'Invalid resume upload',
        errors: formatZodError(parsed.error),
      });
    }

    const { fileName, mimeType, dataBase64 } = parsed.data;

    // The MIME type and the extension must agree: a renamed `.exe` would
    // otherwise sail through as `application/pdf`.
    if (!hasResumeExtension(fileName)) {
      return res.status(400).json({ message: 'Only .pdf, .doc and .docx files are supported' });
    }

    // Cheap sanity check before decoding — Buffer.from() hides malformed input.
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(dataBase64)) {
      return res.status(400).json({ message: 'The file could not be read. Please try again.' });
    }

    const buffer = Buffer.from(dataBase64, 'base64');
    if (buffer.byteLength === 0) {
      return res.status(400).json({ message: 'That file is empty' });
    }
    if (buffer.byteLength > MAX_RESUME_BYTES) {
      return res.status(413).json({ message: 'Resumes must be 8 MB or smaller' });
    }

    const resumeFile = await prisma.resumeFile.create({
      data: {
        userId,
        fileName: sanitizeFileName(fileName),
        mimeType,
        fileSize: buffer.byteLength,
        data: buffer,
      },
      select: RESUME_META_SELECT, // never echo the blob back
    });

    res.status(201).json(resumeFile);
  } catch (error: any) {
    console.error('Upload Resume Error:', error);
    res.status(500).json({ message: 'Failed to upload the resume', error: error.message });
  }
};

/**
 * GET /api/job-applications/resumes — the student's resume library, newest
 * first. Metadata only, so this stays cheap no matter how many CVs exist.
 */
export const listResumeFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const resumeFiles = await prisma.resumeFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: RESUME_META_SELECT,
    });

    res.status(200).json(resumeFiles);
  } catch (error: any) {
    console.error('List Resumes Error:', error);
    res.status(500).json({ message: 'Failed to list your resumes', error: error.message });
  }
};

/**
 * GET /api/job-applications/resumes/:id — streams the document.
 *
 * PDFs are served `inline` so clicking "Open" previews them in the browser;
 * Word files (which no browser can render) are always sent as an attachment.
 * `?download=1` forces the save-file dialog for any type.
 */
export const downloadResumeFile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    // Ownership is part of the query, so another student's id simply 404s.
    const resumeFile = await prisma.resumeFile.findFirst({
      where: { id, userId },
      select: { ...RESUME_META_SELECT, data: true },
    });
    if (!resumeFile) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const buffer = Buffer.from(resumeFile.data);
    const forcesDownload =
      req.query.download === '1' || req.query.download === 'true' || !isPreviewable(resumeFile.mimeType);

    res.setHeader('Content-Type', resumeFile.mimeType);
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.setHeader('Content-Disposition', contentDisposition(resumeFile.fileName, forcesDownload));
    // Never let a browser second-guess the declared type.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

    res.status(200).send(buffer);
  } catch (error: any) {
    console.error('Download Resume Error:', error);
    res.status(500).json({ message: 'Failed to download the resume', error: error.message });
  }
};

/**
 * DELETE /api/job-applications/resumes/:id
 *
 * Removes the stored document. Applications that referenced it keep their
 * `resumeUsed` label (the historical "which resume did I send?" answer) but
 * lose the attachment — the relation is `onDelete: SetNull`.
 */
export const deleteResumeFile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    const { count } = await prisma.resumeFile.deleteMany({ where: { id, userId } });
    if (count === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.status(200).json({ message: 'Resume deleted', id });
  } catch (error: any) {
    console.error('Delete Resume Error:', error);
    res.status(500).json({ message: 'Failed to delete the resume', error: error.message });
  }
};
