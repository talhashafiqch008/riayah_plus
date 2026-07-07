
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PaymentSuccessActions() {
 const navigate = useNavigate();

 return (
 <div className="space-y-3">
 <Button
 onClick={() => navigate('/careseeker/bookings')}
 className="w-full bg-teal-600 hover:bg-teal-700 text-white"
 >
 View My Bookings
 </Button>
 <Button
 variant="ghost"
 onClick={() => navigate('/careseeker/home')}
 className="w-full text-stone-500 hover:text-stone-700"
 >
 Return to Home
 </Button>
 </div>
 );
}
