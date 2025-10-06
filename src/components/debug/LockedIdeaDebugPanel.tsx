/**
 * Debug component to show locked idea status - only shows in debug mode
 */
import React from 'react';
import { useLockedIdea, lockedIdeaManager } from '@/lib/lockedIdeaManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Unlock, Bug, RefreshCw } from 'lucide-react';

export function LockedIdeaDebugPanel() {
  const { lockedIdea, hasLockedIdea, setLockedIdea, clearLockedIdea } = useLockedIdea();
  const [debugInfo, setDebugInfo] = React.useState<any>({});

  const refreshDebugInfo = () => {
    setDebugInfo(lockedIdeaManager.getDebugInfo());
  };

  React.useEffect(() => {
    refreshDebugInfo();
  }, [lockedIdea]);

  // Only show in debug mode
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('debug') !== '1') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-yellow-200 bg-yellow-50/90 backdrop-blur z-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4 text-yellow-600" />
          Locked Idea Debug Panel
          <Button size="sm" variant="ghost" onClick={refreshDebugInfo}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="flex items-center gap-2">
          {hasLockedIdea ? (
            <Badge variant="default" className="bg-green-600">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          ) : (
            <Badge variant="destructive">
              <Unlock className="h-3 w-3 mr-1" />
              No Lock
            </Badge>
          )}
          <span className="text-gray-600">
            {hasLockedIdea ? 'Idea is locked' : 'No idea locked'}
          </span>
        </div>

        {hasLockedIdea && (
          <div className="bg-white/50 p-2 rounded border">
            <div className="font-medium text-green-700 mb-1">Current Locked Idea:</div>
            <div className="text-gray-700 text-[10px] leading-relaxed">
              {lockedIdea.slice(0, 100)}
              {lockedIdea.length > 100 && '...'}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="font-medium text-gray-700">Debug Info:</div>
          <pre className="bg-white/50 p-2 rounded text-[9px] overflow-auto max-h-32">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setLockedIdea('Test AI chatbot for customer service')}
            className="text-xs"
          >
            Test Lock
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={clearLockedIdea}
            className="text-xs"
          >
            Clear Lock
          </Button>
        </div>

        <div className="text-[10px] text-gray-500">
          💡 Use "Lock My Idea" button in the main app to set the idea
        </div>
      </CardContent>
    </Card>
  );
}