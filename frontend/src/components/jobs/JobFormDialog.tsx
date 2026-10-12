"use client";

import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  Loader2,
  NotebookPen,
  Save,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumeUploadField } from "@/components/jobs/ResumeUploadField";
import { cn } from "@/lib/utils";
import {
  JOB_STATUS_META,
  toDateInputValue,
  type JobApplication,
  type JobApplicationInput,
  type JobApplicationStatus,
  type ResumeFile,
} from "@/lib/jobTracker";

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Returns true on success so the dialog can close itself. */
  onSubmit: (input: JobApplicationInput) => Promise<boolean>;
  /** Providing an application switches the dialog into edit mode. */
  initial?: JobApplication | null;
  /** Resume filenames already used — powers the "which resume?" autocomplete. */
  knownResumes: string[];
}

/** Blank form values, used for "create" mode and for resets. */
const EMPTY_FORM = {
  companyName: "",
  role: "",
  packageCtc: "",
  jobLink: "",
  status: "BOOKMARKED" as JobApplicationStatus,
  applicationDate: "",
  resumeUsed: "",
  nextActionDate: "",
  studyNotes: "",
};

/** Converts an optional text field to `null` when the student left it blank. */
const orNull = (value: string): string | null => (value.trim() ? value.trim() : null);

/**
 * Every field on the dark surface states its own text colour. The global tokens
 * (globals.css) already guarantee white ink, but being explicit here means the
 * form cannot regress if a page ever opts into a different theme.
 */
const FIELD_CLASS = "h-10 border-slate-700 bg-slate-950 text-white placeholder:text-slate-500";
const FIELD_LABEL = "text-xs font-bold uppercase tracking-wider text-slate-400";
const FIELD_HINT = "text-[10px] text-slate-500";

/** Groups related fields under a titled card so the dialog reads as a form. */
function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-blue-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="text-[11px] leading-relaxed text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Create / edit dialog.
 *
 * Three fields do the heavy lifting for a student's sanity:
 *  • Resume used — upload the actual PDF / DOC / DOCX, so the document sent to
 *    a company can be reopened months later. A typed reference is still
 *    supported for resumes that live on a placement portal instead.
 *  • Next action date — drives the "3 days away" alert badges.
 *  • Study notes — Markdown, so syllabus lists and pasted interview
 *    experiences keep their structure.
 */
export function JobFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initial = null,
  knownResumes,
}: JobFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [resumeFile, setResumeFile] = useState<ResumeFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form every time the dialog opens (fresh create, or edit target).
  useEffect(() => {
    if (!open) return;

    if (initial) {
      setForm({
        companyName: initial.companyName,
        role: initial.role,
        packageCtc: initial.packageCtc ?? "",
        jobLink: initial.jobLink ?? "",
        status: initial.status,
        applicationDate: toDateInputValue(initial.applicationDate),
        resumeUsed: initial.resumeUsed ?? "",
        nextActionDate: toDateInputValue(initial.nextActionDate),
        studyNotes: initial.studyNotes ?? "",
      });
      setResumeFile(initial.resumeFile ?? null);
    } else {
      setForm(EMPTY_FORM);
      setResumeFile(null);
    }
  }, [open, initial]);

  const isEditMode = Boolean(initial);
  const canSubmit = form.companyName.trim().length > 0 && form.role.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    const payload: JobApplicationInput = {
      companyName: form.companyName.trim(),
      role: form.role.trim(),
      packageCtc: orNull(form.packageCtc),
      jobLink: orNull(form.jobLink),
      status: form.status,
      applicationDate: orNull(form.applicationDate),
      // The uploaded document wins over the typed label: the API mirrors the
      // file name into `resumeUsed` when it links the file.
      resumeUsed: orNull(form.resumeUsed),
      resumeFileId: resumeFile?.id ?? null,
      studyNotes: orNull(form.studyNotes),
      nextActionDate: orNull(form.nextActionDate),
    };

    const success = await onSubmit(payload);
    setSubmitting(false);
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-800 bg-slate-950 p-0 sm:max-w-3xl">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader className="border-b border-slate-800 px-6 py-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg text-white">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <BriefcaseBusiness size={16} />
              </span>
              {isEditMode ? "Edit application" : "Track a new application"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isEditMode
                ? "Update the details, stage, resume or study plan."
                : "Log a company you are targeting. It stays private to your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            {/* ── Role details ─────────────────────────────────────── */}
            <Section
              icon={<Target size={14} />}
              title="Role details"
              description="Who you are applying to, and on what terms."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className={FIELD_LABEL}>
                    Company name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                    placeholder="e.g. Google"
                    autoFocus
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className={FIELD_LABEL}>
                    Role / Position <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="role"
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                    placeholder="e.g. SDE Intern"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="packageCtc" className={FIELD_LABEL}>
                    Package / CTC
                  </Label>
                  <Input
                    id="packageCtc"
                    value={form.packageCtc}
                    onChange={(event) => setForm({ ...form, packageCtc: event.target.value })}
                    placeholder="e.g. 12 LPA / ₹45k per month"
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobLink" className={FIELD_LABEL}>
                    Job link / URL
                  </Label>
                  <Input
                    id="jobLink"
                    value={form.jobLink}
                    onChange={(event) => setForm({ ...form, jobLink: event.target.value })}
                    placeholder="https://careers.company.com/..."
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </Section>

            {/* ── Pipeline & deadlines ─────────────────────────────── */}
            <Section
              icon={<CalendarClock size={14} />}
              title="Pipeline & deadlines"
              description="The stage it is at today, and the next thing you must not miss."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className={FIELD_LABEL}>Application status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm({ ...form, status: value as JobApplicationStatus })
                    }
                  >
                    <SelectTrigger className={cn(FIELD_CLASS, "w-full")}>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-white">
                      {JOB_STATUS_META.map((meta) => (
                        <SelectItem key={meta.value} value={meta.value}>
                          {meta.emoji} {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicationDate" className={FIELD_LABEL}>
                    Application date
                  </Label>
                  <Input
                    id="applicationDate"
                    type="date"
                    value={form.applicationDate}
                    onChange={(event) => setForm({ ...form, applicationDate: event.target.value })}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextActionDate" className={FIELD_LABEL}>
                  Next action date
                </Label>
                <Input
                  id="nextActionDate"
                  type="date"
                  value={form.nextActionDate}
                  onChange={(event) => setForm({ ...form, nextActionDate: event.target.value })}
                  className={FIELD_CLASS}
                />
                <p className={FIELD_HINT}>
                  Upcoming test, interview or deadline. Alerts appear when it is within 3 days.
                </p>
              </div>
            </Section>
            {/* ── Resume sent ──────────────────────────────────────── */}
            <Section
              icon={<FileText size={14} />}
              title="Resume sent"
              description="Attach the exact document you submitted, so you can reopen it months later."
            >
              <ResumeUploadField
                file={resumeFile}
                onAttach={setResumeFile}
                onDetach={() => setResumeFile(null)}
                disabled={submitting}
                hint={
                  resumeFile
                    ? "Attached to this application. Detach it to upload a different version."
                    : "Stored with this application only — never shared with anyone."
                }
              />

              {/* Typed reference — for resumes that live on a placement portal. */}
              {!resumeFile && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <Label htmlFor="resumeUsed" className={FIELD_LABEL}>
                    Or just record a file name
                  </Label>
                  <Input
                    id="resumeUsed"
                    list="job-resume-options"
                    value={form.resumeUsed}
                    onChange={(event) => setForm({ ...form, resumeUsed: event.target.value })}
                    placeholder="resume_backend_v2.pdf"
                    className={FIELD_CLASS}
                  />
                  {/* Autocomplete of resumes already recorded on the board */}
                  <datalist id="job-resume-options">
                    {knownResumes.map((resume) => (
                      <option key={resume} value={resume} />
                    ))}
                  </datalist>
                  <p className={FIELD_HINT}>
                    Handy when the portal keeps your resume for you — the name alone still answers
                    &ldquo;which one did I send?&rdquo;
                  </p>
                </div>
              )}
            </Section>

            {/* ── Preparation notes ────────────────────────────────── */}
            <Section
              icon={<NotebookPen size={14} />}
              title="Preparation notes"
              description="Syllabus, company research, past interview questions — Markdown supported."
            >
              <Textarea
                id="studyNotes"
                value={form.studyNotes}
                onChange={(event) => setForm({ ...form, studyNotes: event.target.value })}
                rows={6}
                placeholder={
                  "## Syllabus\n- DSA: Graphs, DP\n- OS: Deadlocks\n\n## Company research\n- Asked 2 DSA + 1 SQL round last year"
                }
                className="min-h-[9rem] border-slate-700 bg-slate-950 font-mono text-xs leading-relaxed text-white placeholder:text-slate-500"
              />
              <p className={cn(FIELD_HINT, "flex items-center gap-1.5")}>
                <Sparkles size={11} className="text-blue-400" />
                Headings, lists, <code className="text-slate-400">code</code> and{" "}
                <code className="text-slate-400">&gt; quotes</code> render when you open the
                application.
              </p>
            </Section>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t border-slate-800 bg-transparent px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {submitting ? "Saving…" : isEditMode ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
