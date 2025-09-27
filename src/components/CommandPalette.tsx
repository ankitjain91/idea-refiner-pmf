import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Moon, Sun, LayoutDashboard, Plus, Settings, HelpCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  title: string;
  hint?: string;
  action: () => void | Promise<void>;
  keywords?: string[];
  icon?: React.ReactNode;
  group?: string;
}

const groupsOrder = ['Navigation', 'Session', 'Theme', 'Help'];

const fuzzyScore = (q: string, text: string) => {
  if (!q) return 1;
  q = q.toLowerCase();
  text = text.toLowerCase();
  let ti = 0, qi = 0, score = 0, streak = 0;
  while (ti < text.length && qi < q.length) {
    if (text[ti] === q[qi]) { streak++; score += 1 + streak * 0.5; qi++; } else { streak = 0; }
    ti++;
  }
  return qi === q.length ? score / text.length : 0;
};

export const CommandPalette: React.FC<{ open: boolean; onClose: () => void; }> = ({ open, onClose }) => {
  const { toggleTheme, resolvedTheme, setTheme } = useTheme();
  const { createSession } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const coreCommands: Command[] = [
    { id: 'nav-dashboard', title: 'Go to Dashboard', group: 'Navigation', icon: <LayoutDashboard className='h-4 w-4'/>, action: () => navigate('/dashboard'), keywords:['home','main'] },
    { id: 'nav-settings', title: 'Open Settings', group: 'Navigation', icon: <Settings className='h-4 w-4'/>, action: () => navigate('/settings'), keywords:['preferences'] },
    { id: 'nav-pricing', title: 'View Pricing', group: 'Navigation', action: () => navigate('/pricing') },
    { id: 'session-new', title: 'New Brainstorming Session', group: 'Session', icon: <Plus className='h-4 w-4'/>, action: async () => { setBusy(true); try { await createSession('New brainstorming session'); } finally { setBusy(false);} } },
    { id: 'theme-toggle', title: resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme', group: 'Theme', icon: resolvedTheme === 'dark' ? <Sun className='h-4 w-4'/> : <Moon className='h-4 w-4'/>, action: () => toggleTheme(), keywords:['appearance','color'] },
    { id: 'theme-system', title: 'Use System Theme', group: 'Theme', action: () => setTheme('system') },
    { id: 'help', title: 'Help & Support', group: 'Help', icon: <HelpCircle className='h-4 w-4'/>, action: () => navigate('/dashboard#help') }
  ];

  const results = coreCommands
    .map(cmd => ({ cmd, score: fuzzyScore(query, cmd.title + ' ' + (cmd.keywords||[]).join(' ')) }))
    .filter(r => r.score > 0)
    .sort((a,b) => b.score - a.score);

  useEffect(() => { if (!open) { setQuery(''); setHighlight(0);} }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length -1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
      if (e.key === 'Enter') {
        const r = results[highlight];
        if (r) { r.cmd.action(); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, highlight]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[200] flex items-start justify-center pt-32 bg-background/60 backdrop-blur-sm'>
      <div className='w-full max-w-xl rounded-xl glass-super-surface border border-border/60 shadow-xl overflow-hidden'>
        <div className='flex items-center gap-2 px-4 py-3 border-b'>
          <Search className='h-4 w-4 text-muted-foreground'/>
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setHighlight(0);} }
            placeholder='Type a command or search...'
            className='flex-1 bg-transparent outline-none text-sm'
          />
          {busy && <Loader2 className='h-4 w-4 animate-spin text-primary' />}
        </div>
        <div className='max-h-80 overflow-auto py-1'>
          {results.length === 0 && (
            <div className='py-8 text-center text-xs text-muted-foreground'>No matches</div>
          )}
          {groupsOrder.map(group => {
            const groupItems = results.filter(r => r.cmd.group === group);
            if (!groupItems.length) return null;
            return (
              <div key={group} className='px-1 py-1'>
                <div className='text-[10px] uppercase tracking-wide text-muted-foreground/70 px-2 pb-1'>{group}</div>
                {groupItems.map((r,i) => {
                  const globalIndex = results.indexOf(r);
                  return (
                    <button
                      key={r.cmd.id}
                      onClick={() => { r.cmd.action(); onClose(); }}
                      className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm hover:bg-muted/40 transition-colors', globalIndex === highlight && 'bg-primary/15 text-primary')}
                    >
                      <span className='h-5 w-5 inline-flex items-center justify-center text-muted-foreground'>{r.cmd.icon}</span>
                      <span className='flex-1 truncate'>{r.cmd.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className='flex items-center justify-between px-3 py-2 border-t text-[10px] uppercase tracking-wide text-muted-foreground/60'>
          <span>Enter to run • Esc to close</span>
          <span>Arrow keys to navigate</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
