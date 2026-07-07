
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { SecurityBanner } from '@/components/healthcare/SecurityBanner';
import toast from 'react-hot-toast';


export default function CareseekerRefundPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error('Please enter a booking ID');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await client.post('/disputes', {
        booking_id: parseInt(bookingId),
        type: 'incorrect_billing',
        description: reason || 'Refund request for booking',
      });

      if (response.data.success) {
        toast.success('Refund request submitted as dispute');
        setShowConfirmation(false);
        navigate('/careseeker/disputes');
      }
    } catch (error) {
      setShowConfirmation(false);
      if (isApiError(error)) {
        toast.error(error.message || 'Failed to submit request');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

 return (
 <div className="container mx-auto px-4 py-8 max-w-2xl">
  <Link to="/careseeker/bookings" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6">
  <ArrowLeft className="size-4" />
  Back to Bookings
  </Link>

  <SecurityBanner variant="full" className="mb-6" />

  <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <DollarSign className="size-5" />
 Request Refund
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
 <Label htmlFor="reason">Reason</Label>
 <Textarea
 id="reason"
 placeholder="Why do you need a refund?"
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 rows={3}
 />
 </div>

  <Button type="submit" disabled={loading} className="w-full">
  {loading ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Submitting...
    </>
  ) : 'Submit Refund Request'}
  </Button>
  </form>
  </CardContent>
  </Card>

  <ConfirmationDialog
    open={showConfirmation}
    onOpenChange={setShowConfirmation}
    title="Confirm Refund Request"
    description="You are about to submit a refund request for this booking. This will create a dispute that will be reviewed by our team."
    confirmLabel="Submit Refund Request"
    cancelLabel="Cancel"
    onConfirm={handleConfirm}
    onCancel={() => setShowConfirmation(false)}
    loading={loading}
    variant="warning"
  />
  </div>
  );
}
