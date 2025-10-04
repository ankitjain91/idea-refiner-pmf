import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Brain, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TileData } from "@/lib/data-hub-orchestrator";
import { motion } from "framer-motion";

interface LoadingTask {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
}

interface HeroSectionProps {
  pmfScore?: TileData | null;
  loading?: boolean;
  onGetScore?: () => void;
  hasData?: boolean;
  loadingTasks?: LoadingTask[];
  currentTask?: string;
}

export function HeroSection({ pmfScore, loading, onGetScore, hasData, loadingTasks = [], currentTask }: HeroSectionProps) {
  const score = pmfScore?.metrics?.score || 0;
  const category = pmfScore?.metrics?.category || "Analyzing...";
  
  const completedCount = loadingTasks.filter(t => t.status === "complete").length;
  const totalCount = loadingTasks.length || 1;
  const progress = (completedCount / totalCount) * 100;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "hsl(var(--success))";
    if (score >= 60) return "hsl(var(--warning))";
    if (score >= 40) return "hsl(var(--chart-3))";
    return "hsl(var(--destructive))";
  };

  // Beautiful loading state with integrated analysis
  if (loading) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative p-12">
          {/* Multi-layer animated background gradients */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-50"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: '200% 200%' }}
          />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-l from-primary/10 via-transparent to-primary/10 opacity-30"
            animate={{ 
              backgroundPosition: ['100% 50%', '0% 50%', '100% 50%'],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ backgroundSize: '200% 200%' }}
          />
          
          {/* Radial glow effect */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Floating particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut"
              }}
            />
          ))}
          
          <div className="relative flex flex-col items-center justify-center space-y-8">
            {/* Animated Brain with glow and orbit */}
            <div className="relative">
              <motion.div
                className="relative w-32 h-32"
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {/* Orbiting particles */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-primary/60 rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      marginLeft: '-4px',
                      marginTop: '-4px',
                    }}
                    animate={{
                      x: [0, Math.cos((i * 120) * Math.PI / 180) * 60, 0],
                      y: [0, Math.sin((i * 120) * Math.PI / 180) * 60, 0],
                      scale: [1, 1.5, 1],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>

              {/* Brain icon with pulse */}
              <motion.div
                className="absolute inset-0"
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Brain className="h-20 w-20 text-primary" />
                  </motion.div>
                </div>

                {/* Ring animation */}
                <motion.div
                  className="absolute inset-0 border-2 border-primary/30 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </motion.div>
            </div>
            
            {/* Title and description */}
            <div className="text-center space-y-3">
              <motion.h2 
                className="text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: [0.8, 1, 0.8],
                  y: 0,
                }}
                transition={{ 
                  opacity: { duration: 2, repeat: Infinity },
                  y: { delay: 0.2 }
                }}
              >
                Calculating Your Score
              </motion.h2>
              <motion.p 
                className="text-lg text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ 
                  delay: 0.4,
                  duration: 3,
                  repeat: Infinity 
                }}
              >
                {currentTask || "Analyzing market data and validating your idea"}
              </motion.p>
            </div>

            {/* Progress section */}
            <motion.div 
              className="w-full max-w-2xl space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Analysis Progress</span>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                    </motion.div>
                    <motion.span 
                      className="text-xl font-bold text-primary tabular-nums"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      {Math.round(progress)}%
                    </motion.span>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress value={progress} className="h-3" />
                  <motion.div
                    className="absolute inset-0 h-3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <motion.span
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {completedCount} of {totalCount} complete
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    {totalCount - completedCount} remaining
                  </motion.span>
                </div>
              </div>

              {/* Active tasks preview */}
              {loadingTasks.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {loadingTasks.slice(0, 6).map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ 
                        delay: 0.7 + (idx * 0.05),
                        type: "spring",
                        stiffness: 200,
                        damping: 15
                      }}
                      whileHover={{ scale: 1.02 }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-all",
                        task.status === "loading" && "bg-primary/10 border-primary/30 shadow-sm shadow-primary/20",
                        task.status === "complete" && "bg-success/5 border-success/20",
                        task.status === "error" && "bg-destructive/5 border-destructive/20",
                        task.status === "pending" && "bg-muted/30 border-border/30"
                      )}
                    >
                      <div className="flex-shrink-0">
                        {task.status === "pending" && (
                          <motion.div 
                            className="h-3 w-3 rounded-full border-2 border-muted"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        {task.status === "loading" && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="h-3 w-3 text-primary" />
                          </motion.div>
                        )}
                        {task.status === "complete" && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          >
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          </motion.div>
                        )}
                        {task.status === "error" && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5 }}
                          >
                            <AlertCircle className="h-3 w-3 text-destructive" />
                          </motion.div>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium truncate",
                        task.status === "complete" && "text-muted-foreground",
                        task.status === "loading" && "text-primary",
                        task.status === "error" && "text-destructive"
                      )}>
                        {task.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Loading tip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ 
                delay: 1.2,
                duration: 4,
                repeat: Infinity,
                repeatDelay: 2
              }}
              className="text-center"
            >
              <p className="text-sm text-muted-foreground italic">
                💡 Gathering real-time data from multiple sources
              </p>
            </motion.div>

            {/* Animated dots */}
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
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