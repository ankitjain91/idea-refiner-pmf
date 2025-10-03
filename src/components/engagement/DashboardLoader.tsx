import { Brain, TrendingUp, Users, DollarSign, Target, Zap, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

const DASHBOARD_FUN_FACTS = [
  "🦈 Did you know? Baby sharks are called 'pups' and they're born knowing how to swim!",
  "🍕 The world's most expensive pizza costs $12,000 and takes 72 hours to make!",
  "🎮 The first video game ever created was Pong in 1972. It had TWO pixels!",
  "🐙 Octopuses have three hearts and blue blood. Talk about being extra!",
  "🌙 There's a planet made entirely of diamonds. It's called 55 Cancri e!",
  "🦆 Ducks can surf! They've been spotted riding waves in Hawaii for fun!",
  "🧠 Your brain generates 50,000 thoughts per day. That's a lot of ideas!",
  "🎯 The inventor of the frisbee was turned into a frisbee after he died. True story!",
  "🐝 Honey never spoils. Archaeologists found 3,000-year-old honey that was still edible!",
  "🚀 There are more stars in the universe than grains of sand on all Earth's beaches!",
  "🦒 Giraffes have purple tongues that are 20 inches long. Fashion statement!",
  "💎 Bananas are berries, but strawberries aren't. Mind. Blown.",
  "🌊 The Pacific Ocean is so big, it could fit all continents inside it!",
  "🦥 Sloths can hold their breath longer than dolphins. Slow and steady wins!",
  "🎨 The color orange was named after the fruit, not the other way around!",
  "🐧 Penguins propose to their mates with a pebble. Ultimate romantics!",
  "⚡ A bolt of lightning is 5 times hotter than the surface of the sun!",
  "🦈 Sharks existed before trees. They're 400 million years old!",
  "🎪 The shortest war in history lasted 38 minutes. Literally a coffee break!",
  "🌈 There are more possible chess game variations than atoms in the universe!",
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
    // Rotate fun facts
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % DASHBOARD_FUN_FACTS.length);
    }, 4000);

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
        <p className="text-base text-muted-foreground leading-relaxed">
          {DASHBOARD_FUN_FACTS[messageIndex]}
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
