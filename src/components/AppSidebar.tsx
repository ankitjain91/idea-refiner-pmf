import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  Home, 
  MessageSquare, 
  ChartBar, 
  Clock, 
  Plus,
  Crown,
  Settings,
  Archive,
  Star,
  LayoutDashboard,
  Trash2,
  HelpCircle,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useSession } from "@/contexts/SessionContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  onNewChat?: () => void;
}

export function AppSidebar({ onNewChat }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const isOpen = open !== false;
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { sessions, currentSession, createSession, loadSession, deleteSession } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [liveSessions, setLiveSessions] = useState(sessions);
  
  // Update live sessions when sessions change
  useEffect(() => {
    setLiveSessions(sessions);
  }, [sessions]);
  
  // Set up real-time updates for sessions
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('sidebar-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brainstorming_sessions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Session update in sidebar:', payload);
          // Reload sessions from context
          const { data } = await supabase
            .from('brainstorming_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('last_accessed', { ascending: false });
          
          if (data) {
            setLiveSessions(data.map((session: any) => ({
              ...session,
              state: session.state || {},
              activity_log: Array.isArray(session.activity_log) ? session.activity_log : []
            })));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createNewSession = async () => {
    // Clear current session data
    localStorage.removeItem('loadedSessionId');
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('analysisCompleted');
    localStorage.removeItem('analysisData');
    localStorage.removeItem('pmfScore');
    
    // Create a new brainstorming session
    await createSession("New brainstorming session");
    
    // Trigger reset callback if provided
    onNewChat?.();
    
    // Stay on dashboard - the chat component will reset
  };

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    // Trigger reset callback to update the chat
    onNewChat?.();
  };

  const mainNav = [
    { title: "Help & Support", url: "#", icon: HelpCircle, action: "help" },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Pricing", url: "/pricing", icon: Crown },
  ];

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {isOpen && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">PM-FIT</h2>
            <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
              {subscription.tier}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Brainstorming Sessions */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-3">
            <SidebarGroupLabel>Sessions</SidebarGroupLabel>
            <Button
              size="sm"
              variant="ghost"
              onClick={createNewSession}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <SidebarGroupContent>
            <ScrollArea className="h-[250px]">
              <SidebarMenu>
                {liveSessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <div className="flex items-center justify-between w-full group">
                      <SidebarMenuButton
                        onClick={() => handleLoadSession(session.id)}
                        className={`flex-1 ${
                          currentSession?.id === session.id
                            ? "bg-primary/10 text-primary"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-start w-full">
                          <span className="font-medium text-sm truncate max-w-[140px]">
                            {session.name}
                          </span>
                          {isOpen && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(session.last_accessed), "MMM d, h:mm a")}
                            </span>
                          )}
                        </div>
                      </SidebarMenuButton>
                      {isOpen && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </SidebarMenuItem>
                ))}
                {sessions.length === 0 && isOpen && (
                  <div className="text-xs text-muted-foreground px-3 py-2">
                    No sessions yet. Click + to create one.
                  </div>
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
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

      <SidebarFooter className="border-t p-2">
        {isOpen && currentSession && (
          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
            Active: {currentSession.name}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}