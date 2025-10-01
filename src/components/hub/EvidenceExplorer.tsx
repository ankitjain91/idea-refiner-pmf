import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ExternalLink, Search, FileText, Calendar, 
  DollarSign, Globe, Filter
} from "lucide-react";
import { useState, useMemo } from "react";

interface Citation {
  id: string;
  url: string;
  title: string;
  source: string;
  snippet?: string;
  confidence: number;
  tileReferences: string[];
  fetchedAt?: string;
}

interface ProviderLogEntry {
  provider: string;
  requestCount: number;
  dedupeCount: number;
  estimatedCost: number;
  timestamp: string;
  error?: string;
}

interface EvidenceExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidenceStore: Citation[];
  providerLog: ProviderLogEntry[];
}

export function EvidenceExplorer({ 
  open, 
  onOpenChange, 
  evidenceStore = [], 
  providerLog = [] 
}: EvidenceExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Ensure arrays are not undefined
  const safeEvidenceStore = evidenceStore || [];
  const safeProviderLog = providerLog || [];
  
  // Filter evidence based on search and filters
  const filteredEvidence = useMemo(() => {
    return safeEvidenceStore.filter(citation => {
      const matchesSearch = !searchQuery || 
        citation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        citation.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        citation.source.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProvider = !selectedProvider || citation.source === selectedProvider;
      
      return matchesSearch && matchesProvider;
    });
  }, [safeEvidenceStore, searchQuery, selectedProvider]);
  
  // Calculate totals with null checks
  const totalRequests = safeProviderLog.reduce((sum, p) => sum + (p.requestCount || 0), 0);
  const totalCost = safeProviderLog.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalDeduped = safeProviderLog.reduce((sum, p) => sum + (p.dedupeCount || 0), 0);
  
  // Get unique providers
  const providers = Array.from(new Set(safeProviderLog.map(p => p.provider)));
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Evidence Explorer
          </SheetTitle>
          <SheetDescription>
            All citations and data sources used in the analysis
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="evidence" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="evidence">
              Evidence ({safeEvidenceStore.length})
            </TabsTrigger>
            <TabsTrigger value="providers">
              Providers ({providers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="evidence" className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search evidence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedProvider === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProvider(null)}
                >
                  All Sources
                </Button>
                {providers.map(provider => (
                  <Button
                    key={provider}
                    variant={selectedProvider === provider ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    {provider}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Evidence List */}
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3">
                {filteredEvidence.length > 0 ? (
                  filteredEvidence.map((citation) => (
                    <div
                      key={citation.id}
                      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm line-clamp-2 flex-1">
                            {citation.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(citation.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {citation.snippet && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {citation.snippet}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {citation.source}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(citation.confidence * 100)}% confidence
                          </Badge>
                          {citation.tileReferences.map(tile => (
                            <Badge key={tile} variant="secondary" className="text-xs">
                              {tile}
                            </Badge>
                          ))}
                        </div>
                        
                        {citation.fetchedAt && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(citation.fetchedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No evidence matches your search" : "No evidence available"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="providers" className="space-y-4">
            {/* Provider Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Globe className="h-3 w-3" />
                  Total Requests
                </div>
                <p className="text-lg font-semibold">{totalRequests}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Filter className="h-3 w-3" />
                  Deduped
                </div>
                <p className="text-lg font-semibold">{totalDeduped}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  Est. Cost
                </div>
                <p className="text-lg font-semibold">${totalCost.toFixed(3)}</p>
              </div>
            </div>
            
            {/* Provider Details */}
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-3">
                {safeProviderLog.map((entry, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{entry.provider}</h4>
                      {entry.error && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Requests:</span>
                        <span className="ml-1 font-medium">{entry.requestCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deduped:</span>
                        <span className="ml-1 font-medium">{entry.dedupeCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="ml-1 font-medium">
                          ${entry.estimatedCost ? entry.estimatedCost.toFixed(4) : '0.0000'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <span className="ml-1 font-medium">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    {entry.error && (
                      <div className="mt-2 text-xs text-red-500">
                        {entry.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}