"use client";

/**
 * ═══════════════════════════════════════════════════════════════════
 * RESUME UPLOAD — attach a real PDF / DOC / DOCX to an application
 * ═══════════════════════════════════════════════════════════════════
 * The tracker used to accept only a typed file *name*, which is easy to
 * mistype and impossible to reopen later. This field uploads the document
 * itself (drag-and-drop or browse), shows progress, and gives the student
 * Open / Download / Detach actions afterwards.
 *
 * Two exports:
 *   • ResumeFileCard    — read-only view of a stored document (detail modal)
 *   • ResumeUploadField — the dropzone form control (create / edit dialog)
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RESUME_ACCEPT,
  formatFileSize,
  resumeFileKind,
  validateResumeFile,
  type ResumeFile,
} from "@/lib/jobTracker";
import {
  describeResumeError,
  downloadResumeFile,
  openResumeFile,
  uploadResumeFile,
  type ResumeUploadProgress,
} from "@/lib/resumeFiles";

/** Every secondary action shares this look, so the card never turns noisy. */
const ACTION_CLASS =
  "h-8 gap-1.5 border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white";

interface ResumeFileCardProps {
  file: ResumeFile;
  /** Shows a "Detach" action (removes the link, keeps the stored document). */
  onDetach?: () => void;
  /** Shows a "Delete" action that removes the document from storage for good. */
  onDeleteStored?: () => void;
  className?: string;
}

/**
 * A stored resume, rendered as a compact file row.
 * Word documents cannot be previewed by a browser, so for those the primary
 * action becomes Download (and `openResumeFile` falls back to it as well).
 */
export function ResumeFileCard({ file, onDetach, onDeleteStored, className }: ResumeFileCardProps) {
  const [busy, setBusy] = useState<"open" | "download" | null>(null);
  const previewable = file.mimeType === "application/pdf";

  const handleOpen = async () => {
    setBusy("open");
    try {
      const opened = await openResumeFile(file);
      if (!opened) toast.info("Your browser blocked the preview — use Download instead.");
    } catch (error) {
      toast.error(await describeResumeError(error, "Could not open that resume"));
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      await downloadResumeFile(file);
    } catch (error) {
      toast.error(await describeResumeError(error, "Could not download that resume"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3",
        className
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
        <FileText size={15} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white" title={file.fileName}>
          {file.fileName}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="rounded bg-slate-800 px-1 py-px font-bold tracking-wide text-slate-300">
            {resumeFileKind(file.fileName)}
          </span>
          {formatFileSize(file.fileSize)}
          <span aria-hidden>·</span>
          <span>stored</span>
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={ACTION_CLASS}
          onClick={() => void handleOpen()}
          disabled={busy !== null}
          title={previewable ? "Open in a new tab" : "Word files download instead of previewing"}
        >
          {busy === "open" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : previewable ? (
            <Eye size={13} />
          ) : (
            <FileText size={13} />
          )}
          {previewable ? "Open" : "View"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={ACTION_CLASS}
          onClick={() => void handleDownload()}
          disabled={busy !== null}
        >
          {busy === "download" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          Download
        </Button>

        {onDetach && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-slate-800 hover:text-white"
            onClick={onDetach}
            title="Detach this file from the application"
          >
            <X size={13} />
          </Button>
        )}

        {onDeleteStored && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-red-500/10 hover:text-red-300"
            onClick={onDeleteStored}
            title="Delete the stored file permanently"
          >
            <Trash2 size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}

interface ResumeUploadFieldProps {
  /** The document already attached to this application (if any). */
  file: ResumeFile | null;
  /** Called with the stored document once the API has confirmed the upload. */
  onAttach: (file: ResumeFile) => void;
  /** Called when the student detaches the file (the parent decides what to save). */
  onDetach: () => void;
  /** Optional extra action: delete the document from storage for good. */
  onDeleteStored?: () => void;
  /** Set while the surrounding form is submitting. */
  disabled?: boolean;
  /** Small print under the dropzone. */
  hint?: string;
}

/**
 * Dropzone + uploader. Accepts a click, a keyboard activation or a dropped
 * file, validates it locally, then streams it to the API with live progress.
 */
export function ResumeUploadField({
  file,
  onAttach,
  onDetach,
  onDeleteStored,
  disabled = false,
  hint,
}: ResumeUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<ResumeUploadProgress | null>(null);

  const handleFile = async (candidate: File | undefined) => {
    if (!candidate || uploading || disabled) return;

    // Fail fast: bad type or size never becomes a wasted round trip.
    const problem = validateResumeFile(candidate);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    setProgress({ loaded: 0, total: candidate.size, percent: 0 });

    try {
      const stored = await uploadResumeFile(candidate, setProgress);
      onAttach(stored);
      toast.success(`${stored.fileName} uploaded`);
    } catch (error) {
      toast.error(await describeResumeError(error, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
      setProgress(null);
      // Reset the input so picking the same file twice still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Once a document is attached the dropzone is replaced by its file card.
  if (file) {
    return (
      <ResumeFileCard file={file} onDetach={onDetach} onDeleteStored={onDeleteStored} />
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload a resume (PDF, DOC or DOCX)"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-5 text-center transition-colors",
          dragging
            ? "border-blue-500/70 bg-blue-500/10"
            : "border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-900",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin text-blue-400" />
            <p className="text-xs font-semibold text-white">Uploading… {progress?.percent ?? 0}%</p>
            <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
              <UploadCloud size={16} />
            </span>
            <p className="text-xs font-semibold text-white">
              Drop your resume here, or <span className="text-blue-400">browse</span>
            </p>
            <p className="text-[10px] text-slate-500">PDF, DOC or DOCX · up to 8 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <p className="text-[10px] text-slate-600">
        {hint ??
          "The document is stored with this application, so you can reopen exactly what you sent."}
      </p>
    </div>
  );
}
