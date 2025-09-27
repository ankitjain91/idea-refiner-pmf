import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { AnimatePresence, motion } from 'framer-motion';


export function AppLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen flex w-full bg-background/40 backdrop-fade">
      <AppSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="flex-1 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}