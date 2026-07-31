import type { ReactNode } from 'react';

/**
 * Shared chrome for role-portal pages.
 * Matches RoleShellDashboard: ~max-w-5xl, left-aligned (no mx-auto).
 */
export function RolePageShell({
  children,
  maxWidth = 'max-w-5xl',
}: {
  children: ReactNode;
  /** Prefer max-w-5xl to match dashboards; use max-w-6xl only for dense tables. */
  maxWidth?: 'max-w-4xl' | 'max-w-5xl' | 'max-w-6xl';
}) {
  return (
    <div className={`w-full min-w-0 ${maxWidth} space-y-5 sm:space-y-6`}>{children}</div>
  );
}

export function RolePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-stone-600 sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Touch-friendly control sizes; text-base on mobile avoids iOS input zoom. */
export const fieldClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:text-sm';

export const btnPrimaryClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 sm:w-auto';

export const btnSecondaryClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 sm:w-auto';

export const btnDangerClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 sm:w-auto';
