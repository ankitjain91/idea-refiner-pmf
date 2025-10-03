import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Target, DollarSign, Users, BarChart3, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TileConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  requiredFeature: keyof typeof import('@/contexts/SubscriptionContext').SUBSCRIPTION_TIERS.free.features | null;
  minTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

const tiles: TileConfig[] = [
  {
    id: 'score',
    title: 'SmoothBrains Score',
    description: 'Core validation metric',
    icon: Zap,
    requiredFeature: null,
    minTier: 'free'
  },
  {
    id: 'market_size',
    title: 'Market Size Analysis',
    description: 'TAM, SAM, SOM breakdown',
    icon: Target,
    requiredFeature: 'marketAnalysis',
    minTier: 'basic'
  },
  {
    id: 'competition',
    title: 'Competitive Landscape',
    description: 'Competitor mapping & positioning',
    icon: BarChart3,
    requiredFeature: 'advancedAnalytics',
    minTier: 'basic'
  },
  {
    id: 'forecasting',
    title: 'Financial Forecasting',
    description: 'Revenue projections & unit economics',
    icon: DollarSign,
    requiredFeature: 'trendForecasting',
    minTier: 'pro'
  },
  {
    id: 'collaboration',
    title: 'Team Collaboration',
    description: 'Share & collaborate on ideas',
    icon: Users,
    requiredFeature: 'collaboration',
    minTier: 'pro'
  },
  {
    id: 'ai_recs',
    title: 'AI Recommendations',
    description: 'Strategic guidance & next steps',
    icon: TrendingUp,
    requiredFeature: 'aiInsights',
    minTier: 'pro'
  }
];

export function InsightsTiles() {
  const { subscription, canAccess } = useSubscription();
  const navigate = useNavigate();
  const [upgradeModal, setUpgradeModal] = useState<TileConfig | null>(null);

  const handleTileClick = (tile: TileConfig) => {
    const hasAccess = tile.requiredFeature ? canAccess(tile.requiredFeature) : true;
    
    if (!hasAccess) {
      setUpgradeModal(tile);
    } else {
      // Navigate to feature
      navigate('/ideachat');
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const hasAccess = tile.requiredFeature ? canAccess(tile.requiredFeature) : true;
          const Icon = tile.icon;

          return (
            <Card
              key={tile.id}
              className={`relative cursor-pointer transition-all hover:shadow-md ${
                !hasAccess ? 'opacity-60' : ''
              }`}
              onClick={() => handleTileClick(tile)}
            >
              {!hasAccess && (
                <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40 rounded-lg flex items-center justify-center z-10">
                  <div className="text-center">
                    <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="secondary">{tile.minTier}</Badge>
                  </div>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className="h-6 w-6 text-primary" />
                  {hasAccess && <Badge variant="outline">Active</Badge>}
                </div>
                <CardTitle className="text-base mt-2">{tile.title}</CardTitle>
                <CardDescription className="text-sm">{tile.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Upgrade Modal */}
      <Dialog open={!!upgradeModal} onOpenChange={() => setUpgradeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              {upgradeModal && (
                <>
                  <strong>{upgradeModal.title}</strong> is available on{' '}
                  <Badge variant="default" className="mx-1">{upgradeModal.minTier}</Badge> plan and above.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setUpgradeModal(null)}>
              Maybe Later
            </Button>
            <Button onClick={() => {
              setUpgradeModal(null);
              navigate('/pricing');
            }}>
              View Plans
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
