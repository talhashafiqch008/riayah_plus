
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ArrowRight, ArrowLeft, Award, Check, Upload, FileText, CheckCircle, X, AlertCircle, Calendar, Link } from "lucide-react";
import { DatePicker } from "../../../components/ui/DatePicker";
import { AU_PROFESSIONS } from "./StepRoleCountry";
import type { ProviderOnboardingData } from "../OnboardingPage";

// Issuing authorities by country - Qatar and Egypt focused
const ISSUING_AUTHORITIES = [
 { id: 'QCHP', label: 'QCHP - Qatar Council for Healthcare Practitioners', country: 'QAT' },
 { id: 'MOH_QAT', label: 'MOH - Qatar Ministry of Public Health', country: 'QAT' },
 { id: 'EHA', label: 'EHA - Egyptian Health Authority', country: 'EGY' },
 { id: 'MOH_EGY', label: 'MOH - Egypt Ministry of Health', country: 'EGY' },
 { id: 'OTHER', label: 'Other International Authority', country: 'ALL' },
];

const LICENSE_TYPES = [
 { id: 'RN', label: 'Registered Nurse' },
 { id: 'LPN', label: 'Licensed Practical Nurse' },
 { id: 'PHYSIO', label: 'Physiotherapist' },
 { id: 'OT', label: 'Occupational Therapist' },
 { id: 'SLP', label: 'Speech Language Pathologist' },
 { id: 'DIETITIAN', label: 'Dietitian / Nutritionist' },
 { id: 'PSYCHOLOGIST', label: 'Psychologist' },
];



const SPECIALTIES = [
 'Geriatrics', 'Pediatrics', 'Mental Health', 'Rehabilitation',
 'Wound Care', 'Diabetes Management', 'Palliative Care', 'Home Health',
 'Post-Surgery Care', 'Dementia Care', 'Neurological Care', 'Others'
];

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

interface StepCredentialsClinicalProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
}

export default function StepCredentialsClinical({ data, onUpdate, onNext, onBack }: StepCredentialsClinicalProps) {
 const credentials = (data.clinicalCredentials as Record<string, unknown>) || {};
 const selectedSpecialties: string[] = (credentials.specialties as string[]) || [];
 const licenseFile = (data.documents?.['professional_license'] as Record<string, unknown> | undefined);

 const updateCredentials = (field: string, value: string | string[] | File | null) => {
 onUpdate({
 clinicalCredentials: {
 ...credentials,
 [field]: value
 }
 });
 };

 const handleFileUpload = (file: File) => {
 // Update main documents object
 onUpdate({
 documents: {
 ...(data.documents || {}),
 ['professional_license']: {
 file: file,
 name: file.name,
 size: file.size,
 type: file.type,
 lastModified: file.lastModified,
 status: 'uploaded'
 }
 }
 });
 };

 const removeFile = (e: React.MouseEvent) => {
 e.stopPropagation();
 e.preventDefault();
 const newDocs = { ...(data.documents || {}) };
 delete newDocs['professional_license'];
 onUpdate({ documents: newDocs });
 };

 const toggleSpecialty = (specialty: string) => {
 const newSpecialties = selectedSpecialties.includes(specialty)
 ? selectedSpecialties.filter(s => s !== specialty)
 : [...selectedSpecialties, specialty];

 // Clear other specialty text if simplified
 if (specialty === 'Others' && selectedSpecialties.includes('Others')) {
 updateCredentials('otherSpecialty', '');
 }

 updateCredentials('specialties', newSpecialties);
 };

 // If Others is selected, text must be provided
 (!selectedSpecialties.includes('Others') || ((credentials.otherSpecialty as string) && (credentials.otherSpecialty as string).trim().length > 0));

 // Australian specific requirements
 // Australian specific requirements
 const isAustralia = data.country === 'AUS';

 // Get selected US profession details (use data.role as primary source for AU professions)
 // Note: AU_PROFESSIONS structure in StepRoleCountry might differ slightly (check keys). 
 // In StepRoleCountry: { id, label, icon, description } ( wait, I need to check if I added 'license' there)
 // I did NOT add 'license' field to StepRoleCountry AU_PROFESSIONS. I added 'description' which holds the license name mostly.
 // Let's check the previous edit to StepRoleCountry.
 // Yes: { id: 'OT', label: 'Occupational Therapist', icon: '🤲', description: 'AHPRA Registration' }
 // So I should use 'description' as the license name.

 const selectedAuProfession = AU_PROFESSIONS.find(p => p.id === data.role);
 const registrationLabel = selectedAuProfession ? selectedAuProfession.description : 'Professional Registration';

 const australianChecks = [
 { id: 'professional_registration', label: registrationLabel, required: true },
 { id: 'working_with_children', label: 'Working with Children Check', required: true },
 { id: 'ndis_worker_screening', label: 'NDIS Worker Screening', required: true },
 { id: 'work_orientation_module', label: 'Work Orientation Module', required: true },
 { id: 'police_check', label: 'National Police Check', required: true },
 { id: 'first_aid', label: 'First Aid Certificate', required: true },
 { id: 'infection_control', label: 'Infection Control Certificate', required: true },
 { id: 'pii_insurance', label: 'Professional Indemnity Insurance', required: true },
 { id: 'qualifications', label: 'Qualifications / Degree', required: true },
 ];

 // Validation
 const isValidAUS = isAustralia && australianChecks.every(check =>
 !check.required || ((data.documents?.[check.id] as Record<string, unknown>)?.status === 'uploaded')
 );

 const isValidGlobal = !isAustralia && credentials.licenseNumber as string &&
 credentials.licenseType as string &&
 credentials.licenseExpiry as string &&
 licenseFile &&
 credentials.issuingAuthority as string &&
 (!selectedSpecialties.includes('Others') || ((credentials.otherSpecialty as string) && (credentials.otherSpecialty as string).trim().length > 0));

 const isValid = isAustralia ? isValidAUS : isValidGlobal;

 // Filter authorities by selected country
 const relevantAuthorities = ISSUING_AUTHORITIES.filter(
 auth => auth.country === data.country || auth.country === 'ALL'
 );

 return (
 <div className="space-y-10">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 ring-4 ring-teal-50">
 <Award className="size-7 text-white" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">Professional Credentials</h2>
 <p className="text-stone-500 text-lg">Provide your license details for verification.</p>
 </div>
 </div>
 </m.div>

 {/* License Information Form (Hide for AUS as they upload docs directly) */}
 {!isAustralia && (
 <m.div
 {...fadeIn}
 transition={{ delay: 0.1 }}
 className="space-y-6"
 >
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">1</span>
 <h3 className="text-xl font-semibold text-stone-900">
 License Details
 </h3>
 </div>

 <div className="p-8 bg-white rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-100/50">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-3">
 <label htmlFor="license-number--span-classname--text-red-500-----span" className="text-sm font-bold text-stone-700 uppercase tracking-wide">License Number <span className="text-red-500">*</span></label>
 <input id="license-number--span-classname--text-red-500-----span"
 type="text"
 value={(credentials.licenseNumber as string) || ''}
 onChange={(e) => updateCredentials('licenseNumber', e.target.value)}
 placeholder="e.g. QCHP-N-XXXXX"
 className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-bold text-lg text-stone-900 placeholder:text-stone-300 placeholder:font-medium"
 />
 </div>

 <div className="space-y-3">
 <label htmlFor="license-type--span-classname--text-red-500-----span" className="text-sm font-bold text-stone-700 uppercase tracking-wide">License Type <span className="text-red-500">*</span></label>
 <div className="relative">
 <select id="license-type--span-classname--text-red-500-----span"
 value={(credentials.licenseType as string) || ''}
 onChange={(e) => updateCredentials('licenseType', e.target.value)}
 className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-bold text-lg text-stone-900 appearance-none cursor-pointer"
 >
 <option value="" className="text-stone-300">Select profession…</option>
 {LICENSE_TYPES.map((type) => (
 <option key={type.id} value={type.id} className="text-stone-900">{type.label}</option>
 ))}
 </select>
 <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
 <ArrowRight className="size-5 rotate-90" />
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <span className="text-sm font-bold text-stone-700 uppercase tracking-wide">Expiration Date <span className="text-red-500">*</span></span>
 <div className="[&>div]:w-full [&_input]:w-full [&_input]:p-4 [&_input]:bg-stone-50 [&_input]:border-2 [&_input]:border-stone-100 [&_input]:rounded-2xl [&_input]:font-bold [&_input]:text-lg [&_input]:text-stone-900 [&_input]:placeholder-stone-300">
 <DatePicker
 value={(credentials.licenseExpiry as string) || ''}
 onChange={(date) => updateCredentials('licenseExpiry', date)}
 placeholder="Select expiry date"
 />
 </div>
 </div>

 <div className="space-y-3">
 <label htmlFor="issuing-authority--span-classname--text-red-500-----span" className="text-sm font-bold text-stone-700 uppercase tracking-wide">Issuing Authority <span className="text-red-500">*</span></label>
 <div className="relative">
 <select id="issuing-authority--span-classname--text-red-500-----span"
 value={(credentials.issuingAuthority as string) || ''}
 onChange={(e) => updateCredentials('issuingAuthority', e.target.value)}
 className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-bold text-lg text-stone-900 appearance-none cursor-pointer"
 >
 <option value="" className="text-stone-300">Select authority…</option>
 {relevantAuthorities.map((auth) => (
 <option key={auth.id} value={auth.id} className="text-stone-900">{auth.label}</option>
 ))}
 </select>
 <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
 <ArrowRight className="size-5 rotate-90" />
 </div>
 </div>
 </div>
 </div>
 </div>
 </m.div>
 )}

 {/* License File Upload (Global) or Multi-Check Upload (AUS) */}
 <m.div {...fadeIn} transition={{ delay: 0.15 }}>

 {isAustralia ? (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Required Checks & Certifications
 </h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {australianChecks.map((check) => {
 const file = (data.documents?.[check.id] as Record<string, unknown> | undefined);
 const inputId = `upload-${check.id}`;
 return (
 <div key={check.id} className="relative">
 <input
 id={inputId}
 type="file"
 className="hidden"
 accept=".pdf,.jpg,.jpeg,.png"
 onChange={(e) => {
 if (e.target.files && e.target.files[0]) {
 const f = e.target.files[0];
 onUpdate({
 documents: {
 ...(data.documents || {}),
 [check.id]: {
 file: f,
 name: f.name,
 size: f.size,
 type: f.type,
 lastModified: f.lastModified,
 status: 'uploaded'
 }
 }
 });
 }
 }}
 />
  <label
  htmlFor={inputId}
  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${file ? 'border-teal-500 bg-teal-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}
  >
 <div className="flex items-center gap-3 overflow-hidden">
 <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${file ? 'bg-teal-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
 {file ? <Check className="size-5" /> : <Upload className="size-5" />}
 </div>
 <div className="min-w-0">
 <p className={`text-sm font-bold truncate ${file ? 'text-teal-900' : 'text-stone-700'}`}>{check.label}</p>
 {file && <p className="text-xs text-teal-600 truncate">{file.name as string}</p>}
  </div>
  </div>
  </label>
  </div>
 );
 })}
 </div>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Upload License Document
 </h3>
 </div>
 </div>

 <div className="relative">
 <input
 id="license-upload"
 type="file"
 className="hidden"
 accept=".pdf,.jpg,.jpeg,.png"
 onChange={(e) => {
 if (e.target.files && e.target.files[0]) {
 handleFileUpload(e.target.files[0]);
 }
 }}
 />

 <label
 htmlFor="license-upload"
 className={`group w-full p-10 rounded-[2rem] border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden relative ${licenseFile ? 'border-teal-500 bg-teal-50/50' : 'border-stone-300 bg-stone-50 hover:bg-white hover:border-teal-400 hover:shadow-xl hover:-translate-y-1' }`}
 >
 {!licenseFile && <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none" />}

 {licenseFile ? (
 <>
 <div className="size-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white mb-2 shadow-lg shadow-teal-200">
 <CheckCircle className="size-10 stroke-[3px]" />
 </div>
 <div className="text-center z-10">
 <h4 className="font-semibold text-teal-900 text-xl mb-1">File Uploaded Successfully</h4>
 <p className="text-base text-teal-600 font-medium mb-6 bg-white/50 px-4 py-1 rounded-full">{licenseFile.name as string}</p>
 <button
 onClick={removeFile}
 className="px-6 py-3 bg-white text-red-500 border-2 border-red-100 hover:border-red-200 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors shadow-sm"
 >
 Remove File
 </button>
 </div>
 </>
 ) : (
 <>
 <div className="size-20 rounded-3xl bg-white shadow-md flex items-center justify-center text-stone-300 group-hover:text-teal-500 group-hover:scale-110 transition-all duration-300 mb-2">
 <Upload className="size-10 stroke-[1.5px]" />
 </div>
 <div className="text-center z-10">
 <h4 className="font-semibold text-stone-900 text-xl group-hover:text-teal-700 transition-colors">Click to upload license copy</h4>
 <p className="text-base text-stone-500 mt-2 font-medium">
 Support formats: PDF, JPG, PNG (Max 5MB)
 </p>
 </div>
 </>
 )}
 </label>
 </div>
 </>
 )}
 </m.div>

 {/* Specialties */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }}>
 <div className="flex items-center gap-3 mb-6 mt-8">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">3</span>
 <h3 className="text-xl font-semibold text-stone-900">
 {isAustralia ? 'Expertise' : 'Clinical Expertise'}
 </h3>
 </div>

 <div className="bg-stone-50/50 p-8 rounded-[2rem] border border-stone-100">
 <div className="flex flex-wrap gap-3">
 {SPECIALTIES.map((specialty, index) => {
 const isSelected = selectedSpecialties.includes(specialty);
 return (
 <m.button
 key={specialty}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: 0.2 + index * 0.02 }}
 onClick={() => toggleSpecialty(specialty)}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 border shadow-sm ${isSelected ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-purple-200' : 'bg-white text-stone-600 border-stone-200 hover:border-purple-200 hover:text-purple-700' }`}
 >
 {isSelected && <Check className="size-4 text-white stroke-[3px]" />}
 {specialty}
 </m.button>
 );
 })}
 </div>

 {/* Other Specialty Input */}
 {selectedSpecialties.includes('Others') && (
 <m.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="mt-6 max-w-md"
 >
 <label htmlFor="please-specify-your-expertise--span-classname--text-red-500-----span" className="text-sm font-bold text-stone-700 block mb-2 uppercase tracking-wide">Please specify your expertise <span className="text-red-500">*</span></label>
 <input id="please-specify-your-expertise--span-classname--text-red-500-----span"
 type="text"
 value={(credentials.otherSpecialty as string) || ''}
 onChange={(e) => updateCredentials('otherSpecialty', e.target.value)}
 placeholder="e.g. Oncology, Cardiology..."
 className="w-full p-4 border-2 border-stone-200 rounded-2xl focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-100 bg-white transition-all font-bold text-stone-900"
 />
 </m.div>
 )}

 {selectedSpecialties.length === 0 && (
 <div className="flex items-center gap-2 mt-4 text-stone-400 text-sm font-medium bg-white px-4 py-2 rounded-xl w-fit border border-stone-100">
 <AlertCircle className="size-4" />
 Select at least one specialty area to proceed.
 </div>
 )}
 </div>
 </m.div>

 {/* Hobbies Section */}
 <m.div {...fadeIn} transition={{ delay: 0.25 }}>
 <div className="flex items-center gap-3 mb-6 mt-8">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">{isAustralia ? '4' : '4'}</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Interests & Hobbies
 </h3>
 </div>
 <div className="p-8 bg-white rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-100/50">
 <div className="space-y-3">
 <label htmlFor="hobbies--optional" className="text-sm font-bold text-stone-700 uppercase tracking-wide">Hobbies (Optional)</label>
 <textarea id="hobbies--optional"
 value={(credentials.hobbies as string) || ''}
 onChange={(e) => updateCredentials('hobbies', e.target.value)}
 placeholder="e.g. Reading, Hiking, Cooking..."
 className="w-full p-4 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-bold text-lg text-stone-900 placeholder:text-stone-300 placeholder:font-medium min-h-[100px]"
 />
 </div>
 </div>
 </m.div>

 {/* Error Message */}
 {!isValid && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 border-l-4 border-l-amber-500 mt-4"
 >
 <AlertCircle className="size-5 text-amber-500 shrink-0" />
 <span className="font-medium">Please complete all license fields, upload your license document, and specify at least one area of expertise.</span>
 </m.div>
 )}

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.3 }}
 className="flex justify-between items-center pt-8 border-t border-stone-50 mt-6"
 >
 <button
 onClick={onBack}
 className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-600 transition-colors px-6 py-3 hover:bg-stone-50 rounded-2xl"
 >
 <ArrowLeft className="size-4 stroke-[3px]" />
 Back
 </button>
 <m.button
 onClick={onNext}
 disabled={!isValid}
 whileHover={isValid ? { scale: 1.02, x: 5 } : {}}
 whileTap={isValid ? { scale: 0.98 } : {}}
 className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-3 ${isValid ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-stone-300 hover:shadow-xl' : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none' }`}
 >
 Continue
 <ArrowRight className="size-5 stroke-[3px]" />
 </m.button>
 </m.div>
 </div>
 );
}
