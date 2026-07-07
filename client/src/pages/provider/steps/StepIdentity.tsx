
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, ArrowRight, User, CreditCard, Upload, FileText, Shield, Image as ImageIcon, CheckCircle, AlertCircle, Building2, Stethoscope, Briefcase, X, FolderOpen, Check } from "lucide-react";
import type { ProviderOnboardingData } from "../OnboardingPage";

interface StepIdentityProps {
 data: ProviderOnboardingData;
 onUpdate: (data: Partial<ProviderOnboardingData>) => void;
 onNext: () => void;
 onBack: () => void;
 isLoggedIn?: boolean;
}

interface DocRequirement {
 id: string;
 label: string;
 desc: string;
 icon: React.ComponentType<{ className?: string }>;
 color: string;
 bg: string;
 border: string;
 optional?: boolean;
 multiple?: boolean;
}

const fadeIn = {
 initial: { opacity: 0, y: 10 },
 animate: { opacity: 1, y: 0 },
};

export default function StepIdentity({ data, onUpdate, onNext, onBack }: StepIdentityProps) {
 const isAgency = data.providerType === 'AGENCY_CLINIC';

 // Ensure documents object exists
 const uploadedDocs = data.documents || {};

 const handleFileUpload = (docId: string, files: File | File[]) => {
 const fileList = Array.isArray(files) ? files : [files];

 if (docId === 'other') {
 const currentFiles = Array.isArray(uploadedDocs['other']) ? uploadedDocs['other'] : [];
 const newFiles = fileList.map(file => ({
 id: Math.random().toString(36).substr(2, 9),
 file: file,
 name: file.name,
 size: file.size,
 type: file.type,
 lastModified: file.lastModified,
 status: 'uploaded'
 }));

 onUpdate({
 documents: {
 ...uploadedDocs,
 'other': [...currentFiles, ...newFiles]
 }
 });
 return;
 }

 const file = fileList[0];
 if (!file) return;

 onUpdate({
 documents: {
 ...uploadedDocs,
 [docId]: {
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

 const removeFile = (docId: string, e: React.MouseEvent, otherFileId?: string) => {
 e.stopPropagation();
 e.preventDefault();
 const newDocs = { ...uploadedDocs };

 if (docId === 'other' && otherFileId) {
 newDocs['other'] = (newDocs['other'] as Array<{ id: string }>).filter(f => f.id !== otherFileId);
 if ((newDocs['other'] as Array<{ id: string }>).length === 0) delete newDocs['other'];
 } else {
 delete newDocs[docId];
 }

 onUpdate({ documents: newDocs });
 };

 // Define document requirements based on provider type
 const individualDocs: DocRequirement[] = [
 {
 id: 'id_doc',
 label: 'ID Card / Passport',
 desc: 'Valid Government ID',
 icon: CreditCard,
 color: 'from-blue-500 to-indigo-600',
 bg: 'bg-blue-50',
 border: 'hover:border-blue-200'
 },
 {
 id: 'photo',
 label: 'Profile Photo',
 desc: 'Professional headshot',
 icon: ImageIcon,
 color: 'from-purple-500 to-pink-600',
 bg: 'bg-purple-50',
 border: 'hover:border-purple-200'
 },
 {
 id: 'police',
 label: 'Police Clearance',
 desc: 'Valid Background Check',
 icon: Shield,
 color: 'from-emerald-500 to-teal-600',
 bg: 'bg-emerald-50',
 border: 'hover:border-emerald-200'
 },
 {
 id: 'cv',
 label: 'CV / Resume',
 desc: 'Latest Experience PDF',
 icon: FileText,
 color: 'from-amber-500 to-orange-600',
 bg: 'bg-amber-50',
 border: 'hover:border-amber-200'
 },
 ];

 const agencyDocs: DocRequirement[] = [
 {
 id: 'commercial_reg',
 label: 'Commercial Registration',
 desc: 'Valid CR Document',
 icon: Building2,
 color: 'from-blue-500 to-indigo-600',
 bg: 'bg-blue-50',
 border: 'hover:border-blue-200'
 },
 {
 id: 'facility_license',
 label: 'Medical Facility License',
 desc: 'MOPH License',
 icon: Shield,
 color: 'from-emerald-500 to-teal-600',
 bg: 'bg-emerald-50',
 border: 'hover:border-emerald-200'
 },
 {
 id: 'staff_list',
 label: 'Staff List & Licenses',
 desc: 'Excel/PDF with License IDs',
 icon: Stethoscope,
 color: 'from-purple-500 to-pink-600',
 bg: 'bg-purple-50',
 border: 'hover:border-purple-200'
 },
 {
 id: 'auth_letter',
 label: 'Authorization Letter',
 desc: 'For Account Manager',
 icon: Briefcase,
 color: 'from-amber-500 to-orange-600',
 bg: 'bg-amber-50',
 border: 'hover:border-amber-200'
 },
 {
 id: 'other',
 label: 'Other Documents',
 desc: 'Additional supporting papers',
 icon: FolderOpen,
 color: 'from-stone-500 to-stone-600',
 bg: 'bg-stone-50',
 border: 'hover:border-stone-200',
 optional: true,
 multiple: true
 },
 ];

 const individualDocsAUS: DocRequirement[] = [
 {
 id: 'medicare',
 label: 'Medicare Card',
 desc: 'Valid Medicare Card',
 icon: CreditCard,
 color: 'from-green-500 to-emerald-600',
 bg: 'bg-green-50',
 border: 'hover:border-green-200'
 },
 {
 id: 'driver_license',
 label: 'Driver License / Photo ID',
 desc: 'Valid Driver License',
 icon: ImageIcon,
 color: 'from-blue-500 to-indigo-600',
 bg: 'bg-blue-50',
 border: 'hover:border-blue-200'
 },
 {
 id: 'police',
 label: 'Police Check',
 desc: 'National Police Certificate',
 icon: Shield,
 color: 'from-purple-500 to-pink-600',
 bg: 'bg-purple-50',
 border: 'hover:border-purple-200'
 },
 {
 id: 'cv',
 label: 'CV / Resume',
 desc: 'Latest Experience PDF',
 icon: FileText,
 color: 'from-amber-500 to-orange-600',
 bg: 'bg-amber-50',
 border: 'hover:border-amber-200'
 },
 ];

 const requiredDocs = isAgency ? agencyDocs : (data.country === 'AUS' ? individualDocsAUS : individualDocs);

 // Validation
 // For AUS, nationalId is not required, but docs are
 // Validation
 // For AUS, nationalId is not required, but docs are
 const isIdValid = data.country === 'AUS' ? true : data.nationalId?.trim().length >= 5;
 const areAllDocsUploaded = requiredDocs.every(doc => {
 if (doc.optional) return true;
 return (uploadedDocs[doc.id] as Record<string, unknown>)?.status === 'uploaded';
 });
 const isValid = isIdValid && areAllDocsUploaded;

 return (
 <div className="space-y-10">
 {/* Header */}
 <m.div {...fadeIn}>
 <div className="flex items-center gap-4 mb-2">
 <div className="size-14 bg-gradient-to-br from-teal-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200/50 ring-4 ring-teal-50">
 {isAgency ? <Building2 className="size-7 text-white" /> : <User className="size-7 text-white" />}
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-stone-900 tracking-tight">
 {isAgency ? 'Clinic / Agency Verification' : 'Identity Verification'}
 </h2>
 <p className="text-stone-500 text-lg">
 {isAgency ? 'Upload official documents to verify your facility.' : 'Securely verify your identity to join Raiyah Plus.'}
 </p>
 </div>
 </div>
 </m.div>

 {/* National ID / CR Number Input - HIDDEN FOR AUSTRALIA */}
 {data.country !== 'AUS' && (
 <m.div {...fadeIn} transition={{ delay: 0.1 }} className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">1</span>
 <h3 className="text-xl font-semibold text-stone-900">
 {isAgency ? 'Registration Details' : 'Official Identification'}
 </h3>
 </div>

 <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-100/50 relative overflow-hidden group">
 {/* Decoration */}
 <div className="absolute top-0 right-0 size-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-stone-100" />

 <div className="relative z-10 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
 <div className="size-16 rounded-2xl bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
 {isAgency ? <FileText className="size-8 text-stone-400" /> : <CreditCard className="size-8 text-stone-400" />}
 </div>

 <div className="w-full space-y-3">
 <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">
 {isAgency
 ? 'CR Number'
 : (data.country === 'QAT' ? 'QID Number' : data.country === 'EGY' ? 'National ID' : 'ID / Passport Number')
 }
 </label>
 <div className="relative group/input">
 <input
 type="text"
 value={data.nationalId || ''}
 onChange={(e) => onUpdate({ nationalId: e.target.value })}
 placeholder={isAgency ? 'Enter CR Number' : (data.country === 'QAT' ? '28400000000' : 'Enter your ID number')}
 className="w-full p-5 pl-6 bg-stone-50 border-2 border-stone-100 rounded-2xl focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-bold text-xl text-stone-900 placeholder:text-stone-300 placeholder:font-medium"
 />
 <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${isIdValid ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
 <div className="size-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
 <Check className="size-4 text-white stroke-[3px]" />
 </div>
 </div>
 </div>
 <p className="text-sm text-stone-400 font-medium pl-1">
 {isAgency ? 'Enter your Commercial Registration (CR) number.' : 'Please enter your valid national ID or passport number.'}
 </p>
 </div>
 </div>
 </div>
 </m.div>
 )}

 {/* Document Uploads - Mandatory & Functional */}
 <m.div {...fadeIn} transition={{ delay: 0.2 }} className="space-y-6">
 <div className="flex items-center gap-3">
 <span className="flex items-center justify-center size-8 rounded-full bg-stone-900 text-white font-bold text-sm">2</span>
 <h3 className="text-xl font-semibold text-stone-900">
 Required Documents
 </h3>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
 {requiredDocs.map((doc, index) => {
 const Icon = doc.icon;
 const file = uploadedDocs[doc.id] as Record<string, unknown> | Array<Record<string, unknown>>;
 const inputId = `file-upload-${doc.id}`;

 return (
 <m.div
 key={doc.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 + index * 0.05 }}
 className={doc.multiple ? "sm:col-span-2" : ""}
 >
 <input
 id={inputId}
 type="file"
 className="hidden"
 multiple={doc.multiple}
 accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
 onChange={(e) => {
 if (e.target.files) {
 handleFileUpload(doc.id, Array.from(e.target.files));
 }
 }}
 />

 <div
 className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col h-full overflow-hidden ${file && !doc.multiple
 ? 'border-transparent bg-stone-900 ring-2 ring-stone-900 shadow-xl'
 : `border-dashed border-stone-200 bg-white hover:border-stone-300 hover:shadow-lg ${!doc.multiple ? 'hover:-translate-y-1' : ''}`
 }`}
 >
 {/* Icon Background Blob */}
 {(!file || doc.multiple) && <div className={`absolute top-0 right-0 size-32 bg-gradient-to-br ${doc.color} opacity-5 rounded-bl-[4rem] group-hover:scale-110 transition-transform`} />}

 <div className="relative z-10 flex flex-col h-full">
 <div className="flex items-start justify-between mb-4">
 <div className={`size-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${file && !doc.multiple
 ? 'bg-white/10 text-white'
 : `bg-gradient-to-br ${doc.color} text-white shadow-md group-hover:scale-110 group-hover:rotate-3`
 }`}>
 {file && !doc.multiple ? <CheckCircle className="size-6" /> : <Icon className="size-6" />}
 </div>

 <div className="flex gap-2">
 {file && !doc.multiple ? (
 <button
 onClick={(e) => removeFile(doc.id, e)}
 className="size-8 rounded-full bg-white/10 hover:bg-red-500 hover:text-white text-white flex items-center justify-center transition-all backdrop-blur-sm"
 title="Remove file"
 >
 <X className="size-4" />
 </button>
 ) : (
 <label
 htmlFor={inputId}
 className="size-10 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-stone-100 transition-colors cursor-pointer"
 >
 <Upload className="size-5 text-stone-400 group-hover:text-stone-600" />
 </label>
 )}
 </div>
 </div>

 <div className="mt-auto">
 <div className="flex items-center justify-between">
 <div>
 <h4 className={`font-semibold text-lg mb-1 transition-colors ${file && !doc.multiple ? 'text-white' : 'text-stone-900'}`}>
 {doc.label}
 {doc.optional && <span className="text-xs font-normal text-stone-400 ml-2">(Optional)</span>}
 </h4>
 <p className={`text-sm font-medium transition-colors line-clamp-1 ${file && !doc.multiple ? 'text-stone-400' : 'text-stone-500'}`}>
 {file && !doc.multiple ? (file as Record<string, unknown>).name as string : doc.desc}
 </p>
 </div>
 {doc.multiple && file && (
 <span className="bg-stone-900 text-white text-xs font-bold px-3 py-1 rounded-full">
 {Array.isArray(file) ? file.length : 0} Files
 </span>
 )}
 </div>

 {/* Multi-file list */}
 {doc.multiple && Array.isArray(file) && file.length > 0 && (
 <div className="mt-4 space-y-2">
 {(file as Array<{ id: string; name?: string }>).map((f) => (
 <div key={f.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl group/file border border-stone-100 hover:border-stone-200 transition-all">
 <div className="flex items-center gap-3 overflow-hidden">
 <FileText className="size-4 text-stone-400 shrink-0" />
 <span className="text-xs font-bold text-stone-700 truncate">{f.name}</span>
 </div>
 <button
 onClick={(e) => removeFile(doc.id, e, f.id)}
 className="p-1 hover:text-red-500 text-stone-300 transition-colors"
 >
 <X className="size-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </m.div>
 );
 })}
 </div>
 </m.div>

 {/* Error / Status Message */}
 {!isValid && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="flex items-center gap-3 text-sm text-amber-700 bg-amber-50/50 p-4 rounded-2xl border border-amber-100 border-l-4 border-l-amber-500"
 >
 <AlertCircle className="size-5 text-amber-500 shrink-0" />
 <span className="font-medium">Please complete your national ID and upload all required documents to proceed.</span>
 </m.div>
 )}

 {/* Navigation */}
 <m.div
 {...fadeIn}
 transition={{ delay: 0.3 }}
 className="flex justify-between items-center pt-8 border-t border-stone-50"
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

