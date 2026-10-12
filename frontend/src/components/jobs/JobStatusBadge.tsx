"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusMeta, type JobApplicationStatus } from "@/lib/jobTracker";

interface JobStatusBadgeProps {
  status: JobApplicationStatus;
  /** Hide the coloured dot (used inside tight table cells). */
  showDot?: boolean;
  className?: string;
}

/**
 * Small coloured pill for a pipeline stage.
 * All colours come from JOB_STATUS_META so the board, table and modal agree.
 */
export function JobStatusBadge({ status, showDot = true, className }: JobStatusBadgeProps) {
  const meta = getStatusMeta(status);

  return (
    <Badge
      className={cn(
        "gap-1.5 border px-2 py-0.5 text-[11px] font-semibold",
        meta.badgeClass,
        className
      )}
      title={meta.hint}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />}
      {meta.label}
    </Badge>
  );
}
