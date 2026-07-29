
import { Link } from 'react-router-dom';
import { MotionDiv, MotionH2, MotionP } from '@/components/animations/MotionWrapper';

const fadeUp = {
 hidden: { opacity: 0, y: 40 },
 visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } }
};

const RealitySection = () => {
 return (
 <section id="reality" className="py-32 md:py-48 bg-[#1A1A1A] text-[#F2F0E9] px-6 md:px-12 relative">
 <div className="max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-24">
 <MotionDiv
 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUp}
 >
 <h2 className="text-4xl md:text-6xl lg:text-[4.5rem] leading-[1.05] tracking-tighter font-sans font-semibold mb-12">
 Care shouldn&apos;t <br />
 <span className="font-serif italic font-normal text-[#00A9C1]">feel like a second <br />full-time job.</span>
 </h2>

 <div className="font-mono text-sm tracking-widest uppercase text-[#F2F0E9]/40 mb-12">The Reality of Complexity</div>

 <ul className="space-y-6 text-xl md:text-2xl font-light text-[#F2F0E9]/80 border-l border-[#F2F0E9]/20 pl-8">
 <li className="relative before:content-[''] before:absolute before:left-[-32px] before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-[1px] before:bg-[#8CC63F]">Chasing updates from support workers</li>
 <li className="relative before:content-[''] before:absolute before:left-[-32px] before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-[1px] before:bg-[#8CC63F]">Coordinating appointments and schedules</li>
 <li className="relative before:content-[''] before:absolute before:left-[-32px] before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-[1px] before:bg-[#8CC63F]">Trying to turn clinical advice into day-to-day actions</li>
 <li className="relative before:content-[''] before:absolute before:left-[-32px] before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-[1px] before:bg-[#8CC63F]">Ensuring goals are actually followed</li>
 </ul>
 </MotionDiv>

 <MotionDiv
 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUp}
 className="flex flex-col justify-end"
 >
 <div className="border border-[#F2F0E9]/20 p-12 bg-[#F2F0E9]/5">
 <div className="font-mono text-6xl md:text-8xl text-[#00A9C1] mb-6">15–20+<span className="text-2xl">hrs</span></div>
 <p className="text-2xl font-serif mb-8">Most families spend 15–20+ hours per week coordinating care manually.</p>
 <div className="h-[1px] w-full bg-[#F2F0E9]/20 mb-8" />
 <p className="text-lg font-light text-[#F2F0E9]/60">
 Without structure, independence is hard to measure and even harder to sustain.
 </p>
 </div>
 </MotionDiv>
 </div>
 </section>
 );
};

const BeliefSection = () => {
 return (
 <section id="belief" className="py-32 md:py-48 bg-[#005B82] text-[#F2F0E9] px-6 md:px-12 text-center overflow-hidden">
 <div className="max-w-[1200px] mx-auto">
 <MotionDiv initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
 <h2 className="text-5xl md:text-7xl lg:text-[6rem] leading-[1] tracking-tighter font-sans font-semibold mb-24">
 Good care is human.<br />
 <span className="font-serif italic font-normal text-[#00A9C1]">Consistent care is structured.</span>
 </h2>
 </MotionDiv>

 <div className="grid md:grid-cols-3 gap-12 font-light text-lg mb-32 text-left">
 <MotionDiv initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
 <div className="font-mono text-xs uppercase tracking-widest text-[#8CC63F] mb-6">01 // Families</div>
 <p className="border-t border-[#F2F0E9]/20 pt-6">Shouldn&apos;t carry the coordination burden alone. Care breaks down between appointments not during them.</p>
 </MotionDiv>
 <MotionDiv initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
 <div className="font-mono text-xs uppercase tracking-widest text-[#8CC63F] mb-6">02 // Clinicians</div>
 <p className="border-t border-[#F2F0E9]/20 pt-6">Shouldn&apos;t wonder what happens between visits. Their strategic input requires operational execution.</p>
 </MotionDiv>
 <MotionDiv initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
 <div className="font-mono text-xs uppercase tracking-widest text-[#8CC63F] mb-6">03 // Support Workers</div>
 <p className="border-t border-[#F2F0E9]/20 pt-6">Deserve clear guidance and total accountability to deliver their best operational care.</p>
 </MotionDiv>
 </div>

 <MotionDiv initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="text-2xl md:text-4xl font-serif max-w-4xl mx-auto leading-relaxed">
 &quot;Technology reduces complexity. Humans provide judgment.<br /> <span className="text-[#00A9C1] italic">Together, care becomes predictable.</span>&quot;
 </MotionDiv>
 </div>
 </section>
 );
};

const HowItWorksSection = () => {
 const steps = [
 {
 num: "01",
 title: "Apply & Understand",
 desc: "Families submit a simple application outlining their needs, goals, and current situation. We gather the right information upfront so nothing important is missed."
 },
 {
 num: "02",
 title: "Build the Care Plan",
 desc: "A dedicated Care Navigator works with the family to create a structured care plan. This plan translates clinical advice and personal goals into clear, actionable steps tailored to the individual."
 },
 {
 num: "03",
 title: "Coordinate & Execute",
 desc: "Your Care Navigator stays with you ensuring the plan is followed consistently. Support workers operate within structured workflows. Smart recommendations surface at the right moment.",
 tag: "One point of contact. Full visibility. Total accountability."
 },
 {
 num: "04",
 title: "Track & Improve",
 desc: "Families see real-time progress across health, daily living, and independence. Insights highlight what&apos;s working, what needs attention, and what to do next."
 }
 ];

 return (
 <section id="how-it-works" className="py-32 md:py-48 bg-[#F2F0E9] text-[#1A1A1A] px-6 md:px-12">
 <div className="max-w-[1600px] mx-auto grid lg:grid-cols-12 gap-24">
 <div className="lg:col-span-5 relative">
 <div className="sticky top-48">
 <MotionH2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-4xl md:text-6xl tracking-tighter font-sans font-semibold mb-8">
 From application to<br />
 <span className="font-serif italic font-normal text-[#005B82]">real-world independence.</span>
 </MotionH2>
 <MotionP initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-xl text-[#1A1A1A]/70 mb-12">
 No chasing. No guessing. Just coordinated care that moves forward.
 </MotionP>
 </div>
 </div>

 <div className="lg:col-span-7">
 <div className="flex flex-col gap-12">
 {steps.map((step) => (
 <MotionDiv
 key={step.num}
 initial={{ opacity: 0, x: 20 }}
 whileInView={{ opacity: 1, x: 0 }}
 viewport={{ once: true, margin: "-10%" }}
 transition={{ duration: 0.6 }}
 className="group border-t border-[#1A1A1A]/20 pt-8"
 >
 <div className="flex flex-col md:flex-row gap-6 md:gap-12">
 <div className="font-mono text-3xl text-[#00A9C1] flex-shrink-0">{step.num}</div>
 <div>
 <h3 className="text-3xl font-sans font-semibold mb-4 tracking-tight">{step.title}</h3>
 <p className="text-xl font-light leading-relaxed text-[#1A1A1A]/80 mb-6">{step.desc}</p>
 {step.tag && (
 <div className="inline-block bg-[#005B82] text-[#F2F0E9] px-4 py-2 font-mono text-xs uppercase tracking-widest">
 {step.tag}
 </div>
 )}
 </div>
 </div>
 </MotionDiv>
 ))}
 </div>
 </div>
 </div>
 </section>
 );
};

const ValueSection = () => {
 return (
 <section className="py-32 md:py-48 bg-[#F2F0E9] text-[#1A1A1A] border-t border-[#1A1A1A]/10 px-6 md:px-12">
 <div className="max-w-[1600px] mx-auto text-center mb-24">
 <MotionH2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-5xl md:text-7xl lg:text-[6rem] leading-[0.9] tracking-tighter font-sans font-semibold mb-6">
 Less admin.<br />
 <span className="font-serif italic font-normal text-[#005B82]">More living.</span>
 </MotionH2>
 </div>

 <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-x-24 gap-y-12">
 {[
 "Reclaim 15–20+ hours per week",
 "See exactly what&apos;s happening without constant follow-up",
 "Reduce stress and mental load",
 "Track real independence not just assumptions",
 "Feel confident that nothing important is being missed"
 ].map((val, idx) => (
 <MotionDiv
 key={val}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ delay: idx * 0.1 }}
 className="flex items-start gap-6 border-b border-[#1A1A1A]/10 pb-8"
 >
 <div className="size-2 mt-3 bg-[#8CC63F] flex-shrink-0" />
 <div className="text-2xl font-light text-[#1A1A1A]/80 leading-relaxed">{val}</div>
 </MotionDiv>
 ))}
 </div>
 </section>
 );
};

const DifferentiationSection = () => {
 return (
 <section className="py-32 md:py-48 bg-[#1A1A1A] text-[#F2F0E9] px-6 md:px-12">
 <div className="max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-24 items-center">
 <MotionDiv initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
 <h2 className="text-5xl md:text-7xl tracking-tighter font-sans font-semibold mb-16">
 Not another app.<br />
 <span className="font-serif italic font-normal text-[#00A9C1]">Not another agency.</span>
 </h2>

 <div className="font-mono text-lg uppercase tracking-widest text-[#F2F0E9]/50 mb-12 space-y-4">
 <div className="flex gap-4 items-center">
 <span className="text-[#8CC63F]">[ / ]</span> <s className="opacity-50">We replace clinicians.</s>
 </div>
 <div className="flex gap-4 items-center">
 <span className="text-[#8CC63F]">[ / ]</span> <s className="opacity-50">We provide staffing.</s>
 </div>
 <div className="flex gap-4 items-center">
 <span className="text-[#8CC63F]">[ / ]</span> <s className="opacity-50">We simply digitise paperwork.</s>
 </div>
 </div>

 <p className="text-2xl font-light leading-relaxed mb-8">
 Riayah Plus is the coordination infrastructure that keeps everyone aligned purpose-built for disability and aged care, grounded in Australian expertise and real-world care delivery.
 </p>

 <p className="text-xl font-serif text-[#00A9C1] border-l-2 border-[#00A9C1] pl-6 py-2">
 Independence isn&apos;t accidental it&apos;s engineered.<br /> And without coordination, even the best care plans fail.
 </p>
 </MotionDiv>

 <MotionDiv
 initial={{ opacity: 0, scale: 0.95 }}
 whileInView={{ opacity: 1, scale: 1 }}
 viewport={{ once: true }}
 className="bg-[#005B82] p-12 md:p-16 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 size-64 bg-[#00A9C1] opacity-20 blur-[100px]" />
 <h3 className="text-3xl font-sans font-semibold mb-4 tracking-tight">Designed with the people who understand care best</h3>
 <p className="text-lg font-light text-[#F2F0E9]/70 mb-12">Developed in consultation with:</p>

 <ul className="space-y-4 font-mono text-sm uppercase tracking-widest text-[#F2F0E9]/90 mb-16">
 <li className="flex justify-between border-b border-[#F2F0E9]/10 pb-4"><span>Independent support coordinators</span> <span className="text-[#8CC63F]">+</span></li>
 <li className="flex justify-between border-b border-[#F2F0E9]/10 pb-4"><span>Allied health professionals</span> <span className="text-[#8CC63F]">+</span></li>
 <li className="flex justify-between border-b border-[#F2F0E9]/10 pb-4"><span>Community care advisors</span> <span className="text-[#8CC63F]">+</span></li>
 <li className="flex justify-between border-b border-[#F2F0E9]/10 pb-4"><span>Technology and data specialists</span> <span className="text-[#8CC63F]">+</span></li>
 </ul>

 <Link to="/partner" className="group inline-flex items-center justify-center border border-[#F2F0E9] px-8 py-5 transition-all hover:bg-[#F2F0E9] hover:text-[#005B82] w-full">
 <span className="font-sans font-semibold tracking-wide text-sm">Become a Founding Partner</span>
 </Link>
 </MotionDiv>
 </div>
 </section>
 );
};

const CTASection = () => {
 return (
 <section className="py-32 md:py-48 bg-[#005B82] text-[#F2F0E9] px-6 md:px-12 text-center overflow-hidden relative">
 <div className="max-w-[1200px] mx-auto relative z-10">
 <MotionDiv initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
 <h2 className="text-5xl md:text-7xl lg:text-[8rem] leading-[0.9] tracking-tighter font-sans font-semibold mb-12">
 Independence <br />
 <span className="font-serif italic font-normal text-[#1A1A1A]">deserves structure.</span>
 </h2>
 <p className="text-xl md:text-3xl font-light mb-16 max-w-3xl mx-auto text-[#F2F0E9]/90">
 Join the 2026 pilot and help shape a better way to deliver care where intelligent systems and human guidance work together seamlessly.
 </p>

 <div className="flex flex-col sm:flex-row gap-6 justify-center">
 <Link to="/login?portal=family" className="group relative inline-flex items-center justify-center bg-[#1A1A1A] text-[#F2F0E9] px-10 py-6 overflow-hidden transition-all hover:bg-[#F2F0E9] hover:text-[#1A1A1A]">
 <span className="relative z-10 font-sans font-semibold tracking-widest text-sm uppercase">Family Portal</span>
 </Link>
 <Link to="/register" className="group inline-flex items-center justify-center border border-[#1A1A1A] text-[#1A1A1A] px-10 py-6 overflow-hidden transition-all hover:bg-[#1A1A1A] hover:text-[#F2F0E9]">
 <span className="font-sans font-semibold tracking-widest text-sm uppercase">Create Family Account</span>
 </Link>
 </div>
 </MotionDiv>
 </div>
 </section>
 );
};

export default function ScrollEffects() {
 return (
 <>
 <RealitySection />
 <BeliefSection />
 <HowItWorksSection />
 <ValueSection />
 <DifferentiationSection />
 <CTASection />
 </>
 );
}
