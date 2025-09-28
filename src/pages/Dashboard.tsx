// Minimal Dashboard - Single Tile for Cost Optimization
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboardData';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    idea_keywords: [],
    industry: '',
    geography: '',
    time_window: '30d'
  });
  
  const { data, loading, error, getTileData, costInfo } = useOptimizedDashboardData(filters);
  
  // Get only market validation tile data
  const marketData = getTileData('market-validation');

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    return null;
  }

  const handleIdeaSubmit = (idea: string) => {
    const keywords = idea.toLowerCase().split(' ').filter(word => word.length > 3);
    setFilters(prev => ({ ...prev, idea_keywords: keywords }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quick Market Validation</h1>
        <p className="text-muted-foreground">
          Get instant market insights with minimal API usage (Cost-optimized single tile)
        </p>
      </div>

      {/* Simple idea input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enter Your Idea</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe your startup idea..."
              className="flex-1 px-3 py-2 border rounded-md"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleIdeaSubmit(e.currentTarget.value);
                }
              }}
            />
            <Button 
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (input?.value) {
                  handleIdeaSubmit(input.value);
                }
              }}
            >
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Single Market Validation Tile */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Fetching market data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {marketData && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketData.metrics?.map((metric: any, idx: number) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <h4 className="font-medium">{metric.label}</h4>
                  <p className="text-2xl font-bold text-primary">{metric.value}</p>
                  {metric.trend && (
                    <p className="text-sm text-muted-foreground">{metric.trend}</p>
                  )}
                </div>
              ))}
              
              {marketData.insights?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Key Insights</h4>
                  <ul className="space-y-1">
                    {marketData.insights.slice(0, 3).map((insight: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {costInfo && (
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <p>API Usage: {costInfo.totalSearches} searches</p>
                  <p>Estimated Cost: {costInfo.costEstimate}</p>
                  {costInfo.cacheHit && <p className="text-green-600">✓ Served from cache</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !marketData && filters.idea_keywords.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Enter an idea above to see market validation data
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;