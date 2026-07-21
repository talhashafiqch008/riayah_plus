import { CareOnboardingWizard } from '@/pages/careseeker/OnboardingPage';

/**
 * Family onboarding — same careseeker 6-step UX, wired to M2 intake on Finish.
 * Clinical 8-step wizard preserved at FamilyClinicalOnboardingPage.tsx (not primary).
 */
export default function FamilyOnboardingPage() {
  return <CareOnboardingWizard variant="family" />;
}
