import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Brain, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingTask {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
}

interface DashboardLoadingStateProps {
  tasks: LoadingTask[];
  currentTask?: string;
}

export function DashboardLoadingState({ tasks, currentTask }: DashboardLoadingStateProps) {
  const completedCount = tasks.filter(t => t.status === "complete").length;
  const totalCount = tasks.length;
  const progress = (completedCount / totalCount) * 100;
  
  const hasErrors = tasks.some(t => t.status === "error");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header with Brain Icon */}
        <div className="text-center space-y-4">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="inline-block"
          >
            <div className="relative">
              <Brain className="h-20 w-20 text-primary mx-auto" />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
              />
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Calculating Your Score
            </motion.h1>
            <p className="text-muted-foreground text-lg">
              Analyzing market data and validating your idea
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="space-y-6">
            {/* Progress Bar with Percentage */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {progress < 100 
                    ? currentTask || "Loading analysis..."
                    : hasErrors 
                    ? "Completed with some errors"
                    : "Analysis complete!"}
                </span>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-2xl font-bold text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              
              <Progress value={progress} className="h-3" />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedCount} of {totalCount} complete</span>
                <span>{totalCount - completedCount} remaining</span>
              </div>
            </div>

            {/* Task Grid - Show active and recent tasks */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-border/50">
              {tasks.slice(0, 6).map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg transition-all",
                    task.status === "loading" && "bg-primary/10 ring-1 ring-primary/30",
                    task.status === "complete" && "bg-success/5",
                    task.status === "error" && "bg-destructive/5",
                    task.status === "pending" && "bg-muted/30"
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {task.status === "pending" && (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    {task.status === "loading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {task.status === "complete" && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {task.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  {/* Task Label */}
                  <span className={cn(
                    "text-xs font-medium truncate flex-1",
                    task.status === "complete" && "text-muted-foreground",
                    task.status === "loading" && "text-primary",
                    task.status === "error" && "text-destructive"
                  )}>
                    {task.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Loading Tip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center pt-4 border-t border-border/50"
            >
              <p className="text-sm text-muted-foreground italic">
                💡 Tip: We're gathering real-time data from multiple sources to give you the most accurate analysis
              </p>
            </motion.div>
          </div>
        </Card>

        {/* Animated dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 bg-primary rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
