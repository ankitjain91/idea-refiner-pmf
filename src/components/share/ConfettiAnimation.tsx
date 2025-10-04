import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiAnimationProps {
  trigger: boolean;
  duration?: number;
}

export function ConfettiAnimation({ trigger, duration = 3000 }: ConfettiAnimationProps) {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  useEffect(() => {
    if (trigger) {
      // Generate confetti pieces
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);

      // Clear after duration
      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              y: -20, 
              x: `${piece.x}vw`,
              opacity: 1,
              rotate: 0,
            }}
            animate={{ 
              y: '110vh',
              rotate: 360 * 3,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.5,
              delay: piece.delay,
              ease: 'easeIn',
            }}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              backgroundColor: piece.color,
              borderRadius: '2px',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
