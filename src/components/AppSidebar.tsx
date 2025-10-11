import { NavLink } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { 
  Crown,
  Settings,
  MessageSquare,
  BookOpen,
  BarChart3,
  HelpCircle,
  LogOut,
  ChevronRight,
  Brain
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useNavigate } from 'react-router-dom';
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useState } from 'react';
import { cn } from '@/lib/utils';
import HelpSupport from '@/components/HelpSupport';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  style?: React.CSSProperties;
  className?: string;
}

export function AppSidebar({ style, className }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const isOpen = open !== false;
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const mainNav = [
    { 
      title: "Home", 
      url: "/home", 
      icon: BarChart3,
      badge: null
    },
    { 
      title: "Idea Chat", 
      url: "/ideachat", 
      icon: MessageSquare,
      badge: null
    },
    { 
      title: "Sessions", 
      url: "/ideajournal", 
      icon: BookOpen,
      badge: null
    },
    { 
      title: "Owned Ideas", 
      url: "/owned-ideas", 
      icon: Crown,
      badge: null
    },
    { 
      title: "AI Insights", 
      url: "/ai-insights", 
      icon: Brain,
      badge: "NEW"
    },
  ];

  const bottomNav = [
    { 
      title: "Pricing", 
      url: "/pricing", 
      icon: Crown,
    },
    { 
      title: "Settings", 
      url: "/settings", 
      icon: Settings,
    },
  ];

  return (
    <Sidebar collapsible="icon" className={cn(
      "h-full border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )} style={style}>
      <SidebarHeader className="h-[89px] border-b flex items-center justify-center px-4">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">SmoothBrains</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">BETA</Badge>
            </div>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup className="px-2 py-2">
          {isOpen && (
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
              Main
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {isOpen && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <SidebarGroup className="mt-auto px-2 py-2">
          {isOpen && (
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
              Support
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {isOpen && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Help Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setShowHelp(true)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                  {isOpen && <span>Help & Support</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        {user && (
          <div className={cn(
            "flex items-center gap-3 rounded-md p-2",
            isOpen && "hover:bg-accent/50 transition-colors"
          )}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-xs">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {SUBSCRIPTION_TIERS[subscription.tier]?.name || 'Free'} Plan
                </p>
              </div>
            )}
            {isOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto"
                disabled={signingOut}
                onClick={() => {
                  if (signingOut) return;
                  setSigningOut(true);
                  // navigate first for instant UI feedback; context signOut will navigate too but idempotent
                  navigate('/logout');
                  // Fallback: force signOut logic in context (delegates to /logout route) after microtask
                  setTimeout(() => signOut(), 0);
                }}
              >
                <LogOut className={cn("h-4 w-4", signingOut && 'animate-spin')} />
              </Button>
            )}
          </div>
        )}
      </SidebarFooter>
      
      {/* Help Support Dialog */}
      <HelpSupport open={showHelp} onOpenChange={setShowHelp} />
    </Sidebar>
  );
}