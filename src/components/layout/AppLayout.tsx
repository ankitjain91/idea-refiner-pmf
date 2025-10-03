import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { useSidebar } from '@/components/ui/sidebar';


export function AppLayout() {
  const { open } = useSidebar();
  const sidebarWidth = open !== false ? '256px' : '48px';
  
  return (
      <div className="h-screen w-full overflow-hidden bg-background/40 backdrop-fade">
        <div className="fixed inset-y-0 left-0 z-50" style={{ width: sidebarWidth }}>
          <AppSidebar />
        </div>
        <main 
          className="h-screen overflow-y-auto"
          style={{ marginLeft: sidebarWidth }}
        >
          <Outlet />
        </main>
      </div>
  );
}