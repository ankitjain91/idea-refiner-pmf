import { useStateRestoration } from '@/hooks/useStateRestoration';
import { ReactNode } from 'react';

interface StateRestorationWrapperProps {
  children: ReactNode;
}

export const StateRestorationWrapper = ({ children }: StateRestorationWrapperProps) => {
  useStateRestoration();
  return <>{children}</>;
};