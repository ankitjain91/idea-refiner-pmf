import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedBrainProps {
  refinementLevel: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  isAnimating?: boolean;
  previewMode?: boolean; // when true, show progressive formation regardless of refinementLevel
}

const AnimatedBrain: React.FC<AnimatedBrainProps> = ({ 
  refinementLevel, 
  size = 'md',
  isAnimating = false,
  previewMode = false
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const getWrinkleOpacity = (threshold: number) => {
    return refinementLevel >= threshold ? 1 : 0.1;
  };

  const getWrinkleColor = () => {
    // More realistic brain colors
    if (refinementLevel < 25) return '#d1d5db'; // gray-300 - early wrinkles
    if (refinementLevel < 50) return '#f87171'; // red-400 - developing blood flow
    if (refinementLevel < 75) return '#f472b6'; // pink-400 - active regions
    return '#fb7185'; // rose-400 - highly active brain
  };

  // When in previewMode we drive a looping staged sequence from 0->100
  const previewRefinement = React.useMemo(() => {
    if (!previewMode) return refinementLevel;
    // Use a synthetic oscillation to show full progression
    const t = Date.now() / 1200; // slower cycle
    const phase = (t % 1); // 0..1
    return Math.min(100, Math.max(0, phase * 100));
  }, [previewMode, refinementLevel]);

  const activeRefinement = previewMode ? previewRefinement : refinementLevel;

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Brain base - realistic brain tissue colors */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-200 to-red-300 dark:from-pink-300 dark:to-red-400"
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.8, repeat: isAnimating ? Infinity : 0 }}
      />
      
      {/* Brain wrinkles - appear progressively */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 100 100"
        style={{ overflow: 'visible' }}
      >
        {/* Basic wrinkles (0-25%) */}
        <motion.path
          d="M25,30 Q35,25 45,30 Q55,35 65,30"
          stroke={getWrinkleColor()}
          strokeWidth="2"
          fill="none"
          opacity={getWrinkleOpacity(10)}
          animate={(isAnimating || previewMode) && activeRefinement >= 10 ? { 
            pathLength: [0, 1],
            opacity: [0.1, 1] 
          } : {}}
          transition={{ duration: 0.5 }}
        />
        
        {/* More wrinkles (25-50%) */}
        <motion.path
          d="M20,45 Q30,40 40,45 Q50,50 60,45 Q70,40 80,45"
          stroke={getWrinkleColor()}
          strokeWidth="1.5"
          fill="none"
          opacity={getWrinkleOpacity(25)}
          animate={(isAnimating || previewMode) && activeRefinement >= 25 ? { 
            pathLength: [0, 1],
            opacity: [0.1, 1] 
          } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        
        {/* Complex wrinkles (50-75%) */}
        <motion.path
          d="M15,60 Q25,55 35,60 Q45,65 55,60 Q65,55 75,60 Q85,65 95,60"
          stroke={getWrinkleColor()}
          strokeWidth="1.5"
          fill="none"
          opacity={getWrinkleOpacity(50)}
          animate={(isAnimating || previewMode) && activeRefinement >= 50 ? { 
            pathLength: [0, 1],
            opacity: [0.1, 1] 
          } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        
        {/* Advanced wrinkles (75-100%) */}
        <motion.path
          d="M10,75 Q20,70 30,75 Q40,80 50,75 Q60,70 70,75 Q80,80 90,75"
          stroke={getWrinkleColor()}
          strokeWidth="1"
          fill="none"
          opacity={getWrinkleOpacity(75)}
          animate={(isAnimating || previewMode) && activeRefinement >= 75 ? { 
            pathLength: [0, 1],
            opacity: [0.1, 1] 
          } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
        />
        
        {/* Master level wrinkles (90-100%) */}
        <motion.path
          d="M30,20 Q40,15 50,20 M20,35 Q30,30 40,35 M60,35 Q70,30 80,35"
          stroke={getWrinkleColor()}
          strokeWidth="1"
          fill="none"
          opacity={getWrinkleOpacity(90)}
          animate={(isAnimating || previewMode) && activeRefinement >= 90 ? { 
            pathLength: [0, 1],
            opacity: [0.1, 1] 
          } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
        />
      </svg>
      
      {/* Percentage display removed per rebrand requirement */}
      
      {/* Sparkle effects for high refinement */}
      {activeRefinement >= 80 && (
        <>
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
            animate={{ 
              scale: [0, 1, 0],
              rotate: [0, 180, 360] 
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          />
          <motion.div
            className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-pink-400 rounded-full"
            animate={{ 
              scale: [0, 1, 0],
              rotate: [360, 180, 0] 
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity, 
              repeatType: "reverse",
              delay: 0.5 
            }}
          />
        </>
      )}
    </div>
  );
};

export default AnimatedBrain;