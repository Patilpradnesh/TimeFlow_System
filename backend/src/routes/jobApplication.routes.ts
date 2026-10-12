import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  listJobApplications,
  getJobApplicationStats,
  getJobApplicationById,
  createJobApplication,
  updateJobApplication,
  updateJobApplicationStatus,
  deleteJobApplication,
  uploadResumeFile,
  listResumeFiles,
  downloadResumeFile,
  deleteResumeFile,
} from '../controllers/jobApplication.controller.js';

/**
 * Job Application Tracker routes — mounted at /api/job-applications
 * (see src/server.ts). Every route is protected by the JWT middleware, and
 * every handler additionally scopes its queries by the authenticated userId.
 */
const router = Router();

router.use(protect);

/**
 * ORDER MATTERS: static segments must be registered before `/:id`,
 * otherwise Express would interpret "stats" as an application id.
 */
router.get('/stats', getJobApplicationStats);

/**
 * Resume files (real PDF / DOC / DOCX uploads).
 *
 * Registered BEFORE `/:id` for the same reason as `/stats`: otherwise
 * Express would read "resumes" as an application id.
 *   GET    /resumes        → the student's resume library (metadata only)
 *   POST   /resumes        → upload one document (base64 JSON)
 *   GET    /resumes/:id    → stream / download it (ownership enforced)
 *   DELETE /resumes/:id    → remove it
 */
router.get('/resumes', listResumeFiles);
router.post('/resumes', uploadResumeFile);
router.get('/resumes/:id', downloadResumeFile);
router.delete('/resumes/:id', deleteResumeFile);

// CRUD
router.get('/', listJobApplications);
router.post('/', createJobApplication);
router.get('/:id', getJobApplicationById);
router.patch('/:id', updateJobApplication);
router.delete('/:id', deleteJobApplication);

// Status progression (used by the Kanban drag-and-drop board)
router.patch('/:id/status', updateJobApplicationStatus);

export default router;
