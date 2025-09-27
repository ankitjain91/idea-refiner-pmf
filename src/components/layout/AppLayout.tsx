import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';


export function AppLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background/40 backdrop-fade">
      <AppSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}