import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label="Toggle theme"
        onClick={() => setOpen(o => !o)}
        className={cn('h-9 w-9 rounded-md flex items-center justify-center transition-all duration-300 border border-primary/20 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] bg-black/50 backdrop-blur-sm')}
      >
        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 p-2 rounded-md bg-black/95 backdrop-blur-xl border border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.2)] flex flex-col gap-1 z-50">
          <button onClick={() => { setTheme('light'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-primary/10 hover:text-primary transition-all duration-200', theme==='light' && 'bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(0,255,255,0.2)]')}> <Sun className="h-4 w-4" /> Light</button>
          <button onClick={() => { setTheme('dark'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-primary/10 hover:text-primary transition-all duration-200', theme==='dark' && 'bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(0,255,255,0.2)]')}> <Moon className="h-4 w-4" /> Dark</button>
          <button onClick={() => { setTheme('system'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-primary/10 hover:text-primary transition-all duration-200', theme==='system' && 'bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(0,255,255,0.2)]')}> <Monitor className="h-4 w-4" /> System</button>
        </div>
      )}
    </div>
  );
};
