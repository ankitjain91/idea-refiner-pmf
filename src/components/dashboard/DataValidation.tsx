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

interface ValidationResult {
  hasMinimumData: boolean;
  missingFields: string[];
  suggestedQuestions: string[];
  dataCompleteness: number;
  readyForDashboard: boolean;
}

interface RequiredField {
  key: string;
  label: string;
  question: string;
  icon: any;
  importance: 'critical' | 'important' | 'helpful';
}

const REQUIRED_FIELDS: RequiredField[] = [
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
    const idea = localStorage.getItem('ideaText');
    const conversationHistory = localStorage.getItem('conversationHistory');
    const metadata = localStorage.getItem('ideaMetadata');

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
      // Call validation endpoint
      const { data, error } = await supabase.functions.invoke('dashboard-insights', {
        body: {
          idea,
          analysisType: 'validation',
          conversation: conversationHistory ? JSON.parse(conversationHistory) : [],
          context: metadata ? JSON.parse(metadata) : {}
        }
      });

      if (data?.insights) {
        setValidation(data.insights);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkValidation();
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
        <Badge variant={validation.readyForDashboard ? "default" : "secondary"} className={validation.readyForDashboard ? "bg-green-500/20 text-green-500 border-green-500/50" : ""}>
          {validation.dataCompleteness}% Complete
        </Badge>
      </div>

      <Progress value={validation.dataCompleteness} className="h-2 mb-6" />

      {!validation.readyForDashboard && (
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
              validation.missingFields.includes(field.key)
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

      {validation.readyForDashboard ? (
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
            Answer {validation.missingFields.length} more questions to unlock:
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