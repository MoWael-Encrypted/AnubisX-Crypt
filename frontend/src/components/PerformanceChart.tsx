// src/components/PerformanceChart.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BenchmarkData {
  label: string;
  time: number;
  throughput: number;
}

interface PerformanceChartProps {
  data: BenchmarkData[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const COLORS = ['#71717a', '#22c55e', '#3b82f6', '#a855f7']; // Zinc, Green, Blue, Purple

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#a1a1aa"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#a1a1aa"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
          itemStyle={{ color: '#fff' }}
        />
        <Bar dataKey="time" radius={[4, 4, 0, 0]} barSize={60}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;