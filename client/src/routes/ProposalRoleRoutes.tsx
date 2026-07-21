import { Fragment, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RoleRoute } from './RoleRoute';
import { HealthRoleLayout } from '@/layouts/HealthRoleLayout';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import RoleShellDashboard from '@/pages/roles/RoleShellDashboard';
import RoleShellPlaceholder from '@/pages/roles/RoleShellPlaceholder';
import FamilyOnboardingPage from '@/pages/family/FamilyOnboardingPage';
import CoordinatorIntakeQueuePage from '@/pages/coordinator/CoordinatorIntakeQueuePage';
import CareUnitListPage from '@/pages/care/CareUnitListPage';
import CareUnitDetailPage from '@/pages/care/CareUnitDetailPage';
import CarePatientDetailPage from '@/pages/care/CarePatientDetailPage';
import EpisodeListPage from '@/pages/care/EpisodeListPage';
import EpisodeDetailPage from '@/pages/care/EpisodeDetailPage';
import AssessmentSchedulePage from '@/pages/care/AssessmentSchedulePage';

const PageSpinner = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
  </div>
);

const PLACEHOLDER_PAGES: Record<string, { path: string; title: string; description?: string }[]> = {
  family: [
    { path: 'care-plans', title: 'Care Plans' },
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
    { path: 'plans', title: 'Care Plans' },
    { path: 'messages', title: 'Messages' },
  ],
  clinical: [
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
            {shellKey === 'family' && (
              <Route
                path="/family/onboarding"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <FamilyOnboardingPage />
                  </Suspense>
                }
              />
            )}
            {shellKey === 'coordinator' && (
              <>
                <Route
                  path="/coordinator/intake"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CoordinatorIntakeQueuePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/patients"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CareUnitListPage
                        basePath="/coordinator/patients"
                        title="Patients"
                        description="Browse care units and open patient profiles from intake."
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/patients/:unitId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CareUnitDetailPage basePath="/coordinator/patients" />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/patients/:unitId/:patientId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CarePatientDetailPage basePath="/coordinator/patients" />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/episodes"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeListPage basePath="/coordinator/episodes" />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/episodes/:episodeId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeDetailPage basePath="/coordinator/episodes" canTransition />
                    </Suspense>
                  }
                />
              </>
            )}
            {shellKey === 'family' && (
              <>
                <Route
                  path="/family/care-unit"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CareUnitListPage
                        basePath="/family/care-unit"
                        title="My Care Unit"
                        description="Your household, care recipient, and the request you submitted during onboarding."
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/care-unit/:unitId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CareUnitDetailPage basePath="/family/care-unit" />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/care-unit/:unitId/:patientId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CarePatientDetailPage basePath="/family/care-unit" />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/episodes"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeListPage
                        basePath="/family/episodes"
                        title="Care Episodes"
                        description="Follow status from intake through active care."
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/episodes/:episodeId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeDetailPage basePath="/family/episodes" />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/bookings"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <AssessmentSchedulePage mode="family" />
                    </Suspense>
                  }
                />
              </>
            )}
            {shellKey === 'clinical' && (
              <Route
                path="/clinical/schedule"
                element={
                  <Suspense fallback={<PageSpinner />}>
                    <AssessmentSchedulePage mode="clinical" />
                  </Suspense>
                }
              />
            )}
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
