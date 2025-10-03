import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TileData } from "@/lib/data-hub-orchestrator";
import { 
  Rocket, Target, Shield, AlertTriangle,
  TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface QuickStatsStripProps {
  tiles: {
    growth_potential?: TileData | null;
    market_readiness?: TileData | null;
    competitive_advantage?: TileData | null;
    risk_assessment?: TileData | null;
  };
  loading?: boolean;
}

interface QuickStatCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data?: TileData | null;
  loading?: boolean;
  accentColor: string;
}

function QuickStatCard({ title, icon: Icon, data, loading, accentColor }: QuickStatCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Derive a numeric score even if tiles provide different metric shapes
  const deriveScore = (title: string, data?: TileData | null): number | null => {
    const m: any = data?.metrics || {};
    // Direct numeric score
    if (typeof m.score === 'number' && !isNaN(m.score)) return Math.max(0, Math.min(100, m.score));
    // Common alternative numeric keys (0-1 scale)
    if (typeof m.readiness_score === 'number') return Math.round(m.readiness_score * 100);
    if (typeof m.defensibility_score === 'number') return Math.round(m.defensibility_score * 100);
    // String-based heuristics
    const toScoreFromText = (v?: string): number | null => {
      if (!v || typeof v !== 'string') return null;
      const val = v.toLowerCase();
      if (/(excellent|optimal|strong|high)/.test(val)) return 85;
      if (/(good|moderate|medium)/.test(val)) return 65;
      if (/(low|weak|poor)/.test(val)) return 45;
      return null;
    };
    if (title.includes('Growth') && typeof m.projection === 'string') {
      const match = m.projection.match(/(\d+(?:\.\d+)?)x/i);
      if (match) return Math.min(95, 60 + Math.round(parseFloat(match[1]) * 5));
    }
    if (title.includes('Market') && typeof m.adoption_rate === 'string') {
      const s = toScoreFromText(m.adoption_rate); if (s !== null) return s;
    }
    if (title.includes('Competitive') && (typeof m.defensibility === 'string' || typeof m.moat === 'string')) {
      const s1 = toScoreFromText(m.defensibility); if (s1 !== null) return s1;
      const s2 = toScoreFromText(m.moat); if (s2 !== null) return s2;
    }
    if (title.includes('Risk')) {
      // Invert risk: low risk => high score
      const riskText = (m.overall_risk || m.market_risk || m.execution_risk || '') as string;
      const s = toScoreFromText(riskText);
      if (s !== null) return 110 - s; // invert scale roughly
    }
    return null;
  };

  const score = deriveScore(title, data);
  const rawTrend: any = data?.metrics?.trend;
  const trend = typeof rawTrend === 'number' ? rawTrend : /improv|up|grow/i.test(String(rawTrend || '')) ? 1 : /down|declin|fall/i.test(String(rawTrend || '')) ? -1 : 0;
  const confidence = typeof data?.confidence === 'number' && data?.confidence > 0 ? data.confidence : 0.7;
  
  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };
  
  // Create sparkline data (mock for now)
  const sparklineData = Array.from({ length: 10 }, (_, i) => 
    Math.max(0, Math.min(100, score + (Math.random() - 0.5) * 20))
  );
  
  return (
    <>
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
          "border-l-4",
          accentColor
        )}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            {getTrendIcon()}
          </div>
          
          {loading ? (
            <div className="h-8 bg-muted animate-pulse rounded" />
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              
              {/* Mini sparkline */}
              <div className="h-8 flex items-end gap-0.5">
                {sparklineData.map((value, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 rounded-t"
                    style={{ height: `${value * 0.3}px` }}
                  />
                ))}
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {Math.round(confidence * 100)}% conf
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Score</p>
                <p className="text-2xl font-bold">{score}/100</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trend</p>
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span className="text-sm">{trend > 0 ? '+' : ''}{trend}%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm">{data?.explanation}</p>
            </div>
            
            {data?.citations && data.citations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Based on:</p>
                {data.citations.slice(0, 3).map((citation, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    • {citation.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QuickStatsStrip({ tiles, loading }: QuickStatsStripProps) {
  const stats = [
    {
      title: "Growth Potential",
      icon: Rocket,
      data: tiles.growth_potential,
      accentColor: "border-l-green-500"
    },
    {
      title: "Market Readiness",
      icon: Target,
      data: tiles.market_readiness,
      accentColor: "border-l-blue-500"
    },
    {
      title: "Competitive Advantage",
      icon: Shield,
      data: tiles.competitive_advantage,
      accentColor: "border-l-purple-500"
    },
    {
      title: "Risk Assessment",
      icon: AlertTriangle,
      data: tiles.risk_assessment,
      accentColor: "border-l-red-500"
    }
  ];
  
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b mb-6 -mx-4 px-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <QuickStatCard
            key={stat.title}
            title={stat.title}
            icon={stat.icon}
            data={stat.data}
            loading={loading}
            accentColor={stat.accentColor}
          />
        ))}
      </div>
    </div>
  );
}