import { useEffect } from 'react';
import { useInitializeIdeas } from '@/hooks/useInitializeIdeas';

export const IdeasInitializer = ({ children }: { children: React.ReactNode }) => {
  // Initialize startup ideas in database on app load
  useInitializeIdeas();
  
  return <>{children}</>;
};