import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, CheckCircle, ChevronRight, BarChart3 } from 'lucide-react';

interface ImprovementsPanelProps {
  improvementsByTime?: any[];
  improvementsByCost?: any[];
  onSelect: (item: any) => void;
  setDetailModalOpen: (open: boolean) => void;
}

export const ImprovementsPanel: React.FC<ImprovementsPanelProps> = ({ improvementsByTime = [], improvementsByCost = [], onSelect, setDetailModalOpen }) => {
  return (
    <div className="space-y-10">
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          By Timeframe
        </h3>
        {improvementsByTime.length > 0 ? improvementsByTime.map((group: any, idx: number) => (
          <Card
            key={`time-${idx}`}
            className="mb-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-green-500"
            onClick={() => { onSelect({
              type: 'improvement-timeframe',
              title: group.timeframe,
              improvements: group.improvements,
              totalImpact: `${group.improvements?.length || 0} improvements`,
              why: `These improvements are scheduled for ${group.timeframe} to maximize efficiency`,
              how: group.improvements?.map((imp: any) => imp.description) || [],
              where: group.improvements?.flatMap((imp: any) => imp.sources || []) || [],
              impact: `Combined impact: ${group.expectedImpact || '20-30% PMF improvement'}`,
              result: group.expectedResult || 'Progressive improvement in product-market fit'
            }); setDetailModalOpen(true); }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {group.timeframe}
                <Badge variant="outline" className="ml-2">{group.improvements?.length || 0} actions</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {group.improvements?.map((imp: any, i: number) => (
                <div key={i} className="mb-3 p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" />{imp.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{imp.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant="secondary" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" />{imp.expectedDelta || '+5%'}</Badge>
                    {imp.confidence && <Badge variant="outline" className="text-xs">Confidence: {imp.confidence}</Badge>}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3 h-3 mr-1" />Click for detailed implementation plan
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="p-6"><p className="text-muted-foreground text-center">No timeline improvements available yet. Complete the analysis to see recommendations.</p></Card>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          By Cost
        </h3>
        {improvementsByCost.length > 0 ? improvementsByCost.map((group: any, idx: number) => (
          <Card
            key={`cost-${idx}`}
            className="mb-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-blue-500"
            onClick={() => { onSelect({
              type: 'improvement-cost',
              title: group.budget,
              improvements: group.improvements,
              why: `Optimized for ${group.budget} budget constraints`,
              how: group.improvements?.map((imp: any) => `${imp.title}: ${imp.description}`) || [],
              where: group.improvements?.flatMap((imp: any) => imp.sources || []) || [],
              impact: `Average ROI: ${group.averageROI || '300%'}`,
              result: `Expected revenue impact: ${group.revenueImpact || '$10K-50K'}`
            }); setDetailModalOpen(true); }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">{group.budget}<Badge variant="outline">{group.improvements?.length || 0} options</Badge></CardTitle>
            </CardHeader>
            <CardContent>
              {group.improvements?.map((imp: any, i: number) => (
                <div key={i} className="mb-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{imp.title}</h4>
                    <Badge variant="secondary">{imp.cost}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{imp.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs"><BarChart3 className="w-3 h-3 mr-1" />ROI: {imp.roi}</Badge>
                    <span className="text-xs text-green-500">+{imp.expectedRevenue || '$5K'}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground"><ChevronRight className="w-3 h-3 mr-1" />View full ROI analysis</div>
            </CardContent>
          </Card>
        )) : (
          <Card className="p-6"><p className="text-muted-foreground text-center">No cost-based improvements available yet. Complete the analysis to see ROI recommendations.</p></Card>
        )}
      </div>
    </div>
  );
};

export default ImprovementsPanel;
