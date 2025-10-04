import { Brain, TrendingUp, Users, DollarSign, Target, Zap, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
        if (prev >= 90) return 90;
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

  // Initial loader with enhanced animations
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-fade-in relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * 400,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, Math.random() * 400],
              x: [null, Math.random() * window.innerWidth],
              scale: [null, Math.random() * 0.5 + 0.5],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Pulsing brain with glow effect */}
      <div className="relative z-10">
        <motion.div
          className="absolute inset-0 blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-32 h-32 bg-gradient-to-r from-primary via-accent to-secondary rounded-full" />
        </motion.div>
        
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="relative"
        >
          <Brain className="h-24 w-24 text-primary/20" />
        </motion.div>
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="h-24 w-24 text-primary" />
        </motion.div>

        {/* Orbiting sparkles */}
        {[0, 120, 240].map((angle, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2,
            }}
          >
            <motion.div
              style={{
                x: Math.cos((angle * Math.PI) / 180) * 60,
                y: Math.sin((angle * Math.PI) / 180) * 60,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3,
              }}
            >
              <Sparkles className="h-4 w-4 text-accent" />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Animated text content */}
      <motion.div
        className="text-center space-y-4 max-w-lg px-4 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.h2
          className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundSize: '200% 200%',
          }}
        >
          Loading Your Dashboard
        </motion.h2>
        
        <motion.p
          key={messageIndex}
          className="text-base text-muted-foreground leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          {DASHBOARD_FUN_FACTS[messageIndex]}
        </motion.p>
      </motion.div>

      {/* Progress bar with gradient */}
      <motion.div
        className="w-80 z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Progress value={progress} className="h-2" />
      </motion.div>

      {/* Loading status badges */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 max-w-md z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {['Fetching data', 'Analyzing trends', 'Computing scores', 'Validating insights'].map((text, idx) => (
          <motion.div
            key={idx}
            className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full text-xs text-muted-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.8 + idx * 0.1,
              type: "spring",
              stiffness: 200,
            }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: idx * 0.2,
              }}
            />
            {text}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
