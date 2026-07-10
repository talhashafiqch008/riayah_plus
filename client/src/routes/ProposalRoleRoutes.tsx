import { Fragment, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RoleRoute } from './RoleRoute';
import { HealthRoleLayout } from '@/layouts/HealthRoleLayout';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import RoleShellDashboard from '@/pages/roles/RoleShellDashboard';
import RoleShellPlaceholder from '@/pages/roles/RoleShellPlaceholder';

const PageSpinner = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
  </div>
);

const PLACEHOLDER_PAGES: Record<string, { path: string; title: string; description?: string }[]> = {
  family: [
    { path: 'care-plans', title: 'Care Plans' },
    { path: 'bookings', title: 'Bookings' },
    { path: 'documents', title: 'Documents' },
    { path: 'messages', title: 'Messages' },
  ],
  patient: [
    { path: 'care-plan', title: 'My Care Plan' },
    { path: 'appointments', title: 'Appointments' },
    { path: 'documents', title: 'Documents' },
    { path: 'messages', title: 'Messages' },
  ],
  coordinator: [
    {
      path: 'intake',
      title: 'Intake Queue',
      description: 'Review and approve new patient intake submissions. Queue API connects in M2.',
    },
    { path: 'patients', title: 'Patients' },
    { path: 'plans', title: 'Care Plans' },
    { path: 'messages', title: 'Messages' },
  ],
  clinical: [
    { path: 'schedule', title: 'Schedule' },
    { path: 'patients', title: 'Patients' },
    { path: 'notes', title: 'Session Notes' },
    { path: 'messages', title: 'Messages' },
  ],
  support: [
    { path: 'shifts', title: 'My Shifts' },
    { path: 'tasks', title: 'Tasks' },
    { path: 'notes', title: 'Shift Notes' },
    { path: 'messages', title: 'Messages' },
  ],
};

/** Must be a Fragment of `<Route>` nodes — not a component — for React Router v6 `<Routes>`. */
export const proposalRoleRouteElements = (
  <Fragment>
    {(Object.keys(ROLE_SHELLS) as Array<keyof typeof ROLE_SHELLS>).map((shellKey) => {
      const shell = ROLE_SHELLS[shellKey];
      const placeholders = PLACEHOLDER_PAGES[shellKey] ?? [];

      return (
        <Route key={shellKey} element={<RoleRoute allowedRoles={shell.allowedRoles} />}>
          <Route element={<HealthRoleLayout config={shell} />}>
            <Route
              path={shell.basePath}
              element={
                <Suspense fallback={<PageSpinner />}>
                  <RoleShellDashboard shellKey={shellKey} />
                </Suspense>
              }
            />
            <Route
              path={`${shell.basePath}/dashboard`}
              element={<Navigate to={shell.basePath} replace />}
            />
            {placeholders.map((page) => (
              <Route
                key={page.path}
                path={`${shell.basePath}/${page.path}`}
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <RoleShellPlaceholder
                      shellKey={shellKey}
                      pageTitle={page.title}
                      description={page.description}
                    />
                  </Suspense>
                }
              />
            ))}
          </Route>
        </Route>
      );
    })}
  </Fragment>
);
