import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Circle, Target, Filter, ArrowUpDown } from 'lucide-react';
import { usePMF } from '@/hooks/usePMF';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ActionsPanelProps {
  actions: any[];
  loading: boolean;
  ideaId: string;
}

export function ActionsPanel({ actions, loading, ideaId }: ActionsPanelProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const { updateActionStatus } = usePMF(ideaId);
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleToggleStatus = async (actionId: string, currentStatus: string) => {
    setProcessingAction(actionId);
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const success = await updateActionStatus(actionId, newStatus);
    setProcessingAction(null);

    if (success) {
      toast({
        title: newStatus === 'completed' ? '✅ Action Completed' : '🔄 Action Reopened',
        description: newStatus === 'completed' 
          ? 'Great progress! Keep the momentum going.' 
          : 'Action moved back to pending.',
      });
    }
  };

  // Filter and sort
  let filteredActions = actions;
  if (filterStatus !== 'all') {
    filteredActions = actions.filter(a => a.status === filterStatus);
  }

  if (sortBy === 'priority') {
    filteredActions.sort((a, b) => a.priority - b.priority);
  } else if (sortBy === 'date') {
    filteredActions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const getPriorityBadge = (priority: number) => {
    if (priority <= 3) return { variant: 'destructive' as const, label: 'High' };
    if (priority <= 6) return { variant: 'secondary' as const, label: 'Medium' };
    return { variant: 'outline' as const, label: 'Low' };
  };

  const completedCount = actions.filter(a => a.status === 'completed').length;
  const pendingCount = actions.filter(a => a.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Action Items
            </CardTitle>
            <CardDescription>
              {pendingCount} pending • {completedCount} completed • {actions.length} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredActions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {filterStatus === 'all' 
                ? 'No action items yet. Calculate your PMF score to get recommendations.' 
                : `No ${filterStatus} actions.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActions.map((action) => {
              const priorityBadge = getPriorityBadge(action.priority);
              const isCompleted = action.status === 'completed';
              const isProcessing = processingAction === action.id;

              return (
                <div 
                  key={action.id} 
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted ? 'bg-muted/50 opacity-75' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 mt-0.5"
                      onClick={() => handleToggleStatus(action.id, action.status)}
                      disabled={isProcessing}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium leading-tight ${isCompleted ? 'line-through' : ''}`}>
                          {action.title}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={priorityBadge.variant} className="text-xs">
                            {priorityBadge.label}
                          </Badge>
                          {action.estimated_effort && (
                            <Badge variant="outline" className="text-xs">
                              {action.estimated_effort}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                      
                      {action.category && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {action.category}
                          </Badge>
                          {action.created_at && (
                            <span>Added {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      )}

                      {action.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          Completed {formatDistanceToNow(new Date(action.completed_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
