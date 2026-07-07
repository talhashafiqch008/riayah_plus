import { lazy, Suspense, type ReactNode, type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RootLayout } from '@/layouts/RootLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CareseekerLayout } from '@/layouts/CareseekerLayout';
import { ProviderLayout } from '@/layouts/ProviderLayout';
import { StaffLayout } from '@/layouts/StaffLayout';
import { TrainerLayout } from '@/layouts/TrainerLayout';
import { DemoCoordinatorLayout } from '@/layouts/DemoCoordinatorLayout';
import { PROVIDER_ROLES, CLIENT_ROLES } from './getRoleDashboard';

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
const PrivacyPage         = lazy(() => import('@/pages/public/PrivacyPage'));
const TermsPage           = lazy(() => import('@/pages/public/TermsPage'));
const DeleteAccountPage        = lazy(() => import('@/pages/public/DeleteAccountPage'));
const LoginPage                = lazy(() => import('@/pages/public/LoginPage'));
const OnboardingRequiredPage   = lazy(() => import('@/pages/public/OnboardingRequiredPage'));

// ─── Public-only (redirect if authed) ─────────────────────────────────────────
const CareseekerLoginPage = lazy(() => import('@/pages/careseeker/LoginPage'));
const PhoneLoginPage      = lazy(() => import('@/pages/careseeker/PhoneLoginPage'));
const ProviderLoginPage   = lazy(() => import('@/pages/provider/LoginPage'));
const ProviderSignupPage  = lazy(() => import('@/pages/provider/SignupPage'));
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
const AdminPayoutsPage       = lazy(() => import('@/pages/admin/PayoutsPage'));
const AdminPayoutDetailPage  = lazy(() => import('@/pages/admin/PayoutDetailPage'));
const AdminProvidersPage     = lazy(() => import('@/pages/admin/ProvidersPage'));
const AdminProviderDetailPage = lazy(() => import('@/pages/admin/ProviderDetailPage'));
const AdminProvidersPendingPage = lazy(() => import('@/pages/admin/ProvidersPendingPage'));
const AdminServicesPage      = lazy(() => import('@/pages/admin/ServicesPage'));
const AdminSessionsPage      = lazy(() => import('@/pages/admin/SessionsPage'));
const AdminSettingsPage      = lazy(() => import('@/pages/admin/SettingsPage'));
const AdminStaffPage         = lazy(() => import('@/pages/admin/StaffPage'));
const AdminAddStaffPage      = lazy(() => import('@/pages/admin/AddStaffPage'));
const AdminUsersPage         = lazy(() => import('@/pages/admin/UsersPage'));
const AdminVerificationsPage = lazy(() => import('@/pages/admin/VerificationsPage'));

// ─── Careseeker pages ──────────────────────────────────────────────────────────
const CareseekerDashboardPage   = lazy(() => import('@/pages/careseeker/DashboardPage'));
const CareseekerOnboardingPage  = lazy(() => import('@/pages/careseeker/OnboardingPage'));
const CareseekerBookingPage     = lazy(() => import('@/pages/careseeker/BookingPage'));
const CareseekerBookingsPage    = lazy(() => import('@/pages/careseeker/BookingsPage'));
const CareseekerProvidersPage   = lazy(() => import('@/pages/careseeker/ProvidersPage'));
const CareseekerProviderDetailPage = lazy(() => import('@/pages/careseeker/ProviderDetailPage'));
const CareseekerMarketplacePage = lazy(() => import('@/pages/careseeker/MarketplacePage'));
const CareseekerMyNeedsPage     = lazy(() => import('@/pages/careseeker/MyNeedsPage'));
const CareseekerPostNeedPage    = lazy(() => import('@/pages/careseeker/PostNeedPage'));
const CareseekerOfferDetailPage = lazy(() => import('@/pages/careseeker/OfferDetailPage'));
const CareseekerCheckoutPage    = lazy(() => import('@/pages/careseeker/CheckoutPage'));
const CareseekerPaymentSuccessPage = lazy(() => import('@/pages/careseeker/PaymentSuccessPage'));
const CareseekerPaymentsPage    = lazy(() => import('@/pages/careseeker/PaymentsPage'));
const CareseekerCareNeedsPage   = lazy(() => import('@/pages/careseeker/CareNeedsPage'));
const CareseekerCarePlansPage   = lazy(() => import('@/pages/careseeker/CarePlansPage'));
const CareseekerCareSummaryPage = lazy(() => import('@/pages/careseeker/CareSummaryPage'));
const CareseekerDocumentsPage   = lazy(() => import('@/pages/careseeker/DocumentsPage'));
const CareseekerBudgetPage      = lazy(() => import('@/pages/careseeker/BudgetPage'));
const CareseekerEmergencyPage   = lazy(() => import('@/pages/careseeker/EmergencyPage'));
const CareseekerFamilyPage      = lazy(() => import('@/pages/careseeker/FamilyPage'));
const CareseekerAIMeetPage      = lazy(() => import('@/pages/careseeker/AIMeetPage'));
const CareseekerMessagesPage    = lazy(() => import('@/pages/careseeker/MessagesPage'));
const CareseekerOffersPage      = lazy(() => import('@/pages/careseeker/OffersPage'));
const CareseekerDisputesPage    = lazy(() => import('@/pages/careseeker/DisputesPage'));
const CareseekerNewDisputePage  = lazy(() => import('@/pages/careseeker/NewDisputePage'));
const CareseekerReviewsPage     = lazy(() => import('@/pages/careseeker/ReviewsPage'));
const CareseekerSettingsPage    = lazy(() => import('@/pages/careseeker/SettingsPage'));
const CareseekerSecurityPage    = lazy(() => import('@/pages/careseeker/SecurityPage'));
const CareseekerTelehealthPage  = lazy(() => import('@/pages/careseeker/TelehealthPage'));
const CareseekerTimelinePage    = lazy(() => import('@/pages/careseeker/TimelinePage'));
const CareseekerVideoPage       = lazy(() => import('@/pages/careseeker/VideoPage'));
const CareseekerWalletPage      = lazy(() => import('@/pages/careseeker/WalletPage'));
const CareseekerPaymentMethodsPage = lazy(() => import('@/pages/careseeker/PaymentMethodsPage'));
const CareseekerRefundPage      = lazy(() => import('@/pages/careseeker/RefundPage'));
const CareseekerMatchesPage     = lazy(() => import('@/pages/careseeker/MatchesPage'));
const CareseekerAsyncStatusPage = lazy(() => import('@/pages/careseeker/AsyncStatusPage'));
const CareseekerRaiyahPage      = lazy(() => import('@/pages/careseeker/RaiyahPage'));

// ─── Provider pages ────────────────────────────────────────────────────────────
const ProviderDashboardPage     = lazy(() => import('@/pages/provider/DashboardPage'));
const ProviderOnboardingPage    = lazy(() => import('@/pages/provider/OnboardingPage'));
const ProviderAccountPendingPage = lazy(() => import('@/pages/provider/AccountPendingPage'));
const ProviderVerificationPendingPage = lazy(() => import('@/pages/provider/VerificationPendingPage'));
const ProviderAccountPage       = lazy(() => import('@/pages/provider/AccountPage'));
const ProviderAvailabilityPage  = lazy(() => import('@/pages/provider/AvailabilityPage'));
const ProviderBidsPage          = lazy(() => import('@/pages/provider/BidsPage'));
const ProviderClientsPage       = lazy(() => import('@/pages/provider/ClientsPage'));
const ProviderDocumentsPage     = lazy(() => import('@/pages/provider/DocumentsPage'));
const ProviderEarningsPage      = lazy(() => import('@/pages/provider/EarningsPage'));
const ProviderJobRequestsPage   = lazy(() => import('@/pages/provider/JobRequestsPage'));
const ProviderMarketplacePage   = lazy(() => import('@/pages/provider/MarketplacePage'));
const ProviderMarketplaceOffersPage = lazy(() => import('@/pages/provider/MarketplaceOffersPage'));
const ProviderCreateOfferPage   = lazy(() => import('@/pages/provider/CreateOfferPage'));
const ProviderMessagesPage      = lazy(() => import('@/pages/provider/MessagesPage'));
const ProviderOffersPage        = lazy(() => import('@/pages/provider/OffersPage'));
const ProviderPatientDetailPage = lazy(() => import('@/pages/provider/PatientDetailPage'));
const ProviderPayoutsPage       = lazy(() => import('@/pages/provider/PayoutsPage'));
const ProviderPricingPage       = lazy(() => import('@/pages/provider/PricingPage'));
const ProviderReportsPage       = lazy(() => import('@/pages/provider/ReportsPage'));
const ProviderReviewsPage       = lazy(() => import('@/pages/provider/ReviewsPage'));
const ProviderSchedulePage      = lazy(() => import('@/pages/provider/SchedulePage'));
const ProviderActiveShiftsPage  = lazy(() => import('@/pages/provider/ActiveShiftsPage'));
const ProviderSelfRefundPage    = lazy(() => import('@/pages/provider/SelfRefundPage'));
const ProviderSettingsPage      = lazy(() => import('@/pages/provider/SettingsPage'));
const ProviderStaffPage         = lazy(() => import('@/pages/provider/StaffPage'));
const ProviderTasksPage         = lazy(() => import('@/pages/provider/TasksPage'));
const ProviderTelehealthPage    = lazy(() => import('@/pages/provider/TelehealthPage'));
const ProviderTrainingPage      = lazy(() => import('@/pages/provider/TrainingPage'));
const ProviderVerificationPage  = lazy(() => import('@/pages/provider/VerificationPage'));

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

const providerRoleList = [...PROVIDER_ROLES];
const clientRoleList = [...CLIENT_ROLES];

export function AppRoutes() {
  return (
    <Routes>
      {/* Root layout wraps everything */}
      <Route element={<RootLayout />}>

        {/* ── Backward-compat redirects ──────────────────────────────── */}
        <Route path="/onboarding" element={<Navigate to="/careseeker/onboarding" replace />} />

        {/* ── Public routes ─────────────────────────────────────────── */}
        <Route path="/"                element={<S><HomePage /></S>} />
        <Route path="/browse"          element={<S><BrowsePage /></S>} />
        <Route path="/find-care"       element={<S><FindCarePage /></S>} />
        <Route path="/find-support"    element={<S><FindSupportPage /></S>} />
        <Route path="/find-support/:id" element={<S><FindSupportDetailPage /></S>} />
        <Route path="/doctor/:id"      element={<S><PublicProviderPage /></S>} />
        <Route path="/register"        element={<S><RegisterPage /></S>} />
        <Route path="/forgot-password" element={<S><ForgotPasswordPage /></S>} />
        <Route path="/privacy"         element={<S><PrivacyPage /></S>} />
        <Route path="/terms"           element={<S><TermsPage /></S>} />
        <Route path="/delete-account"        element={<S><DeleteAccountPage /></S>} />
        <Route path="/login"                 element={<S><LoginPage /></S>} />
        <Route path="/onboarding-required"   element={<S><OnboardingRequiredPage /></S>} />

        {/* ── Public-only routes ────────────────────────────────────── */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/careseeker/login"       element={<S><CareseekerLoginPage /></S>} />
          <Route path="/careseeker/phone-login" element={<S><PhoneLoginPage /></S>} />
          <Route path="/provider/login"         element={<S><ProviderLoginPage /></S>} />
          <Route path="/provider/signup"        element={<S><ProviderSignupPage /></S>} />
          <Route path="/admin/login"            element={<S><AdminLoginPage /></S>} />
        </Route>

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
            <Route path="/admin/payments/:id"       element={<S><AdminPaymentDetailPage /></S>} />
            <Route path="/admin/payouts"            element={<S><AdminPayoutsPage /></S>} />
            <Route path="/admin/payouts/:id"        element={<S><AdminPayoutDetailPage /></S>} />
            <Route path="/admin/providers"          element={<S><AdminProvidersPage /></S>} />
            <Route path="/admin/providers/pending"  element={<S><AdminProvidersPendingPage /></S>} />
            <Route path="/admin/providers/:id"      element={<S><AdminProviderDetailPage /></S>} />
            <Route path="/admin/services"           element={<S><AdminServicesPage /></S>} />
            <Route path="/admin/sessions"           element={<S><AdminSessionsPage /></S>} />
            <Route path="/admin/settings"           element={<S><AdminSettingsPage /></S>} />
            <Route path="/admin/staff"              element={<S><AdminStaffPage /></S>} />
            <Route path="/admin/staff/add"          element={<S><AdminAddStaffPage /></S>} />
            <Route path="/admin/users"              element={<S><AdminUsersPage /></S>} />
            <Route path="/admin/verifications"      element={<S><AdminVerificationsPage /></S>} />
          </Route>
        </Route>

        {/* ── Careseeker routes ─────────────────────────────────────── */}
        <Route element={<RoleRoute allowedRoles={clientRoleList} />}>
          <Route element={<CareseekerLayout />}>
            <Route path="/careseeker"                            element={<S><CareseekerDashboardPage /></S>} />
            <Route path="/careseeker/dashboard"                  element={<Navigate to="/careseeker" replace />} />
            <Route path="/careseeker/onboarding"                 element={<S><CareseekerOnboardingPage /></S>} />
            <Route path="/careseeker/booking/:providerId"        element={<S><CareseekerBookingPage /></S>} />
            <Route path="/careseeker/booking"                    element={<S><CareseekerBookingPage /></S>} />
            <Route path="/careseeker/bookings"                   element={<S><CareseekerBookingsPage /></S>} />
            <Route path="/careseeker/providers"                  element={<S><CareseekerProvidersPage /></S>} />
            <Route path="/careseeker/providers/:id"              element={<S><CareseekerProviderDetailPage /></S>} />
            <Route path="/careseeker/marketplace"                element={<S><CareseekerMarketplacePage /></S>} />
            <Route path="/careseeker/marketplace/my-needs"       element={<S><CareseekerMyNeedsPage /></S>} />
            <Route path="/careseeker/marketplace/post"           element={<S><CareseekerPostNeedPage /></S>} />
            <Route path="/careseeker/marketplace/offers/:id"     element={<S><CareseekerOfferDetailPage /></S>} />
            <Route path="/careseeker/payment/checkout/:bookingId" element={<S><CareseekerCheckoutPage /></S>} />
            <Route path="/careseeker/payment/success"            element={<S><CareseekerPaymentSuccessPage /></S>} />
            <Route path="/careseeker/payments"                   element={<S><CareseekerPaymentsPage /></S>} />
            <Route path="/careseeker/care-needs"                 element={<S><CareseekerCareNeedsPage /></S>} />
            <Route path="/careseeker/care-plans"                 element={<S><CareseekerCarePlansPage /></S>} />
            <Route path="/careseeker/care-summary"               element={<S><CareseekerCareSummaryPage /></S>} />
            <Route path="/careseeker/documents"                  element={<S><CareseekerDocumentsPage /></S>} />
            <Route path="/careseeker/budget"                     element={<S><CareseekerBudgetPage /></S>} />
            <Route path="/careseeker/emergency"                  element={<S><CareseekerEmergencyPage /></S>} />
            <Route path="/careseeker/family"                     element={<S><CareseekerFamilyPage /></S>} />
            <Route path="/careseeker/meet-with-ai"               element={<S><CareseekerAIMeetPage /></S>} />
            <Route path="/careseeker/messages"                   element={<S><CareseekerMessagesPage /></S>} />
            <Route path="/careseeker/offers"                     element={<S><CareseekerOffersPage /></S>} />
            <Route path="/careseeker/disputes"                   element={<S><CareseekerDisputesPage /></S>} />
            <Route path="/careseeker/disputes/new"               element={<S><CareseekerNewDisputePage /></S>} />
            <Route path="/careseeker/reviews"                    element={<S><CareseekerReviewsPage /></S>} />
            <Route path="/careseeker/settings"                   element={<S><CareseekerSettingsPage /></S>} />
            <Route path="/careseeker/settings/security"          element={<S><CareseekerSecurityPage /></S>} />
            <Route path="/careseeker/telehealth"                 element={<S><CareseekerTelehealthPage /></S>} />
            <Route path="/careseeker/timeline"                   element={<S><CareseekerTimelinePage /></S>} />
            <Route path="/careseeker/video"                      element={<S><CareseekerVideoPage /></S>} />
            <Route path="/careseeker/wallet"                     element={<S><CareseekerWalletPage /></S>} />
            <Route path="/careseeker/wallet/payment-methods"     element={<S><CareseekerPaymentMethodsPage /></S>} />
            <Route path="/careseeker/refund"                     element={<S><CareseekerRefundPage /></S>} />
            <Route path="/careseeker/matches"                    element={<S><CareseekerMatchesPage /></S>} />
            <Route path="/careseeker/async-status"               element={<S><CareseekerAsyncStatusPage /></S>} />
            <Route path="/careseeker/raiyah"                     element={<S><CareseekerRaiyahPage /></S>} />
          </Route>
        </Route>

        {/* ── Provider routes ───────────────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          {/* account-pending = any authenticated provider, no full role check needed */}
          <Route path="/provider/account-pending"     element={<S><ProviderAccountPendingPage /></S>} />
          <Route path="/provider/onboarding"          element={<S><ProviderOnboardingPage /></S>} />
          <Route path="/provider/verification-pending" element={<S><ProviderVerificationPendingPage /></S>} />
        </Route>
        <Route element={<RoleRoute allowedRoles={providerRoleList} />}>
          <Route element={<ProviderLayout />}>
            <Route path="/provider"                             element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/provider/dashboard"                   element={<S><ProviderDashboardPage /></S>} />
            <Route path="/provider/account"                     element={<S><ProviderAccountPage /></S>} />
            <Route path="/provider/availability"                element={<S><ProviderAvailabilityPage /></S>} />
            <Route path="/provider/bids"                        element={<S><ProviderBidsPage /></S>} />
            <Route path="/provider/clients"                     element={<S><ProviderClientsPage /></S>} />
            <Route path="/provider/documents"                   element={<S><ProviderDocumentsPage /></S>} />
            <Route path="/provider/earnings"                    element={<S><ProviderEarningsPage /></S>} />
            <Route path="/provider/job-requests"                element={<S><ProviderJobRequestsPage /></S>} />
            <Route path="/provider/marketplace"                 element={<S><ProviderMarketplacePage /></S>} />
            <Route path="/provider/marketplace/offers"          element={<S><ProviderMarketplaceOffersPage /></S>} />
            <Route path="/provider/marketplace/offers/create"   element={<S><ProviderCreateOfferPage /></S>} />
            <Route path="/provider/marketplace/create-offer"    element={<Navigate to="/provider/marketplace/offers/create" replace />} />
            <Route path="/provider/messages"                    element={<S><ProviderMessagesPage /></S>} />
            <Route path="/provider/offers"                      element={<S><ProviderOffersPage /></S>} />
            <Route path="/provider/patients/:id"                element={<S><ProviderPatientDetailPage /></S>} />
            <Route path="/provider/payouts"                     element={<S><ProviderPayoutsPage /></S>} />
            <Route path="/provider/pricing"                     element={<S><ProviderPricingPage /></S>} />
            <Route path="/provider/reports"                     element={<S><ProviderReportsPage /></S>} />
            <Route path="/provider/reviews"                     element={<S><ProviderReviewsPage /></S>} />
            <Route path="/provider/schedule"                    element={<S><ProviderSchedulePage /></S>} />
            <Route path="/provider/shifts/active"               element={<S><ProviderActiveShiftsPage /></S>} />
            <Route path="/provider/self-refund"                 element={<S><ProviderSelfRefundPage /></S>} />
            <Route path="/provider/settings"                    element={<S><ProviderSettingsPage /></S>} />
            <Route path="/provider/staff"                       element={<S><ProviderStaffPage /></S>} />
            <Route path="/provider/tasks"                       element={<S><ProviderTasksPage /></S>} />
            <Route path="/provider/telehealth"                  element={<S><ProviderTelehealthPage /></S>} />
            <Route path="/provider/training"                    element={<S><ProviderTrainingPage /></S>} />
            <Route path="/provider/verification"                element={<S><ProviderVerificationPage /></S>} />
          </Route>
        </Route>

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

        {/* ── Demo coordinator (public prototype) ─────────────────────── */}
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

        {/* ── 404 ───────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
