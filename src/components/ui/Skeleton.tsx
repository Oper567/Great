import React from "react";

interface SkeletonBlockProps {
  className?: string;
  dark?: boolean;
}

/**
 * Reusable shimmer skeleton primitive compatible with both light institutional pages
 * and dark-slate CBT / Admin / Teacher dashboards.
 */
export function SkeletonBlock({ className = "", dark = false }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={`${dark ? "gfms-skeleton-dark bg-slate-800" : "gfms-skeleton bg-slate-200"} rounded-xl ${className}`}
    />
  );
}

export function PublicPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page content" className="min-h-[75vh] bg-slate-50">
      {/* Hero Banner Skeleton */}
      <section className="bg-primary-950 py-10 sm:py-16 border-b border-primary-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-[2px] bg-secondary-400/70" />
            <div className="h-3 w-44 rounded-full bg-primary-800/80 animate-pulse" />
          </div>
          <div className="h-8 sm:h-11 w-3/4 max-w-xl rounded-xl bg-primary-800/80 animate-pulse" />
          <div className="space-y-2 max-w-2xl pt-1">
            <div className="h-3.5 w-full rounded-lg bg-primary-900/90 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded-lg bg-primary-900/90 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Main Content Cards Skeleton */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2.5">
            <SkeletonBlock className="h-5 w-36 rounded-full" />
            <SkeletonBlock className="h-8 w-64 sm:w-80" />
            <SkeletonBlock className="h-4 w-56 sm:w-96" />
          </div>
          <SkeletonBlock className="h-10 w-44" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm"
            >
              <SkeletonBlock className="h-44 w-full rounded-xl" />
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-5 w-4/5" />
              <div className="space-y-1.5">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ResultPortalSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading Result Checker Portal"
      className="min-h-screen bg-slate-100 flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col items-center space-y-3">
          <SkeletonBlock className="w-16 h-16 rounded-full" />
          <SkeletonBlock className="h-6 w-52" />
          <SkeletonBlock className="h-3.5 w-64" />
        </div>
        <div className="space-y-3.5 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ReportCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading Terminal Report Sheet"
      className="min-h-screen bg-slate-100 py-6 sm:py-10 px-4"
    >
      <div className="max-w-4xl mx-auto bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-5 sm:p-8 space-y-6">
        {/* School Banner */}
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <SkeletonBlock className="w-14 h-14 rounded-full shrink-0" />
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-56 sm:w-80" />
              <SkeletonBlock className="h-3.5 w-40 sm:w-56" />
            </div>
          </div>
          <SkeletonBlock className="h-10 w-28 hidden sm:block" />
        </div>

        {/* Bio Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
          ))}
        </div>

        {/* Subject Table Rows */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div key={row} className="p-3 grid grid-cols-12 gap-3 items-center">
              <SkeletonBlock className="col-span-5 h-4" />
              <SkeletonBlock className="col-span-2 h-4" />
              <SkeletonBlock className="col-span-2 h-4" />
              <SkeletonBlock className="col-span-3 h-4" />
            </div>
          ))}
        </div>

        {/* Remarks & Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export function PortalDashboardSkeleton({
  variant = "admin",
}: {
  variant?: "student" | "admin" | "staff";
}) {
  return (
    <div
      aria-busy="true"
      aria-label={`Loading ${variant} portal`}
      className="min-h-screen bg-slate-950 text-slate-100"
    >
      {/* Top Navbar Skeleton */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock dark className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBlock dark className="h-4 w-44 sm:w-64" />
              <SkeletonBlock dark className="h-3 w-28 sm:w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock dark className="h-8 w-24 rounded-lg" />
            <SkeletonBlock dark className="h-8 w-20 rounded-lg hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Tabs / Action Strip */}
        <div className="flex items-center gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock dark key={i} className="h-9 w-28 sm:w-36 shrink-0" />
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((card) => (
            <div
              key={card}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5"
            >
              <SkeletonBlock dark className="h-3.5 w-24" />
              <SkeletonBlock dark className="h-7 w-16" />
              <SkeletonBlock dark className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Table / Exam List Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <SkeletonBlock dark className="h-5 w-48" />
            <SkeletonBlock dark className="h-9 w-52 sm:w-64" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between gap-4 bg-slate-950/70 border border-slate-800/70 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <SkeletonBlock dark className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBlock dark className="h-4 w-48 sm:w-72 max-w-full" />
                    <SkeletonBlock dark className="h-3 w-32 sm:w-44" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SkeletonBlock dark className="h-7 w-20 rounded-full" />
                  <SkeletonBlock dark className="h-8 w-24 rounded-lg hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CbtExamRoomSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading CBT Examination Room"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
    >
      {/* Exam Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock dark className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5">
              <SkeletonBlock dark className="h-4 w-40 sm:w-56" />
              <SkeletonBlock dark className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock dark className="h-9 w-28 rounded-xl" />
            <SkeletonBlock dark className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Question + Palette Split */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <SkeletonBlock dark className="h-7 w-36" />
            <SkeletonBlock dark className="h-7 w-28" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <SkeletonBlock dark className="h-5 w-full" />
            <SkeletonBlock dark className="h-5 w-11/12" />
            <SkeletonBlock dark className="h-5 w-2/3" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((opt) => (
              <div
                key={opt}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3"
              >
                <SkeletonBlock dark className="w-8 h-8 rounded-xl shrink-0" />
                <SkeletonBlock dark className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <SkeletonBlock dark className="h-5 w-40" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, idx) => (
                <SkeletonBlock dark key={idx} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
