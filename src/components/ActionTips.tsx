import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MessageSquare, 
  Mail, 
  Share2, 
  FileText, 
  TrendingUp,
  ExternalLink,
  Rocket
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActionTipsProps {
  score: number;
  metadata?: any; // ChatGPT analysis data
}

const ActionTips = ({ score, metadata }: ActionTipsProps) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    toast({
      title: "Action Initiated",
      description: `${action} - This feature requires Supabase integration for full functionality`,
    });
  };

  // Use ChatGPT action tips if available
  const chatGptTips = metadata?.actionTips || [];
  
  const defaultTips = [
    {
      icon: Calendar,
      title: "Sync with Calendar",
      description: "Schedule validation milestones",
      action: "Connect Calendar",
      priority: score > 50,
    },
    {
      icon: MessageSquare,
      title: "Test via Polls",
      description: "Validate with target audience",
      action: "Create Poll",
      priority: true,
    },
    {
      icon: Mail,
      title: "Email Campaign",
      description: "Build early interest list",
      action: "Setup Campaign",
      priority: score > 60,
    },
    {
      icon: Share2,
      title: "Share for Feedback",
      description: "Get peer reviews",
      action: "Generate Link",
      priority: true,
    },
    {
      icon: FileText,
      title: "Generate Pitch Deck",
      description: "AI-powered deck creation",
      action: "Create Deck",
      priority: score > 70,
    },
    {
      icon: TrendingUp,
      title: "Market Research",
      description: "Deep competitor analysis",
      action: "Analyze Market",
      priority: score > 40,
    },
  ];

  // Merge ChatGPT tips with default tips
  const tips = chatGptTips.length > 0 
    ? chatGptTips.map((tip: string, index: number) => ({
        icon: [Rocket, TrendingUp, MessageSquare, Calendar, FileText, Mail][index % 6],
        title: tip.split('.')[0] || tip.substring(0, 30),
        description: tip,
        action: "Take Action",
        priority: true,
      }))
    : defaultTips;

  const activeTips = tips.filter(tip => tip.priority);

  return (
    <Card className="glass-card p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Actionable Next Steps
          </h3>
          <Badge variant="outline" className="text-xs">
            {activeTips.length} Recommendations
          </Badge>
        </div>

        <div className="grid gap-3">
          {activeTips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tip.title}</p>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(tip.action)}
                  className="flex items-center gap-1 hover:bg-primary/10 hover:border-primary"
                >
                  {tip.action}
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Click any action to start implementation
            </p>
            <Badge variant="secondary" className="text-xs">
              Live Updates
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ActionTips;