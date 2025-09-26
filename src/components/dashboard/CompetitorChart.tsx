import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CompetitorChartProps {
  data: Array<{
    name: string;
    metric: string;
    yours: number;
    theirs: number;
    unit: string;
  }>;
}

export function CompetitorChart({ data }: CompetitorChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Competitive Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="metric" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: any, name: any) => {
                const item = data.find(d => d.yours === value || d.theirs === value);
                return [`${value}${item?.unit || ''}`, name];
              }}
            />
            <Legend />
            <Bar 
              dataKey="yours" 
              fill="hsl(var(--primary))" 
              name="Your Product"
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="theirs" 
              fill="hsl(var(--muted-foreground))" 
              name="Competitors"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}