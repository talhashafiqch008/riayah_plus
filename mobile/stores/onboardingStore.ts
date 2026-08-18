import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { detectCountryFromTimezone } from '../lib/familyCareseekerIntake';

const DRAFT_KEY = 'raiyah:family_careseeker_onboarding_draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** 5 steps: Location → Support → Preferences → Schedule → Confirm (skip Registration). */
export const TOTAL_STEPS = 5;

export type OnboardingFormData = {
  country: string;
  countryManual: boolean;
  preferredLanguage: string;
  careRecipientType: string;
  careCategories: string[];
  careNeeds: Record<string, string[]>;
  practitionerGender: string;
  languages: string[];
  careLocation: string;
  address: string;
  scheduleType: string;
  preferredDays: string[];
  preferredTimeSlots: string[];
  isCustomTime: boolean;
  customStartTime: string;
  customEndTime: string;
  startTiming: string;
  independentProviderAcknowledged: boolean;
  termsAccepted: boolean;
  marketingConsentGranted: boolean;
};

export const initialFormData = (): OnboardingFormData => ({
  country: detectCountryFromTimezone(),
  countryManual: false,
  preferredLanguage: '',
  careRecipientType: '',
  careCategories: [],
  careNeeds: {},
  practitionerGender: '',
  languages: [],
  careLocation: '',
  address: '',
  scheduleType: '',
  preferredDays: [],
  preferredTimeSlots: [],
  isCustomTime: false,
  customStartTime: '',
  customEndTime: '',
  startTiming: '',
  independentProviderAcknowledged: false,
  termsAccepted: false,
  marketingConsentGranted: false,
});

interface OnboardingState {
  currentStep: number;
  data: OnboardingFormData;
  draftHydrated: boolean;
  setStep: (step: number) => void;
  updateData: (patch: Partial<OnboardingFormData>) => void;
  reset: () => void;
  hydrateDraft: () => Promise<void>;
  persistDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  currentStep: 1,
  data: initialFormData(),
  draftHydrated: false,

  setStep: (step) => set({ currentStep: step }),

  updateData: (patch) =>
    set((s) => ({
      data: { ...s.data, ...patch },
    })),

  reset: () =>
    set({
      currentStep: 1,
      data: initialFormData(),
    }),

  hydrateDraft: async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) {
        set({ draftHydrated: true });
        return;
      }
      const draft = JSON.parse(raw) as {
        data?: Partial<OnboardingFormData>;
        step?: number;
        expiresAt?: number;
      };
      if (!draft.expiresAt || draft.expiresAt < Date.now()) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        set({ draftHydrated: true });
        return;
      }
      set({
        data: { ...initialFormData(), ...(draft.data ?? {}) },
        currentStep: typeof draft.step === 'number' && draft.step > 0 ? draft.step : 1,
        draftHydrated: true,
      });
    } catch {
      set({ draftHydrated: true });
    }
  },

  persistDraft: async () => {
    const { data, currentStep } = get();
    if (currentStep < 1) return;
    try {
      await AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          data,
          step: currentStep,
          expiresAt: Date.now() + DRAFT_TTL_MS,
        }),
      );
    } catch {
      // ignore
    }
  },

  clearDraft: async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  },
}));
