"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useSocket } from '@/providers/SocketProvider';
import {
  getStatusMeta,
  type JobApplication,
  type JobApplicationInput,
  type JobApplicationStats,
  type JobApplicationStatus,
} from '@/lib/jobTracker';

/**
 * ═══════════════════════════════════════════════════════════════════
 * useJobApplications — the single state container for the tracker
 * ═══════════════════════════════════════════════════════════════════
 * Keeps the page component presentational. Responsibilities:
 *   • fetch the board + funnel stats (server-side filtering & sorting)
 *   • debounce the search box
 *   • optimistic status moves for drag-and-drop, with rollback on failure
 *   • subscribe to live socket events so other tabs stay in sync
 *
 * The server is always the source of truth: after every mutation we refresh
 * from the API rather than trying to reconcile local state by hand.
 */

export type JobSortField =
  | 'nextActionDate'
  | 'applicationDate'
  | 'createdAt'
  | 'companyName'
  | 'status';

export interface JobFilters {
  search: string;
  status: 'ALL' | JobApplicationStatus;
  sort: JobSortField;
  order: 'asc' | 'desc';
  /** Only cards whose next action falls inside the 3-day alert window. */
  upcomingIn3DaysOnly: boolean;
}

export const DEFAULT_JOB_FILTERS: JobFilters = {
  search: '',
  status: 'ALL',
  sort: 'nextActionDate',
  order: 'asc',
  upcomingIn3DaysOnly: false,
};

/** Shape of the payload the backend emits on every mutation. */
interface RealtimePayload {
  application?: JobApplication;
  id?: string;
  companyName?: string;
  previousStatus?: JobApplicationStatus;
  message?: string;
}

const REALTIME_EVENTS = [
  'job-application:created',
  'job-application:updated',
  'job-application:deleted',
] as const;

export function useJobApplications() {
  const { socket, isConnected } = useSocket();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<JobApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);

  /** Instant value for the search input; `filters.search` lags behind by 350ms. */
  const [searchInput, setSearchInput] = useState('');

  /** Resume filenames seen this session — powers the "Resume used" suggestions. */
  const [knownResumes, setKnownResumes] = useState<string[]>([]);

  /**
   * Ids mutated by THIS browser tab. The socket echo of our own write is then
   * swallowed, so the user doesn't get a toast for something they just did.
   */
  const localMutations = useRef<Set<string>>(new Set());

  // Latest filters, readable from callbacks without re-creating them.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const applicationsRef = useRef(applications);
  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  const buildParams = useCallback((current: JobFilters): Record<string, string> => {
    const params: Record<string, string> = { sort: current.sort, order: current.order };
    if (current.status !== 'ALL') params.status = current.status;
    if (current.search.trim()) params.search = current.search.trim();
    if (current.upcomingIn3DaysOnly) params.upcomingInDays = '3';
    return params;
  }, []);

  /** Reloads the board and the funnel from the API. */
  const refresh = useCallback(async () => {
    try {
      const [listResponse, statsResponse] = await Promise.all([
        api.get('/job-applications', { params: buildParams(filtersRef.current) }),
        api.get('/job-applications/stats'),
      ]);
      setApplications(listResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load job applications', error);
      toast.error('Could not load your job tracker');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // Initial load + reload whenever filters change.
  useEffect(() => {
    void refresh();
  }, [refresh, filters]);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput }
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Remember resume filenames for the autocomplete suggestions.
  useEffect(() => {
    setKnownResumes((previous) => {
      const merged = new Set(previous);
      for (const application of applications) {
        if (application.resumeUsed) merged.add(application.resumeUsed);
      }
      return merged.size === previous.length ? previous : Array.from(merged).sort();
    });
  }, [applications]);

  // ────────────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────────────

  /** Creates an application. Returns true on success so the dialog can close. */
  const createApplication = useCallback(
    async (input: JobApplicationInput): Promise<boolean> => {
      try {
        const response = await api.post('/job-applications', input);
        localMutations.current.add(response.data.id);
        await refresh();
        toast.success(`${input.companyName} added to your tracker`);
        return true;
      } catch (error: any) {
        const fieldErrors = error?.response?.data?.errors as Record<string, string> | undefined;
        const firstError = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
        toast.error(
          firstError ?? error?.response?.data?.message ?? 'Could not save this application'
        );
        return false;
      }
    },
    [refresh]
  );

  /** Partial update — used by the edit dialog and the detail modal. */
  const updateApplication = useCallback(
    async (
      id: string,
      patch: Partial<JobApplicationInput>,
      successMessage?: string
    ): Promise<boolean> => {
      try {
        localMutations.current.add(id);
        const response = await api.patch(`/job-applications/${id}`, patch);
        setApplications((prev) => prev.map((item) => (item.id === id ? response.data : item)));
        await refresh(); // keeps the funnel counters honest
        if (successMessage) toast.success(successMessage);
        return true;
      } catch (error: any) {
        const fieldErrors = error?.response?.data?.errors as Record<string, string> | undefined;
        const firstError = fieldErrors ? Object.values(fieldErrors)[0] : undefined;
        toast.error(firstError ?? error?.response?.data?.message ?? 'Update failed');
        return false;
      }
    },
    [refresh]
  );

  /**
   * Moves a card between columns. Applies an optimistic update immediately so
   * drag-and-drop feels instant, then rolls back if the API rejects it.
   */
  const changeStatus = useCallback(
    async (
      id: string,
      status: JobApplicationStatus,
      options?: { silent?: boolean }
    ): Promise<boolean> => {
      const previous = applicationsRef.current.find((item) => item.id === id);
      if (previous && previous.status === status) return true;

      if (previous) {
        setApplications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item))
        );
      }

      localMutations.current.add(id);
      try {
        const response = await api.patch(`/job-applications/${id}/status`, { status });
        setApplications((prev) => prev.map((item) => (item.id === id ? response.data : item)));
        if (!options?.silent) {
          toast.success(`${response.data.companyName} → ${getStatusMeta(status).label}`);
        }
        await refresh();
        return true;
      } catch (error) {
        // Roll the card back to where it came from.
        if (previous) {
          setApplications((prev) => prev.map((item) => (item.id === id ? previous : item)));
        }
        toast.error('Could not update the stage. Please try again.');
        return false;
      }
    },
    [refresh]
  );

  /** Deletes an application, removing it from the board immediately. */
  const deleteApplication = useCallback(
    async (id: string, companyName: string): Promise<boolean> => {
      const snapshot = applicationsRef.current;
      setApplications((prev) => prev.filter((item) => item.id !== id));
      localMutations.current.add(id);

      try {
        await api.delete(`/job-applications/${id}`);
        toast.success(`${companyName} removed`);
        await refresh();
        return true;
      } catch (error) {
        setApplications(snapshot); // restore the card
        toast.error('Could not delete this application');
        return false;
      }
    },
    [refresh]
  );

  // ────────────────────────────────────────────────────────────────
  // Live sync — keeps every open tab on the same page
  // ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleEvent = (payload: RealtimePayload) => {
      const id = payload.application?.id ?? payload.id;
      const isOwnMutation = id ? localMutations.current.has(id) : false;

      if (id) localMutations.current.delete(id);

      // Only announce changes that came from another tab/device.
      if (!isOwnMutation && payload.message) {
        toast.info(payload.message);
      }

      void refresh();
    };

    for (const event of REALTIME_EVENTS) {
      socket.on(event, handleEvent);
    }

    return () => {
      for (const event of REALTIME_EVENTS) {
        socket.off(event, handleEvent);
      }
    };
  }, [socket, refresh]);

  // ────────────────────────────────────────────────────────────────
  // Derived state
  // ────────────────────────────────────────────────────────────────

  /** Applications grouped by stage, ready for the Kanban columns. */
  const groupedByStatus = useMemo(() => {
    const groups: Record<JobApplicationStatus, JobApplication[]> = {
      BOOKMARKED: [],
      APPLIED: [],
      ONLINE_ASSESSMENT: [],
      TECHNICAL_INTERVIEW: [],
      HR_INTERVIEW: [],
      OFFERED: [],
      REJECTED: [],
    };
    for (const application of applications) {
      groups[application.status].push(application);
    }
    return groups;
  }, [applications]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters(DEFAULT_JOB_FILTERS);
  }, []);

  return {
    // data
    applications,
    groupedByStatus,
    stats,
    knownResumes,
    loading,
    isLive: isConnected,
    // filters
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    hasActiveFilters: Boolean(
      filters.search || filters.status !== 'ALL' || filters.upcomingIn3DaysOnly
    ),
    // actions
    refresh,
    createApplication,
    updateApplication,
    changeStatus,
    deleteApplication,
  };
}
