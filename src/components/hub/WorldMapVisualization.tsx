import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe, TrendingUp, DollarSign, Users, Percent } from "lucide-react";
import { useState } from "react";

interface RegionData {
  name: string;
  coordinates: [number, number];
  tam: number;
  sam: number;
  som: number;
  cagr: number;
  confidence: number;
  marketPenetration: number;
  competitorDensity: number;
  regulatoryScore: number;
  demographics: {
    population: number;
    urbanization: number;
    internetPenetration: number;
    mobileUsers: number;
  };
}

interface WorldMapVisualizationProps {
  marketData?: any;
  loading?: boolean;
}

export function WorldMapVisualization({ marketData, loading }: WorldMapVisualizationProps) {
  const [viewType, setViewType] = useState<"market" | "growth" | "penetration">("market");
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  
  // Highly detailed mock regional data with real coordinates
  const regions: RegionData[] = [
    {
      name: "North America",
      coordinates: [-100, 45],
      tam: 58000000000,
      sam: 18500000000,
      som: 3800000000,
      cagr: 15.2,
      confidence: 0.88,
      marketPenetration: 0.42,
      competitorDensity: 0.72,
      regulatoryScore: 0.85,
      demographics: {
        population: 579000000,
        urbanization: 0.82,
        internetPenetration: 0.90,
        mobileUsers: 0.85
      }
    },
    {
      name: "Europe",
      coordinates: [10, 50],
      tam: 42000000000,
      sam: 12800000000,
      som: 2600000000,
      cagr: 12.8,
      confidence: 0.82,
      marketPenetration: 0.38,
      competitorDensity: 0.68,
      regulatoryScore: 0.90,
      demographics: {
        population: 746000000,
        urbanization: 0.75,
        internetPenetration: 0.87,
        mobileUsers: 0.83
      }
    },
    {
      name: "Asia Pacific",
      coordinates: [105, 20],
      tam: 72000000000,
      sam: 25000000000,
      som: 5200000000,
      cagr: 22.5,
      confidence: 0.75,
      marketPenetration: 0.28,
      competitorDensity: 0.85,
      regulatoryScore: 0.70,
      demographics: {
        population: 4641000000,
        urbanization: 0.51,
        internetPenetration: 0.63,
        mobileUsers: 0.72
      }
    },
    {
      name: "Latin America",
      coordinates: [-60, -15],
      tam: 18000000000,
      sam: 6200000000,
      som: 1300000000,
      cagr: 18.7,
      confidence: 0.70,
      marketPenetration: 0.22,
      competitorDensity: 0.45,
      regulatoryScore: 0.65,
      demographics: {
        population: 656000000,
        urbanization: 0.81,
        internetPenetration: 0.71,
        mobileUsers: 0.68
      }
    },
    {
      name: "Middle East & Africa",
      coordinates: [25, 0],
      tam: 12500000000,
      sam: 3800000000,
      som: 750000000,
      cagr: 25.3,
      confidence: 0.65,
      marketPenetration: 0.15,
      competitorDensity: 0.32,
      regulatoryScore: 0.55,
      demographics: {
        population: 1718000000,
        urbanization: 0.43,
        internetPenetration: 0.47,
        mobileUsers: 0.52
      }
    },
    {
      name: "Oceania",
      coordinates: [135, -25],
      tam: 8500000000,
      sam: 2700000000,
      som: 580000000,
      cagr: 14.2,
      confidence: 0.85,
      marketPenetration: 0.45,
      competitorDensity: 0.58,
      regulatoryScore: 0.88,
      demographics: {
        population: 44000000,
        urbanization: 0.86,
        internetPenetration: 0.88,
        mobileUsers: 0.85
      }
    }
  ];
  
  const totalTAM = regions.reduce((sum, r) => sum + r.tam, 0);
  const totalSAM = regions.reduce((sum, r) => sum + r.sam, 0);
  const totalSOM = regions.reduce((sum, r) => sum + r.som, 0);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    return `${(value / 1000).toFixed(0)}K`;
  };
  
  const getRegionColor = (region: RegionData) => {
    let value = 0;
    switch(viewType) {
      case "growth":
        value = region.cagr / 30;
        break;
      case "penetration":
        value = region.marketPenetration;
        break;
      default:
        value = (region.som / totalSOM);
    }
    
    if (value > 0.3) return "hsl(var(--success))";
    if (value > 0.2) return "hsl(var(--warning))";
    if (value > 0.1) return "hsl(var(--accent))";
    return "hsl(var(--muted))";
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Global Market Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewType("market")}
              variant={viewType === "market" ? "default" : "outline"}
              size="sm"
            >
              Market Size
            </Button>
            <Button
              onClick={() => setViewType("growth")}
              variant={viewType === "growth" ? "default" : "outline"}
              size="sm"
            >
              Growth Rate
            </Button>
            <Button
              onClick={() => setViewType("penetration")}
              variant={viewType === "penetration" ? "default" : "outline"}
              size="sm"
            >
              Penetration
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Realistic World Map */}
          <div className="relative aspect-[2/1] bg-gradient-to-br from-background to-muted/20 rounded-lg overflow-hidden">
            <svg viewBox="-180 -90 360 180" className="w-full h-full">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="hsl(var(--border))" strokeWidth="0.1" opacity="0.3"/>
                </pattern>
              </defs>
              
              {/* Background */}
              <rect x="-180" y="-90" width="360" height="180" fill="url(#grid)" />
              
              {/* Continents - More realistic shapes */}
              <g className="opacity-80">
                {/* North America */}
                <path d="M -150 45 Q -140 55 -130 50 L -120 55 L -110 52 L -100 48 L -90 45 L -85 40 L -80 35 L -75 30 L -70 35 L -65 40 L -70 45 L -75 50 L -80 55 L -90 58 L -100 60 L -110 58 L -120 55 L -130 50 L -140 45 Z" 
                  fill={getRegionColor(regions[0])} 
                  stroke="hsl(var(--border))" 
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[0])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Europe */}
                <path d="M -5 50 L 0 48 L 5 50 L 10 48 L 15 50 L 20 48 L 25 50 L 30 52 L 25 55 L 20 58 L 15 55 L 10 58 L 5 55 L 0 52 Z"
                  fill={getRegionColor(regions[1])}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[1])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Asia */}
                <path d="M 35 50 L 40 45 L 50 40 L 60 35 L 70 30 L 80 28 L 90 25 L 100 20 L 110 18 L 120 20 L 130 25 L 135 30 L 130 35 L 120 40 L 110 45 L 100 48 L 90 50 L 80 48 L 70 45 L 60 42 L 50 45 L 40 48 Z"
                  fill={getRegionColor(regions[2])}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[2])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* South America */}
                <path d="M -70 -10 L -65 -15 L -60 -20 L -55 -25 L -50 -30 L -48 -35 L -50 -40 L -55 -45 L -60 -50 L -65 -45 L -70 -40 L -75 -35 L -78 -30 L -75 -25 L -72 -20 L -70 -15 Z"
                  fill={getRegionColor(regions[3])}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[3])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Africa */}
                <path d="M 10 0 L 15 -5 L 20 -10 L 25 -15 L 30 -20 L 35 -15 L 40 -10 L 35 -5 L 30 0 L 35 5 L 30 10 L 25 15 L 20 10 L 15 5 L 10 0 Z"
                  fill={getRegionColor(regions[4])}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[4])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
                
                {/* Australia */}
                <path d="M 120 -30 L 125 -32 L 130 -35 L 135 -32 L 140 -30 L 135 -28 L 130 -25 L 125 -28 Z"
                  fill={getRegionColor(regions[5])}
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  className="cursor-pointer transition-all hover:opacity-100"
                  onMouseEnter={() => setHoveredRegion(regions[5])}
                  onMouseLeave={() => setHoveredRegion(null)}
                />
              </g>
              
              {/* Market size bubbles */}
              {regions.map((region) => {
                const size = Math.sqrt(
                  viewType === "growth" ? region.cagr : 
                  viewType === "penetration" ? region.marketPenetration * 100 :
                  (region.som / 100000000)
                ) * 2;
                return (
                  <g key={region.name}>
                    <circle
                      cx={region.coordinates[0]}
                      cy={-region.coordinates[1]}
                      r={size}
                      className="fill-primary/30 stroke-primary animate-pulse"
                      strokeWidth="1"
                    />
                    <text 
                      x={region.coordinates[0]} 
                      y={-region.coordinates[1] + size + 15} 
                      className="fill-foreground text-[10px] font-medium"
                      textAnchor="middle"
                    >
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Detailed hover card */}
            {hoveredRegion && (
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur border rounded-lg p-4 shadow-xl max-w-sm">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{hoveredRegion.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(hoveredRegion.confidence * 100)}% confidence
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {hoveredRegion.cagr}% CAGR
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">TAM</p>
                      <p className="font-semibold">{formatCurrency(hoveredRegion.tam)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">SAM</p>
                      <p className="font-semibold">{formatCurrency(hoveredRegion.sam)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">SOM</p>
                      <p className="font-semibold">{formatCurrency(hoveredRegion.som)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Penetration</p>
                      <p className="font-semibold">{Math.round(hoveredRegion.marketPenetration * 100)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Demographics</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span>Population:</span>
                        <span className="font-medium">{formatNumber(hoveredRegion.demographics.population)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Urban:</span>
                        <span className="font-medium">{Math.round(hoveredRegion.demographics.urbanization * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Internet:</span>
                        <span className="font-medium">{Math.round(hoveredRegion.demographics.internetPenetration * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobile:</span>
                        <span className="font-medium">{Math.round(hoveredRegion.demographics.mobileUsers * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Market Factors</div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Competition</span>
                        <Progress value={hoveredRegion.competitorDensity * 100} className="w-20 h-1.5" />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs">Regulatory</span>
                        <Progress value={hoveredRegion.regulatoryScore * 100} className="w-20 h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Summary statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total TAM</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalTAM)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-accent/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Addressable (SAM)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSAM)}</p>
                  </div>
                  <Users className="h-8 w-8 text-accent/20" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-success/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Obtainable (SOM)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSOM)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-success/20" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed regional table */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Regional Analysis</div>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-xs">
                    <th className="text-left p-2">Region</th>
                    <th className="text-right p-2">Market Size</th>
                    <th className="text-right p-2">Growth</th>
                    <th className="text-right p-2">Penetration</th>
                    <th className="text-right p-2">Competition</th>
                    <th className="text-right p-2">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region) => (
                    <tr key={region.name} className="border-t text-sm hover:bg-muted/20 transition-colors">
                      <td className="p-2 font-medium">{region.name}</td>
                      <td className="text-right p-2">{formatCurrency(region.som)}</td>
                      <td className="text-right p-2">
                        <Badge variant={region.cagr > 20 ? "default" : "outline"} className="text-xs">
                          {region.cagr}%
                        </Badge>
                      </td>
                      <td className="text-right p-2">{Math.round(region.marketPenetration * 100)}%</td>
                      <td className="text-right p-2">
                        <Progress value={region.competitorDensity * 100} className="w-16 h-1.5" />
                      </td>
                      <td className="text-right p-2">
                        <Badge variant={
                          region.cagr > 20 && region.marketPenetration < 0.3 ? "default" : 
                          region.cagr > 15 ? "secondary" : "outline"
                        }>
                          {region.cagr > 20 && region.marketPenetration < 0.3 ? "High" : 
                           region.cagr > 15 ? "Medium" : "Low"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}