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
  Sparkles,
  Brain,
  Zap,
  User
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { BRAND } from '@/branding';
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { SessionPicker } from '@/components/SessionPicker';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import HelpSupport from '@/components/HelpSupport';

interface AppSidebarProps {
  style?: React.CSSProperties;
  className?: string;
}

const themeClasses = {
  primary: 'bg-black text-gray-300',
  hover: 'hover:bg-gray-800',
  border: 'border-gray-700',
};

export function AppSidebar({ style, className }: AppSidebarProps = {}) {
  const { open } = useSidebar();
  const isOpen = open !== false;
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [showHelp, setShowHelp] = useState(false);

  const mainNav = [
    { 
      title: "Idea Chat", 
      url: "/ideachat", 
      icon: MessageSquare,
      gradient: "from-blue-400 to-blue-600",
      description: "AI-powered ideation"
    },
    { 
      title: "Sessions", 
      url: "/ideajournal", 
      icon: BookOpen,
      gradient: "from-purple-400 to-purple-600",
      description: "Your idea history"
    },
    { 
      title: "Dashboard", 
      url: "/dashboard", 
      icon: BarChart3,
      gradient: "from-green-400 to-green-600",
      description: "Analytics & insights"
    },
    { 
      title: "Settings", 
      url: "/settings", 
      icon: Settings,
      gradient: "from-gray-400 to-gray-600",
      description: "Preferences"
    },
    { 
      title: "Pricing", 
      url: "/pricing", 
      icon: Crown,
      gradient: "from-amber-400 to-amber-600",
      description: "Upgrade plan"
    },
  ];

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative group transition-all duration-200",
      isActive 
        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-medium border-l-2 border-primary" 
        : "hover:bg-muted/50 hover:translate-x-1"
    );

  return (
    <Sidebar collapsible="icon" className={cn(
      "glass-super-surface elevation-2 backdrop-fade transition-all duration-300",
      className
    )} style={style}>
      <SidebarHeader className="border-b border-border/50 p-2 sm:p-4 bg-gradient-to-b from-background/50 to-transparent">
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          !isOpen && "justify-center"
        )}>
          <div className="relative">
            <Brain className={cn(
              "text-primary transition-all duration-300",
              isOpen ? "h-8 w-8" : "h-6 w-6"
            )} />
            <div className="absolute -inset-1 bg-primary/20 blur-xl rounded-full animate-pulse" />
          </div>
          {isOpen && (
            <div className="flex flex-col">
              <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent tracking-tight animate-gradient">
                SmoothBrains
              </h2>
              <span className="text-xs text-muted-foreground">AI PMF Assistant</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col p-2">
        {/* Main Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <div className="flex items-center gap-3 w-full py-1">
                        <div className={cn(
                          "p-2 rounded-lg bg-gradient-to-br transition-all duration-300",
                          item.gradient,
                          "opacity-80 group-hover:opacity-100"
                        )}>
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                        {isOpen && (
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Help & Support Button - Above Footer */}
      <div className="border-t border-border/30 px-2 sm:px-3 py-3">
        <SidebarMenuButton
          onClick={() => setShowHelp(true)}
          className="w-full hover:bg-muted/50 rounded-lg px-3 py-2.5 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 opacity-80 group-hover:opacity-100 transition-all duration-300">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {isOpen && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Site Guru</span>
                <span className="text-xs text-muted-foreground">Get instant help</span>
              </div>
            )}
          </div>
        </SidebarMenuButton>
      </div>

      <SidebarFooter className="border-t border-border/30 p-3 bg-gradient-to-b from-transparent to-background/50">
        {user && (
          <div className="space-y-3">
            {isOpen && (
              <>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{user.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-muted-foreground">Active session</p>
                  </div>
                </div>
                <Badge 
                  variant={subscription.tier === 'free' ? 'secondary' : 'default'} 
                  className={cn(
                    "text-xs w-fit",
                    subscription.tier !== 'free' && "bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-600 border-amber-600/20"
                  )}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {SUBSCRIPTION_TIERS[subscription.tier]?.name || subscription.tier}
                </Badge>
              </>
            )}
            {!isOpen && (
              <div className="flex justify-center">
                <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
      
      {/* Help Support Dialog */}
      <HelpSupport open={showHelp} onOpenChange={setShowHelp} />
    </Sidebar>
  );
}