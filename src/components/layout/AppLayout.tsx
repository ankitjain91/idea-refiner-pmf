import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';


export function AppLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background/40 backdrop-fade">
      <div className="fixed inset-y-0 left-0 z-50">
        <AppSidebar />
      </div>
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto ml-[var(--sidebar-width)]">
        <Outlet />
      </main>
    </div>
  );
}