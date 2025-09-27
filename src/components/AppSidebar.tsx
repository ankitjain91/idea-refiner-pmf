import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus,
  Crown,
  Settings,
  Trash2,
  HelpCircle,
  Pencil,
  Copy,
  Search,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { BRAND } from '@/branding';
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SessionContext";
import { useAlerts } from "@/contexts/AlertContext";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { DeleteSessionsButton } from "@/components/DeleteSessionsButton";

interface AppSidebarProps {
  onNewChat?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function AppSidebar({ onNewChat, style, className }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const isOpen = open !== false;
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { sessions, currentSession, createSession, loadSession, deleteSession, renameSession, duplicateSession, isSaving } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { addAlert } = useAlerts();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const newInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  // Use sessions directly from context - no local state or real-time updates needed
  // Real-time updates should be handled by the main content area or context

  const resetLocalSessionState = () => {
    const keys = ['loadedSessionId','currentSessionId','userIdea','userAnswers','userRefinements','ideaMetadata','chatHistory','analysisCompleted','analysisData','pmfScore'];
    keys.forEach(k => localStorage.removeItem(k));
  };

  const handleCreateInline = async () => {
    if (!newName.trim()) {
      addAlert({ variant: 'warning', title: 'Name required', message: 'Enter a session name', scope: 'session', autoDismissMs: 3000 });
      return;
    }
    resetLocalSessionState();
    await createSession(newName.trim());
    setCreating(false);
    setNewName('');
    onNewChat?.();
  };

  const handleLoadSession = async (sessionId: string) => {
    // Navigate first so lazy components mount in correct route, then load state
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: false });
    }
    await loadSession(sessionId);
    // Trigger reset callback to update the chat
    onNewChat?.();
    // Notify chat component to rehydrate/focus
    window.dispatchEvent(new CustomEvent('session:loaded', { detail: { id: sessionId }}));
    // Accessibility announcement
    window.dispatchEvent(new CustomEvent('status:announce', { detail: 'Session opened' }));
  };

  const mainNav = [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Pricing", url: "/pricing", icon: Crown },
    { title: "Help & Support", url: "#", icon: HelpCircle, action: "help" },
  ];

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  // Focus management
  useEffect(() => { if (creating && newInputRef.current) newInputRef.current.focus(); }, [creating]);
  useEffect(() => { if (editingId && editInputRef.current) editInputRef.current.focus(); }, [editingId]);
  const filtered = sessions.filter(s => !search.trim() || (s.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <Sidebar collapsible="icon" className={"glass-super-surface elevation-2 backdrop-fade " + (className || '')} style={style}>
      <SidebarHeader className="border-b p-4">
        {isOpen && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{BRAND}</h2>
            <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
              {subscription.tier}
            </Badge>
          </div>
        )}
      </SidebarHeader>

  <SidebarContent className="flex flex-col soft-scroll">
        {/* Brainstorming Sessions - takes available space */}
        <SidebarGroup className="flex-1">
          <div className="px-3 pt-2">
            {isOpen && (
              <div className="relative group">
                <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full text-[12px] pl-6 pr-2 py-1.5 rounded-md bg-muted/40 focus:bg-background/80 border border-transparent focus:border-border outline-none transition-colors"
                />
                <button
                  onClick={() => setCreating(c => !c)}
                  aria-label="New session"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted/70 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <SidebarGroupContent className="mt-2">
            <ScrollArea className="h-full pr-2">
              <SidebarMenu>
                {creating && isOpen && (
                  <div className="px-2 py-1.5 flex items-center gap-2">
                    <input
                      ref={newInputRef}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { handleCreateInline(); }
                        if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                      }}
                      placeholder="Session name..."
                      className="flex-1 text-xs px-2 py-1 rounded-md bg-background/80 border focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleCreateInline}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</Button>
                  </div>
                )}
                {filtered.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <div className="group">
                      <SidebarMenuButton
                        onClick={() => handleLoadSession(session.id)}
                        className={`w-full px-2 py-2 flex items-center gap-2 rounded-md justify-between ${
                          currentSession?.id === session.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex flex-col flex-1 min-w-0">
                          {editingId === session.id ? (
                            <input
                              ref={editInputRef}
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => { renameSession(session.id, editingValue); setEditingId(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { renameSession(session.id, editingValue); setEditingId(null); }
                                if (e.key === 'Escape') { setEditingId(null); }
                              }}
                              className="w-full text-[13px] px-1 py-0.5 rounded bg-background/70 border focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                          ) : (
                            <span
                              className="font-medium text-[13px] truncate leading-tight text-foreground flex items-center gap-1"
                              title={session.name}
                            >
                              <span className="max-w-[140px] xl:max-w-[170px] truncate inline-block">{session.name || 'Untitled Session'}</span>
                              {currentSession?.id === session.id && (
                                <span className="inline-flex items-center flex-shrink-0">
                                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                                </span>
                              )}
                            </span>
                          )}
                          {isOpen && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(session.last_accessed), "MMM d, h:mm a")}
                            </span>
                          )}
                        </div>
                        {editingId !== session.id && (
                          <div className="flex items-center gap-1 transition-opacity">
                            {isOpen && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); setEditingId(session.id); setEditingValue(session.name || ''); }}
                                  className="h-6 w-6 p-0"
                                  aria-label="Rename session"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); duplicateSession(session.id); }}
                                  className="h-6 w-6 p-0"
                                  aria-label="Duplicate session"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                              aria-label="Delete session"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </div>
                  </SidebarMenuItem>
                ))}
                {filtered.length === 0 && sessions.length > 0 && (
                  <div className="text-xs text-muted-foreground px-3 py-2">No matches</div>
                )}
                {sessions.length === 0 && !creating && isOpen && (
                  <div className="text-xs text-muted-foreground px-3 py-2">
                    No sessions yet. Click + to create one.
                  </div>
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation - positioned at bottom */}
        <SidebarGroup className="mt-auto border-t">
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild={!item.action}
                    onClick={item.action === 'help' ? () => {
                      const helpBtn = document.querySelector('[data-help-button]') as HTMLButtonElement;
                      if (helpBtn) helpBtn.click();
                    } : undefined}
                  >
                    {item.action ? (
                      <button className="flex items-center w-full hover:bg-muted/50 rounded-md px-2 py-1.5">
                        <item.icon className="mr-2 h-4 w-4" />
                        {isOpen && <span>{item.title}</span>}
                      </button>
                    ) : (
                      <NavLink to={item.url} end className={getNavClass}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {isOpen && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t p-2 space-y-2">
        {isOpen && (
          <div className="px-2">
            <DeleteSessionsButton />
          </div>
        )}
        {isOpen && currentSession && (
          <div className="text-[11px] text-muted-foreground truncate max-w-[180px] flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Active:
            </span>
            <span className="truncate" title={currentSession.name}>{currentSession.name}</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}