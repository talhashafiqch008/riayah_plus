
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Gavel, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api/client';
import { isApiError } from '@/lib/errors';
import toast from 'react-hot-toast';


interface Dispute {
 id: number;
 booking_id: number;
 type: string;
 status: string;
 description: string;
 refund_amount: number;
 filed_at: string;
 resolved_at?: string;
}

export default function DisputesPage() {
 const navigate = useNavigate();

 const { data, isLoading } = useQuery({
 queryKey: ['disputes'],
 queryFn: async () => {
 const response = await client.get('/disputes');
 return response.data;
 },
 });

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'filed': return 'bg-yellow-100 text-yellow-800';
 case 'under_review': return 'bg-blue-100 text-blue-800';
 case 'resolved_careseeker_favored': return 'bg-green-100 text-green-800';
 case 'resolved_provider_favored': return 'bg-red-100 text-red-800';
 case 'resolved_partial_refund': return 'bg-orange-100 text-orange-800';
 case 'rejected': return 'bg-gray-100 text-gray-800';
 default: return 'bg-gray-100 text-gray-800';
 }
 };

 const getTypeLabel = (type: string) => {
 const labels: Record<string, string> = {
 'no_show': 'No Show',
 'unsatisfactory_service': 'Unsatisfactory Service',
 'incorrect_billing': 'Incorrect Billing',
 'other': 'Other',
 };
 return labels[type] || type;
 };

 if (isLoading) {
 return (
 <div className="container mx-auto px-4 py-8 max-w-4xl">
 <Skeleton className="h-12 mb-6" />
 <Skeleton className="h-48" />
 </div>
 );
 }

 const disputes = data?.disputes || [];

 return (
 <div className="container mx-auto px-4 py-8 max-w-4xl">
 <div className="flex justify-between items-center mb-6">
 <h1 className="text-3xl">My Disputes</h1>
 <Link to="/careseeker/disputes/new">
 <Button className="gap-2">
 <Plus className="w-4 h-4" />
 File New Dispute
 </Button>
 </Link>
 </div>

 {disputes.length === 0 ? (
 <Card>
 <CardContent className="p-8 text-center">
 <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">No Disputes</h3>
 <p className="text-stone-500 mb-4">You have not filed any disputes yet.</p>
 <Link to="/careseeker/disputes/new">
 <Button variant="outline">File a Dispute</Button>
 </Link>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-4">
 {disputes.map((dispute: Dispute) => (
 <Card key={dispute.id}>
 <CardContent className="p-6">
 <div className="flex justify-between items-start mb-4">
 <div>
 <h3 className="font-semibold text-lg">
 Dispute #{dispute.id}
 </h3>
 <p className="text-sm text-stone-500">
 Booking #{dispute.booking_id}
 </p>
 </div>
 <Badge className={getStatusColor(dispute.status)}>
 {dispute.status.replace(/_/g, ' ')}
 </Badge>
 </div>
 <div className="space-y-2">
 <p><span className="font-medium">Type:</span> {getTypeLabel(dispute.type)}</p>
 <p><span className="font-medium">Description:</span> {dispute.description}</p>
 {dispute.refund_amount > 0 && (
 <p><span className="font-medium">Refund:</span> {dispute.refund_amount / 100} SAR</p>
 )}
 <p className="text-sm text-stone-500">
 Filed: {new Date(dispute.filed_at).toLocaleDateString()}
 </p>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
