import { useState, useEffect, useRef } from 'react';
import type { IdeaFilters } from '@/hooks/useIdeaManagement';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Download, RefreshCw } from 'lucide-react';

interface GlobalFiltersProps {
  onFiltersChange: (filters: IdeaFilters) => void;
  onExport: () => void;
  onRefresh: () => void;
  currentFilters?: IdeaFilters;
}

export function GlobalFilters({ onFiltersChange, onExport, onRefresh, currentFilters }: GlobalFiltersProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [industry, setIndustry] = useState('');
  const [geography, setGeography] = useState('global');
  const [timeWindow, setTimeWindow] = useState('last_12_months');
  const initializedRef = useRef(false);
  const skipFirstEmitRef = useRef(true);
  
  // Initialize from currentFilters once to avoid overwriting parent-provided filters
  useEffect(() => {
    if (!initializedRef.current && currentFilters) {
      console.log('[GlobalFilters] Initializing from currentFilters', currentFilters);
      setKeywords(currentFilters.idea_keywords || []);
      setIndustry(currentFilters.industry || '');
      setGeography(currentFilters.geography || 'global');
      setTimeWindow(currentFilters.time_window || 'last_12_months');
      initializedRef.current = true;
    }
  }, [currentFilters]);
  
  useEffect(() => {
    if (skipFirstEmitRef.current) {
      // Skip first emit to avoid overwriting parent filters on mount
      skipFirstEmitRef.current = false;
      console.log('[GlobalFilters] Skipping first emit to preserve parent filters');
      return;
    }
    const next = {
      idea_keywords: keywords,
      industry,
      geography,
      time_window: timeWindow
    } as IdeaFilters;
    console.log('[GlobalFilters] Emitting filters change', next);
    onFiltersChange(next);
  }, [keywords, industry, geography, timeWindow]);
  
  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };
  
  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };
  
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Global Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Idea Keywords</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                className="flex-1"
              />
              <Button size="sm" onClick={addKeyword}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {keywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeKeyword(keyword)}
                  />
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <Select value={industry || 'all'} onValueChange={(value) => setIndustry(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="fintech">FinTech</SelectItem>
                <SelectItem value="healthtech">HealthTech</SelectItem>
                <SelectItem value="edtech">EdTech</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
                <SelectItem value="ai">AI/ML</SelectItem>
                <SelectItem value="crypto">Crypto/Web3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Geography</label>
            <Select value={geography} onValueChange={setGeography}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="north-america">North America</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
                <SelectItem value="usa">United States</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="china">China</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Window</label>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                <SelectItem value="last_24_months">Last 24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}