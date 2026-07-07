
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/components/motion/variants';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


export default function PaymentHistoryPage() {
 const navigate = useNavigate();

 useEffect(() => {
 navigate('/careseeker/wallet');
 }, [navigate]);

 return (
 <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-stone-50 flex items-center justify-center">
 <div className="text-center">
 <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
 <p className="text-stone-600">Redirecting to wallet&hellip;</p>
 </div>
 </motion.div>
 );
}
