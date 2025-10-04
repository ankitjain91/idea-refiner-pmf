import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, AlertCircle, Database, TrendingUp, Users, Search, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingTask {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  icon?: React.ReactNode;
}

interface LoadingStatusIndicatorProps {
  show: boolean;
  tasks: LoadingTask[];
  currentTask?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  market_size: <Database className="h-4 w-4" />,
  competition: <Users className="h-4 w-4" />,
  sentiment: <TrendingUp className="h-4 w-4" />,
  web_search: <Search className="h-4 w-4" />,
  news_analysis: <Newspaper className="h-4 w-4" />,
  google_trends: <TrendingUp className="h-4 w-4" />,
};

export function LoadingStatusIndicator({ show, tasks, currentTask }: LoadingStatusIndicatorProps) {
  if (!show || tasks.length === 0) return null;

  const completedCount = tasks.filter(t => t.status === "complete").length;
  const totalCount = tasks.length;
  const progress = (completedCount / totalCount) * 100;
  
  const hasErrors = tasks.some(t => t.status === "error");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-50 max-w-md"
        >
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <h3 className="font-semibold">Loading Analysis</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{totalCount}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progress < 100 
                    ? `Analyzing ${currentTask || "data"}...`
                    : hasErrors 
                    ? "Completed with some errors"
                    : "Analysis complete!"}
                </p>
              </div>

              {/* Task List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      task.status === "loading" && "bg-primary/5",
                      task.status === "complete" && "bg-success/5",
                      task.status === "error" && "bg-destructive/5"
                    )}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {task.status === "pending" && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                      {task.status === "loading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {task.status === "complete" && (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      )}
                      {task.status === "error" && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {iconMap[task.id] || task.icon}
                        <span className={cn(
                          "text-sm font-medium truncate",
                          task.status === "complete" && "text-muted-foreground",
                          task.status === "error" && "text-destructive"
                        )}>
                          {task.label}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {task.status === "loading" && (
                      <Badge variant="secondary" className="text-xs">
                        Loading
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
