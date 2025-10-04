import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Globe2, TrendingUp, DollarSign, Users, Activity, MapPin, BarChart, Maximize2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Satellite background + equirectangular projection for markers
const satUrl = "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"; // contains "world.topo.bathy"

// markers & projection now defined within component after regions & container size are available

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerSize({ w: cr.width, h: Math.max(360, cr.width * 0.5) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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

  const markers = regions.map((r: any) => ({
    lng: r?.coordinates?.[0] ?? 0,
    lat: r?.coordinates?.[1] ?? 0,
    name: r?.name || r?.region || '',
  }));

  const project = (lat: number, lng: number) => {
    const w = containerSize.w || 800;
    const h = containerSize.h || 400;
    const x = ((lng + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return { x, y };
  };
  
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
          {/* Enhanced Interactive SVG World Map */}
          <div className="relative aspect-[2/1] rounded-xl bg-gradient-to-br from-primary/5 via-background to-primary/10 border border-border/50 overflow-hidden group">
            
            <div ref={containerRef} className="relative w-full rounded-2xl overflow-hidden transition-all duration-700" style={{ height: containerSize.h }}>
              {/* Satellite background with subtle animation */}
              <motion.img 
                src={satUrl} 
                alt="World Satellite" 
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                initial={{ scale: 1 }}
                animate={{ scale: 1.02 }}
                transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              />
              
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20 pointer-events-none" />
              
              {/* Animated grid overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
              
              {/* Interactive region markers */}
              {markers.map((m, i) => {
                const region = regions[i];
                const p = project(m.lat, m.lng);
                const isHovered = hoveredRegion?.name === region.name;
                const isSelected = selectedRegion?.name === region.name;
                
                return (
                  <motion.div 
                    key={i} 
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                    style={{ left: p.x, top: p.y }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
                    onMouseEnter={() => setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => setSelectedRegion(isSelected ? null : region)}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {/* Pulsing ring effect */}
                      {(isHovered || isSelected) && (
                        <motion.div
                          className="absolute w-12 h-12 rounded-full border-2 border-primary"
                          initial={{ scale: 0.5, opacity: 0.8 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      
                      {/* Main marker */}
                      <motion.div 
                        className={cn(
                          "w-3 h-3 rounded-full shadow-lg transition-all duration-300",
                          isSelected ? "ring-4 ring-primary/50" : "",
                          isHovered ? "ring-2 ring-primary/30" : ""
                        )}
                        style={{ 
                          backgroundColor: getRegionColor(region),
                          boxShadow: `0 0 ${isHovered || isSelected ? '20px' : '10px'} ${getRegionColor(region)}`
                        }}
                        animate={{
                          scale: isHovered || isSelected ? [1, 1.2, 1] : 1,
                        }}
                        transition={{
                          duration: 2,
                          repeat: isHovered || isSelected ? Infinity : 0,
                        }}
                      />
                      
                      {/* Region label */}
                      <AnimatePresence>
                        {(isHovered || isSelected) && m.name && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute top-6 whitespace-nowrap"
                          >
                            <span className="text-[11px] px-2 py-1 rounded-md bg-background/95 backdrop-blur-sm text-foreground shadow-lg border border-border/50 font-medium">
                              {m.name}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      {/* Quick stats on hover */}
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-12 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-xl border border-border/50 min-w-[120px]"
                        >
                          <div className="text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Growth:</span>
                              <span className="font-semibold text-green-500">{region.cagr}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SOM:</span>
                              <span className="font-semibold">{formatCurrency(region.som)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Connecting lines animation */}
              <svg className="absolute inset-0 pointer-events-none">
                {hoveredRegion && markers.map((m, i) => {
                  if (regions[i].name === hoveredRegion.name) return null;
                  const start = project(hoveredRegion.coordinates[1], hoveredRegion.coordinates[0]);
                  const end = project(m.lat, m.lng);
                  
                  return (
                    <motion.line
                      key={i}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke="hsl(var(--primary))"
                      strokeWidth="1"
                      opacity="0.2"
                      strokeDasharray="5,5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1 }}
                    />
                  );
                })}
              </svg>
            </div>


            {/* Enhanced hover tooltip */}
            <AnimatePresence>
              {hoveredRegion && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-4 right-4 bg-background/98 backdrop-blur-xl border-2 border-primary/20 rounded-xl p-5 shadow-2xl max-w-sm"
                >
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          {hoveredRegion.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Sparkles className="h-3 w-3" />
                          {Math.round(hoveredRegion.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">TAM</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(hoveredRegion.tam)}</p>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">SAM</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(hoveredRegion.sam)}</p>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">SOM</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(hoveredRegion.som)}</p>
                      </motion.div>
                    </div>
                    
                    <div className="space-y-2.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3" />
                          Growth Rate
                        </span>
                        <span className="font-bold text-sm text-green-500">{hoveredRegion.cagr}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Activity className="h-3 w-3" />
                          Market Penetration
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress value={hoveredRegion.marketPenetration * 100} className="h-1.5 w-16" />
                          <span className="font-semibold text-xs">{Math.round(hoveredRegion.marketPenetration * 100)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          Population
                        </span>
                        <span className="font-semibold text-xs">{formatNumber(hoveredRegion.demographics.population)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Globe2 className="h-3 w-3" />
                          Internet
                        </span>
                        <span className="font-semibold text-xs">{Math.round(hoveredRegion.demographics.internetPenetration * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Enhanced summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Total Market (TAM)</p>
                      <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {formatCurrency(totalTAM)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Total available opportunity
                      </p>
                    </div>
                    <motion.div 
                      className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Addressable (SAM)</p>
                      <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {formatCurrency(totalSAM)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Reachable segment
                      </p>
                    </div>
                    <motion.div 
                      className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Users className="h-6 w-6 text-primary" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Obtainable (SOM)</p>
                      <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {formatCurrency(totalSOM)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Year 1 projection
                      </p>
                    </div>
                    <motion.div 
                      className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <DollarSign className="h-6 w-6 text-primary" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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