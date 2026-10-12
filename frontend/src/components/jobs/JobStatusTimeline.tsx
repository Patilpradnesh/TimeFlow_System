"use client";

import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  getStatusMeta,
  type JobStatusHistoryEntry,
} from "@/lib/jobTracker";

interface JobStatusTimelineProps {
  history: JobStatusHistoryEntry[];
  /** When the card last entered its current stage. */
  statusUpdatedAt: string | null;
}

/**
 * Audit trail of every stage hop, newest first.
 * Because the backend appends to `statusHistory` on each change, a student can
 * always answer "when did I actually hear back from this company?".
 */
export function JobStatusTimeline({ history, statusUpdatedAt }: JobStatusTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <History size={13} />
          No stage changes recorded yet.
        </p>
      </div>
    );
  }

  // Newest first for readability.
  const ordered = [...history].reverse();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <History size={13} />
        Stage Timeline
      </h4>

      <ol className="space-y-3">
        {ordered.map((entry, index) => {
          const meta = getStatusMeta(entry.status);
          const isLatest = index === 0;

          return (
            <li key={`${entry.status}-${entry.at}-${index}`} className="flex gap-3">
              {/* Rail + dot */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    meta.dotClass,
                    isLatest && "ring-2 ring-offset-2 ring-offset-slate-950 ring-slate-700"
                  )}
                />
                {index < ordered.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-slate-800" aria-hidden />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <p className={cn("text-xs font-semibold", isLatest ? "text-white" : "text-slate-400")}>
                  {meta.label}
                </p>
                <p className="text-[10px] text-slate-600">
                  {formatDateTime(entry.at)}
                  {isLatest && statusUpdatedAt && " · current stage"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
