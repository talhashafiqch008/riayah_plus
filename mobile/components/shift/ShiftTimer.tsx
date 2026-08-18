import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useShiftStore } from '../../stores/shiftStore';

export function ShiftTimer({ className = '' }: { className?: string }) {
  const isOnShift = useShiftStore((s) => s.isOnShift);
  const elapsedSeconds = useShiftStore((s) => s.elapsedSeconds);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isOnShift) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isOnShift]);

  void tick;

  const secs = elapsedSeconds();
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const display =
    h > 0
      ? `${h}h ${String(m).padStart(2, '0')}m`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <Text className={`text-4xl font-bold text-white ${className}`}>{display}</Text>
  );
}
