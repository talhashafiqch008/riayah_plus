
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
;
import { MotionDiv, MotionHeader, MotionH1, MotionP } from '@/components/animations/MotionWrapper';

const fadeUp = {
 hidden: { opacity: 0, y: 40 },
 visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
};

const Header = () => {
 const [isScrolled, setIsScrolled] = useState(false);

 useEffect(() => {
 const handleScroll = () => {
 setIsScrolled(window.scrollY > 50);
 };
 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 return (
 <MotionHeader
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 1, delay: 0.2 }}
 className={`fixed top-0 left-0 right-0 z-40 px-6 md:px-12 transition-all duration-300 ${isScrolled ? 'py-4 bg-[#F2F0E9]/95 backdrop-blur-md shadow-sm border-b border-[#1A1A1A]/10 text-[#1A1A1A]' : 'py-6 text-[#1A1A1A]' }`}
 >
 <div className="flex justify-between items-center max-w-[1600px] mx-auto">
 <img src="/logo.png" alt="Raiyah Plus" width={128} height={40} className="w-32 h-auto" loading="lazy" />
 <div className="hidden md:flex gap-8 text-sm font-medium tracking-wide">
 <Link to="#reality" className="hover:opacity-60 transition-opacity">Reality</Link>
 <Link to="#belief" className="hover:opacity-60 transition-opacity">Belief</Link>
 <Link to="#how-it-works" className="hover:opacity-60 transition-opacity">System</Link>
 </div>
 </div>
 </MotionHeader>
 );
};

const HeroSection = () => {
 return (
 <section className="relative min-h-screen flex flex-col justify-end pb-12 pt-32 px-6 md:px-12 bg-[#F2F0E9] text-[#1A1A1A] overflow-hidden">
 <div className="max-w-[1600px] mx-auto w-full grid lg:grid-cols-12 gap-12 lg:gap-24 items-end relative z-10">

 <div className="lg:col-span-6 pb-12">
 <MotionDiv
 initial="hidden" animate="visible" variants={{
 visible: { transition: { staggerChildren: 0.1 } }
 }}
 >
 <MotionDiv variants={fadeUp} className="flex items-center gap-3 mb-12">
 </MotionDiv>

 <MotionH1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-tighter font-sans font-semibold mb-8">
 AI is transforming care.<br />
 <span className="font-serif italic font-normal text-[#005B82]">Structure is what makes it work.</span>
 </MotionH1>

 <MotionP variants={fadeUp} className="text-xl md:text-2xl font-light leading-relaxed max-w-xl text-[#1A1A1A]/80 mb-12">
 Riayah Plus brings together intelligent systems and dedicated Care Navigators to turn complex care into clear, trackable progress without the constant coordination.
 </MotionP>

 <MotionDiv variants={fadeUp} className="flex flex-col sm:flex-row gap-6 mb-16">
 <Link to="/careseeker/login" className="group relative inline-flex items-center justify-center bg-[#005B82] text-[#F2F0E9] px-8 py-5 rounded-none overflow-hidden transition-all hover:bg-[#1f2b24]">
 <span className="relative z-10 font-sans font-semibold tracking-wide text-sm">Login as Careseeker</span>
 </Link>
 <Link to="/provider/login" className="group inline-flex items-center justify-center border border-[#1A1A1A] px-8 py-5 rounded-none overflow-hidden transition-all hover:bg-[#1A1A1A] hover:text-[#F2F0E9]">
 <span className="font-sans font-semibold tracking-wide text-sm">Login as Provider</span>
 </Link>
 </MotionDiv>

 <MotionDiv variants={fadeUp} className="font-mono text-xs uppercase tracking-widest leading-loose text-[#1A1A1A]/60 max-w-md">
 Purpose-built for disability and aged care, grounded in Australian expertise and real-world understanding of how care is delivered day to day.
 </MotionDiv>
 </MotionDiv>
 </div>

 <div className="lg:col-span-6 h-[50vh] lg:h-[80vh] relative min-h-[400px]">
 <MotionDiv
 initial={{ opacity: 0, clipPath: 'inset(10% 0 0 0)' }}
 animate={{ opacity: 1, clipPath: 'inset(0% 0 0 0)' }}
 transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
 className="size-full relative grid grid-cols-2 gap-4"
 >
 <div className="relative size-full bg-[#1A1A1A] overflow-hidden">
 <img src="/care-hero.png" alt="Care Professional with Client" className="absolute inset-0 size-full object-cover opacity-80" loading="lazy" />
 </div>
 <div className="relative size-full bg-[#005B82] p-8 flex flex-col gap-6 justify-center">
 <div className="w-full h-32 border border-[#F2F0E9]/20 p-4 flex flex-col justify-between">
 <div className="font-mono text-[10px] text-[#F2F0E9]/50 uppercase">Guidance Signal</div>
 <div className="w-full h-[1px] bg-[#F2F0E9]/20 relative">
 <MotionDiv
 animate={{ x: ["0%", "100%", "0%"] }}
 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
 className="absolute top-[-2px] left-0 w-8 h-[5px] bg-[#8CC63F]"
 />
 </div>
 </div>
 <div className="w-full h-48 border border-[#F2F0E9]/20 p-4">
 <div className="font-mono text-[10px] text-[#F2F0E9]/50 uppercase mb-4">Trackable Progress</div>
 <div className="space-y-3">
 <div className="h-6 w-full bg-[#F2F0E9]/10"><MotionDiv initial={{ width: 0 }} animate={{ width: "85%" }} transition={{ delay: 1, duration: 1.5 }} className="h-full bg-[#F2F0E9]/40" /></div>
 <div className="h-6 w-full bg-[#F2F0E9]/10"><MotionDiv initial={{ width: 0 }} animate={{ width: "62%" }} transition={{ delay: 1.2, duration: 1.5 }} className="h-full bg-[#F2F0E9]/40" /></div>
 </div>
 </div>
 </div>
 </MotionDiv>
 </div>
 </div>
 </section>
 );
};

export default function HeroAnimation() {
 return (
 <>
 <Header />
 <HeroSection />
 </>
 );
}
