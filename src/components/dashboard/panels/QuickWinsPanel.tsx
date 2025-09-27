import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Activity, ChevronRight, Clock, Info } from 'lucide-react';

interface QuickWinsPanelProps { wins: any[]; onSelect: (item: any) => void; setDetailModalOpen: (o: boolean) => void; }

export const QuickWinsPanel: React.FC<QuickWinsPanelProps> = ({ wins, onSelect, setDetailModalOpen }) => {
  return (
    <div className="space-y-4">
      {wins?.map((win: any, idx: number) => (
        <Card key={idx} className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-primary hover:scale-[1.02]"
          onClick={() => { onSelect({
            type: 'quickwin',
            ...win,
            why: win.reasoning || 'This quick win can accelerate your path to product-market fit',
            how: win.specificSteps || [],
            where: win.sources || [],
            impact: win.expectedImpact || '10-15% improvement in PMF score',
            result: win.expectedResult || 'Immediate improvement in user engagement and market response'
          }); setDetailModalOpen(true); }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between"><span className="group-hover:text-primary transition-colors">{win.title}</span><Zap className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" /></CardTitle>
            <div className="flex gap-2">
              <Badge variant={win.impact === 'High' ? 'default' : 'secondary'} className="animate-pulse">Impact: {win.impact}</Badge>
              <Badge variant={win.effort === 'Low' ? 'default' : 'secondary'}>Effort: {win.effort}</Badge>
              <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{win.timeframe || '1-2 weeks'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3 text-sm">{win.description}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="w-3 h-3" />Expected improvement: {win.expectedDelta || '+5-10%'}<ChevronRight className="w-3 h-3 ml-auto" />Click for full analysis</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QuickWinsPanel;
