
export default function NoiseOverlay() {
 return (
 <div className="pointer-events-none fixed inset-0 z-50 size-full opacity-[0.05] mix-blend-overlay">
 <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
 <filter id="noise">
 <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
 </filter>
 <rect width="100%" height="100%" filter="url(#noise)" />
 </svg>
 </div>
 );
}
