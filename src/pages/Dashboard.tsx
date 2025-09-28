import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { Card } from '@/components/ui/card';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { DataTile } from '@/components/hub/DataTile';
import { CompetitorChart } from '@/components/dashboard/CompetitorChart';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { PMFScoreDisplay } from '@/components/dashboard/PMFScoreDisplay';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [idea, setIdea] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const {
    metrics,
    market,
    competition,
    channels,
    realtime,
    loading: dataLoading,
    error,
    refresh,
    progress,
    status
  } = useDashboardData(idea);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { state: { from: { pathname: '/dashboard' }, openAuthModal: true } });
    }
  }, [user, authLoading, navigate]);

  // Get idea from localStorage or location state
  useEffect(() => {
    const storedIdea = localStorage.getItem('pmfCurrentIdea') || 
                      localStorage.getItem('userIdea') ||
                      location.state?.idea;
    
    if (storedIdea) {
      setIdea(storedIdea);
      setIsLoading(false);
    } else {
      // No idea found, redirect to idea input
      toast.error('No idea found. Please enter your idea first.');
      navigate('/ideachat');
    }
  }, [location, navigate]);

  const handleDashboardComplete = (data: any) => {
    setDashboardData(data);
    setIsLoading(false);
  };

  const handleRefresh = () => {
    refresh();
    toast.success('Dashboard data refreshed');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DashboardLoader 
          idea={idea || ''}
          onComplete={handleDashboardComplete}
        />
      </div>
    );
  }

  return (
    <ScrollArea className="h-screen">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Product-Market Fit Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Analyzing: {idea}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={dataLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* PMF Score */}
        {metrics && <PMFScoreDisplay currentScore={metrics.pmfScore || 0} previousScore={metrics.previousScore || 0} />}

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="market">Market Analysis</TabsTrigger>
            <TabsTrigger value="competition">Competition</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Key Metrics Cards */}
              <Card className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Target Market</h3>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {market?.targetMarketSize || 'Analyzing...'}
                </p>
                <p className="text-sm text-muted-foreground">Potential users</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Revenue Potential</h3>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {market?.revenuePotential || 'Calculating...'}
                </p>
                <p className="text-sm text-muted-foreground">Annual recurring</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Market Fit</h3>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {metrics?.pmfScore || 0}%
                </p>
                <p className="text-sm text-muted-foreground">PMF Score</p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {competition && (
                <CompetitorChart 
                  data={competition.competitors?.map((c: any) => ({
                    name: c.name,
                    metric: 'Market Share',
                    yours: 15,
                    theirs: c.marketShare || 25,
                    unit: '%'
                  })) || []}
                />
              )}
              
              {market?.growthProjections && (
                <GrowthChart 
                  data={market.growthProjections}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="market">
            <DataTile 
              title="Market Analysis"
              icon={TrendingUp}
              tileType="marketAnalysis"
              filters={{ idea }}
            />
          </TabsContent>

          <TabsContent value="competition">
            <DataTile 
              title="Competition"
              icon={Users}
              tileType="competition"
              filters={{ idea }}
            />
          </TabsContent>

          <TabsContent value="channels">
            <DataTile 
              title="Marketing Channels"
              icon={Target}
              tileType="channels"
              filters={{ idea }}
            />
          </TabsContent>
        </Tabs>

        {/* Real-time updates indicator */}
        {realtime && (
          <div className="fixed bottom-4 right-4">
            <Card className="p-2 px-4 flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm">Live updates active</span>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default Dashboard;