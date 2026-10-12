"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  IndianRupee,
  Loader2,
  Paperclip,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { JobStudyNotes } from "@/components/jobs/JobStudyNotes";
import { JobStatusTimeline } from "@/components/jobs/JobStatusTimeline";
import { ResumeUploadField } from "@/components/jobs/ResumeUploadField";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { deleteResumeFile, describeResumeError } from "@/lib/resumeFiles";
import {
  JOB_STATUS_META,
  URGENCY_CLASS,
  describeDeadline,
  formatDate,
  formatDateTime,
  getNextStatus,
  getPreviousStatus,
  getStatusMeta,
  getUrgency,
  toDateInputValue,
  type JobApplication,
  type JobApplicationInput,
  type JobApplicationStatus,
  type ResumeFile,
} from "@/lib/jobTracker";

interface JobDetailModalProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (
    id: string,
    patch: Partial<JobApplicationInput>,
    successMessage?: string
  ) => Promise<boolean>;
  onChangeStatus: (id: string, status: JobApplicationStatus) => Promise<unknown>;
  onDelete: (application: JobApplication) => void;
  onEdit: (application: JobApplication) => void;
}

const FIELD_LABEL = "text-[10px] font-bold uppercase tracking-widest text-slate-500";

/**
 * Full detail view for one application.
 *
 * Answers the three questions a student actually has mid-placement-season:
 *   1. What stage is this company at, and what is the next one?
 *   2. Which resume version did I send them?
 *   3. What do I need to study before the next round?
 */
export function JobDetailModal({
  application,
  open,
  onOpenChange,
  onUpdate,
  onChangeStatus,
  onDelete,
  onEdit,
}: JobDetailModalProps) {
  // Inline-editable fields keep their own draft state so typing does not fire requests.
  const [resumeDraft, setResumeDraft] = useState("");
  const [nextActionDraft, setNextActionDraft] = useState("");
  const [savingField, setSavingField] = useState<"resume" | "nextAction" | null>(null);

  useEffect(() => {
    if (!application) return;
    setResumeDraft(application.resumeUsed ?? "");
    setNextActionDraft(toDateInputValue(application.nextActionDate));
  }, [application]);

  if (!application) return null;

  const meta = getStatusMeta(application.status);
  const urgency = getUrgency(application.nextActionDate);
  const nextStatus = getNextStatus(application.status);
  const previousStatus = getPreviousStatus(application.status);

  const resumeChanged = resumeDraft.trim() !== (application.resumeUsed ?? "");
  const nextActionChanged = nextActionDraft !== toDateInputValue(application.nextActionDate);

  const saveResume = async () => {
    setSavingField("resume");
    await onUpdate(
      application.id,
      { resumeUsed: resumeDraft.trim() || null },
      "Resume version saved"
    );
    setSavingField(null);
  };

  /** Links a freshly uploaded document to this application. */
  const attachStoredResume = async (file: ResumeFile) => {
    setSavingField("resume");
    await onUpdate(
      application.id,
      { resumeFileId: file.id, resumeUsed: file.fileName },
      "Resume attached"
    );
    setSavingField(null);
  };

  /** Unlinks the document but keeps the historical "which resume" label. */
  const detachStoredResume = async () => {
    setSavingField("resume");
    await onUpdate(application.id, { resumeFileId: null }, "Resume detached");
    setSavingField(null);
  };

  /**
   * Removes the document from storage for good. Destructive and irreversible,
   * so it is confirmed first — the point of the feature is that the file can
   * still be reopened, and that promise should not be broken by a mis-click.
   */
  const destroyStoredResume = async () => {
    const stored = application.resumeFile;
    if (!stored) return;

    const confirmed = window.confirm(
      `Delete the stored file "${stored.fileName}"?\n\nIt is removed from the server. Applications that used it keep the file name but lose the attachment.`
    );
    if (!confirmed) return;

    setSavingField("resume");
    try {
      await deleteResumeFile(stored.id);
      await onUpdate(application.id, { resumeFileId: null }, "Stored resume deleted");
    } catch (error) {
      toast.error(await describeResumeError(error, "Could not delete that resume"));
    } finally {
      setSavingField(null);
    }
  };

  const saveNextAction = async () => {
    setSavingField("nextAction");
    await onUpdate(
      application.id,
      { nextActionDate: nextActionDraft || null },
      "Next action updated"
    );
    setSavingField(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-800 bg-slate-900 p-0 sm:max-w-3xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <DialogHeader className="border-b border-slate-800 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
                <BriefcaseBusiness size={20} className="shrink-0 text-blue-400" />
                <span className="truncate">{application.companyName}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span>{application.role}</span>
                {application.packageCtc && (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <IndianRupee size={11} />
                    {application.packageCtc}
                  </span>
                )}
                {application.jobLink && (
                  <a
                    href={application.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink size={11} />
                    Job posting
                  </a>
                )}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 pr-8">
              <JobStatusBadge status={application.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(application)}
                className="border-slate-700 bg-slate-950 text-slate-300"
              >
                <Pencil size={13} />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Status progression ─────────────────────────────────── */}
        <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-4">
          <p className={cn(FIELD_LABEL, "mb-2")}>Move to stage</p>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct stage selector */}
            <Select
              value={application.status}
              onValueChange={(value) =>
                void onChangeStatus(application.id, value as JobApplicationStatus)
              }
            >
              <SelectTrigger className="h-9 w-52 border-slate-700 bg-slate-950 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-white">
                {JOB_STATUS_META.map((statusMeta) => (
                  <SelectItem key={statusMeta.value} value={statusMeta.value}>
                    {statusMeta.emoji} {statusMeta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* One-click previous stage */}
            {previousStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onChangeStatus(application.id, previousStatus)}
                className="border-slate-700 bg-slate-950 text-slate-300"
                title={`Move back to ${getStatusMeta(previousStatus).label}`}
              >
                <ArrowLeft size={13} />
                {getStatusMeta(previousStatus).short}
              </Button>
            )}

            {/* One-click next stage — the action students use most */}
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => void onChangeStatus(application.id, nextStatus)}
                className="bg-blue-600 text-white hover:bg-blue-500"
                title={`Advance to ${getStatusMeta(nextStatus).label}`}
              >
                Advance to {getStatusMeta(nextStatus).label}
                <ArrowRight size={13} />
              </Button>
            )}

            {/* Terminal-stage shortcuts */}
            {application.status !== "OFFERED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onChangeStatus(application.id, "OFFERED")}
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              >
                🏆 Mark offered
              </Button>
            )}
            {application.status !== "REJECTED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onChangeStatus(application.id, "REJECTED")}
                className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                🚫 Mark rejected
              </Button>
            )}
          </div>

          <p className="mt-2 text-[10px] text-slate-600">{meta.hint}</p>
        </div>

        {/* ── Body: notes + timeline | details ───────────────────── */}
        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Left column */}
          <div className="space-y-5">
            <JobStudyNotes
              value={application.studyNotes}
              onSave={(notes) =>
                onUpdate(application.id, { studyNotes: notes || null }, "Study notes saved")
              }
            />

            <JobStatusTimeline
              history={application.statusHistory ?? []}
              statusUpdatedAt={application.statusUpdatedAt}
            />
          </div>

          {/* Right column — facts + inline editable metadata */}
          <div className="space-y-4">
            {/* Next-action alert */}
            <div
              className={cn(
                "rounded-2xl border p-4",
                urgency === "none" ? "border-slate-800 bg-slate-950/50" : URGENCY_CLASS[urgency]
              )}
            >
              <p className={cn(FIELD_LABEL, "mb-1 flex items-center gap-1.5")}>
                <CalendarClock size={12} />
                Next action
              </p>
              <p className="text-sm font-bold">
                {application.nextActionDate ? formatDate(application.nextActionDate) : "Not scheduled"}
              </p>
              <p className="text-[11px] opacity-80">
                {application.nextActionDate
                  ? describeDeadline(application.nextActionDate)
                  : "Set a date to get a 3-day alert badge."}
              </p>
            </div>

            {/* Resume version — the anti-panic field */}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <Label className={cn(FIELD_LABEL, "flex items-center gap-1.5")}>
                <Paperclip size={12} />
                Resume sent
              </Label>

              {/* Real document first: open, download, detach or delete. */}
              <ResumeUploadField
                file={application.resumeFile ?? null}
                onAttach={(file) => void attachStoredResume(file)}
                onDetach={() => void detachStoredResume()}
                onDeleteStored={() => void destroyStoredResume()}
                disabled={savingField === "resume"}
                hint={
                  application.resumeFile
                    ? "Open or download exactly what you submitted."
                    : undefined
                }
              />

              {/* No document? The typed reference still answers "which one?". */}
              {!application.resumeFile && (
                <div className="flex items-center gap-2">
                  <Input
                    id="detailResume"
                    value={resumeDraft}
                    onChange={(event) => setResumeDraft(event.target.value)}
                    placeholder="resume_backend_v2.pdf"
                    className="h-9 border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-500"
                  />
                  <Button
                    size="icon-sm"
                    onClick={() => void saveResume()}
                    disabled={!resumeChanged || savingField === "resume"}
                    className="shrink-0 bg-blue-600 text-white hover:bg-blue-500"
                    title="Save resume reference"
                  >
                    {savingField === "resume" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                  </Button>
                </div>
              )}

              <p className="text-[10px] text-slate-600">
                Tailored resumes are easy to mix up — upload the file you sent and it stays
                reopenable.
              </p>
            </div>

            {/* Next action date editor */}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <Label htmlFor="detailNextAction" className={cn(FIELD_LABEL, "flex items-center gap-1.5")}>
                <CalendarClock size={12} />
                Reschedule next action
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="detailNextAction"
                  type="date"
                  value={nextActionDraft}
                  onChange={(event) => setNextActionDraft(event.target.value)}
                  className="h-9 border-slate-700 bg-slate-950 text-xs text-white"
                />
                <Button
                  size="icon-sm"
                  onClick={() => void saveNextAction()}
                  disabled={!nextActionChanged || savingField === "nextAction"}
                  className="shrink-0 bg-blue-600 text-white hover:bg-blue-500"
                  title="Save next action date"
                >
                  {savingField === "nextAction" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                </Button>
              </div>
            </div>

            {/* Read-only facts */}
            <dl className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Applied on</dt>
                <dd className="font-medium text-slate-300">
                  {formatDate(application.applicationDate)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Stage since</dt>
                <dd className="font-medium text-slate-300">
                  {formatDateTime(application.statusUpdatedAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Added</dt>
                <dd className="font-medium text-slate-300">{formatDateTime(application.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-6 py-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(application)}
            className="bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            <Trash2 size={13} />
            Delete application
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-400"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
