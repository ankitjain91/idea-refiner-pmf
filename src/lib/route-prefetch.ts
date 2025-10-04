// Lightweight, safe warmup of common lazy-loaded routes to speed up first navigation
export function warmRouteChunks() {
  const imports: Array<Promise<any>> = [
    import('@/pages/EnterpriseHub'),
    import('@/pages/Hub'),
    import('@/pages/EnhancedIdeaChatPage'),
    import('@/pages/Dashboard'),
    import('@/pages/IdeaJournal'),
    import('@/pages/Pricing'),
    import('@/pages/Settings'),
    import('@/pages/Documentation'),
    import('@/pages/Logout'),
    import('@/pages/NotFound'),
  ];
  // Use allSettled to avoid unhandled rejections in dev
  Promise.allSettled(imports).catch(() => {});
}
