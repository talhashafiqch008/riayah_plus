
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';


export default function NewDisputePage() {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [bookingId, setBookingId] = useState('');
 const [type, setType] = useState('');
 const [description, setDescription] = useState('');

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!bookingId || !type || !description) {
 toast.error('Please fill in all fields');
 return;
 }

 setLoading(true);
 try {
 const response = await client.post('/disputes', {
 booking_id: parseInt(bookingId),
 type,
 description,
 });

 if (response.data.success) {
 toast.success('Dispute filed successfully');
 navigate('/careseeker/disputes');
 }
 } catch (error) {
 if (isApiError(error)) {
 toast.error(error.message || 'Failed to file dispute');
 } else {
 toast.error('An unexpected error occurred');
 }
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="container mx-auto px-4 py-8 max-w-2xl">
 <Link to="/careseeker/disputes" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6">
 <ArrowLeft className="size-4" />
 Back to Disputes
 </Link>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Gavel className="size-5" />
 File a Dispute
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="booking">Booking ID</Label>
 <Input
 id="booking"
 type="number"
 placeholder="Enter your booking ID"
 value={bookingId}
 onChange={(e) => setBookingId(e.target.value)}
 required
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="type">Dispute Type</Label>
 <Select value={type} onValueChange={setType}>
 <SelectTrigger>
 <SelectValue placeholder="Select dispute type" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="no_show">No Show</SelectItem>
 <SelectItem value="unsatisfactory_service">Unsatisfactory Service</SelectItem>
 <SelectItem value="incorrect_billing">Incorrect Billing</SelectItem>
 <SelectItem value="other">Other</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="description">Description</Label>
 <Textarea
 id="description"
 placeholder="Describe your issue in detail (min 10 characters)"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 required
 minLength={10}
 rows={5}
 />
 </div>

 <Button type="submit" disabled={loading} className="w-full">
 {loading ? 'Filing Dispute...' : 'File Dispute'}
 </Button>
 </form>
 </CardContent>
 </Card>
 </div>
 );
}
