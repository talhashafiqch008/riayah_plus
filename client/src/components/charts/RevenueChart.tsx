/* eslint-disable */
// @ts-nocheck

// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'; // TODO: Consider dynamic import for code splitting

interface RevenueChartProps {
 data: Array<{
 month: string;
 revenue: number;
 }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
 return (
 <div className="w-full h-80">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
 <XAxis
 dataKey="month"
 stroke="#6b7280"
 style={{ fontSize: '12px' }}
 />
 <YAxis
 stroke="#6b7280"
 style={{ fontSize: '12px' }}
 tickFormatter={(value) => `$${value}`}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: '#fff',
 border: '1px solid #e5e7eb',
 borderRadius: '8px',
 padding: '12px'
 }}
 formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
 />
 <Legend />
 <Line
 type="monotone"
 dataKey="revenue"
 stroke="#0d9488"
 strokeWidth={3}
 dot={{ fill: '#0d9488', r: 4 }}
 activeDot={{ r: 6 }}
 />
 </LineChart>
 </ResponsiveContainer>
 </div>
 );
}
