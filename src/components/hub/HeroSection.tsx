import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileData } from "@/lib/data-hub-orchestrator";
import { motion } from "framer-motion";

interface HeroSectionProps {
  pmfScore?: TileData | null;
  loading?: boolean;
  onGetScore?: () => void;
  hasData?: boolean;
}

export function HeroSection({ pmfScore, loading, onGetScore, hasData }: HeroSectionProps) {
  const score = pmfScore?.metrics?.score || 0;
  const category = pmfScore?.metrics?.category || "Analyzing...";
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "hsl(var(--success))";
    if (score >= 60) return "hsl(var(--warning))";
    if (score >= 40) return "hsl(var(--chart-3))";
    return "hsl(var(--destructive))";
  };

  // Loading state
  if (loading) {
    return (
      <Card className="relative overflow-hidden border-border/50">
        <div className="relative p-12">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Animated calculating indicator */}
            <div className="relative w-32 h-32">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/20"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <motion.h2 
                className="text-2xl font-bold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Calculating Your Score
              </motion.h2>
              <motion.p 
                className="text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Analyzing market data, competition, and growth signals...
              </motion.p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Score display
  return (
    <Card className="relative overflow-hidden border-border/50">
      <motion.div 
        className="relative p-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Subtle background glow */}
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: getScoreColor(score) }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1 }}
        />
        
        <div className="relative flex flex-col items-center justify-center space-y-8">
          {/* Main score circle */}
          <motion.div 
            className="relative w-56 h-56"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <svg className="w-56 h-56 transform -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="16"
                fill="none"
                className="text-muted/10"
              />
              <motion.circle
                cx="112"
                cy="112"
                r="100"
                stroke={getScoreColor(score)}
                strokeWidth="16"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 100}`}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - score / 100) }}
                transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              />
            </svg>
            
            {/* Score number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8, type: "spring", stiffness: 300 }}
              >
                <span 
                  className="text-7xl font-bold tabular-nums"
                  style={{ color: getScoreColor(score) }}
                >
                  {score}
                </span>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Badge 
              variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "outline"}
              className="text-base px-4 py-1.5"
            >
              {category}
            </Badge>
          </motion.div>

          {/* Simple explanation */}
          <motion.p 
            className="text-center text-muted-foreground max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {score >= 70 
              ? "Strong market potential detected. Your idea shows promising signals."
              : score >= 40
              ? "Moderate potential. Focus on key improvements to strengthen fit."
              : "Early stage signals. Significant refinement recommended."}
          </motion.p>
        </div>
      </motion.div>
    </Card>
  );
}