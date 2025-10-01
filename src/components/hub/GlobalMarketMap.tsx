import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Globe, DollarSign, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileData } from "@/lib/data-hub-orchestrator";

interface GlobalMarketMapProps {
  marketData?: TileData | null;
  loading?: boolean;
}

interface RegionData {
  name: string;
  tam: number;
  sam: number;
  som: number;
  cagr: number;
  confidence: number;
}

export function GlobalMarketMap({ marketData, loading }: GlobalMarketMapProps) {
  const [viewType, setViewType] = useState<"dollar" | "percent">("dollar");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Mock regional data - would come from marketData in production
  const regions: RegionData[] = [
    { name: "North America", tam: 50000000000, sam: 15000000000, som: 3000000000, cagr: 15, confidence: 0.85 },
    { name: "Europe", tam: 35000000000, sam: 10000000000, som: 2000000000, cagr: 12, confidence: 0.75 },
    { name: "Asia Pacific", tam: 60000000000, sam: 20000000000, som: 4000000000, cagr: 22, confidence: 0.70 },
    { name: "Latin America", tam: 15000000000, sam: 5000000000, som: 1000000000, cagr: 18, confidence: 0.65 },
    { name: "Middle East & Africa", tam: 10000000000, sam: 3000000000, som: 500000000, cagr: 25, confidence: 0.60 },
  ];
  
  const totalTAM = regions.reduce((sum, r) => sum + r.tam, 0);
  const totalSAM = regions.reduce((sum, r) => sum + r.sam, 0);
  const totalSOM = regions.reduce((sum, r) => sum + r.som, 0);
  
  const formatValue = (value: number) => {
    if (viewType === "dollar") {
      if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `${((value / totalTAM) * 100).toFixed(1)}%`;
    }
  };
  
  const getRegionColor = (region: RegionData) => {
    const opportunity = (region.som / totalSOM) * region.cagr * region.confidence;
    if (opportunity > 0.3) return "fill-green-500/80";
    if (opportunity > 0.2) return "fill-yellow-500/80";
    if (opportunity > 0.1) return "fill-orange-500/80";
    return "fill-muted/50";
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Global Market Opportunity</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewType("dollar")}
              variant={viewType === "dollar" ? "default" : "outline"}
              size="sm"
              className="gap-1"
            >
              <DollarSign className="h-3 w-3" />
              USD
            </Button>
            <Button
              onClick={() => setViewType("percent")}
              variant={viewType === "percent" ? "default" : "outline"}
              size="sm"
              className="gap-1"
            >
              <Percent className="h-3 w-3" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* World Map Visualization */}
          <div className="relative aspect-[2/1] bg-gradient-to-b from-background/50 to-muted/20 rounded-lg p-4 overflow-hidden">
            <svg viewBox="0 0 1000 500" className="w-full h-full">
              {/* Background gradient */}
              <defs>
                <radialGradient id="oceanGradient">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <rect width="1000" height="500" fill="url(#oceanGradient)" />
              
              {/* World map paths - more realistic shapes */}
              <g className="opacity-90">
                {/* North America */}
                <path
                  d="M 150 150 Q 200 100 250 120 L 280 180 L 260 220 Q 220 240 180 230 L 150 200 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[0]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("North America")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Europe */}
                <path
                  d="M 480 140 L 520 130 Q 540 140 550 160 L 530 180 Q 500 190 480 180 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[1]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("Europe")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Asia Pacific */}
                <path
                  d="M 600 150 Q 650 140 700 160 L 750 200 Q 780 240 760 280 L 700 300 Q 650 290 620 260 L 600 200 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[2]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("Asia Pacific")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Latin America */}
                <path
                  d="M 220 280 Q 230 260 240 280 L 250 350 Q 240 380 220 370 L 210 320 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[3]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("Latin America")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Africa */}
                <path
                  d="M 480 220 Q 500 200 520 210 L 530 280 Q 520 320 500 330 Q 480 320 470 290 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[4]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("Middle East & Africa")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Australia/Oceania - part of APAC */}
                <path
                  d="M 720 350 Q 750 340 770 360 L 760 380 Q 740 385 720 375 Z"
                  className={cn("transition-all cursor-pointer stroke-background/50", getRegionColor(regions[2]))}
                  strokeWidth="2"
                  onMouseEnter={() => setHoveredRegion("Asia Pacific")}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
              </g>
              
              {/* Region labels with better positioning */}
              <text x="200" y="180" className="fill-foreground text-sm font-semibold" textAnchor="middle">North America</text>
              <text x="510" y="160" className="fill-foreground text-sm font-semibold" textAnchor="middle">Europe</text>
              <text x="680" y="230" className="fill-foreground text-sm font-semibold" textAnchor="middle">Asia Pacific</text>
              <text x="230" y="330" className="fill-foreground text-sm font-semibold" textAnchor="middle">LATAM</text>
              <text x="500" y="270" className="fill-foreground text-sm font-semibold" textAnchor="middle">MEA</text>
              
              {/* Market size bubbles */}
              {regions.map((region, idx) => {
                const positions = [
                  { x: 200, y: 150 }, // NA
                  { x: 510, y: 140 }, // EU
                  { x: 680, y: 200 }, // APAC
                  { x: 230, y: 300 }, // LATAM
                  { x: 500, y: 250 }, // MEA
                ];
                const size = Math.sqrt(region.tam / 1000000000) * 2;
                return (
                  <circle
                    key={region.name}
                    cx={positions[idx].x}
                    cy={positions[idx].y}
                    r={size}
                    className="fill-primary/20 stroke-primary/50 animate-pulse"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
            
            {/* Hover tooltip */}
            {hoveredRegion && (
              <div className="absolute top-4 right-4 bg-background border rounded-lg p-3 shadow-lg">
                <p className="font-semibold">{hoveredRegion}</p>
                {regions.find(r => r.name === hoveredRegion) && (
                  <div className="text-sm space-y-1 mt-2">
                    <p>TAM: {formatValue(regions.find(r => r.name === hoveredRegion)!.tam)}</p>
                    <p>SAM: {formatValue(regions.find(r => r.name === hoveredRegion)!.sam)}</p>
                    <p>SOM: {formatValue(regions.find(r => r.name === hoveredRegion)!.som)}</p>
                    <p>CAGR: {regions.find(r => r.name === hoveredRegion)!.cagr}%</p>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(regions.find(r => r.name === hoveredRegion)!.confidence * 100)}% confidence
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Regional breakdown table */}
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <div>Region</div>
              <div>TAM</div>
              <div>SAM</div>
              <div>SOM</div>
              <div>Growth</div>
            </div>
            {regions.map((region) => (
              <div key={region.name} className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-muted/20 rounded">
                <div className="font-medium">{region.name}</div>
                <div>{formatValue(region.tam)}</div>
                <div>{formatValue(region.sam)}</div>
                <div>{formatValue(region.som)}</div>
                <div className="flex items-center gap-1">
                  <span>{region.cagr}%</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(region.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-5 gap-2 text-sm py-2 border-t font-semibold">
              <div>Total</div>
              <div>{formatValue(totalTAM)}</div>
              <div>{formatValue(totalSAM)}</div>
              <div>{formatValue(totalSOM)}</div>
              <div>-</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}