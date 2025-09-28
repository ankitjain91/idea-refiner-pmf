import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, CheckCircle, Info, HelpCircle, 
  Target, Users, CircleDollarSign, Briefcase,
  TrendingUp, Lightbulb, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { Activity } from 'lucide-react';

export interface ValidationResult {
  hasMinimumData: boolean;
  missingFields: string[];
  suggestedQuestions: string[];
  dataCompleteness: number;
  readyForDashboard: boolean;
}

export interface RequiredField {
  key: string;
  label: string;
  question: string;
  icon: any;
  importance: 'critical' | 'important' | 'helpful';
}

export const REQUIRED_FIELDS: RequiredField[] = [
  {
    key: 'targetAudience',
    label: 'Target Audience',
    question: 'Who is your target customer? Describe their demographics, needs, and pain points.',
    icon: Users,
    importance: 'critical'
  },
  {
    key: 'problemSolving',
    label: 'Problem Statement',
    question: 'What specific problem does your idea solve? How are people currently solving this?',
    icon: Target,
    importance: 'critical'
  },
  {
    key: 'businessModel',
    label: 'Business Model',
    question: 'How will you make money? What\'s your pricing strategy?',
    icon: CircleDollarSign,
    importance: 'critical'
  },
  {
    key: 'marketSize',
    label: 'Market Size',
    question: 'What\'s the size of your target market? Any specific geographic focus?',
    icon: TrendingUp,
    importance: 'important'
  },
  {
    key: 'uniqueValue',
    label: 'Unique Value Proposition',
    question: 'What makes your solution unique compared to existing alternatives?',
    icon: Lightbulb,
    importance: 'important'
  },
  {
    key: 'competitorAnalysis',
    label: 'Competition',
    question: 'Who are your main competitors? What are their strengths and weaknesses?',
    icon: Briefcase,
    importance: 'helpful'
  }
];

export const useIdeaValidation = () => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  const checkValidation = async () => {
    // Check multiple localStorage keys for idea
    const idea = localStorage.getItem('currentIdea') || 
                  localStorage.getItem('pmf.user.idea') || 
                  localStorage.getItem('userIdea') ||
                  localStorage.getItem('ideaText');
                  
    // Get user answers for validation
    const userAnswers = localStorage.getItem('pmf.user.answers') || localStorage.getItem('userAnswers');
    const analysisCompleted = localStorage.getItem('pmf.analysis.completed') === 'true';
    
    if (!idea) {
      setValidation({
        hasMinimumData: false,
        missingFields: ['idea'],
        suggestedQuestions: ['What\'s your startup idea?'],
        dataCompleteness: 0,
        readyForDashboard: false
      });
      setLoading(false);
      return;
    }

    try {
      // Calculate validation based on local data first
      const rawAnswers = userAnswers ? JSON.parse(userAnswers) : {};
      // Backward compatibility: map legacy keys to current ones
      const answers: Record<string, any> = { ...rawAnswers };
      if (answers.competition && !answers.competitorAnalysis) {
        answers.competitorAnalysis = answers.competition;
      }
      const answeredFields = Object.keys(answers);
      
      // Check which required fields are missing (treat empty strings as missing)
      const missingFields = REQUIRED_FIELDS
        .filter(field => !answers[field.key] || (typeof answers[field.key] === 'string' && !answers[field.key].trim()))
        .map(field => field.key);
      
      // Calculate weighted completeness score
      const criticalFields = REQUIRED_FIELDS.filter(f => f.importance === 'critical');
      const importantFields = REQUIRED_FIELDS.filter(f => f.importance === 'important');
      const helpfulFields = REQUIRED_FIELDS.filter(f => f.importance === 'helpful');
      
      const criticalCompleted = criticalFields.filter(f => !!answers[f.key]).length;
      const importantCompleted = importantFields.filter(f => !!answers[f.key]).length;
      const helpfulCompleted = helpfulFields.filter(f => !!answers[f.key]).length;
      
      // Weighted scoring: critical = 50%, important = 30%, helpful = 20%
      const criticalScore = (criticalCompleted / Math.max(criticalFields.length, 1)) * 50;
      const importantScore = (importantCompleted / Math.max(importantFields.length, 1)) * 30;
      const helpfulScore = (helpfulCompleted / Math.max(helpfulFields.length, 1)) * 20;
      
      const dataCompleteness = Math.round(criticalScore + importantScore + helpfulScore);
      
      // Dashboard is ready if analysis is completed OR critical fields are done + 70% overall
      const readyForDashboard = analysisCompleted || 
        (criticalCompleted === criticalFields.length && dataCompleteness >= 70);
      
      setValidation({
        hasMinimumData: dataCompleteness >= 30,
        missingFields,
        suggestedQuestions: missingFields.map(field => {
          const fieldDef = REQUIRED_FIELDS.find(f => f.key === field);
          return fieldDef?.question || '';
        }).filter(q => q),
        dataCompleteness,
        readyForDashboard
      });
    } catch (error) {
      console.error('Validation error:', error);
      // Default to ready if there's an error
      setValidation({
        hasMinimumData: true,
        missingFields: [],
        suggestedQuestions: [],
        dataCompleteness: 100,
        readyForDashboard: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkValidation();
    
    // Re-check when localStorage changes
    const interval = setInterval(checkValidation, 2000);
    return () => clearInterval(interval);
  }, []);

  return { validation, loading, refresh: checkValidation };
};

interface DataCompletionCardProps {
  validation: ValidationResult | null;
  onAskQuestion: (question: string) => void;
  onGoToDashboard: () => void;
}

export const DataCompletionCard: React.FC<DataCompletionCardProps> = ({ 
  validation, 
  onAskQuestion,
  onGoToDashboard 
}) => {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  if (!validation) return null;

  // Safe fallbacks to prevent runtime errors
  const safeMissingFields = Array.isArray(validation.missingFields) ? validation.missingFields : [];
  const safeDataCompleteness = typeof validation.dataCompleteness === 'number' ? validation.dataCompleteness : 0;
  const safeReady = !!validation.readyForDashboard;

  const toggleField = (key: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedFields(newExpanded);
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'text-red-500';
      case 'important': return 'text-yellow-500';
      case 'helpful': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="p-6 border-primary/20 bg-gradient-to-br from-card to-card/80">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Dashboard Readiness</h3>
            <p className="text-sm text-muted-foreground">
              Complete information for comprehensive analysis
            </p>
          </div>
        </div>
        <Badge variant={safeReady ? "default" : "secondary"} className={safeReady ? "bg-green-500/20 text-green-500 border-green-500/50" : ""}>
          {safeDataCompleteness}% Complete
        </Badge>
      </div>

      <Progress value={safeDataCompleteness} className="h-2 mb-6" />

      {!safeReady && (
        <>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To unlock the full dashboard experience, please provide more information about your idea.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 mb-4">
            <p className="text-sm font-medium text-muted-foreground">Missing Information:</p>
            {REQUIRED_FIELDS.filter(field => 
              safeMissingFields.includes(field.key)
            ).map((field) => {
              const Icon = field.icon;
              const isExpanded = expandedFields.has(field.key);

              return (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                >
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleField(field.key)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", getImportanceColor(field.importance))} />
                      <span className="font-medium">{field.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {field.importance}
                      </Badge>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-3"
                      >
                        <p className="text-sm text-muted-foreground">{field.question}</p>
                        <Button 
                          size="sm"
                          onClick={() => onAskQuestion(field.question)}
                          className="w-full"
                        >
                          Answer in Chat
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {safeReady ? (
        <div className="space-y-4">
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Great! You have provided enough information for a comprehensive dashboard analysis.
            </AlertDescription>
          </Alert>
          <Button onClick={onGoToDashboard} className="w-full">
            View Full Dashboard
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      ) : (
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            Answer {safeMissingFields.length} more questions to unlock:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
              <span>Market Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
              <span>Competitor Insights</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
              <span>Revenue Projections</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
              <span>Growth Strategy</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};