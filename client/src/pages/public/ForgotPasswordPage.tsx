
import { useState , useRef } from 'react';
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from 'react-router-dom';




export default function ForgotPasswordPage() {
 const [email, setEmail] = useState("");
 const [submitted, setSubmitted] = useState(false);

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitted(true);
 };

 if (submitted) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
 <div className="w-full max-w-md">
 <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
 <div className="mx-auto mb-4 size-16 rounded-full bg-teal-100 flex items-center justify-center">
 <Mail className="size-8 text-teal-600" />
 </div>
 <h2 className="text-2xl font-semibold text-stone-900 mb-2">Check Your Email</h2>
 <p className="text-stone-600 mb-6">
 We've sent password reset instructions to <strong>{email}</strong>
 </p>
 <Link
 to="/"
 className="inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
 >
 <ArrowLeft className="mr-2 size-4" />
 Back to Home
 </Link>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
 <div className="w-full max-w-md">
 <div className="text-center mb-8">
 <h1 className="text-3xl font-semibold text-stone-900 mb-2">Forgot Password?</h1>
 <p className="text-stone-600">
 Enter your email and we'll send you instructions to reset your password
 </p>
 </div>

 <div className="rounded-2xl bg-white p-8 shadow-xl">
 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label htmlFor="input-src-app-forgot-password-page-tsx-58-60" className="block text-sm font-medium text-stone-700 mb-2">
 Email Address
 </label>
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-stone-300 px-4 py-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
 placeholder="you@example.com"
 />
 </div>

 <button
 type="submit"
 className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
 >
 Send Reset Link
 </button>

 <div className="text-center">
 <Link
 to="/"
 className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 font-medium"
 >
 <ArrowLeft className="mr-2 size-4" />
 Back to Home
 </Link>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
}
