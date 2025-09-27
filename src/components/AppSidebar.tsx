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
  HelpCircle,
  MessageSquare,
  BookOpen,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { BRAND } from '@/branding';
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { SessionPicker } from '@/components/SessionPicker';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

  const mainNav = [
    { title: "Idea Chat", url: "/ideachat", icon: MessageSquare },
    { title: "Idea Journal", url: "/ideajournal", icon: BookOpen },
    { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Pricing", url: "/pricing", icon: Crown },
    { title: "Help & Support", url: "#", icon: HelpCircle, action: "help" },
  ];

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon" className={"glass-super-surface elevation-2 backdrop-fade " + (className || '')} style={style}>
      <SidebarHeader className="border-b p-2 sm:p-4">
        {isOpen && (
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold truncate">smoothbrains.ai ©</h2>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        {/* Main Navigation */}
        <SidebarGroup className="flex-1">
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
                        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {isOpen && (
                          <span className={cn(
                            "text-sm leading-tight",
                            item.action === 'new-smoothbrain' && 'font-bold text-blue-700 dark:text-blue-400'
                          )}>
                            {item.title}
                          </span>
                        )}
                      </button>
                    ) : (
                      <NavLink to={item.url} end className={getNavClass}>
                        <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {isOpen && <span className="text-sm leading-tight">{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 sm:p-3">
        {isOpen && user && (
          <div className="flex flex-col gap-2">
            <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'} className="text-xs w-fit">
              {SUBSCRIPTION_TIERS[subscription.tier]?.name || subscription.tier}
            </Badge>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate max-w-full flex items-center gap-1 sm:gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" /> 
              </span>
              <span className="truncate">Welcome back!</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}