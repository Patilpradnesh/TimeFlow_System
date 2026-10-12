"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  LayoutGrid,
  List,
  Plus,
  Radio,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationFunnel } from "@/components/jobs/ApplicationFunnel";
import { JobKanbanBoard } from "@/components/jobs/JobKanbanBoard";
import { JobTableView } from "@/components/jobs/JobTableView";
import { JobDetailModal } from "@/components/jobs/JobDetailModal";
import { JobFormDialog } from "@/components/jobs/JobFormDialog";
import { useJobApplications, type JobSortField } from "@/hooks/useJobApplications";
import {
  JOB_STATUS_META,
  type JobApplication,
  type JobApplicationStatus,
} from "@/lib/jobTracker";
import { cn } from "@/lib/utils";

/** Sort options offered in the toolbar. */
const SORT_OPTIONS: { value: JobSortField; label: string }[] = [
  { value: "nextActionDate", label: "Next action date" },
  { value: "applicationDate", label: "Application date" },
  { value: "companyName", label: "Company name" },
  { value: "status", label: "Stage" },
  { value: "createdAt", label: "Recently added" },
];

/**
 * ═══════════════════════════════════════════════════════════════════
 * JOB APPLICATION TRACKER — main dashboard
 * ═══════════════════════════════════════════════════════════════════
 * Presentation only: all state, API calls and live-sync live in
 * `useJobApplications`. Two interchangeable views over the same data —
 * a drag-and-drop Kanban board and a sortable data table.
 */
export default function JobTrackerPage() {
  const {
    applications,
    groupedByStatus,
    stats,
    knownResumes,
    loading,
    isLive,
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    hasActiveFilters,
    refresh,
    createApplication,
    updateApplication,
    changeStatus,
    deleteApplication,
  } = useJobApplications();

  const [view, setView] = useState<"board" | "table">("board");
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  /** Id of the card whose detail modal is open. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Always render the freshest server copy of the open card.
  const selectedApplication =
    applications.find((application) => application.id === selectedId) ?? null;

  const openCreateDialog = () => {
    setEditingApplication(null);
    setFormOpen(true);
  };

  const openEditDialog = (application: JobApplication) => {
    setSelectedId(null); // close the detail modal first
    setEditingApplication(application);
    setFormOpen(true);
  };

  /** Deleting is destructive and irreversible, so we confirm first. */
  const confirmAndDelete = async (application: JobApplication) => {
    const confirmed = window.confirm(
      `Delete ${application.companyName} — ${application.role}?\n\nAll notes and stage history for this application will be removed.`
    );
    if (!confirmed) return;

    setSelectedId(null);
    await deleteApplication(application.id, application.companyName);
  };

  /** Clicking an active column header toggles the sort direction. */
  const handleSortChange = (field: JobSortField) => {
    setFilters({
      ...filters,
      sort: field,
      order: filters.sort === field && filters.order === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "border text-[10px] font-black uppercase tracking-widest",
                isLive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 bg-slate-800/50 text-slate-400"
              )}
            >
              <Radio size={10} className={isLive ? "animate-pulse" : ""} />
              {isLive ? "Live sync on" : "Offline"}
            </Badge>

            {stats && stats.upcomingIn3Days > 0 && (
              <Badge className="border border-amber-500/30 bg-amber-500/10 text-[10px] font-black uppercase tracking-widest text-amber-300">
                {stats.upcomingIn3Days} due in 3 days
              </Badge>
            )}

            {stats && stats.overdue > 0 && (
              <Badge className="border border-red-500/30 bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-300">
                {stats.overdue} overdue
              </Badge>
            )}
          </div>

          <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight text-white">
            <Briefcase className="text-blue-500" size={34} />
            Job Application Tracker
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Every company, stage, resume version and study plan in one place — so nothing slips
            during placement season.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "board" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <LayoutGrid size={13} />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                view === "table" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <List size={13} />
              Table
            </button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refresh()}
            className="border-slate-800 bg-slate-900/60 text-slate-400"
            title="Refresh from server"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>

          <Button
            onClick={openCreateDialog}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
          >
            <Plus size={16} />
            New application
          </Button>
        </div>
      </div>

      {/* ── Filter & sort toolbar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search company, role or resume file…"
            className="h-9 border-slate-700 bg-slate-950 pl-9 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filter by stage */}
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value as "ALL" | JobApplicationStatus })
          }
        >
          <SelectTrigger className="h-9 w-48 border-slate-700 bg-slate-950 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-white">
            <SelectItem value="ALL">All stages</SelectItem>
            {JOB_STATUS_META.map((meta) => (
              <SelectItem key={meta.value} value={meta.value}>
                {meta.emoji} {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort field */}
        <Select
          value={filters.sort}
          onValueChange={(value) => setFilters({ ...filters, sort: value as JobSortField })}
        >
          <SelectTrigger className="h-9 w-48 border-slate-700 bg-slate-950 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-white">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort direction */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ ...filters, order: filters.order === "asc" ? "desc" : "asc" })}
          className="h-9 border-slate-800 bg-slate-950 text-slate-300"
          title="Toggle sort direction"
        >
          {filters.order === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          {filters.order === "asc" ? "Asc" : "Desc"}
        </Button>

        {/* 3-day alert window filter */}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
          <Switch
            size="sm"
            checked={filters.upcomingIn3DaysOnly}
            onCheckedChange={(checked) =>
              setFilters({ ...filters, upcomingIn3DaysOnly: Boolean(checked) })
            }
          />
          Due in 3 days
        </label>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-slate-400 hover:text-white"
          >
            <X size={13} />
            Clear
          </Button>
        )}
      </div>

      {/* ── Funnel analytics ─────────────────────────────────── */}
      <ApplicationFunnel stats={stats} />

      {/* ── Board or table ───────────────────────────────────── */}
      {loading && applications.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          <RefreshCw size={16} className="mr-2 animate-spin" />
          Loading your applications…
        </div>
      ) : view === "board" ? (
        <JobKanbanBoard
          groupedByStatus={groupedByStatus}
          onOpen={(application) => setSelectedId(application.id)}
          onStatusChange={changeStatus}
        />
      ) : (
        <JobTableView
          applications={applications}
          onOpen={(application) => setSelectedId(application.id)}
          onDelete={(application) => void confirmAndDelete(application)}
          sort={filters.sort}
          order={filters.order}
          onSortChange={handleSortChange}
        />
      )}

      {!loading && applications.length > 0 && view === "board" && (
        <p className="text-center text-[11px] text-slate-600">
          Tip: drag a card into another column to move the company forward — the change saves
          instantly and syncs to your other devices.
        </p>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      <JobFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editingApplication}
        knownResumes={knownResumes}
        onSubmit={(input) =>
          editingApplication
            ? updateApplication(editingApplication.id, input, "Application updated")
            : createApplication(input)
        }
      />

      <JobDetailModal
        application={selectedApplication}
        open={Boolean(selectedApplication)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedId(null);
        }}
        onUpdate={updateApplication}
        onChangeStatus={changeStatus}
        onDelete={(application) => void confirmAndDelete(application)}
        onEdit={openEditDialog}
      />
    </div>
  );
}
