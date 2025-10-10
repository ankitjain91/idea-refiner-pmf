import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface ScoreHistoryChartProps {
  history: any[];
}

export function ScoreHistoryChart({ history }: ScoreHistoryChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No score history available</p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = history
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(score => ({
      date: format(new Date(score.created_at), 'MMM d'),
      fullDate: format(new Date(score.created_at), 'PPP'),
      pmf: score.pmf_score,
      confidence: score.ai_confidence ? Math.round(score.ai_confidence * 100) : null,
    }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs" 
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={[0, 100]} 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: any, name: string) => {
              if (name === 'pmf') return [value, 'PMF Score'];
              if (name === 'confidence') return [value + '%', 'AI Confidence'];
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              if (value === 'pmf') return 'PMF Score';
              if (value === 'confidence') return 'AI Confidence';
              return value;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="pmf" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
          {chartData.some(d => d.confidence !== null) && (
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
