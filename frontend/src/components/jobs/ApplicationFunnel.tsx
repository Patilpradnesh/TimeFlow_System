"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  JOB_STATUS_META,
  PROGRESSION_ORDER,
  getStatusMeta,
  type JobApplicationStats,
} from "@/lib/jobTracker";

interface ApplicationFunnelProps {
  stats: JobApplicationStats | null;
}

/**
 * "Application Funnel" analytics widget.
 *
 * Two views of the same data:
 *  1. KPI tiles — totals and the alert counters a student checks daily
 *  2. The funnel — Bookmarked → Applied → OA → Tech → HR → Offer, where each
 *     row's bar length is relative to the largest stage, and the right-hand
 *     percentage shows stage-to-stage conversion.
 *
 * Everything is derived from GET /api/job-applications/stats (one GROUP BY).
 */
export function ApplicationFunnel({ stats }: ApplicationFunnelProps) {
  if (!stats || stats.total === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm text-white">
            <TrendingUp size={16} className="text-blue-400" />
            Application Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            Add your first application and your conversion funnel will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stages = PROGRESSION_ORDER.map((status) => ({
    status,
    meta: getStatusMeta(status),
    count: stats.funnel[status] ?? 0,
  })).filter((stage) => stage.status !== "BOOKMARKED" || stats.funnel.BOOKMARKED > 0);

  // Bars are scaled against the largest stage so the shape of the funnel reads clearly.
  const largest = Math.max(...stages.map((stage) => stage.count), 1);

  // Stage-to-stage conversion (Applied → OA → Tech → HR → Offer).
  const conversionFor = (index: number): number | null => {
    if (index === 0) return null;
    const previous = stages[index - 1].count;
    const current = stages[index].count;
    if (previous === 0) return null;
    return Math.round((current / previous) * 100);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm text-white">
          <span className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Application Funnel
          </span>
          <span className="text-[11px] font-normal text-slate-500">
            {stats.submitted} submitted · {stats.active} active
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            icon={CheckCircle2}
            label="Total Tracked"
            value={stats.total}
            tone="text-slate-200"
          />
          <KpiTile
            icon={Clock3}
            label="Due in 3 days"
            value={stats.upcomingIn3Days}
            tone="text-amber-300"
            highlight={stats.upcomingIn3Days > 0}
          />
          <KpiTile
            icon={AlertTriangle}
            label="Overdue"
            value={stats.overdue}
            tone="text-red-300"
            highlight={stats.overdue > 0}
          />
          <KpiTile
            icon={Trophy}
            label="Offers"
            value={stats.funnel.OFFERED}
            tone="text-emerald-300"
          />
        </div>

        {/* Funnel bars — one row per pipeline stage */}
        <div className="space-y-2.5">
          {stages.map((stage, index) => {
            const conversion = conversionFor(index);

            return (
              <div key={stage.status} className="flex items-center gap-3">
                <span className="flex w-32 shrink-0 items-center gap-1.5 text-[11px] text-slate-400">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", stage.meta.dotClass)} />
                  <span className="truncate">{stage.meta.label}</span>
                </span>

                <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-950/70">
                  <div
                    className={cn("h-full rounded-md transition-all duration-500", stage.meta.dotClass)}
                    style={{
                      // Minimum 6% so a non-zero stage stays visible.
                      width:
                        stage.count === 0
                          ? "0%"
                          : `${Math.max((stage.count / largest) * 100, 6)}%`,
                    }}
                  />
                </div>

                <span className="w-6 shrink-0 text-right text-[11px] font-bold text-slate-200">
                  {stage.count}
                </span>

                <span
                  className={cn(
                    "w-11 shrink-0 text-right text-[10px] font-bold",
                    conversion === null
                      ? "text-slate-600"
                      : conversion >= 50
                        ? "text-emerald-400"
                        : conversion >= 20
                          ? "text-amber-400"
                          : "text-red-400"
                  )}
                  title={
                    conversion === null
                      ? "Baseline stage"
                      : "Conversion from the previous stage"
                  }
                >
                  {conversion === null ? "—" : `${conversion}%`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Headline conversion rates */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
          <span>
            Applied → Assessment:{" "}
            <strong className="text-slate-200">{stats.conversion.toAssessment}%</strong>
          </span>
          <span>
            Applied → Interview:{" "}
            <strong className="text-slate-200">{stats.conversion.toInterview}%</strong>
          </span>
          <span>
            Applied → Offer:{" "}
            <strong className="text-slate-200">{stats.conversion.toOffer}%</strong>
          </span>
          {stats.staleFor14Days > 0 && (
            <span className="text-amber-400">
              {stats.staleFor14Days} not updated in 14+ days
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-600">
          Legend: {JOB_STATUS_META.map((meta) => meta.short).join(" → ")}
        </p>
      </CardContent>
    </Card>
  );
}

/** Compact KPI tile used by the funnel header. */
function KpiTile({
  icon: Icon,
  label,
  value,
  tone,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        highlight ? "border-amber-500/30 bg-amber-500/5" : "border-slate-800 bg-slate-950/50"
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} className={tone} />
        <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
          {label}
        </span>
      </div>
      <p className={cn("text-xl font-black", tone)}>{value}</p>
    </div>
  );
}
