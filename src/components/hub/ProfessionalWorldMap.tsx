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
  
  // Extract real data from marketData prop or use intelligent defaults
  const extractRegionalData = (): RegionData[] => {
    const baseRegions = [
      {
        name: "North America",
        coordinates: [-100, 45] as [number, number],
        population: 579000000,
        urbanization: 0.82,
        internetPenetration: 0.90,
        mobileUsers: 0.85
      },
      {
        name: "Europe",
        coordinates: [10, 50] as [number, number],
        population: 747000000,
        urbanization: 0.75,
        internetPenetration: 0.87,
        mobileUsers: 0.83
      },
      {
        name: "Asia Pacific",
        coordinates: [105, 20] as [number, number],
        population: 4560000000,
        urbanization: 0.51,
        internetPenetration: 0.63,
        mobileUsers: 0.72
      },
      {
        name: "Latin America",
        coordinates: [-60, -15] as [number, number],
        population: 659000000,
        urbanization: 0.81,
        internetPenetration: 0.71,
        mobileUsers: 0.68
      },
      {
        name: "Middle East & Africa",
        coordinates: [25, 0] as [number, number],
        population: 2100000000,
        urbanization: 0.43,
        internetPenetration: 0.47,
        mobileUsers: 0.52
      },
      {
        name: "Oceania",
        coordinates: [135, -25] as [number, number],
        population: 44000000,
        urbanization: 0.86,
        internetPenetration: 0.88,
        mobileUsers: 0.85
      }
    ];

    // If we have real market data, use it to calculate realistic regional splits
    if (marketData) {
      console.log('[ProfessionalWorldMap] Received marketData:', marketData);
      
      // Try multiple possible data structures
      const metrics = marketData.metrics || marketData.data?.metrics || marketData;
      const totalTam = 
        metrics?.tam ?? 
        metrics?.total_addressable_market ?? 
        marketData?.tam ??
        marketData?.total_addressable_market ??
        marketData?.marketSize?.tam ??
        null;
      
      const totalSam = 
        metrics?.sam ?? 
        metrics?.serviceable_addressable_market ?? 
        marketData?.sam ??
        marketData?.serviceable_addressable_market ??
        marketData?.marketSize?.sam ??
        null;
        
      const totalSom = 
        metrics?.som ?? 
        metrics?.serviceable_obtainable_market ?? 
        marketData?.som ??
        marketData?.serviceable_obtainable_market ??
        marketData?.marketSize?.som ??
        null;
      
      console.log('[ProfessionalWorldMap] Extracted values:', { totalTam, totalSam, totalSom });
      
      // Check if values exist (even if zero) and are not all zero
      if ((totalTam !== null && totalTam !== undefined) && 
          (totalSam !== null && totalSam !== undefined) && 
          (totalSom !== null && totalSom !== undefined) &&
          (totalTam > 0 || totalSam > 0 || totalSom > 0)) {
        
        console.log('[ProfessionalWorldMap] Using actual market data:', { totalTam, totalSam, totalSom });
        
        // Regional market share based on digital economy size and internet penetration
        const regionalShares = {
          "North America": 0.28,      // Highest per-capita spending
          "Europe": 0.24,              // Strong digital infrastructure
          "Asia Pacific": 0.32,        // Largest population, growing fast
          "Latin America": 0.08,       // Emerging market
          "Middle East & Africa": 0.06, // Growing potential
          "Oceania": 0.02              // Small but mature
        };

        return baseRegions.map(region => {
          const share = regionalShares[region.name as keyof typeof regionalShares] || 0.1;
          const regionTam = totalTam * share;
          const regionSam = totalSam * share;
          const regionSom = totalSom * share;
          
          // Calculate growth rate based on region maturity and digital penetration
          const baseGrowth = 12;
          const growthMultiplier = (1 - region.internetPenetration) * 1.5 + 1; // Emerging markets grow faster
          const cagr = baseGrowth * growthMultiplier;
          
          return {
            name: region.name,
            coordinates: region.coordinates,
            tam: regionTam,
            sam: regionSam,
            som: regionSom,
            cagr: parseFloat(cagr.toFixed(1)),
            confidence: 0.75 + (region.internetPenetration * 0.2), // Higher confidence in mature markets
            marketPenetration: regionSom / regionTam,
            competitorDensity: region.internetPenetration * 0.8, // More developed = more competition
            regulatoryScore: region.urbanization * 0.9, // Urban areas = better regulation
            demographics: {
              population: region.population,
              urbanization: region.urbanization,
              internetPenetration: region.internetPenetration,
              mobileUsers: region.mobileUsers
            }
          };
        });
      } else {
        console.log('[ProfessionalWorldMap] Market data is zero or invalid, using fallback');
      }
    }

    // No fallback - return empty regions if no valid data
    console.log('[ProfessionalWorldMap] No valid market data available');
    return [];
  };

  const regions = extractRegionalData();
  
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

  // Show empty state if no data
  if (regions.length === 0 || totalTAM === 0) {
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Market Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Click "Get PMF Score" or refresh to analyze your idea and load global market data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                  className="absolute top-4 right-4 bg-background/90 dark:bg-background/85 backdrop-blur-2xl border-2 border-primary/40 rounded-xl p-5 shadow-2xl max-w-sm ring-1 ring-black/20 dark:ring-white/10"
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
          
          
          {/* Dynamic content based on view type */}
          <AnimatePresence mode="wait">
            {viewType === "market" && (
              <motion.div
                key="market"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
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
              </motion.div>
            )}

            {viewType === "growth" && (
              <motion.div
                key="growth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-background">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Regional Growth Rates (CAGR)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {regions.sort((a, b) => b.cagr - a.cagr).map((region, i) => (
                        <motion.div
                          key={region.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedRegion(region)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getRegionColor(region) }}
                            />
                            <span className="font-medium">{region.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={(region.cagr / 25) * 100} className="w-24 h-2" />
                            <span className="text-lg font-bold text-green-500">{region.cagr}%</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {viewType === "penetration" && (
              <motion.div
                key="penetration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-background">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Market Penetration by Region
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {regions.sort((a, b) => b.marketPenetration - a.marketPenetration).map((region, i) => (
                        <motion.div
                          key={region.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedRegion(region)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: getRegionColor(region) }}
                            />
                            <span className="font-medium">{region.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-xs text-muted-foreground">
                              <div>SOM: {formatCurrency(region.som)}</div>
                              <div>TAM: {formatCurrency(region.tam)}</div>
                            </div>
                            <Progress value={region.marketPenetration * 100} className="w-24 h-2" />
                            <span className="text-lg font-bold text-blue-500 w-16 text-right">
                              {(region.marketPenetration * 100).toFixed(1)}%
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}