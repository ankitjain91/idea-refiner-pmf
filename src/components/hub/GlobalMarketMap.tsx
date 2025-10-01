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
          <div className="relative aspect-[2/1] bg-muted/20 rounded-lg p-4">
            <svg viewBox="0 0 800 400" className="w-full h-full">
              {/* Simplified world map regions */}
              <g className="opacity-90">
                {/* North America */}
                <rect
                  x="100" y="80" width="150" height="120"
                  className={cn("transition-all cursor-pointer", getRegionColor(regions[0]))}
                  onMouseEnter={() => setHoveredRegion("North America")}
                  onMouseLeave={() => setHoveredRegion(null)}
                  rx="8"
                />
                {/* Europe */}
                <rect
                  x="380" y="100" width="100" height="80"
                  className={cn("transition-all cursor-pointer", getRegionColor(regions[1]))}
                  onMouseEnter={() => setHoveredRegion("Europe")}
                  onMouseLeave={() => setHoveredRegion(null)}
                  rx="8"
                />
                {/* Asia Pacific */}
                <rect
                  x="520" y="120" width="180" height="140"
                  className={cn("transition-all cursor-pointer", getRegionColor(regions[2]))}
                  onMouseEnter={() => setHoveredRegion("Asia Pacific")}
                  onMouseLeave={() => setHoveredRegion(null)}
                  rx="8"
                />
                {/* Latin America */}
                <rect
                  x="150" y="230" width="80" height="120"
                  className={cn("transition-all cursor-pointer", getRegionColor(regions[3]))}
                  onMouseEnter={() => setHoveredRegion("Latin America")}
                  onMouseLeave={() => setHoveredRegion(null)}
                  rx="8"
                />
                {/* Middle East & Africa */}
                <rect
                  x="380" y="200" width="100" height="150"
                  className={cn("transition-all cursor-pointer", getRegionColor(regions[4]))}
                  onMouseEnter={() => setHoveredRegion("Middle East & Africa")}
                  onMouseLeave={() => setHoveredRegion(null)}
                  rx="8"
                />
              </g>
              
              {/* Labels */}
              <text x="175" y="140" className="fill-foreground text-xs font-medium" textAnchor="middle">NA</text>
              <text x="430" y="140" className="fill-foreground text-xs font-medium" textAnchor="middle">EU</text>
              <text x="610" y="190" className="fill-foreground text-xs font-medium" textAnchor="middle">APAC</text>
              <text x="190" y="290" className="fill-foreground text-xs font-medium" textAnchor="middle">LATAM</text>
              <text x="430" y="275" className="fill-foreground text-xs font-medium" textAnchor="middle">MEA</text>
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