import { Fragment, Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RoleRoute } from './RoleRoute';
import { HealthRoleLayout } from '@/layouts/HealthRoleLayout';
import { ROLE_SHELLS } from '@/config/proposalRoleShells';
import RoleShellDashboard from '@/pages/roles/RoleShellDashboard';
import RoleShellPlaceholder from '@/pages/roles/RoleShellPlaceholder';
import FamilyOnboardingPage from '@/pages/family/FamilyOnboardingPage';
import FamilyCarePlansPage from '@/pages/family/FamilyCarePlansPage';
import FamilyCarePlanReviewPage from '@/pages/family/FamilyCarePlanReviewPage';
import FamilyBillingPage from '@/pages/family/FamilyBillingPage';
import FamilyInvoiceDetailPage from '@/pages/family/FamilyInvoiceDetailPage';
import FamilyTelehealthPage from '@/pages/family/FamilyTelehealthPage';
import FamilyTelehealthJoinPage, {
  FamilyAppointmentJoinRedirect,
} from '@/pages/family/FamilyTelehealthJoinPage';
import RoleMessagesPage from '@/pages/roles/RoleMessagesPage';
import CoordinatorIntakeQueuePage from '@/pages/coordinator/CoordinatorIntakeQueuePage';
import CoordinatorCarePlansPage from '@/pages/coordinator/CoordinatorCarePlansPage';
import CoordinatorCarePlanBuilderPage from '@/pages/coordinator/CoordinatorCarePlanBuilderPage';
import CoordinatorCarePlanDetailPage from '@/pages/coordinator/CoordinatorCarePlanDetailPage';
import CoordinatorSchedulePage from '@/pages/coordinator/CoordinatorSchedulePage';
import ClinicalNotesPage from '@/pages/clinical/ClinicalNotesPage';
import ClinicalEpisodeNotesPage from '@/pages/clinical/ClinicalEpisodeNotesPage';
import ClinicalCarePlansPage from '@/pages/clinical/ClinicalCarePlansPage';
import ClinicalCarePlanPage from '@/pages/clinical/ClinicalCarePlanPage';
import ClinicalTelehealthPage from '@/pages/clinical/ClinicalTelehealthPage';
import ClinicalTelehealthJoinPage from '@/pages/clinical/ClinicalTelehealthJoinPage';
import SupportShiftsPage from '@/pages/support/SupportShiftsPage';
import SupportTasksPage from '@/pages/support/SupportTasksPage';
import OrgFamiliesPage from '@/pages/org/OrgFamiliesPage';
import OrgCoordinatorsPage from '@/pages/org/OrgCoordinatorsPage';
import OrgPendingRequestsPage from '@/pages/org/OrgPendingRequestsPage';
import OrgStaffPage from '@/pages/org/OrgStaffPage';
import CareUnitListPage from '@/pages/care/CareUnitListPage';
import CareUnitDetailPage from '@/pages/care/CareUnitDetailPage';
import CarePatientDetailPage from '@/pages/care/CarePatientDetailPage';
import EpisodeListPage from '@/pages/care/EpisodeListPage';
import EpisodeDetailPage from '@/pages/care/EpisodeDetailPage';
import AssessmentSchedulePage from '@/pages/care/AssessmentSchedulePage';
import StaffProfileSettingsPage from '@/pages/staff/ProfilePage';

const PageSpinner = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
  </div>
);

const PLACEHOLDER_PAGES: Record<string, { path: string; title: string; description?: string }[]> = {
  family: [
    {
      path: 'documents',
      title: 'Documents',
      description: 'Document upload is available from your care request and care unit. A dedicated documents hub expands in a later release.',
    },
  ],
  patient: [
    { path: 'care-plan', title: 'My Care Plan' },
    { path: 'appointments', title: 'Appointments' },
    { path: 'documents', title: 'Documents' },
    { path: 'messages', title: 'Messages' },
  ],
  support: [
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
                      <EpisodeDetailPage
                        basePath="/coordinator/episodes"
                        canTransition
                        canSchedule
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/episodes/:episodeId/care-plan/new"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CoordinatorCarePlanBuilderPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/plans"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CoordinatorCarePlansPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/plans/:id"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CoordinatorCarePlanDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/schedule"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <CoordinatorSchedulePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/coordinator/messages/:conversationId?"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <RoleMessagesPage basePath="/coordinator/messages" canStartStaffThreads />
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
                        title="Care Journey"
                        description="Follow your care journey from request received through active care."
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/episodes/:episodeId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeDetailPage basePath="/family/episodes" canSchedule />
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
                <Route
                  path="/family/care-plans"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyCarePlansPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/care-plans/:id"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyCarePlanReviewPage />
                    </Suspense>
                  }
                />
                <Route path="/family/invoices" element={<Navigate to="/family/billing" replace />} />
                <Route
                  path="/family/quotations"
                  element={<Navigate to="/family/billing?tab=quotations" replace />}
                />
                <Route
                  path="/family/billing"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyBillingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/billing/:id"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyInvoiceDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/appointments/:id/join"
                  element={<FamilyAppointmentJoinRedirect />}
                />
                <Route
                  path="/family/telehealth"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyTelehealthPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/telehealth/:sessionId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <FamilyTelehealthJoinPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/family/messages/:conversationId?"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <RoleMessagesPage basePath="/family/messages" canStartCoordinatorThread />
                    </Suspense>
                  }
                />
              </>
            )}
            {shellKey === 'clinical' && (
              <>
                <Route
                  path="/clinical/telehealth"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalTelehealthPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/telehealth/:sessionId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalTelehealthJoinPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/schedule"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <AssessmentSchedulePage mode="clinical" />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/patients"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeListPage
                        basePath="/clinical/patients"
                        title="Patients"
                        description="Care episodes in your organization — open one for details, or use Session Notes to document."
                      />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/patients/:episodeId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeDetailPage basePath="/clinical/patients" />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/episodes/:episodeId"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EpisodeDetailPage basePath="/clinical/patients" />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/notes"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalNotesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/episodes/:episodeId/notes"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalEpisodeNotesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/plans"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalCarePlansPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/profile"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <StaffProfileSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/plans/:id"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <ClinicalCarePlanPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/clinical/messages/:conversationId?"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <RoleMessagesPage basePath="/clinical/messages" canStartStaffThreads />
                    </Suspense>
                  }
                />
              </>
            )}
            {shellKey === 'support' && (
              <>
                <Route
                  path="/support/shifts"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <SupportShiftsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/tasks"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <SupportTasksPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/support/profile"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <StaffProfileSettingsPage />
                    </Suspense>
                  }
                />
              </>
            )}
            {shellKey === 'org' && (
              <>
                <Route
                  path="/org/pending"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <OrgPendingRequestsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/org/families"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <OrgFamiliesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/org/coordinators"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <OrgCoordinatorsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/org/staff"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <OrgStaffPage />
                    </Suspense>
                  }
                />
              </>
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
