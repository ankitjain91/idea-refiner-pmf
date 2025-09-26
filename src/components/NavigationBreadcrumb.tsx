import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home, ChevronRight } from 'lucide-react';

export const NavigationBreadcrumb = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Define route labels
  const routeLabels: Record<string, string> = {
    '/': 'Home',
    '/auth': 'Sign In',
    '/dashboard': 'Dashboard',
    '/settings': 'Settings',
    '/pricing': 'Pricing',
    '/logout': 'Sign Out'
  };

  // Generate breadcrumb items based on path
  const generateBreadcrumbs = () => {
    if (pathname === '/' || pathname === '/auth') {
      return null; // Don't show breadcrumbs on auth pages
    }

    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/dashboard',
      isLast: segments.length === 1 && segments[0] === 'dashboard'
    });

    // Add current page if not dashboard
    if (pathname !== '/dashboard') {
      breadcrumbs.push({
        label: routeLabels[pathname] || segments[segments.length - 1],
        path: pathname,
        isLast: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (!breadcrumbs) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage className="flex items-center gap-1">
                  {index === 0 && <Home className="h-3 w-3" />}
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.path} className="flex items-center gap-1 hover:text-primary">
                    {index === 0 && <Home className="h-3 w-3" />}
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};