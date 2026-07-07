
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";


import {

 ArrowLeft,
 ShieldCheck,
 Globe,
 Building,
 UserCheck,
 FileText,
 Search,
 Scale,
 ChevronRight,
 Menu,
 X,
 MessageSquareText
} from 'lucide-react';

export default function PrivacyPolicyPage() {
 const [activeSection, setActiveSection] = useState('overview');
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 const scrollToSection = (id: string) => {
 setActiveSection(id);
 const element = document.getElementById(id);
 if (element) {
 setTimeout(() => {
 element.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }, 100);
 }
 setMobileMenuOpen(false);
 };

 return (
 <div className="min-h-screen bg-stone-50 text-teal-900 font-sans selection:bg-teal-100 selection:text-teal-900">

 {/* Top Navigation Bar - Sticky */}
 <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-200 h-16 transition-all shadow-sm">
 <div className="max-w-7xl mx-auto px-4 lg:px-8 h-full flex items-center justify-between">
 <Link
 to="/"
 className="flex items-center gap-2 text-stone-500 hover:text-teal-600 transition-colors group"
 >
 <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-teal-50 transition-colors">
 <ArrowLeft className="size-4" />
 </div>
 <span className="font-medium text-sm">Return</span>
 </Link>

 <div className="hidden md:flex items-center gap-2 text-sm font-bold text-teal-700 tracking-wide uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
 <ShieldCheck className="size-4" />
 <span>Raiyah Plus Legal Center</span>
 </div>

 <button
 className="md:hidden p-2 text-stone-600"
 onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
 >
 {mobileMenuOpen ? <X /> : <Menu />}
 </button>
 </div>
 </nav>

 {/* Mobile Menu Overlay */}
 <AnimatePresence>
 {mobileMenuOpen && (
 <m.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="fixed inset-0 z-40 bg-white pt-20 px-6 md:hidden"
 >
 <div className="space-y-4">
 <button onClick={() => scrollToSection('overview')} className="block w-full text-left py-3 border-b border-stone-100 font-medium">Overview</button>
 <button onClick={() => scrollToSection('interpretation')} className="block w-full text-left py-3 border-b border-stone-100 font-medium">Interpretation</button>
 <button onClick={() => scrollToSection('definitions')} className="block w-full text-left py-3 border-b border-stone-100 font-medium">Definitions</button>
 <button onClick={() => scrollToSection('messaging')} className="block w-full text-left py-3 border-b border-stone-100 font-medium">Messaging Privacy</button>
 </div>
 </m.div>
 )}
 </AnimatePresence>

 <div className="pt-24 pb-20 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

 {/* Left Sidebar - Table of Contents (Desktop) */}
 <aside className="hidden lg:block lg:col-span-3">
 <div className="sticky top-28 space-y-8">
 <div className="space-y-1">
 <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest pl-3 mb-4">Table of Contents</h3>
 <nav className="flex flex-col gap-1 relative">
 {/* Active Indicator Line */}
 <div className="absolute left-0 w-0.5 bg-teal-200 h-full rounded-full" />

 {[
 { id: 'overview', label: 'Overview' },
 { id: 'interpretation', label: 'Interpretation' },
 { id: 'definitions', label: 'Definitions' },
 { id: 'messaging', label: 'Messaging Privacy' },
 ].map((item) => (
 <button
 key={item.id}
 onClick={() => scrollToSection(item.id)}
 className={`text-left px-4 py-2.5 text-sm font-medium rounded-r-lg transition-all duration-300 border-l-2 -ml-[2px] ${activeSection === item.id ? 'bg-gradient-to-r from-teal-50 to-transparent text-teal-700 border-teal-500 translate-x-1' : 'text-stone-500 hover:text-stone-800 border-transparent hover:bg-stone-50' }`}
 >
 {item.label}
 </button>
 ))}
 </nav>
 </div>

 {/* Contact Card */}
 <div className="bg-gradient-to-br from-teal-900 to-teal-800 rounded-2xl p-6 text-white overflow-hidden relative group shadow-lg">
 <div className="absolute -top-6 -right-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
 <ShieldCheck className="size-32 rotate-12" />
 </div>
 <div className="relative z-10">
 <h4 className="font-semibold text-lg mb-2">Privacy Questions?</h4>
 <p className="text-teal-100 text-xs mb-5 font-medium opacity-90 leading-relaxed">
 Our DPO is available to answer any questions about your data rights.
 </p>
 <a href="mailto:support@riayahplus.com" className="w-full py-2.5 bg-white text-teal-900 text-xs font-bold rounded-lg hover:bg-teal-50 hover:shadow-md transition-all flex items-center justify-center gap-2">
 Contact Support
 <ChevronRight className="size-3" />
 </a>
 </div>
 </div>
 </div>
 </aside>

 {/* Main Content Area */}
 <main className="lg:col-span-9 space-y-20">

 {/* Header / Hero */}
 <section id="overview" className="scroll-mt-28 relative">
 <m.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.6, ease: "easeOut" }}
 >
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold tracking-widest uppercase mb-8 border border-teal-100 shadow-sm">
 <span className="size-1.5 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]"></span>
 Last Updated: January 5, 2026
 </div>
 <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-stone-900 mb-8 leading-[1.1]">
 Privacy <span className="text-teal-600">Policy</span>
 </h1>
 <div className="prose prose-lg text-stone-600 max-w-none">
 <p className="lead text-xl md:text-2xl font-light text-stone-500 mb-8 max-w-3xl">
 We are transparent about your data. This policy outlines our practices concerning the collection, use, and disclosure of your information.
 </p>
 <div className="bg-white p-8 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
 <p className="m-0 relative z-10 text-stone-600">
 By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. We use Your Personal data to provide and improve the Service.
 </p>
 <div className="absolute top-0 right-0 size-32 bg-gradient-to-br from-teal-50 to-transparent rounded-bl-full opacity-50" />
 </div>
 </div>
 </m.div>
 </section>

 {/* Interpretation Section */}
 <section id="interpretation" className="scroll-mt-28">
 <div className="flex items-center gap-4 mb-8">
 <div className="size-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
 <Scale className="size-5" />
 </div>
 <h2 className="text-3xl font-semibold text-stone-900">Interpretation</h2>
 </div>

 <m.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 className="bg-white border border-stone-200 rounded-2xl p-8 lg:p-10 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
 >
 <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent opacity-50" />
 <p className="text-stone-600 leading-relaxed text-lg font-light">
 The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
 </p>
 </m.div>
 </section>

 {/* Definitions Section */}
 <section id="definitions" className="scroll-mt-28">
 <div className="flex items-center gap-4 mb-8">
 <div className="size-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
 <FileText className="size-5" />
 </div>
 <h2 className="text-3xl font-semibold text-stone-900">Definitions</h2>
 </div>
 <p className="text-stone-500 mb-10 text-lg">Key terms used throughout this privacy policy:</p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

 {/* Definition Card 1 */}
 <DefinitionCard
 title="Account"
 icon={<UserCheck className="size-5" />}
 content="Means a unique account created for You to access our Service or parts of our Service."
 delay={0.1}
 />

 {/* Definition Card 2 */}
 <DefinitionCard
 title="Business (CCPA)"
 icon={<Building className="size-5" />}
 content="Refers to the legal entity that collects Consumers' personal information and determines the purposes and means of the processing of Consumers' personal information."
 delay={0.2}
 />

 {/* Definition Card 3 - Highlighted */}
 <div className="md:col-span-2">
 <DefinitionCard
 title="Company"
 icon={<ShieldCheck className="size-6" />}
 content='Refers to "Raiyah Plus", "We", "Us" or "Our". For GDPR purposes, the Company is the Data Controller.'
 highlight
 delay={0.3}
 />
 </div>

 {/* Definition Card 4 */}
 <DefinitionCard
 title="Country"
 icon={<Globe className="size-5" />}
 content="Refers to Australia."
 delay={0.4}
 />

 {/* Definition Card 5 */}
 <DefinitionCard
 title="Consumer (CCPA)"
 icon={<Search className="size-5" />}
 content="Means a natural person who is a California resident, including individuals in the USA for other than a temporary purpose."
 delay={0.5}
 />

 </div>
 </section>

 {/* Messaging Privacy Section */}
 <section id="messaging" className="scroll-mt-28">
 <div className="flex items-center gap-4 mb-8">
 <div className="size-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700">
 <MessageSquareText className="size-5" />
 </div>
 <h2 className="text-3xl font-semibold text-stone-900">Messaging Privacy & Consent</h2>
 </div>

 <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
 <div className="prose prose-slate max-w-none">
 <p className="text-lg text-stone-600 mb-6 font-medium">
 Compliance regarding user phone numbers and messaging (WhatsApp & SMS).
 </p>
 <p className="text-stone-600 mb-6 leading-relaxed">
 By explicitly providing your phone number during the signup process (checking the opt-in box), you consent to receive necessary service communications from <strong>Raiyah Plus</strong> via WhatsApp and SMS.
 </p>

 <h4 className="font-semibold text-stone-900 mb-4">Acceptable Use of Your Phone Number:</h4>
 <ul className="grid sm:grid-cols-2 gap-4 list-none pl-0 mb-8">
 {[
 'Account activity verification (2FA)',
 'Booking confirmations & scheduling',
 'Direct customer support communication',
 'Urgent service updates'
 ].map((item) => (
 <li key={item} className="flex items-center gap-3 text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
 <div className="size-1.5 rounded-full bg-teal-500 flex-shrink-0" />
 {item}
 </li>
 ))}
 </ul>

 <div className="bg-teal-50 border border-teal-100 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start">
 <div className="p-3 bg-white rounded-lg text-teal-600 shadow-sm shrink-0">
 <ShieldCheck className="size-6" />
 </div>
 <div>
 <h4 className="font-semibold text-teal-900 text-lg mb-2">Strict Data Non-Distribution Policy</h4>
 <p className="text-teal-800/80 leading-relaxed text-sm">
 <strong>We do not share, sell, rent, or trade your personal phone number or SMS consent with third parties or affiliates</strong> for marketing or promotional purposes. Your number is strictly used for the transactional and support services you have opted into.
 </p>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* Footer Note */}
 <div className="mt-24 pt-10 border-t border-stone-200">
 <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-stone-400 text-sm font-medium">
 <p>© 2026 Raiyah Plus. All rights reserved.</p>
 <div className="flex gap-6">
 <a href="#" className="hover:text-teal-600 transition-colors">Terms of Service</a>
 <a href="#" className="hover:text-teal-600 transition-colors">Cookie Policy</a>
 </div>
 </div>
 </div>

 </main>
 </div>
 </div>
 </div>
 );
}

function DefinitionCard({ title, icon, content, highlight = false, delay = 0 }: { title: string, icon: React.ReactNode, content: string, highlight?: boolean, delay?: number }) {
 return (
 <m.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ delay: delay, duration: 0.4 }}
 className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 h-full flex flex-col ${highlight ? 'bg-teal-900 text-white shadow-xl ring-4 ring-teal-50/50' : 'bg-white border border-stone-100 text-stone-600 hover:border-teal-200 hover:shadow-lg hover:-translate-y-1' }`}>
 {highlight && (
 <div className="absolute top-0 right-0 size-64 bg-teal-800 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
 )}

 <div className="flex items-start justify-between mb-6 relative z-10">
 <h3 className={`font-semibold text-lg tracking-tight ${highlight ? 'text-white' : 'text-stone-900 group-hover:text-teal-700 transition-colors'}`}>
 {title}
 </h3>
 <div className={`p-2.5 rounded-xl transition-all duration-300 shadow-sm ${highlight ? 'bg-teal-800 text-teal-100' : 'bg-stone-50 text-stone-400 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
 {icon}
 </div>
 </div>

 <p className={`text-sm leading-7 font-medium relative z-10 ${highlight ? 'text-teal-100/90' : 'text-stone-500'}`}>
 {content}
 </p>

 {!highlight && (
 <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-teal-400 to-teal-600 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out" />
 )}
 </m.div>
 );
}
