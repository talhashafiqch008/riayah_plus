import { L } from './tokens';

type Props = {
  className?: string;
  /** Softer / denser atmosphere */
  intensity?: 'soft' | 'strong';
};

/** Cool teal / aqua mist blobs — Riayah primary atmosphere */
export function SoftBackdrop({ className = '', intensity = 'soft' }: Props) {
  const o = intensity === 'strong' ? 1 : 0.85;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className="absolute -start-[14%] -top-[22%] h-[58%] w-[58%] rounded-full blur-3xl"
        style={{ background: L.aqua, opacity: o * 0.7 }}
      />
      <div
        className="absolute -end-[10%] top-[0%] h-[52%] w-[52%] rounded-full blur-3xl"
        style={{ background: L.tide, opacity: o * 0.35 }}
      />
      <div
        className="absolute bottom-[-20%] start-[22%] h-[48%] w-[56%] rounded-full blur-3xl"
        style={{ background: L.mint, opacity: o * 0.75 }}
      />
      <div
        className="absolute end-[12%] bottom-[4%] h-[36%] w-[36%] rounded-full blur-3xl"
        style={{ background: L.sky, opacity: o * 0.65 }}
      />
      <div
        className="absolute start-[40%] top-[35%] h-[30%] w-[30%] rounded-full blur-3xl"
        style={{ background: L.foam, opacity: o * 0.45 }}
      />
    </div>
  );
}
