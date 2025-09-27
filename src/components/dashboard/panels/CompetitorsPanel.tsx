import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, AlertCircle, ChevronRight } from 'lucide-react';

interface CompetitorsPanelProps {
  competitors: any[];
  onSelect: (item: any) => void;
  setDetailModalOpen: (open: boolean) => void;
}

export const CompetitorsPanel: React.FC<CompetitorsPanelProps> = ({ competitors, onSelect, setDetailModalOpen }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {competitors?.length > 0 ? competitors.map((comp: any, idx: number) => (
        <Card
          key={idx}
          className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-gradient-to-br from-background to-muted/20 border-l-4 border-l-purple-500"
          onClick={() => {
            onSelect({
              type: 'competitor',
              title: comp.name,
              ...comp,
              why: `Understanding ${comp.name} helps identify market gaps and opportunities`,
              how: [
                `They target: ${comp.targetMarket || 'Similar audience'}`,
                `Their USP: ${comp.usp || comp.description}`,
                `Key features: ${comp.keyFeatures?.join(', ') || 'Feature parity required'}`,
                `Weaknesses: ${comp.weaknesses?.join(', ') || 'Limited customer support'}`
              ],
              where: comp.sources || [],
              impact: `Market opportunity: ${comp.marketGap || '15-20% untapped segment'}`,
              result: `Differentiation strategy: ${comp.differentiationStrategy || 'Focus on underserved features'}`
            });
            setDetailModalOpen(true);
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">{comp.name}</CardTitle>
              <Target className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex gap-2">
              <Badge className="w-fit">{comp.marketShare} market share</Badge>
              <Badge variant="outline">{comp.userBase || '10K+ users'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{comp.description}</p>
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Pricing</p>
                <p className="font-semibold">{comp.pricing}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Funding</p>
                <p className="font-semibold">{comp.fundingRaised}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                Threat level: {comp.threatLevel || 'Medium'}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )) : (
        <Card className="col-span-full p-6">
          <p className="text-muted-foreground text-center">No competitor analysis available. Complete the assessment to see competitive landscape.</p>
        </Card>
      )}
    </div>
  );
};

export default CompetitorsPanel;
