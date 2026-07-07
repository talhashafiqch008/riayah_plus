
import { useState } from "react";
import { User, Mail, Phone, MapPin, Award, Save } from "lucide-react";
import toast from 'react-hot-toast';




export default function StaffProfilePage() {
 const [profile, setProfile] = useState({
 firstName: "Ahmed",
 lastName: "Maaz",
 email: "ahmed.maaz@riayaplus.com",
 phone: "+1 234 567 8900",
 address: "123 Main Street, Melbourne, VIC 3000",
 specializations: "Elderly Care, Disability Support",
 certifications: "First Aid, CPR, Medication Management",
 bio: "Experienced care worker with 5+ years in home care services.",
 });

 const handleSave = () => {
 toast.success("Profile updated successfully!");
 };

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-semibold tracking-tight text-stone-900">My Profile</h1>
 <p className="text-sm text-stone-500">Manage your personal information</p>
 </div>

 {/* Profile Header */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <div className="flex items-center gap-6">
 <div className="size-24 rounded-full bg-teal-100 flex items-center justify-center">
 <User className="size-12 text-teal-700" />
 </div>
 <div>
 <h2 className="text-2xl font-semibold text-stone-900">{profile.firstName} {profile.lastName}</h2>
 <p className="text-sm text-stone-500">Support Worker</p>
 <button className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
 Change Photo
 </button>
 </div>
 </div>
 </div>

 {/* Personal Information */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Personal Information</h3>
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-55-57" className="block text-sm font-medium text-stone-700 mb-2">
 First Name
 </label>
 <input
 type="text"
 value={profile.firstName}
 onChange={(e) => setProfile(prev => ({...prev, firstName: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-66-68" className="block text-sm font-medium text-stone-700 mb-2">
 Last Name
 </label>
 <input
 type="text"
 value={profile.lastName}
 onChange={(e) => setProfile(prev => ({...prev, lastName: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-77-79" className="block text-sm font-medium text-stone-700 mb-2">
 Email
 </label>
 <input
 type="email"
 value={profile.email}
 onChange={(e) => setProfile(prev => ({...prev, email: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-88-90" className="block text-sm font-medium text-stone-700 mb-2">
 Phone
 </label>
 <input
 type="tel"
 value={profile.phone}
 onChange={(e) => setProfile(prev => ({...prev, phone: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 <div className="md:col-span-2">
 <label htmlFor="input-src-app-staff-profile-page-tsx-99-101" className="block text-sm font-medium text-stone-700 mb-2">
 Address
 </label>
 <input
 type="text"
 value={profile.address}
 onChange={(e) => setProfile(prev => ({...prev, address: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 />
 </div>
 </div>
 </div>

 {/* Professional Information */}
 <div className="rounded-xl border bg-white p-6 shadow-sm">
 <h3 className="text-lg font-semibold text-stone-900 mb-4">Professional Information</h3>
 <div className="space-y-4">
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-117-119" className="block text-sm font-medium text-stone-700 mb-2">
 Specializations
 </label>
 <input
 type="text"
 value={profile.specializations}
 onChange={(e) => setProfile(prev => ({...prev, specializations: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="e.g., Elderly Care, Disability Support"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-129-131" className="block text-sm font-medium text-stone-700 mb-2">
 Certifications
 </label>
 <input
 type="text"
 value={profile.certifications}
 onChange={(e) => setProfile(prev => ({...prev, certifications: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="e.g., First Aid, CPR"
 />
 </div>
 <div>
 <label htmlFor="input-src-app-staff-profile-page-tsx-141-143" className="block text-sm font-medium text-stone-700 mb-2">
 Bio
 </label>
 <textarea
 rows={4}
 value={profile.bio}
 onChange={(e) => setProfile(prev => ({...prev, bio: e.target.value }))}
 className="w-full rounded-md border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
 placeholder="Tell us about yourself..."
 />
 </div>
 </div>
 </div>

 {/* Save Button */}
 <div className="flex justify-end">
 <button
 onClick={handleSave}
 className="flex items-center rounded-md bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-500"
 >
 <Save className="mr-2 size-4" />
 Save Changes
 </button>
 </div>
 </div>
 );
}
