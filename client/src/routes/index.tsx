import { lazy, Suspense, type ReactNode, type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { RootLayout } from '@/layouts/RootLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StaffLayout } from '@/layouts/StaffLayout';
import { TrainerLayout } from '@/layouts/TrainerLayout';
import { DemoCoordinatorLayout } from '@/layouts/DemoCoordinatorLayout';
import { proposalRoleRouteElements } from './ProposalRoleRoutes';

const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
  </div>
);

function lazy_page(fn: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(fn);
  return (
    <Suspense fallback={<PageSpinner />}>
      <Component />
    </Suspense>
  );
}

// ─── Public pages ─────────────────────────────────────────────────────────────
const HomePage            = lazy(() => import('@/pages/public/HomePage'));
const BrowsePage          = lazy(() => import('@/pages/public/BrowsePage'));
const FindCarePage        = lazy(() => import('@/pages/public/FindCarePage'));
const FindSupportPage     = lazy(() => import('@/pages/public/FindSupportPage'));
const FindSupportDetailPage = lazy(() => import('@/pages/public/FindSupportDetailPage'));
const PublicProviderPage  = lazy(() => import('@/pages/public/PublicProviderPage'));
const RegisterPage        = lazy(() => import('@/pages/public/RegisterPage'));
const ForgotPasswordPage  = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('@/pages/public/ResetPasswordPage'));
const SetPasswordPage     = lazy(() => import('@/pages/public/SetPasswordPage'));
const VerifyEmailPendingPage = lazy(() => import('@/pages/public/VerifyEmailPendingPage'));
const PrivacyPage         = lazy(() => import('@/pages/public/PrivacyPage'));
const TermsPage           = lazy(() => import('@/pages/public/TermsPage'));
const DeleteAccountPage        = lazy(() => import('@/pages/public/DeleteAccountPage'));
const LoginPage                = lazy(() => import('@/pages/public/LoginPage'));
const OnboardingRequiredPage   = lazy(() => import('@/pages/public/OnboardingRequiredPage'));

const AdminLoginPage      = lazy(() => import('@/pages/admin/LoginPage'));

// ─── Admin pages ───────────────────────────────────────────────────────────────
const AdminDashboardPage     = lazy(() => import('@/pages/admin/DashboardPage'));
const AdminAnalyticsPage     = lazy(() => import('@/pages/admin/AnalyticsPage'));
const AdminAssignmentsPage   = lazy(() => import('@/pages/admin/AssignmentsPage'));
const AdminAuditLogsPage     = lazy(() => import('@/pages/admin/AuditLogsPage'));
const AdminBookingsPage      = lazy(() => import('@/pages/admin/BookingsPage'));
const AdminBookingDetailPage = lazy(() => import('@/pages/admin/BookingDetailPage'));
const AdminCompliancePage    = lazy(() => import('@/pages/admin/CompliancePage'));
const AdminDisputesPage      = lazy(() => import('@/pages/admin/DisputesPage'));
const AdminDocumentsPage     = lazy(() => import('@/pages/admin/DocumentsPage'));
const AdminIncidentsPage     = lazy(() => import('@/pages/admin/IncidentsPage'));
const AdminPaymentsPage      = lazy(() => import('@/pages/admin/PaymentsPage'));
const AdminPaymentDetailPage = lazy(() => import('@/pages/admin/PaymentDetailPage'));
const AdminReconciliationPage = lazy(() => import('@/pages/admin/ReconciliationPage'));
const AdminInvoicesPage      = lazy(() => import('@/pages/admin/InvoicesPage'));
const AdminPricingPage       = lazy(() => import('@/pages/admin/PricingPage'));
const AdminPayoutsPage       = lazy(() => import('@/pages/admin/PayoutsPage'));
const AdminPayoutDetailPage  = lazy(() => import('@/pages/admin/PayoutDetailPage'));
const AdminProvidersPage     = lazy(() => import('@/pages/admin/ProvidersPage'));
const AdminProviderDetailPage = lazy(() => import('@/pages/admin/ProviderDetailPage'));
const AdminProvidersPendingPage = lazy(() => import('@/pages/admin/ProvidersPendingPage'));
const AdminFamiliesPage      = lazy(() => import('@/pages/admin/FamiliesPage'));
const AdminSessionsPage      = lazy(() => import('@/pages/admin/SessionsPage'));
const AdminSettingsPage      = lazy(() => import('@/pages/admin/SettingsPage'));
const AdminOrganizationsPage = lazy(() => import('@/pages/admin/OrganizationsPage'));
const AdminStaffPage         = lazy(() => import('@/pages/admin/StaffPage'));
const AdminAddStaffPage      = lazy(() => import('@/pages/admin/AddStaffPage'));
const AdminUsersPage         = lazy(() => import('@/pages/admin/UsersPage'));
const AdminVerificationsPage = lazy(() => import('@/pages/admin/VerificationsPage'));

// Careseeker and provider pages are retired — imports removed with route trees.

// ─── Staff pages ───────────────────────────────────────────────────────────────
const StaffDashboardPage = lazy(() => import('@/pages/staff/DashboardPage'));
const StaffMessagesPage  = lazy(() => import('@/pages/staff/MessagesPage'));
const StaffNotesPage     = lazy(() => import('@/pages/staff/NotesPage'));
const StaffProfilePage   = lazy(() => import('@/pages/staff/ProfilePage'));
const StaffShiftsPage    = lazy(() => import('@/pages/staff/ShiftsPage'));
const StaffTasksPage     = lazy(() => import('@/pages/staff/TasksPage'));

// ─── Trainer pages ──────────────────────────────────────────────────────────────
const TrainerDashboardPage   = lazy(() => import('@/pages/trainer/DashboardPage'));
const TrainerAnalyticsPage   = lazy(() => import('@/pages/trainer/AnalyticsPage'));
const TrainerCertificatesPage = lazy(() => import('@/pages/trainer/CertificatesPage'));
const TrainerCoursesPage     = lazy(() => import('@/pages/trainer/CoursesPage'));
const TrainerCreateCoursePage = lazy(() => import('@/pages/trainer/CreateCoursePage'));
const TrainerQuizzesPage     = lazy(() => import('@/pages/trainer/QuizzesPage'));
const TrainerStudentsPage    = lazy(() => import('@/pages/trainer/StudentsPage'));
const TrainerUploadPage      = lazy(() => import('@/pages/trainer/UploadPage'));

// ─── Shared authenticated pages ────────────────────────────────────────────────
const GlobalDashboardPage  = lazy(() => import('@/pages/DashboardRedirectPage'));
const DirectMessagePage    = lazy(() => import('@/pages/DirectMessagePage'));
const ConversationsPage    = lazy(() => import('@/pages/ConversationsPage'));
const VideoMeetingPage     = lazy(() => import('@/pages/VideoMeetingPage'));
const VideoRoomPage        = lazy(() => import('@/pages/VideoRoomPage'));
const AIMeetPage           = lazy(() => import('@/pages/AIMeetPage'));

// ─── Demo coordinator pages ───────────────────────────────────────────────────
const DemoWorkflowPage      = lazy(() => import('@/pages/demo/coordinator/WorkflowPage'));
const DemoDashboardPage     = lazy(() => import('@/pages/demo/coordinator/DashboardPage'));
const DemoIntakePage        = lazy(() => import('@/pages/demo/coordinator/IntakePage'));
const DemoCareseekerPage    = lazy(() => import('@/pages/demo/coordinator/CareseekerPage'));
const DemoProviderPage      = lazy(() => import('@/pages/demo/coordinator/ProviderPage'));
const DemoHelperPage        = lazy(() => import('@/pages/demo/coordinator/HelperPage'));
const DemoBookingsPage      = lazy(() => import('@/pages/demo/coordinator/BookingsPage'));
const DemoReportingPage     = lazy(() => import('@/pages/demo/coordinator/ReportingPage'));
const DemoMonitoringPage    = lazy(() => import('@/pages/demo/coordinator/MonitoringPage'));
const DemoOrganizationPage  = lazy(() => import('@/pages/demo/coordinator/OrganizationPage'));

const S = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageSpinner />}>{children}</Suspense>
);

export function AppRoutes() {
  return (
    <Routes>
      {/* Root layout wraps everything */}
      <Route element={<RootLayout />}>

        {/* ── Retired marketplace roles — redirect to family portal login ────────── */}
        <Route path="/provider/*"   element={<Navigate to="/login?portal=family" replace />} />
        <Route path="/careseeker/*" element={<Navigate to="/login?portal=family" replace />} />
        <Route path="/onboarding"   element={<Navigate to="/family/onboarding" replace />} />

        {/* ── Public routes ─────────────────────────────────────────── */}
        <Route path="/"                element={<S><HomePage /></S>} />
        <Route path="/browse"          element={<S><BrowsePage /></S>} />
        <Route path="/find-care"       element={<S><FindCarePage /></S>} />
        <Route path="/find-support"    element={<S><FindSupportPage /></S>} />
        <Route path="/find-support/:id" element={<S><FindSupportDetailPage /></S>} />
        <Route path="/doctor/:id"      element={<S><PublicProviderPage /></S>} />
        <Route path="/register"        element={<S><RegisterPage /></S>} />
        <Route path="/forgot-password" element={<S><ForgotPasswordPage /></S>} />
        <Route path="/reset-password"  element={<S><ResetPasswordPage /></S>} />
        <Route path="/set-password"    element={<S><SetPasswordPage /></S>} />
        <Route path="/verify-email"    element={<S><VerifyEmailPendingPage /></S>} />
        <Route path="/privacy"         element={<S><PrivacyPage /></S>} />
        <Route path="/terms"           element={<S><TermsPage /></S>} />
        <Route path="/delete-account"        element={<S><DeleteAccountPage /></S>} />
        <Route path="/login"                 element={<S><LoginPage /></S>} />
        <Route path="/onboarding-required"   element={<S><OnboardingRequiredPage /></S>} />

        {/* Admin login handles its own role check */}
        <Route path="/admin/login"            element={<S><AdminLoginPage /></S>} />

        {/* ── Admin routes ──────────────────────────────────────────── */}
        <Route element={<RoleRoute allowedRoles={['admin', 'super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin"                    element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard"          element={<S><AdminDashboardPage /></S>} />
            <Route path="/admin/analytics"          element={<S><AdminAnalyticsPage /></S>} />
            <Route path="/admin/assignments"        element={<S><AdminAssignmentsPage /></S>} />
            <Route path="/admin/audit-logs"         element={<S><AdminAuditLogsPage /></S>} />
            <Route path="/admin/bookings"           element={<S><AdminBookingsPage /></S>} />
            <Route path="/admin/bookings/:id"       element={<S><AdminBookingDetailPage /></S>} />
            <Route path="/admin/compliance"         element={<S><AdminCompliancePage /></S>} />
            <Route path="/admin/disputes"           element={<S><AdminDisputesPage /></S>} />
            <Route path="/admin/documents"          element={<S><AdminDocumentsPage /></S>} />
            <Route path="/admin/incidents"          element={<S><AdminIncidentsPage /></S>} />
            <Route path="/admin/payments"           element={<S><AdminPaymentsPage /></S>} />
            <Route path="/admin/payments/reconciliation" element={<S><AdminReconciliationPage /></S>} />
            <Route path="/admin/payments/:id"       element={<S><AdminPaymentDetailPage /></S>} />
            <Route path="/admin/invoices"           element={<S><AdminInvoicesPage /></S>} />
            <Route path="/admin/pricing"            element={<S><AdminPricingPage /></S>} />
            <Route path="/admin/services"           element={<Navigate to="/admin/pricing" replace />} />
            <Route path="/admin/payouts"            element={<S><AdminPayoutsPage /></S>} />
            <Route path="/admin/payouts/:id"        element={<S><AdminPayoutDetailPage /></S>} />
            <Route path="/admin/providers"          element={<S><AdminProvidersPage /></S>} />
            <Route path="/admin/providers/pending"  element={<S><AdminProvidersPendingPage /></S>} />
            <Route path="/admin/providers/:id"      element={<S><AdminProviderDetailPage /></S>} />
            <Route path="/admin/families"           element={<S><AdminFamiliesPage /></S>} />
            <Route path="/admin/sessions"           element={<S><AdminSessionsPage /></S>} />
            <Route path="/admin/settings"           element={<S><AdminSettingsPage /></S>} />
            <Route path="/admin/organizations"     element={<S><AdminOrganizationsPage /></S>} />
            <Route path="/admin/staff"              element={<S><AdminStaffPage /></S>} />
            <Route path="/admin/staff/add"          element={<S><AdminAddStaffPage /></S>} />
            <Route path="/admin/users"              element={<S><AdminUsersPage /></S>} />
            <Route path="/admin/verifications"      element={<S><AdminVerificationsPage /></S>} />
          </Route>
        </Route>

        {/* Careseeker and provider route trees are retired — all /careseeker/* and /provider/* */}
        {/* URLs are caught by the redirects at the top of this file. */}

        {/* ── Proposal role shells (M1): Family, Patient, Coordinator, Clinical, Support ── */}
        {proposalRoleRouteElements}

        {/* ── Staff routes ──────────────────────────────────────────── */}
        <Route element={<RoleRoute allowedRoles={['staff', 'admin']} />}>
          <Route element={<StaffLayout />}>
            <Route path="/staff"           element={<S><StaffDashboardPage /></S>} />
            <Route path="/staff/dashboard" element={<Navigate to="/staff" replace />} />
            <Route path="/staff/messages"  element={<S><StaffMessagesPage /></S>} />
            <Route path="/staff/notes"     element={<S><StaffNotesPage /></S>} />
            <Route path="/staff/profile"   element={<S><StaffProfilePage /></S>} />
            <Route path="/staff/shifts"    element={<S><StaffShiftsPage /></S>} />
            <Route path="/staff/tasks"     element={<S><StaffTasksPage /></S>} />
          </Route>
        </Route>

        {/* ── Trainer routes ─────────────────────────────────────────── */}
        <Route element={<RoleRoute allowedRoles={['trainer', 'admin']} />}>
          <Route element={<TrainerLayout />}>
            <Route path="/trainer"                   element={<S><TrainerDashboardPage /></S>} />
            <Route path="/trainer/dashboard"         element={<Navigate to="/trainer" replace />} />
            <Route path="/trainer/analytics"         element={<S><TrainerAnalyticsPage /></S>} />
            <Route path="/trainer/certificates"      element={<S><TrainerCertificatesPage /></S>} />
            <Route path="/trainer/courses"           element={<S><TrainerCoursesPage /></S>} />
            <Route path="/trainer/courses/create"    element={<S><TrainerCreateCoursePage /></S>} />
            <Route path="/trainer/quizzes"           element={<S><TrainerQuizzesPage /></S>} />
            <Route path="/trainer/students"          element={<S><TrainerStudentsPage /></S>} />
            <Route path="/trainer/upload"            element={<S><TrainerUploadPage /></S>} />
          </Route>
        </Route>

        {/* ── Shared authenticated routes ────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"        element={<S><GlobalDashboardPage /></S>} />
          <Route path="/chat/:userId"     element={<S><DirectMessagePage /></S>} />
          <Route path="/conversations"    element={<S><ConversationsPage /></S>} />
          <Route path="/meeting/:roomId"  element={<S><VideoMeetingPage /></S>} />
          <Route path="/room/:id"         element={<S><VideoRoomPage /></S>} />
          <Route path="/meet-ai"          element={<S><AIMeetPage /></S>} />
        </Route>

        {/* ── Demo coordinator (dev/auth gated — Z-8) ─────────────────── */}
        {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ROUTES === 'true') && (
          <Route element={<ProtectedRoute />}>
            <Route element={<DemoCoordinatorLayout />}>
              <Route path="/demo/coordinator"              element={<S><DemoWorkflowPage /></S>} />
              <Route path="/demo/coordinator/dashboard"    element={<S><DemoDashboardPage /></S>} />
              <Route path="/demo/coordinator/intake"       element={<S><DemoIntakePage /></S>} />
              <Route path="/demo/coordinator/careseeker"   element={<S><DemoCareseekerPage /></S>} />
              <Route path="/demo/coordinator/provider"     element={<S><DemoProviderPage /></S>} />
              <Route path="/demo/coordinator/helper"       element={<S><DemoHelperPage /></S>} />
              <Route path="/demo/coordinator/bookings"     element={<S><DemoBookingsPage /></S>} />
              <Route path="/demo/coordinator/reporting"    element={<S><DemoReportingPage /></S>} />
              <Route path="/demo/coordinator/monitoring"   element={<S><DemoMonitoringPage /></S>} />
              <Route path="/demo/coordinator/organization" element={<S><DemoOrganizationPage /></S>} />
            </Route>
          </Route>
        )}

        {/* ── 404 ───────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
