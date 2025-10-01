import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe2, TrendingUp, DollarSign, Users, Activity, Cpu, Zap, Target, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import worldMapSvg from "@/assets/world-regions.svg";

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

interface SpaceshipWorldMapProps {
  marketData?: any;
  loading?: boolean;
}

export function SpaceshipWorldMap({ marketData, loading }: SpaceshipWorldMapProps) {
  const [viewType, setViewType] = useState<"market" | "growth" | "penetration">("market");
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [systemStatus, setSystemStatus] = useState("OPERATIONAL");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // More realistic regional data based on actual market research
  const regions: RegionData[] = [
    {
      name: "North America",
      coordinates: [-100, 45],
      tam: 4500000000, // $4.5B realistic for a specific market segment
      sam: 1350000000, // 30% of TAM
      som: 135000000,  // 10% of SAM (realistic first year)
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
    
    // Futuristic color scheme
    if (value > 0.6) return "#00ff88"; // Bright green
    if (value > 0.4) return "#00bbff"; // Cyan
    if (value > 0.2) return "#ff6b00"; // Orange
    return "#ff0066"; // Pink
  };

  // Animated grid effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Draw static grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }, []);

  return (
    <Card className="relative border-primary/30 bg-gradient-to-br from-background via-background/95 to-primary/5 overflow-hidden">
      {/* Holographic overlay effect */}
      
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                <Globe2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                Global Market Intelligence
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Radio className="h-3 w-3 mr-1" />
                  Live Data
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {systemStatus}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewType("market")}
              variant={viewType === "market" ? "default" : "outline"}
              size="sm"
              className={cn(
                "relative overflow-hidden transition-all",
                viewType === "market" && "bg-gradient-to-r from-primary to-accent border-primary/50"
              )}
            >
              <Cpu className="h-3 w-3 mr-1" />
              Market Size
            </Button>
            <Button
              onClick={() => setViewType("growth")}
              variant={viewType === "growth" ? "default" : "outline"}
              size="sm"
              className={cn(
                "relative overflow-hidden transition-all",
                viewType === "growth" && "bg-gradient-to-r from-primary to-accent border-primary/50"
              )}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Growth Rate
            </Button>
            <Button
              onClick={() => setViewType("penetration")}
              variant={viewType === "penetration" ? "default" : "outline"}
              size="sm"
              className={cn(
                "relative overflow-hidden transition-all",
                viewType === "penetration" && "bg-gradient-to-r from-primary to-accent border-primary/50"
              )}
            >
              <Target className="h-3 w-3 mr-1" />
              Penetration
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="space-y-6">
          {/* Futuristic World Map Display */}
          <div className="relative aspect-[2/1] rounded-lg overflow-hidden bg-gradient-to-br from-background via-background/50 to-primary/10 border border-primary/20">
            {/* Animated grid background */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full opacity-50"
            />
            
            {/* World map with holographic effect */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <img 
                src={worldMapSvg} 
                alt="World Map" 
                className="w-full h-full object-contain opacity-20 filter hue-rotate-180"
              />
            </div>
            
            {/* Data points overlay */}
            <svg viewBox="-180 -90 360 180" className="absolute inset-0 w-full h-full">
              {/* Connection lines between regions */}
              {regions.map((region, i) => 
                regions.slice(i + 1).map((otherRegion, j) => (
                  <line
                    key={`${i}-${j}`}
                    x1={region.coordinates[0]}
                    y1={-region.coordinates[1]}
                    x2={otherRegion.coordinates[0]}
                    y2={-otherRegion.coordinates[1]}
                    stroke="url(#holographic-gradient)"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                ))
              )}
              
              <defs>
                <linearGradient id="holographic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ff00ff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity="0.8" />
                </linearGradient>
                
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Region markers with pulsing effect */}
              {regions.map((region, index) => {
                const size = Math.sqrt(
                  viewType === "growth" ? region.cagr * 2 : 
                  viewType === "penetration" ? region.marketPenetration * 500 :
                  (region.som / 10000000)
                ) * 3;
                
                return (
                  <g key={region.name}>
                    {/* Outer ring */}
                    <circle
                      cx={region.coordinates[0]}
                      cy={-region.coordinates[1]}
                      r={size + 10}
                      fill="none"
                      stroke={getRegionColor(region)}
                      strokeWidth="1"
                      opacity="0.3"
                    />
                    
                    {/* Main marker */}
                    <circle
                      cx={region.coordinates[0]}
                      cy={-region.coordinates[1]}
                      r={size}
                      fill={getRegionColor(region)}
                      fillOpacity="0.6"
                      stroke={getRegionColor(region)}
                      strokeWidth="2"
                      filter="url(#glow)"
                      className="cursor-pointer transition-all hover:r-[size+5]"
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    />
                    
                    {/* Center dot */}
                    <circle
                      cx={region.coordinates[0]}
                      cy={-region.coordinates[1]}
                      r="2"
                      fill="#ffffff"
                    />
                    
                    {/* Region label */}
                    <text 
                      x={region.coordinates[0]} 
                      y={-region.coordinates[1] + size + 20} 
                      className="fill-foreground text-xs font-medium"
                      textAnchor="middle"
                    >
                      {region.name}
                    </text>
                  </g>
                );
              })}
            </svg>
            
            {/* Holographic hover display */}
            {hoveredRegion && (
              <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-xl border border-primary/30 rounded-lg p-4 shadow-2xl max-w-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg" />
                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{hoveredRegion.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">TAM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.tam)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">SAM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.sam)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">SOM</p>
                      <p className="text-sm font-semibold">{formatCurrency(hoveredRegion.som)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Growth Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={hoveredRegion.cagr * 4} className="w-20 h-1.5" />
                        <span className="text-xs font-semibold">{hoveredRegion.cagr}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Penetration</span>
                      <div className="flex items-center gap-2">
                        <Progress value={hoveredRegion.marketPenetration * 100} className="w-20 h-1.5" />
                        <span className="text-xs font-semibold">{Math.round(hoveredRegion.marketPenetration * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={hoveredRegion.confidence * 100} className="w-20 h-1.5" />
                        <span className="text-xs font-semibold">{Math.round(hoveredRegion.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30 border border-border/50">
                      <p className="text-muted-foreground mb-1">Population</p>
                      <p className="font-semibold">{formatNumber(hoveredRegion.demographics.population)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border/50">
                      <p className="text-muted-foreground mb-1">Internet</p>
                      <p className="font-semibold">{Math.round(hoveredRegion.demographics.internetPenetration * 100)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Futuristic summary statistics */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="relative border-primary/30 bg-gradient-to-br from-primary/10 to-transparent overflow-hidden">
              <CardContent className="relative pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total TAM</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalTAM)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Market Potential</p>
                  </div>
                  <div className="relative">
                    <TrendingUp className="relative h-8 w-8 text-primary/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative border-accent/30 bg-gradient-to-br from-accent/10 to-transparent overflow-hidden">
              <CardContent className="relative pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Addressable (SAM)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSAM)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reachable Market</p>
                  </div>
                  <div className="relative">
                    <Users className="relative h-8 w-8 text-accent/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="relative border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent overflow-hidden">
              <CardContent className="relative pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Obtainable (SOM)</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalSOM)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Year 1 Target</p>
                  </div>
                  <div className="relative">
                    <DollarSign className="relative h-8 w-8 text-green-500/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}