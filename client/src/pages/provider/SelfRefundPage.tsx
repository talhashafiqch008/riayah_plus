
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';


export default function SelfRefundPage() {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [bookingId, setBookingId] = useState('');
 const [amount, setAmount] = useState('');
 const [reason, setReason] = useState('');

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!bookingId || !amount) {
 toast.error('Please fill in all required fields');
 return;
 }

 setLoading(true);
 try {
 const response = await client.post('/provider/self-refund', {
 booking_id: parseInt(bookingId),
 amount_credits: parseInt(amount),
 reason: reason || undefined,
 });

 if (response.data.success) {
 toast.success('Self-refund processed successfully');
 navigate('/provider/dashboard');
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to process refund');
 } else {
 toast.error('An unexpected error occurred');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="container mx-auto px-4 py-8 max-w-2xl">
 <Link to="/provider/dashboard" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6">
 <ArrowLeft className="size-4" />
 Back to Dashboard
 </Link>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <DollarSign className="size-5" />
 Request Self-Refund
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="booking">Booking ID</Label>
 <Input
 id="booking"
 type="number"
 placeholder="Enter booking ID"
 value={bookingId}
 onChange={(e) => setBookingId(e.target.value)}
 required
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="amount">Amount (Credits)</Label>
 <Input
 id="amount"
 type="number"
 placeholder="Enter amount in credits"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 required
 min={1}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="reason">Reason (Optional)</Label>
 <Textarea
 id="reason"
 placeholder="Why are you requesting this refund?"
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 />
 </div>

 <Button type="submit" disabled={loading} className="w-full">
 {loading ? 'Processing...' : 'Request Refund'}
 </Button>
 </form>
 </CardContent>
 </Card>
 </div>
 );
}
