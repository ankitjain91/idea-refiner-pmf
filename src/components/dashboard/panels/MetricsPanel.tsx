import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, ChevronRight } from 'lucide-react';

interface MetricsPanelProps {
  insights: any;
  onSelect: (item: any) => void;
  setDetailModalOpen: (open: boolean) => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ insights, onSelect, setDetailModalOpen }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-l-4 border-l-blue-500"
        onClick={() => { onSelect({
          type: 'metric',
          title: 'Market Size',
          value: insights.marketSize?.total,
            growth: insights.marketSize?.growth,
            why: 'Market size determines the total addressable opportunity for your product',
            how: [
              `Total addressable market: ${insights.marketSize?.tam || '$500M'}`,
              `Serviceable addressable market: ${insights.marketSize?.sam || '$100M'}`,
              `Serviceable obtainable market: ${insights.marketSize?.som || '$10M'}`,
              `Year-over-year growth: ${insights.marketSize?.growth}`
            ],
            where: insights.marketSize?.sources || [],
            impact: `Capture potential: ${insights.marketSize?.captureRate || '1-5%'} of market`,
            result: `Revenue opportunity: ${insights.marketSize?.revenueOpportunity || '$1M-5M ARR'}`
        }); setDetailModalOpen(true); }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            Market Size
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{insights.marketSize?.total || '$100M'}</p>
          <p className="text-sm text-muted-foreground mt-1">Growth: {insights.marketSize?.growth || '25% YoY'}</p>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="outline" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" />{insights.marketSize?.trend || 'Expanding'}</Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-500/5 to-green-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Search Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{insights.realTimeMetrics?.searchVolume?.monthly?.toLocaleString()}</p>
          <Badge className="mt-2" variant={insights.realTimeMetrics?.searchVolume?.trend === 'Increasing' ? 'default' : 'secondary'}>
            {insights.realTimeMetrics?.searchVolume?.trend}
          </Badge>
          <div className="mt-3 flex flex-wrap gap-1">
            {insights.realTimeMetrics?.searchVolume?.relatedQueries?.map((query: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">{query}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-500/5 to-purple-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
            Revenue Projections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded"><p className="text-sm text-muted-foreground">Month 1</p><p className="font-bold text-purple-600">{insights.monetization?.revenue?.month1}</p></div>
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded"><p className="text-sm text-muted-foreground">Month 6</p><p className="font-bold text-purple-600">{insights.monetization?.revenue?.month6}</p></div>
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded"><p className="text-sm text-muted-foreground">Year 1</p><p className="font-bold text-purple-600">{insights.monetization?.revenue?.year1}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsPanel;
