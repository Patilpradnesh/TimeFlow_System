"use client";

/**
 * ═══════════════════════════════════════════════════════════════════
 * RESUME FILES — browser side of the upload / download round trip
 * ═══════════════════════════════════════════════════════════════════
 * Endpoints (see backend/src/routes/jobApplication.routes.ts):
 *   POST   /api/job-applications/resumes        → store a PDF / DOC / DOCX
 *   GET    /api/job-applications/resumes        → the resume library
 *   GET    /api/job-applications/resumes/:id    → stream the document
 *   DELETE /api/job-applications/resumes/:id    → remove it
 *
 * Two deliberate implementation choices:
 *
 * 1. UPLOAD AS BASE64 JSON, NOT MULTIPART. The backend is a dependency-light
 *    Express app with no multipart parser, and it already accepts a 50 MB JSON
 *    body. A FileReader round trip is the smallest possible change that still
 *    uploads the *real* bytes, and it behaves identically in every browser.
 *
 * 2. DOWNLOADS GO THROUGH AXIOS, NOT A BARE <a href>. The API is protected by
 *    a Bearer token that lives in localStorage; a plain link would send no
 *    Authorization header and always 401. Fetching a Blob lets the existing
 *    axios interceptor authenticate the request, and the Blob URL is revoked
 *    afterwards so nothing leaks into the page's memory.
 */

import api from "@/lib/api";
import { MAX_RESUME_BYTES, type ResumeFile } from "@/lib/jobTracker";

export interface ResumeUploadProgress {
  loaded: number;
  total: number;
  /** 0–100, clamped just below 100 until the server has confirmed the upload. */
  percent: number;
}

/** Reads a File into a plain base64 string (the `data:` prefix is stripped). */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read. Please try again."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.readAsDataURL(file);
  });

/**
 * The backend validates the MIME type against an allow list, and some browsers
 * report an empty string for `.doc` / `.docx`. Deriving it from the extension
 * keeps a legitimate Word upload from being rejected.
 */
export const resolveResumeMimeType = (file: File): string => {
  if (file.type) return file.type;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/msword";
};

/**
 * Uploads one resume document and resolves with its stored metadata.
 * Errors are left to the caller so it can toast a message; use
 * `describeResumeError` to turn the Axios error into something human.
 */
export const uploadResumeFile = async (
  file: File,
  onProgress?: (progress: ResumeUploadProgress) => void
): Promise<ResumeFile> => {
  const dataBase64 = await fileToBase64(file);

  const { data } = await api.post<ResumeFile>(
    "/job-applications/resumes",
    {
      fileName: file.name,
      mimeType: resolveResumeMimeType(file),
      dataBase64,
    },
    {
      // base64 inflates the body by ~33%, so the server's 8 MB limit still
      // binds on the real (decoded) size — see MAX_RESUME_BYTES.
      maxBodyLength: Math.ceil(MAX_RESUME_BYTES / 3) * 4 + 1024 * 1024,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        const total = event.total ?? 0;
        const loaded = event.loaded ?? 0;
        onProgress({
          loaded,
          total,
          percent: total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0,
        });
      },
    }
  );

  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
  return data;
};

/** Streams a stored resume out of the API (the interceptor adds the JWT). */
export const fetchResumeBlob = async (
  id: string,
  options: { download?: boolean } = {}
): Promise<Blob> => {
  const { data } = await api.get<Blob>(`/job-applications/resumes/${id}`, {
    params: options.download ? { download: "1" } : undefined,
    responseType: "blob",
  });
  return data;
};

/** Saves the document to the student's machine with its original name. */
export const downloadResumeFile = async (
  resume: Pick<ResumeFile, "id" | "fileName">
): Promise<void> => {
  const blob = await fetchResumeBlob(resume.id, { download: true });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = resume.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser a moment to start the download, then free the memory.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/**
 * Previews the document in a new tab. Only PDFs can be rendered by a browser,
 * so a Word file falls back to a normal download.
 *
 * Returns `false` when the tab was blocked, so the caller can point the student
 * at the download button instead of silently doing nothing.
 */
export const openResumeFile = async (
  resume: Pick<ResumeFile, "id" | "fileName" | "mimeType">
): Promise<boolean> => {
  if (resume.mimeType !== "application/pdf") {
    await downloadResumeFile(resume);
    return true;
  }

  const blob = await fetchResumeBlob(resume.id);
  const url = URL.createObjectURL(blob);

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }

  // The new tab owns the URL now; keep it alive long enough for the PDF viewer.
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return true;
};

/** Removes a stored document. Applications keep their historical label. */
export const deleteResumeFile = async (id: string): Promise<void> => {
  await api.delete(`/job-applications/resumes/${id}`);
};

/**
 * Turns an Axios failure into one readable sentence.
 *
 * Error bodies arrive as JSON for the upload endpoints and as a Blob for the
 * streaming ones — both shapes are handled so the student never sees
 * "Request failed with status code 400".
 */
export const describeResumeError = async (error: unknown, fallback: string): Promise<string> => {
  const payload = (error as { response?: { data?: unknown } } | undefined)?.response?.data;

  const readBody = (body: unknown): string | null => {
    if (!body || typeof body !== "object") return null;
    const typed = body as { message?: string; errors?: Record<string, string> };
    const firstFieldError = typed.errors ? Object.values(typed.errors)[0] : undefined;
    return firstFieldError ?? typed.message ?? null;
  };

  if (typeof Blob !== "undefined" && payload instanceof Blob) {
    try {
      return readBody(JSON.parse(await payload.text())) ?? fallback;
    } catch {
      return fallback;
    }
  }

  return readBody(payload) ?? fallback;
};
