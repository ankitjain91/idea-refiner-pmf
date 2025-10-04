import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, DollarSign } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { usePMFScores } from "@/hooks/usePMFScores";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Home() {
  const { subscription, usage } = useSubscription();
  const { user } = useAuth();
  const limits = SUBSCRIPTION_TIERS[subscription.tier].features;
  const { data: usageData, loading: usageLoading } = useUsageHistory(30);
  const { distribution: pmfDistribution, loading: pmfLoading } = usePMFScores();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
          <p className="text-muted-foreground">Here's your quick overview</p>
        </div>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.ideas_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.ideasPerMonth === -1 ? '∞' : limits.ideasPerMonth} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.ai_credits_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.aiCreditsPerMonth} used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exports</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage.exports_used}</div>
              <p className="text-xs text-muted-foreground">
                of {limits.exportsPerMonth === -1 ? '∞' : limits.exportsPerMonth} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{subscription.tier}</div>
              <p className="text-xs text-muted-foreground">Current plan</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
              <CardDescription>Your idea validation activity (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {usageLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : usageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="ideas" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Ideas"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ai_credits" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      name="AI Credits"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No usage data yet. Start validating ideas!
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PMF Score Distribution</CardTitle>
              <CardDescription>Score ranges of your analyzed ideas</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {pmfLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : pmfDistribution.length > 0 && pmfDistribution.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmfDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      name="Number of Ideas"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No PMF scores yet. Analyze your first idea!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}