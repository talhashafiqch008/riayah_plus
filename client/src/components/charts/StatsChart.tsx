/* eslint-disable */
// @ts-nocheck

// import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, type PieLabelRenderProps } from 'recharts'; // TODO: Consider dynamic import for code splitting

interface StatsChartProps {
 data: Array<{
 name: string;
 value: number;
 }>;
}

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function StatsChart({ data }: StatsChartProps) {
 return (
 <div className="w-full h-80">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={data}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={({ name, percent }: PieLabelRenderProps) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 >
 {data.map((entry, index) => (
 <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 contentStyle={{
 backgroundColor: '#fff',
 border: '1px solid #e5e7eb',
 borderRadius: '8px',
 padding: '12px'
 }}
 />
 <Legend />
 </PieChart>
 </ResponsiveContainer>
 </div>
 );
}
