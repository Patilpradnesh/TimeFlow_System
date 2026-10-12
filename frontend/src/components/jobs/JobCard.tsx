"use client";

import { CalendarClock, ExternalLink, FileText, IndianRupee, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  URGENCY_CLASS,
  describeDeadline,
  formatDate,
  getUrgency,
  needsAttention,
  type JobApplication,
} from "@/lib/jobTracker";

interface JobCardProps {
  application: JobApplication;
  onOpen: (application: JobApplication) => void;
  onDragStart?: (application: JobApplication) => void;
  onDragEnd?: () => void;
  /** Dims the card while it is being dragged. */
  isDragging?: boolean;
}

/**
 * One application on the Kanban board.
 *
 * It is a native HTML5 drag source (`draggable`) — the board handles the drop,
 * so no drag-and-drop library is required. Clicking anywhere except the job
 * link opens the detail modal.
 */
export function JobCard({ application, onOpen, onDragStart, onDragEnd, isDragging }: JobCardProps) {
  const urgency = getUrgency(application.nextActionDate);
  const showAlert = needsAttention(application.nextActionDate);
  const hasNotes = Boolean(application.studyNotes && application.studyNotes.trim().length > 0);

  return (
    <div
      draggable
      onDragStart={(event) => {
        // Required for Firefox to start a drag at all.
        event.dataTransfer.setData("text/plain", application.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(application);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(application)}
      className={cn(
        "group cursor-grab space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5",
        "transition-all hover:border-slate-700 hover:bg-slate-900 active:cursor-grabbing",
        isDragging && "opacity-40 ring-2 ring-blue-500/40"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(application);
        }
      }}
    >
      {/* Company + alert badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-bold text-white">{application.companyName}</p>
        {showAlert && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              URGENCY_CLASS[urgency]
            )}
            title={describeDeadline(application.nextActionDate)}
          >
            {urgency === "overdue" ? "Overdue" : "Soon"}
          </span>
        )}
      </div>

      {/* Role */}
      <p className="truncate text-xs text-slate-400">{application.role}</p>

      {/* Meta chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {application.packageCtc && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <IndianRupee size={10} />
            {application.packageCtc}
          </span>
        )}

        {application.resumeUsed && (
          <span
            className="inline-flex max-w-[9rem] items-center gap-1 truncate rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
            title={`Resume submitted: ${application.resumeUsed}`}
          >
            <Paperclip size={10} className="shrink-0" />
            <span className="truncate">{application.resumeUsed}</span>
          </span>
        )}

        {hasNotes && (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
            title="Study notes available"
          >
            <FileText size={10} />
            Notes
          </span>
        )}

        {application.jobLink && (
          <a
            href={application.jobLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white"
            title="Open the original job posting"
          >
            <ExternalLink size={10} />
            Posting
          </a>
        )}
      </div>

      {/* Next action */}
      <div
        className={cn(
          "flex items-center gap-1.5 border-t border-slate-800/70 pt-2.5 text-[11px]",
          showAlert ? "text-white" : "text-slate-500"
        )}
      >
        <CalendarClock size={12} className={showAlert ? "text-amber-400" : "text-slate-600"} />
        <span className="truncate">
          {application.nextActionDate
            ? `${formatDate(application.nextActionDate)} · ${describeDeadline(application.nextActionDate)}`
            : "No next action set"}
        </span>
      </div>
    </div>
  );
}
