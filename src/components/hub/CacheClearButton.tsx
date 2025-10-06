import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clearAllCache } from "@/utils/clearAllCache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CacheClearButtonProps {
  onCacheCleared?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

export function CacheClearButton({ 
  onCacheCleared, 
  variant = "outline",
  size = "sm",
  showIcon = true,
  className
}: CacheClearButtonProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      await clearAllCache();
      
      toast({
        title: "Cache Cleared",
        description: "All cached data has been removed. The page will reload to fetch fresh data.",
        duration: 3000,
      });
      
      // Call the callback if provided
      onCacheCleared?.();
      
      // Reload the page after a short delay to fetch fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Failed to clear cache:", error);
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isClearing}
          className={className}
        >
          {isClearing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {size !== "icon" && <span className="ml-2">Clearing...</span>}
            </>
          ) : (
            <>
              {showIcon && <Trash2 className="h-4 w-4" />}
              {size !== "icon" && <span className={showIcon ? "ml-2" : ""}>Clear Cache</span>}
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Clear All Cache?</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p className="font-semibold text-destructive">Warning: This will permanently remove all cached data!</p>
              <p>This action will clear:</p>
              <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                <li>All API response cache (IndexedDB)</li>
                <li>All dashboard and tile data</li>
                <li>Market analysis results</li>
                <li>Sentiment and trend data</li>
                <li>All localStorage cache (except authentication)</li>
              </ul>
              <p className="mt-3 font-medium">After clearing, you'll need to reload data for ALL your ideas from the API again.</p>
              <p className="text-xs text-muted-foreground mt-2">Tip: Only use this if you're experiencing data issues. Cached data helps load your analysis instantly!</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearCache}>
            Clear Cache
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}