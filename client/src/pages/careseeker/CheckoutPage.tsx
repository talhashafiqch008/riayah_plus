/**
 * Booking Checkout Page
 * Redirects to wallet for credit-based payment
 */


import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


export default function CheckoutPage() {
 const params = useParams();
 const navigate = useNavigate();
 const bookingId = params.bookingId as string;

 // TODO: Move event handler out of effect
 useEffect(() => {
 if (bookingId) {
 navigate(`/careseeker/wallet?bookingId=${bookingId}`);
 }
 }, [bookingId, navigate]);

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-stone-50 flex items-center justify-center">
 <div className="text-center">
 <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
 <p className="text-stone-600">Redirecting to wallet&hellip;</p>
 </div>
 </motion.div>
 );
}
