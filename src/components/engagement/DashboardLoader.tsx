import { Brain, TrendingUp, Users, DollarSign, Target, Zap, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

const FUNNY_LOADING_MESSAGES = [
  "Teaching AI to count money it hasn't made yet...",
  "Asking Reddit if your idea is stupid (spoiler: they'll say yes)...",
  "Convincing investors this isn't just another AI wrapper...",
  "Calculating how many pizzas until profitability...",
  "Pretending to understand your target market...",
  "Summoning the spirit of Steve Jobs for validation...",
  "Checking if your competitors are also winging it...",
  "Converting hopes and dreams into actual metrics...",
  "Consulting the magic 8-ball of market research...",
  "Bribing the algorithm for better scores...",
  "Asking ChatGPT if it would invest (it said no)...",
  "Calculating unicorn probability (still waiting)...",
  "Measuring vibes and checking the vibe index...",
  "Determining if this is disruption or delusion...",
  "Running numbers through the BS detector...",
];

const SCORE_TIPS = [
  "💡 Higher engagement metrics = real human interest",
  "🎯 Niche markets often beat broad ones initially",
  "📈 Growth trends matter more than current size",
  "🤝 Low competition + high demand = sweet spot",
  "💰 Willingness to pay > market size",
  "⚡ Speed to market beats perfect planning",
];

export function DashboardLoader({ stage = 'initial' }: { stage?: 'initial' | 'score' | 'tiles' }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Rotate funny messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUNNY_LOADING_MESSAGES.length);
    }, 3000);

    // Rotate tips
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SCORE_TIPS.length);
    }, 4000);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90; // Cap at 90% until real data loads
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  if (stage === 'score') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <Brain className="h-16 w-16 text-primary/20" />
          </div>
          <Brain className="h-16 w-16 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-lg font-semibold text-foreground">
            Calculating SmoothBrains Score...
          </h3>
          <p className="text-sm text-muted-foreground animate-pulse">
            {FUNNY_LOADING_MESSAGES[messageIndex]}
          </p>
        </div>
        <Progress value={progress} className="w-64 h-2" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
          <Sparkles className="h-3 w-3" />
          {SCORE_TIPS[tipIndex]}
        </div>
      </div>
    );
  }

  if (stage === 'tiles') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
        {[
          { icon: TrendingUp, label: 'Market Trends', color: 'text-blue-500' },
          { icon: Users, label: 'User Sentiment', color: 'text-green-500' },
          { icon: DollarSign, label: 'Market Size', color: 'text-yellow-500' },
          { icon: Target, label: 'Competition', color: 'text-red-500' },
          { icon: Zap, label: 'Growth Potential', color: 'text-purple-500' },
          { icon: Sparkles, label: 'AI Insights', color: 'text-pink-500' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-6 space-y-4 animate-pulse"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-muted rounded-lg ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="h-4 bg-muted rounded w-24" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Initial loader
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 animate-spin">
          <Brain className="h-20 w-20 text-primary/10" />
        </div>
        <Brain className="h-20 w-20 text-primary animate-pulse" />
      </div>
      <div className="text-center space-y-3 max-w-lg px-4">
        <h2 className="text-2xl font-bold text-foreground">
          Loading Your Dashboard
        </h2>
        <p className="text-base text-muted-foreground animate-pulse">
          {FUNNY_LOADING_MESSAGES[messageIndex]}
        </p>
      </div>
      <Progress value={progress} className="w-80 h-2" />
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {['Fetching data', 'Analyzing trends', 'Computing scores', 'Validating insights'].map((text, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full text-xs text-muted-foreground animate-pulse"
            style={{ animationDelay: `${idx * 200}ms` }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
