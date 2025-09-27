import { useEffect, useState } from 'react';
import { Message } from '../chat/types';

export function useWrinkleAggregation(messages: Message[]) {
  const [wrinklePoints, setWrinklePoints] = useState(0);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    const total = messages
      .filter(m => m.type === 'bot' && typeof m.pointsEarned === 'number')
      .reduce((acc, m) => acc + (m.pointsEarned || 0), 0);
    setWrinklePoints(prev => {
      if (prev !== total) {
        const delta = total - prev;
        if (Math.abs(delta) >= 3) {
          setIsRefining(true);
          setTimeout(() => setIsRefining(false), 800);
        }
        return Math.max(0, total);
      }
      return prev;
    });
  }, [messages]);

  return { wrinklePoints, isRefining };
}
