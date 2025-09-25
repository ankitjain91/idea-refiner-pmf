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
  SidebarTrigger,
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
  Trash2,
  Crown,
  Settings,
  HelpCircle,
  Archive,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Session {
  id: string;
  session_name: string;
  idea: string;
  pmf_score: number;
  last_accessed: string;
  created_at: string;
  is_active: boolean;
}

interface AppSidebarProps {
  onNewChat?: () => void;
}

export function AppSidebar({ onNewChat }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const isOpen = open !== false;
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSessions();
      // Get current session from localStorage
      const savedSessionId = localStorage.getItem('currentSessionId');
      if (savedSessionId) {
        setCurrentSessionId(savedSessionId);
      }
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const createNewSession = async () => {
    // Clear current session data
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('userIdea');
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('userRefinements');
    localStorage.removeItem('ideaMetadata');
    setCurrentSessionId(null);
    
    // If on dashboard, navigate to home
    if (window.location.pathname === '/dashboard') {
      navigate('/');
    } else {
      // Otherwise trigger reset on current page
      onNewChat?.();
    }
    
    // Reload sessions list
    await loadSessions();
  };

  const loadSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (data) {
        // Restore session data
        localStorage.setItem('currentSessionId', sessionId);
        localStorage.setItem('userIdea', data.idea);
        localStorage.setItem('userAnswers', JSON.stringify(data.user_answers || {}));
        localStorage.setItem('userRefinements', JSON.stringify(data.refinements || {}));
        localStorage.setItem('ideaMetadata', JSON.stringify(data.metadata || {}));
        
        // Update last accessed
        await supabase
          .from('analysis_sessions')
          .update({ last_accessed: new Date().toISOString() })
          .eq('id', sessionId);

        setCurrentSessionId(sessionId);
        navigate('/dashboard');
        
        toast({
          title: "Session Loaded",
          description: `Loaded: ${data.session_name}`,
        });
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive"
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('analysis_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(sessions.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        createNewSession();
      }
      
      toast({
        title: "Session Deleted",
        description: "Session has been removed",
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      });
    }
  };

  const mainNav = [
    { title: "New Analysis", url: "/", icon: Plus, action: createNewSession },
    { title: "Dashboard", url: "/dashboard", icon: ChartBar },
    { title: "Pricing", url: "/pricing", icon: Crown },
  ];

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {isOpen && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Start Your PMF Journey</h2>
            <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
              {subscription.tier}
            </Badge>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.action ? (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={item.action}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {isOpen && <span>{item.title}</span>}
                      </Button>
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

        {/* Recent Sessions */}
        {isOpen && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Your Sessions</span>
              <Badge variant="outline" className="text-xs">
                {sessions.length}
              </Badge>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea className="h-[250px]">
                <SidebarMenu>
                  {loadingSessions ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground">
                      Loading sessions...
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      <p>No saved sessions yet</p>
                      <p className="text-xs mt-1">Your analyses will be saved here</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <SidebarMenuItem key={session.id}>
                        <div
                          className={`group flex items-center justify-between px-2 py-2 rounded-md cursor-pointer transition-all hover:bg-muted/50 ${
                            currentSessionId === session.id
                              ? 'bg-primary/10 border-l-2 border-primary'
                              : ''
                          }`}
                        >
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => loadSession(session.id)}
                          >
                            <p className="text-sm font-medium truncate">
                              {session.session_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {session.pmf_score}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(session.last_accessed), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            title="Delete session"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Help & Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="w-full justify-start">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    {isOpen && <span>Help & Support</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    {isOpen && <span>Settings</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarTrigger />
      </SidebarFooter>
    </Sidebar>
  );
}