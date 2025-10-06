import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clearAllCache, clearTileCache } from "@/utils/clearAllCache";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CacheClearButtonProps {
  onCacheCleared?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

const TILE_TYPES = [
  { id: 'twitter_sentiment', label: 'Twitter/X Buzz' },
  { id: 'youtube_analysis', label: 'YouTube Analysis' },
  { id: 'reddit_sentiment', label: 'Reddit Sentiment' },
  { id: 'market_size', label: 'Market Size' },
  { id: 'competition', label: 'Competition Analysis' },
  { id: 'google_trends', label: 'Google Trends' },
  { id: 'news_analysis', label: 'News Analysis' },
  { id: 'web_search', label: 'Web Search' },
  { id: 'market_trends', label: 'Market Trends' },
] as const;

export function CacheClearButton({ 
  onCacheCleared, 
  variant = "outline",
  size = "sm",
  showIcon = true,
  className
}: CacheClearButtonProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [clearAll, setClearAll] = useState(true);
  const { toast } = useToast();

  const handleToggleTile = (tileId: string) => {
    setSelectedTiles(prev => 
      prev.includes(tileId) 
        ? prev.filter(id => id !== tileId)
        : [...prev, tileId]
    );
    setClearAll(false);
  };

  const handleToggleAll = (checked: boolean) => {
    setClearAll(checked);
    if (checked) {
      setSelectedTiles([]);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      if (clearAll) {
        await clearAllCache();
        toast({
          title: "All Cache Cleared",
          description: "All cached data has been removed. The page will reload to fetch fresh data.",
          duration: 3000,
        });
      } else if (selectedTiles.length > 0) {
        for (const tileId of selectedTiles) {
          await clearTileCache(tileId);
        }
        toast({
          title: "Tile Cache Cleared",
          description: `Cleared cache for ${selectedTiles.length} tile(s). The page will reload to fetch fresh data.`,
          duration: 3000,
        });
      } else {
        toast({
          title: "No Selection",
          description: "Please select at least one tile or choose 'Clear All'.",
          variant: "destructive",
          duration: 3000,
        });
        setIsClearing(false);
        return;
      }
      
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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Clear Cache</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="clear-all" 
                  checked={clearAll}
                  onCheckedChange={handleToggleAll}
                />
                <Label htmlFor="clear-all" className="font-semibold cursor-pointer">
                  Clear All Cache
                </Label>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Or select specific tiles:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {TILE_TYPES.map(tile => (
                    <div key={tile.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={tile.id}
                        checked={selectedTiles.includes(tile.id)}
                        onCheckedChange={() => handleToggleTile(tile.id)}
                        disabled={clearAll}
                      />
                      <Label 
                        htmlFor={tile.id} 
                        className={`cursor-pointer ${clearAll ? 'opacity-50' : ''}`}
                      >
                        {tile.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {clearAll && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ This will clear all cached data including IndexedDB, localStorage cache, and tile data.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearCache} disabled={!clearAll && selectedTiles.length === 0}>
            Clear {clearAll ? 'All' : `${selectedTiles.length} Tile(s)`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}