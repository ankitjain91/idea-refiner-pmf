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
        className={cn('h-9 w-9 rounded-md flex items-center justify-center transition-colors border border-border/60 hover:bg-muted/40 backdrop-fade glass-super-surface')}
      >
        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 p-2 rounded-lg glass-super-surface border border-border/60 shadow-lg flex flex-col gap-1 z-50">
          <button onClick={() => { setTheme('light'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/40', theme==='light' && 'bg-primary/10 text-primary font-medium')}> <Sun className="h-4 w-4" /> Light</button>
          <button onClick={() => { setTheme('dark'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/40', theme==='dark' && 'bg-primary/10 text-primary font-medium')}> <Moon className="h-4 w-4" /> Dark</button>
          <button onClick={() => { setTheme('system'); setOpen(false); }} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/40', theme==='system' && 'bg-primary/10 text-primary font-medium')}> <Monitor className="h-4 w-4" /> System</button>
        </div>
      )}
    </div>
  );
};
