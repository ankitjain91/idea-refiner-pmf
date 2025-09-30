import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiCallAnalyzer } from '@/lib/api-call-analyzer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Clock, RefreshCw, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function APIMetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMetrics = () => {
    setIsLoading(true);
    setTimeout(() => {
      const report = apiCallAnalyzer.getMetricsReport();
      setMetrics(report);
      setIsLoading(false);
      apiCallAnalyzer.logMetrics(); // Also log to console
    }, 100);
  };

  useEffect(() => {
    refreshMetrics();
    // Auto-refresh disabled - only manual refresh available
    // const interval = setInterval(refreshMetrics, 5000);
    // return () => clearInterval(interval);
  }, []);

  if (isLoading || !metrics) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Prepare data for charts
  const serviceChartData = metrics.byService
    .filter((s: any) => s.totalCalls > 0)
    .slice(0, 8)
    .map((s: any) => ({
      name: s.serviceName.length > 15 ? s.serviceName.substring(0, 15) + '...' : s.serviceName,
      fullName: s.serviceName,
      total: s.totalCalls,
      duplicates: s.duplicateCalls,
      failed: s.failedCalls,
      cost: (s.totalCalls * s.estimatedCost).toFixed(3)
    }));

  const costDistribution = metrics.byService
    .filter((s: any) => s.totalCalls > 0 && s.estimatedCost > 0)
    .map((s: any) => ({
      name: s.serviceName,
      value: s.totalCalls * s.estimatedCost
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total API Calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.totalAPICalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.uniqueEndpoints} endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duplicate Calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {metrics.summary.totalDuplicates}
            </div>
            <Progress 
              value={metrics.summary.averageDuplicationRate} 
              className="mt-2 h-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.averageDuplicationRate.toFixed(1)}% duplication
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed Calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics.summary.totalErrors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((metrics.summary.totalErrors / metrics.summary.totalAPICalls) * 100).toFixed(1)}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Est. Total Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${metrics.summary.estimatedTotalCost.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Most Used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {metrics.byService[0]?.serviceName || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.byService[0]?.totalCalls || 0} calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={refreshMetrics} 
              size="sm" 
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Service Usage</CardTitle>
              <CardDescription>Calls by service with duplication and failure metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    content={({active, payload}) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-2">
                            <p className="text-sm font-medium">{data.fullName}</p>
                            <p className="text-xs text-muted-foreground">Total: {data.total}</p>
                            <p className="text-xs text-muted-foreground">Duplicates: {data.duplicates}</p>
                            <p className="text-xs text-muted-foreground">Failed: {data.failed}</p>
                            <p className="text-xs text-muted-foreground">Cost: ${data.cost}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="#0088FE" name="Total Calls" />
                  <Bar dataKey="duplicates" fill="#FFBB28" name="Duplicates" />
                  <Bar dataKey="failed" fill="#FF8042" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Distribution</CardTitle>
              <CardDescription>Estimated costs by service</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: $${entry.value.toFixed(3)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
              <CardDescription>Most frequently called API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.byEndpoint.slice(0, 10).map((endpoint: any, idx: number) => {
                  // Extract service name and method from endpoint
                  const serviceName = endpoint.endpoint.match(/supabase\.functions\.invoke\('([^']+)'\)/)?.[1] || 
                                     endpoint.endpoint.match(/functions\/([^\/\?]+)/)?.[1] || 
                                     endpoint.endpoint;
                  const isSupabase = endpoint.endpoint.includes('supabase.functions');
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={isSupabase ? "default" : "secondary"} className="text-xs">
                            {isSupabase ? 'Supabase' : 'External'}
                          </Badge>
                          <p className="text-sm font-medium">{serviceName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{endpoint.endpoint}</p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {endpoint.count} calls
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {endpoint.averageTime.toFixed(0)}ms avg
                          </span>
                          {endpoint.duplicationRate > 20 && (
                            <Badge variant="outline" className="text-xs">
                              {endpoint.duplicationRate.toFixed(0)}% duplicates
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={endpoint.successRate} 
                          className="w-16 h-1"
                        />
                        <span className="text-xs text-muted-foreground">
                          {endpoint.successRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>Suggestions to improve API efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.recommendations.length > 0 ? (
                  metrics.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3" />
                    <p>No recommendations at this time</p>
                    <p className="text-xs mt-1">Your API usage is optimized!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Detailed breakdown by service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Service</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Duplicates</th>
                      <th className="text-right p-2">Failed</th>
                      <th className="text-right p-2">API Key</th>
                      <th className="text-right p-2">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.byService
                      .filter((s: any) => s.totalCalls > 0)
                      .map((service: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 font-medium">{service.serviceName}</td>
                          <td className="text-right p-2">{service.totalCalls}</td>
                          <td className="text-right p-2">
                            {service.duplicateCalls > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {service.duplicateCalls}
                              </Badge>
                            )}
                          </td>
                          <td className="text-right p-2">
                            {service.failedCalls > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {service.failedCalls}
                              </Badge>
                            )}
                          </td>
                          <td className="text-right p-2">
                            <Badge variant="secondary" className="text-xs">
                              {service.apiKeys[0]}
                            </Badge>
                          </td>
                          <td className="text-right p-2">
                            ${(service.totalCalls * service.estimatedCost).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}