import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, BarChart3, Shield, DollarSign, RotateCcw } from 'lucide-react';

interface QuickActionsProps {
  hasValidIdea: boolean;
  conversationStarted: boolean;
  onSendMessage: (message: string) => void;
  onResetChat: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  hasValidIdea,
  conversationStarted,
  onSendMessage,
  onResetChat
}) => {
  const quickActions = [
    {
      id: 'analysis',
      label: 'PMF Analysis',
      icon: BarChart3,
      message: 'Analyze my idea and give me a PMF score',
      color: 'primary',
      hoverColor: 'primary'
    },
    {
      id: 'wrinkles',
      label: 'Grow More Wrinkles',
      icon: Sparkles,
      message: 'Help me refine this idea further',
      color: 'purple',
      hoverColor: 'purple-500'
    },
    {
      id: 'risks',
      label: 'Risk Assessment',
      icon: Shield,
      message: 'What are the main risks?',
      color: 'yellow',
      hoverColor: 'yellow-500'
    },
    {
      id: 'monetization',
      label: 'Monetization',
      icon: DollarSign,
      message: 'How should I monetize this?',
      color: 'green',
      hoverColor: 'green-500'
    }
  ];

  return (
    <div className="p-4 sm:p-6 border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 flex-1">
          {quickActions.map((action) => (
            <motion.div 
              key={action.id}
              whileHover={hasValidIdea ? { scale: 1.02 } : {}} 
              whileTap={hasValidIdea ? { scale: 0.98 } : {}}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={!hasValidIdea}
                onClick={() => hasValidIdea && onSendMessage(action.message)}
                className={`fluid-text-xs group ${hasValidIdea 
                  ? `hover:bg-${action.color === 'primary' ? 'primary' : action.color}-500/10 hover:border-${action.color === 'primary' ? 'primary' : action.color}-500/50` 
                  : 'opacity-50 cursor-not-allowed bg-muted'}`}
              >
                <action.icon className={`h-3 w-3 mr-1.5 ${hasValidIdea 
                  ? `text-${action.color === 'primary' ? 'primary' : action.color}-500 group-hover:scale-110 transition-transform` 
                  : 'text-muted-foreground'}`} />
                {action.label}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Reset button */}
        {conversationStarted && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetChat}
              className="fluid-text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1.5" />
              Reset
            </Button>
          </motion.div>
        )}
      </div>
      
      {/* GPT-5 Powered indicator */}
      <div className="flex items-center justify-center mt-4 gap-1 text-slate-500 dark:text-slate-400 fluid-text-xs font-medium">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>GPT-5 Powered</span>
        <Sparkles className="h-2 w-2 text-yellow-300" />
      </div>
    </div>
  );
};

export default QuickActions;