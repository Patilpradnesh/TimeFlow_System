"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { JobCard } from "@/components/jobs/JobCard";
import {
  JOB_STATUS_META,
  type JobApplication,
  type JobApplicationStatus,
} from "@/lib/jobTracker";

interface JobKanbanBoardProps {
  groupedByStatus: Record<JobApplicationStatus, JobApplication[]>;
  onOpen: (application: JobApplication) => void;
  /** Called when a card is dropped on a different column. */
  onStatusChange: (id: string, status: JobApplicationStatus) => void | Promise<unknown>;
}

/**
 * Trello-style pipeline board.
 *
 * DRAG & DROP: implemented with the native HTML5 API (`draggable` +
 * dragstart/dragover/drop) instead of a library like react-beautiful-dnd or
 * dnd-kit. That keeps the dependency list untouched, and column-to-column
 * moves are exactly what the native API is good at.
 */
export function JobKanbanBoard({ groupedByStatus, onOpen, onStatusChange }: JobKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobApplicationStatus | null>(null);

  const handleDrop = async (event: React.DragEvent, status: JobApplicationStatus) => {
    event.preventDefault();
    // Fall back to the tracked id — some browsers restrict dataTransfer reads.
    const id = event.dataTransfer.getData("text/plain") || draggingId;

    setDragOverStatus(null);
    setDraggingId(null);

    if (!id) return;
    await onStatusChange(id, status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {JOB_STATUS_META.map((meta) => {
        const columnApplications = groupedByStatus[meta.value] ?? [];
        const isDropTarget = dragOverStatus === meta.value;

        return (
          <section
            key={meta.value}
            onDragOver={(event) => {
              // preventDefault is what allows a drop to happen at all.
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dragOverStatus !== meta.value) setDragOverStatus(meta.value);
            }}
            onDragLeave={() =>
              setDragOverStatus((current) => (current === meta.value ? null : current))
            }
            onDrop={(event) => void handleDrop(event, meta.value)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-3xl border bg-slate-950/40 transition-colors",
              meta.columnClass,
              isDropTarget && "border-blue-500/70 bg-blue-500/5"
            )}
          >
            {/* Column header */}
            <header className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotClass)} />
                <h3 className="truncate text-xs font-black uppercase tracking-widest text-slate-300">
                  {meta.short}
                </h3>
              </div>
              <span className="shrink-0 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {columnApplications.length}
              </span>
            </header>

            {/* Drop zone / card list */}
            <div className="flex-1 space-y-3 overflow-y-auto px-3 pb-4" style={{ maxHeight: "62vh" }}>
              {columnApplications.length === 0 ? (
                <div
                  className={cn(
                    "flex h-24 items-center justify-center rounded-2xl border border-dashed text-[11px]",
                    isDropTarget
                      ? "border-blue-500/60 text-blue-300"
                      : "border-slate-800 text-slate-600"
                  )}
                >
                  {isDropTarget ? "Drop to move here" : "Nothing here yet"}
                </div>
              ) : (
                columnApplications.map((application) => (
                  <JobCard
                    key={application.id}
                    application={application}
                    onOpen={onOpen}
                    onDragStart={(item) => setDraggingId(item.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverStatus(null);
                    }}
                    isDragging={draggingId === application.id}
                  />
                ))
              )}

              {/* Extra tasting of empty space so users can always drop into a full-looking column */}
              {columnApplications.length > 0 && isDropTarget && (
                <div className="flex h-16 items-center justify-center rounded-2xl border border-dashed border-blue-500/60 text-[11px] text-blue-300">
                  Drop to move here
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
