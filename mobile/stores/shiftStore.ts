import { create } from 'zustand';

interface ShiftState {
  isOnShift: boolean;
  shiftStartTime: number | null;
  sessionId: string | null;
  checkInLocation: { lat: number; lng: number } | null;
  startShift: (sessionId: string, lat: number, lng: number) => void;
  endShift: () => void;
  elapsedSeconds: () => number;
}

export const useShiftStore = create<ShiftState>()((set, get) => ({
  isOnShift: false,
  shiftStartTime: null,
  sessionId: null,
  checkInLocation: null,

  startShift: (sessionId, lat, lng) =>
    set({
      isOnShift: true,
      shiftStartTime: Date.now(),
      sessionId,
      checkInLocation: { lat, lng },
    }),

  endShift: () =>
    set({
      isOnShift: false,
      shiftStartTime: null,
      sessionId: null,
      checkInLocation: null,
    }),

  elapsedSeconds: () => {
    const start = get().shiftStartTime;
    return start ? Math.floor((Date.now() - start) / 1000) : 0;
  },
}));
