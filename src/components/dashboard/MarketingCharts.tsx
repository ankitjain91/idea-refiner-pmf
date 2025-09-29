import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, FunnelChart, Funnel, LabelList } from 'recharts';
import { RealtimeSnapshot } from '@/hooks/useRealtimeInsights';
import { cn } from '@/lib/utils';

interface MarketingChartsProps {
  trends: RealtimeSnapshot['trends'];
}

export const MarketingCharts: React.FC<MarketingChartsProps> = ({ trends }) => {
  // Add null checks and data validation
  if (!trends) {
    return <div className="text-center text-muted-foreground py-8">Loading marketing data...</div>;
  }

  const roiData = trends.roiByChannel ? Object.entries(trends.roiByChannel).map(([channel, roi]) => ({
    channel: channel.toUpperCase(),
    roi: typeof roi === 'number' ? roi : 0,
    fill: roi > 5 ? '#10b981' : roi > 3 ? '#f59e0b' : '#ef4444'
  })) : [];

  const cacVsLtvData = Array.isArray(trends.cacVsLtv) ? trends.cacVsLtv : [];
  const leadVelocityData = Array.isArray(trends.leadVelocity) ? trends.leadVelocity : [];
  const funnelTopData = Array.isArray(trends.funnelTop) ? trends.funnelTop : [];

  const funnelColors = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981'];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* ROI by Channel */}
      <Card className="glass-card border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">ROI by Channel</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={roiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="channel" 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              label={{ value: 'LTV/CAC Ratio', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [`${value}x`, 'ROI']}
            />
            <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
              {roiData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* CAC vs LTV Scatter */}
      <Card className="glass-card border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">CAC vs LTV Analysis</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              type="number" 
              dataKey="cac" 
              name="CAC"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              label={{ value: 'CAC ($)', position: 'insideBottom', offset: -5, style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }}
            />
            <YAxis 
              type="number" 
              dataKey="ltv" 
              name="LTV"
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              label={{ value: 'LTV ($)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px'
              }}
              formatter={(value: any, name: string) => [`$${value}`, name]}
            />
            <Scatter 
              name="Channels" 
              data={cacVsLtvData} 
              fill="#8b5cf6"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Lead Velocity */}
      <Card className="glass-card border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Lead Velocity (7-day)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={leadVelocityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
            />
            <YAxis 
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
              label={{ value: 'Leads', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Conversion Funnel */}
      <Card className="glass-card border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Top Channel Funnel</h3>
        <ResponsiveContainer width="100%" height={250}>
          <FunnelChart>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px'
              }}
            />
            <Funnel
              dataKey="value"
              data={funnelTopData}
              isAnimationActive
            >
              <LabelList position="center" fill="#fff" fontSize={12} />
              {funnelTopData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={funnelColors[index]} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};