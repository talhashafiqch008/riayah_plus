import { Link } from 'react-router-dom';
import HeroAnimation from '@/components/landing/HeroAnimation';
import ScrollEffects from '@/components/landing/ScrollEffects';
import NoiseOverlay from '@/components/landing/NoiseOverlay';


export default function CinematicLandingPage() {
 return (
 <main id="main-content" className="min-h-screen bg-[#F2F0E9] font-sans selection:bg-[#8CC63F] selection:text-[#F2F0E9]" tabIndex={-1}>
 <NoiseOverlay />
 <HeroAnimation />
 <ScrollEffects />

 <footer className="py-12 bg-[#1A1A1A] text-[#F2F0E9] border-t border-[#F2F0E9]/10 px-6 md:px-12 font-mono text-xs uppercase tracking-widest">
 <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
 <div>&copy; 2026 Raiyah Plus</div>
 <div className="flex gap-8">
 <Link to="/privacy" className="hover:text-[#00A9C1] transition-colors">Privacy Policy</Link>
 <Link to="/terms" className="hover:text-[#00A9C1] transition-colors">Terms of Service</Link>
 </div>
 </div>
 </footer>
 </main>
 );
}
