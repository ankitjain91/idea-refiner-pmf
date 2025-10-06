import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Heart, TrendingUp, AlertCircle } from 'lucide-react';
import { useIdeaContext } from '@/hooks/useIdeaContext';
import { optimizedQueue } from '@/lib/optimized-request-queue';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

const COLORS = { positive: '#10b981', neutral: '#f59e0b', negative: '#ef4444' };

export function ComprehensiveSentimentTile() {
  const { currentIdea } = useIdeaContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!currentIdea) return;
    const fetch = async () => {
      setLoading(true);
      const res = await optimizedQueue.invokeFunction('unified-sentiment', { idea: currentIdea });
      setData(res?.sentiment || null);
      setLoading(false);
    };
    fetch();
  }, [currentIdea]);

  if (loading) {
    return <Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Unified Sentiment</CardTitle></CardHeader><CardContent><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded" />)}</div></CardContent></Card>;
  }

  if (!data) return null;

  const metrics = data.metrics || {};
  const clusters = data.clusters || [];
  const sourceData = Object.entries(metrics.source_breakdown || {}).map(([name, val]: any) => ({ name, ...val }));

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg"><Heart className="h-5 w-5 text-red-500" />Unified Sentiment Analysis</CardTitle>
          <Badge>{data.confidence}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{data.summary}</p>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 px-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[500px]">
            <TabsContent value="overview" className="px-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">Overall Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart><Pie data={[{name:'Positive',value:metrics.overall_distribution?.positive||0},{name:'Neutral',value:metrics.overall_distribution?.neutral||0},{name:'Negative',value:metrics.overall_distribution?.negative||0}]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">{[COLORS.positive,COLORS.neutral,COLORS.negative].map((c,i)=><Cell key={i} fill={c}/>)}</Pie><RechartsTooltip/></PieChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-4">
                  <h4 className="text-sm font-medium mb-3">By Source</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sourceData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><RechartsTooltip/><Bar dataKey="positive" stackId="a" fill={COLORS.positive}/><Bar dataKey="neutral" stackId="a" fill={COLORS.neutral}/><Bar dataKey="negative" stackId="a" fill={COLORS.negative}/></BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="sources" className="px-4 space-y-3">
              {sourceData.map((s:any,i:number)=><Card key={i} className="p-4"><h4 className="font-medium mb-2 capitalize">{s.name}</h4><div className="space-y-2"><div className="flex justify-between text-sm"><span>Positive</span><span>{s.positive}%</span></div><Progress value={s.positive}/></div></Card>)}
            </TabsContent>
            <TabsContent value="clusters" className="px-4 space-y-3">
              {clusters.map((c:any,i:number)=><Card key={i} className="p-4"><h4 className="font-semibold">{c.theme}</h4><p className="text-sm text-muted-foreground mt-1">{c.insight}</p><div className="flex gap-2 mt-2 text-xs"><span>Pos: {c.sentiment.positive}%</span><span>Neu: {c.sentiment.neutral}%</span><span>Neg: {c.sentiment.negative}%</span></div></Card>)}
            </TabsContent>
            <TabsContent value="drivers" className="px-4 space-y-3">
              <Card className="p-4"><h4 className="text-sm font-medium mb-2">Positive Drivers</h4><div className="flex flex-wrap gap-2">{metrics.top_positive_drivers?.map((d:string,i:number)=><Badge key={i} variant="default">{d}</Badge>)}</div></Card>
              <Card className="p-4"><h4 className="text-sm font-medium mb-2">Concerns</h4><div className="flex flex-wrap gap-2">{metrics.top_negative_concerns?.map((c:string,i:number)=><Badge key={i} variant="destructive">{c}</Badge>)}</div></Card>
            </TabsContent>
            <TabsContent value="raw" className="px-4"><Card className="p-4"><ScrollArea className="h-[400px]"><pre className="text-xs bg-muted p-4 rounded">{JSON.stringify(data,null,2)}</pre></ScrollArea></Card></TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
