"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ExternalLink,
  FileText,
  Paperclip,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { cn } from "@/lib/utils";
import {
  URGENCY_CLASS,
  describeDeadline,
  formatDate,
  getUrgency,
  hasResumeFile,
  needsAttention,
  type JobApplication,
} from "@/lib/jobTracker";
import type { JobSortField } from "@/hooks/useJobApplications";

interface JobTableViewProps {
  applications: JobApplication[];
  onOpen: (application: JobApplication) => void;
  onDelete: (application: JobApplication) => void;
  sort: JobSortField;
  order: "asc" | "desc";
  onSortChange: (field: JobSortField) => void;
}

/**
 * Clean, scannable data table for students who prefer lists over boards.
 * Header cells are clickable and delegate sorting to the API (server-side
 * sorting keeps working once a student has hundreds of applications).
 */
export function JobTableView({
  applications,
  onOpen,
  onDelete,
  sort,
  order,
  onSortChange,
}: JobTableViewProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
        <p className="text-sm text-slate-500">
          No applications match your filters yet. Add your first one to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <SortableHeader
                label="Company / Role"
                field="companyName"
                sort={sort}
                order={order}
                onSortChange={onSortChange}
              />
              <SortableHeader
                label="Stage"
                field="status"
                sort={sort}
                order={order}
                onSortChange={onSortChange}
              />
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Package
              </th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Resume Used
              </th>
              <SortableHeader
                label="Applied"
                field="applicationDate"
                sort={sort}
                order={order}
                onSortChange={onSortChange}
              />
              <SortableHeader
                label="Next Action"
                field="nextActionDate"
                sort={sort}
                order={order}
                onSortChange={onSortChange}
              />
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {applications.map((application) => {
              const urgency = getUrgency(application.nextActionDate);
              const showAlert = needsAttention(application.nextActionDate);

              return (
                <tr
                  key={application.id}
                  onClick={() => onOpen(application)}
                  className="cursor-pointer border-b border-slate-900 transition-colors last:border-0 hover:bg-slate-900/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{application.companyName}</p>
                      {application.jobLink && (
                        <a
                          href={application.jobLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="text-slate-500 hover:text-blue-400"
                          title="Open job posting"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="truncate">{application.role}</span>
                      {application.studyNotes && (
                        <FileText size={11} className="shrink-0 text-blue-400/70" />
                      )}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <JobStatusBadge status={application.status} />
                  </td>

                  <td className="px-4 py-3 text-xs text-emerald-300">
                    {application.packageCtc ?? <span className="text-slate-600">—</span>}
                  </td>

                  <td className="px-4 py-3">
                    {application.resumeUsed ? (
                      <span
                        className={cn(
                          "inline-flex max-w-[12rem] items-center gap-1 rounded-md px-2 py-0.5 text-[11px]",
                          hasResumeFile(application)
                            ? "bg-blue-500/10 text-blue-200"
                            : "bg-slate-800/80 text-slate-300"
                        )}
                        title={
                          hasResumeFile(application)
                            ? `${application.resumeUsed} — stored file, open it from the details`
                            : `Resume reference: ${application.resumeUsed}`
                        }
                      >
                        <Paperclip size={11} className="shrink-0" />
                        <span className="truncate">{application.resumeUsed}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">Not recorded</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(application.applicationDate)}
                  </td>

                  <td className="px-4 py-3">
                    {application.nextActionDate ? (
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <CalendarClock
                            size={12}
                            className={showAlert ? "text-amber-400" : "text-slate-600"}
                          />
                          {formatDate(application.nextActionDate)}
                        </span>
                        <span
                          className={cn(
                            "w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            URGENCY_CLASS[urgency]
                          )}
                        >
                          {describeDeadline(application.nextActionDate)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(application);
                      }}
                      title="Delete application"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Clickable header cell that flips the sort direction when clicked twice. */
function SortableHeader({
  label,
  field,
  sort,
  order,
  onSortChange,
}: {
  label: string;
  field: JobSortField;
  sort: JobSortField;
  order: "asc" | "desc";
  onSortChange: (field: JobSortField) => void;
}) {
  const isActive = sort === field;

  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSortChange(field)}
        className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors",
          isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
        )}
      >
        {label}
        {isActive && (order === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}
