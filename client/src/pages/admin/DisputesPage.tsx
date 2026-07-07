
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gavel, Eye } from 'lucide-react';

interface Dispute {
 id: number;
 booking_id: number;
 careseeker_name: string;
 provider_name: string;
 type: string;
 status: string;
 description: string;
 refund_amount_credits: number;
 filed_at: string;
 created_at: string;
}

export default function AdminDisputesPage() {
 const queryClient = useQueryClient();
 const [statusFilter, setStatusFilter] = useState('');
 const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
 const [resolution, setResolution] = useState('');
 const [refundAmount, setRefundAmount] = useState('');
 const [notes, setNotes] = useState('');

 const { data, isLoading } = useQuery({
 queryKey: ['admin-disputes', statusFilter],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (statusFilter) params.append('status', statusFilter);
 const response = await fetch(`/api/admin/disputes?${params}`);
 if (!response.ok) throw new Error('Failed to fetch disputes');
 return response.json();
 },
 });

 const resolveMutation = useMutation({
 mutationFn: async ({ id, resolution, refundAmount, notes }: any) => {
 const response = await fetch(`/api/admin/disputes/${id}/resolve`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 resolution,
 refund_amount_credits: refundAmount ? parseFloat(refundAmount) : null,
 notes,
 }),
 });
 if (!response.ok) throw new Error('Failed to resolve dispute');
 return response.json();
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
 setSelectedDispute(null);
 setResolution('');
 setRefundAmount('');
 setNotes('');
 },
 });

 const disputes = data?.disputes || [];

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'filed': return 'bg-yellow-100 text-yellow-800';
 case 'under_review': return 'bg-blue-100 text-blue-800';
 case 'provider_responded': return 'bg-purple-100 text-purple-800';
 case 'resolved_careseeker_favored': return 'bg-green-100 text-green-800';
 case 'resolved_provider_favored': return 'bg-red-100 text-red-800';
 case 'resolved_partial_refund': return 'bg-orange-100 text-orange-800';
 case 'rejected': return 'bg-gray-100 text-gray-800';
 default: return 'bg-gray-100 text-gray-800';
 }
 };

 if (isLoading) {
 return (
 <div className="container mx-auto px-4 py-8 max-w-6xl">
 <Skeleton className="h-48 mb-6" />
 <Skeleton className="h-96" />
 </div>
 );
 }

 return (
 <div className="container mx-auto px-4 py-8 max-w-6xl">
 <h1 className="text-3xl mb-6">Dispute Resolution</h1>

 <Card className="mb-8">
 <CardHeader>
 <CardTitle>Filter Disputes</CardTitle>
 </CardHeader>
 <CardContent>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-64">
 <SelectValue placeholder="All statuses" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="">All</SelectItem>
 <SelectItem value="filed">Filed</SelectItem>
 <SelectItem value="under_review">Under Review</SelectItem>
 <SelectItem value="provider_responded">Provider Responded</SelectItem>
 <SelectItem value="resolved_careseeker_favored">Careseeker Favored</SelectItem>
 <SelectItem value="resolved_provider_favored">Provider Favored</SelectItem>
 <SelectItem value="resolved_partial_refund">Partial Refund</SelectItem>
 <SelectItem value="rejected">Rejected</SelectItem>
 </SelectContent>
 </Select>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Disputes ({disputes.length})</CardTitle>
 </CardHeader>
 <CardContent>
 {disputes.length === 0 ? (
 <p className="text-muted-foreground text-center py-8">No disputes found</p>
 ) : (
 <div className="space-y-2">
 {disputes.map((dispute: Dispute) => (
 <div
 key={dispute.id}
 className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
 >
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="font-semibold">Booking #{dispute.booking_id}</span>
 <Badge className={getStatusColor(dispute.status)}>
 {dispute.status.replace(/_/g, ' ')}
 </Badge>
 </div>
 <p className="text-sm text-muted-foreground">
 Careseeker: {dispute.careseeker_name} | Provider: {dispute.provider_name}
 </p>
 <p className="text-sm mt-1">{dispute.type}</p>
 </div>
 <div className="flex items-center gap-2">
 {dispute.refund_amount_credits > 0 && (
 <span className="text-sm font-medium text-orange-600">
 {dispute.refund_amount_credits.toFixed(2)} Credits
 </span>
 )}
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setSelectedDispute(dispute)}
 >
 <Eye className="size-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {selectedDispute && (
 <Dialog open onOpenChange={() => setSelectedDispute(null)}>
 <DialogContent className="sm:max-w-lg">
 <DialogHeader>
 <DialogTitle>Resolve Dispute #{selectedDispute.id}</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 <div>
 <p className="text-sm text-muted-foreground">Description</p>
 <p className="text-sm">{selectedDispute.description}</p>
 </div>

 <div>
 <Label htmlFor="resolution">Resolution</Label>
 <Select value={resolution} onValueChange={setResolution}>
 <SelectTrigger>
 <SelectValue placeholder="Select resolution" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="careseeker_favored">Careseeker Favored (Full Refund)</SelectItem>
 <SelectItem value="provider_favored">Provider Favored (No Refund)</SelectItem>
 <SelectItem value="partial_refund">Partial Refund</SelectItem>
 <SelectItem value="reject">Reject Dispute</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {(resolution === 'careseeker_favored' || resolution === 'partial_refund') && (
 <div>
 <Label htmlFor="refund">Refund Amount (USD)</Label>
 <Input
 id="refund"
 type="number"
 step="0.01"
 min="0"
 placeholder="Enter refund amount"
 value={refundAmount}
 onChange={(e) => setRefundAmount(e.target.value)}
 />
 </div>
 )}

 <div>
 <Label htmlFor="notes">Resolution Notes</Label>
 <Textarea
 id="notes"
 placeholder="Enter notes..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 />
 </div>

 <div className="flex gap-2">
 <Button
 variant="outline"
 className="flex-1"
 onClick={() => setSelectedDispute(null)}
 >
 Cancel
 </Button>
 <Button
 className="flex-1"
 disabled={!resolution || resolveMutation.isPending}
 onClick={() =>
 resolveMutation.mutate({
 id: selectedDispute.id,
 resolution,
 refundAmount,
 notes,
 })
 }
 >
 <Gavel className="mr-2 size-4" />
 {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 )}
 </div>
 );
}
