
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, Plus, Trash2 } from 'lucide-react';
import { CreditsDisplay } from '@/components/CurrencyDisplay';


interface PricingFormData {
 session_type: string;
 credits: number;
 duration_minutes: number;
}

export default function ProviderPricingPage() {
 const queryClient = useQueryClient();
 const [formData, setFormData] = useState<PricingFormData>({
 session_type: 'standard',
 credits: 3000,
 duration_minutes: 60,
 });

 const { data: pricing, isLoading } = useQuery({
 queryKey: ['provider-pricing'],
 queryFn: async () => {
 const response = await fetch('/api/provider/pricing');
 if (!response.ok) throw new Error('Failed to fetch pricing');
 return response.json();
 },
 });

 const createMutation = useMutation({
 mutationFn: async (data: PricingFormData) => {
 const response = await fetch('/api/provider/pricing', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 if (!response.ok) throw new Error('Failed to save pricing');
 return response.json();
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['provider-pricing'] });
 },
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: number) => {
 const response = await fetch(`/api/provider/pricing/${id}`, {
 method: 'DELETE',
 });
 if (!response.ok) throw new Error('Failed to delete pricing');
 return response.json();
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['provider-pricing'] });
 },
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 createMutation.mutate(formData);
 };

 if (isLoading) {
 return (
 <div className="container mx-auto px-4 py-8 max-w-2xl">
 <Skeleton className="h-48 mb-6" />
 <Skeleton className="h-96" />
 </div>
 );
 }

 const pricingList = pricing?.pricing || [];

 return (
 <div className="container mx-auto px-4 py-8 max-w-2xl">
  <h1 className="text-3xl mb-6 text-stone-900">Session Pricing</h1>

 <Card className="mb-8">
 <CardHeader>
  <CardTitle className="text-stone-900">Add New Pricing</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
  <Label htmlFor="session_type" className="text-stone-900">Session Type</Label>
 <Input
 id="session_type"
 value={formData.session_type}
 onChange={(e) => setFormData(prev => ({ ...prev, session_type: e.target.value }))}
 placeholder="e.g. standard, premium, consultation"
 />
 </div>

 <div>
  <Label htmlFor="credits" className="text-stone-900">Price (USD)</Label>
 <div className="flex items-center gap-2">
 <DollarSign className="size-4 text-stone-500" />
 <Input
 id="credits"
 type="number"
 min="1"
 step="0.01"
 value={formData.credits}
 onChange={(e) => {
 const val = parseFloat(e.target.value);
 setFormData(prev => ({ ...prev, credits: isNaN(val) ? 0 : val }));
 }}
 />
 </div>
 </div>

 <div>
  <Label htmlFor="duration" className="text-stone-900">Duration (minutes)</Label>
 <div className="flex items-center gap-2">
 <Clock className="size-4 text-stone-500" />
 <Input
 id="duration"
 type="number"
 min="15"
 step="15"
 value={formData.duration_minutes}
 onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={createMutation.isPending}
 className="w-full"
 >
 <Plus className="mr-2 size-4" />
 {createMutation.isPending ? 'Saving...' : 'Add Pricing'}
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
  <CardTitle className="text-stone-900">Current Pricing</CardTitle>
 </CardHeader>
 <CardContent>
 {pricingList.length === 0 ? (
 <p className="text-stone-500 text-center py-8">No pricing set yet</p>
 ) : (
 <div className="space-y-2">
 {pricingList.map((item: any) => (
 <div
 key={item.id}
 className="flex items-center justify-between p-3 rounded-lg border"
 >
 <div>
  <p className="font-medium text-stone-900">{item.session_type}</p>
<p className="text-sm text-stone-500">
<CreditsDisplay amount={item.credits || 0} unit="major" /> / {item.duration_minutes} min
</p>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => deleteMutation.mutate(item.id)}
 disabled={deleteMutation.isPending}
 >
 <Trash2 className="size-4 text-red-600" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
