import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe2, TrendingUp, DollarSign, Users, Activity, MapPin, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ProfessionalWorldMapProps {
  marketData?: any;
  loading?: boolean;
}

export function ProfessionalWorldMap({ marketData, loading }: ProfessionalWorldMapProps) {
  const [viewType, setViewType] = useState<"market" | "growth" | "penetration">("market");
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<RegionData | null>(null);
  
  // Realistic regional data
  const regions: RegionData[] = [
    {
      name: "North America",
      coordinates: [-100, 45],
      tam: 4500000000,
      sam: 1350000000,
      som: 135000000,
      cagr: 12.5,
      confidence: 0.82,
      marketPenetration: 0.08,
      competitorDensity: 0.72,
      regulatoryScore: 0.85,
      demographics: {
        population: 365000000,
        urbanization: 0.82,
        internetPenetration: 0.90,
        mobileUsers: 0.85
      }
    },
    {
      name: "Europe",
      coordinates: [10, 50],
      tam: 3800000000,
      sam: 950000000,
      som: 76000000,
      cagr: 10.2,
      confidence: 0.78,
      marketPenetration: 0.06,
      competitorDensity: 0.68,
      regulatoryScore: 0.90,
      demographics: {
        population: 447000000,
        urbanization: 0.75,
        internetPenetration: 0.87,
        mobileUsers: 0.83
      }
    },
    {
      name: "Asia Pacific",
      coordinates: [105, 20],
      tam: 5200000000,
      sam: 1040000000,
      som: 52000000,
      cagr: 18.5,
      confidence: 0.72,
      marketPenetration: 0.03,
      competitorDensity: 0.85,
      regulatoryScore: 0.70,
      demographics: {
        population: 2322000000,
        urbanization: 0.51,
        internetPenetration: 0.63,
        mobileUsers: 0.72
      }
    },
    {
      name: "Latin America",
      coordinates: [-60, -15],
      tam: 1200000000,
      sam: 240000000,
      som: 12000000,
      cagr: 15.8,
      confidence: 0.68,
      marketPenetration: 0.02,
      competitorDensity: 0.45,
      regulatoryScore: 0.65,
      demographics: {
        population: 433000000,
        urbanization: 0.81,
        internetPenetration: 0.71,
        mobileUsers: 0.68
      }
    },
    {
      name: "Middle East & Africa",
      coordinates: [25, 0],
      tam: 950000000,
      sam: 142500000,
      som: 7125000,
      cagr: 22.3,
      confidence: 0.62,
      marketPenetration: 0.01,
      competitorDensity: 0.32,
      regulatoryScore: 0.55,
      demographics: {
        population: 859000000,
        urbanization: 0.43,
        internetPenetration: 0.47,
        mobileUsers: 0.52
      }
    },
    {
      name: "Oceania",
      coordinates: [135, -25],
      tam: 450000000,
      sam: 135000000,
      som: 13500000,
      cagr: 11.2,
      confidence: 0.85,
      marketPenetration: 0.12,
      competitorDensity: 0.58,
      regulatoryScore: 0.88,
      demographics: {
        population: 31000000,
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
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
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
        value = region.cagr / 25;
        break;
      case "penetration":
        value = region.marketPenetration * 5;
        break;
      default:
        value = (region.som / totalSOM) * 2;
    }
    
    // Professional gradient colors
    if (value > 0.6) return "hsl(var(--primary))";
    if (value > 0.4) return "hsl(var(--primary) / 0.8)";
    if (value > 0.2) return "hsl(var(--primary) / 0.6)";
    return "hsl(var(--primary) / 0.4)";
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">Global Market Overview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewType("market")}
              variant={viewType === "market" ? "default" : "outline"}
              size="sm"
              className={cn("h-8", viewType === "market" && "shadow-sm")}
            >
              Market Size
            </Button>
            <Button
              onClick={() => setViewType("growth")}
              variant={viewType === "growth" ? "default" : "outline"}
              size="sm"
              className={cn("h-8", viewType === "growth" && "shadow-sm")}
            >
              Growth
            </Button>
            <Button
              onClick={() => setViewType("penetration")}
              variant={viewType === "penetration" ? "default" : "outline"}
              size="sm"
              className={cn("h-8", viewType === "penetration" && "shadow-sm")}
            >
              Penetration
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Clean SVG World Map */}
          <div className="relative aspect-[2/1] rounded-xl bg-gradient-to-b from-muted/30 to-background border border-border/50 overflow-hidden">
            <svg viewBox="0 0 360 180" className="w-full h-full">
              <defs>
                {/* Subtle gradient definitions */}
                <linearGradient id="ocean-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.05" />
                </linearGradient>
                
                <radialGradient id="region-glow">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
                
                <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feFlood floodColor="#000000" floodOpacity="0.1"/>
                  <feComposite in2="offsetblur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Background */}
              <rect width="360" height="180" fill="url(#ocean-gradient)" />
              
              {/* Subtle grid lines */}
              <g opacity="0.1">
                {[...Array(18)].map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1="0"
                    y1={i * 10}
                    x2="360"
                    y2={i * 10}
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                  />
                ))}
                {[...Array(36)].map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 10}
                    y1="0"
                    x2={i * 10}
                    y2="180"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                  />
                ))}
              </g>
              
              {/* Continents - Simplified but recognizable shapes */}
              <g>
                {/* North America */}
                <path 
                  d="M 60 50 Q 70 45 80 48 L 90 46 L 100 48 L 110 52 L 105 58 L 95 60 L 85 58 L 75 55 L 65 52 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
                
                {/* South America */}
                <path 
                  d="M 85 80 L 88 75 L 90 70 L 92 75 L 94 80 L 92 90 L 90 100 L 88 105 L 85 100 L 83 90 L 84 85 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
                
                {/* Europe */}
                <path 
                  d="M 170 45 L 175 43 L 180 42 L 185 43 L 190 45 L 188 48 L 183 50 L 178 48 L 173 47 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
                
                {/* Africa */}
                <path 
                  d="M 175 65 L 178 60 L 180 58 L 185 60 L 188 65 L 186 75 L 184 85 L 182 90 L 178 88 L 175 80 L 173 70 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
                
                {/* Asia */}
                <path 
                  d="M 200 45 L 220 43 L 240 45 L 250 48 L 245 52 L 235 54 L 225 52 L 215 50 L 205 48 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
                
                {/* Australia */}
                <path 
                  d="M 250 95 L 260 93 L 265 95 L 263 98 L 258 100 L 252 98 Z"
                  fill="hsl(var(--muted))"
                  fillOpacity="0.2"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                />
              </g>
              
              {/* Region markers */}
              {regions.map((region) => {
                const size = Math.sqrt(
                  viewType === "growth" ? region.cagr * 2 : 
                  viewType === "penetration" ? region.marketPenetration * 500 :
                  (region.som / 10000000)
                ) * 2;
                
                const x = region.coordinates[0] + 180;
                const y = 90 - region.coordinates[1];
                
                return (
                  <g 
                    key={region.name}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => setSelectedRegion(region)}
                  >
                    {/* Shadow */}
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 2}
                      fill="black"
                      fillOpacity="0.1"
                      transform={`translate(0, 2)`}
                    />
                    
                    {/* Outer ring */}
                    <circle
                      cx={x}
                      cy={y}
                      r={size + 8}
                      fill="none"
                      stroke={getRegionColor(region)}
                      strokeWidth="1"
                      strokeOpacity="0.2"
                      className={cn(
                        "transition-all duration-300",
                        hoveredRegion === region && "stroke-opacity-40"
                      )}
                    />
                    
                    {/* Main circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={size}
                      fill={getRegionColor(region)}
                      fillOpacity={hoveredRegion === region ? "0.7" : "0.5"}
                      stroke="white"
                      strokeWidth="2"
                      filter="url(#soft-shadow)"
                      className="transition-all duration-300"
                    />
                    
                    {/* Center dot */}
                    <circle
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="white"
                    />
                    
                    {/* Label */}
                    <text 
                      x={x} 
                      y={y + size + 15} 
                      className="text-xs fill-foreground/70 select-none"
                      textAnchor="middle"
                      style={{ fontSize: '10px' }}
                    >
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Hover tooltip */}
            {hoveredRegion && (
              <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-xl border border-border rounded-lg p-4 shadow-lg max-w-xs">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {hoveredRegion.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(hoveredRegion.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">TAM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.tam)}</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">SAM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.sam)}</p>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">SOM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.som)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Growth Rate</span>
                      <span className="font-medium">{hoveredRegion.cagr}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Market Penetration</span>
                      <span className="font-medium">{Math.round(hoveredRegion.marketPenetration * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Population</span>
                      <span className="font-medium">{formatNumber(hoveredRegion.demographics.population)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Market (TAM)</p>
                    <p className="text-2xl font-semibold mt-1">{formatCurrency(totalTAM)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Available opportunity
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Addressable (SAM)</p>
                    <p className="text-2xl font-semibold mt-1">{formatCurrency(totalSAM)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reachable segment
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Obtainable (SOM)</p>
                    <p className="text-2xl font-semibold mt-1">{formatCurrency(totalSOM)}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Year 1 projection
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Regional breakdown table */}
          {selectedRegion && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-primary" />
                    {selectedRegion.name} - Detailed Analysis
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRegion(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Competition Density</p>
                    <Progress value={selectedRegion.competitorDensity * 100} className="mt-2 h-2" />
                    <p className="text-xs mt-1">{Math.round(selectedRegion.competitorDensity * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Regulatory Score</p>
                    <Progress value={selectedRegion.regulatoryScore * 100} className="mt-2 h-2" />
                    <p className="text-xs mt-1">{Math.round(selectedRegion.regulatoryScore * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Internet Penetration</p>
                    <Progress value={selectedRegion.demographics.internetPenetration * 100} className="mt-2 h-2" />
                    <p className="text-xs mt-1">{Math.round(selectedRegion.demographics.internetPenetration * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile Users</p>
                    <Progress value={selectedRegion.demographics.mobileUsers * 100} className="mt-2 h-2" />
                    <p className="text-xs mt-1">{Math.round(selectedRegion.demographics.mobileUsers * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}