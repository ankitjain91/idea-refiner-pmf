import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BarChart3, Rocket, ChevronRight, Clock } from 'lucide-react';

interface ChannelsPanelProps {
  channels: any;
  onSelect: (item: any) => void;
  setDetailModalOpen: (open: boolean) => void;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({ channels, onSelect, setDetailModalOpen }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Organic Channels
        </h3>
        {channels?.organic?.length > 0 ? channels.organic.map((channel: any, idx: number) => (
          <Card key={idx} className="mb-3 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-orange-500"
            onClick={() => { onSelect({
              type: 'channel-organic',
              title: channel.name,
              ...channel,
              why: `${channel.name} offers ${channel.potential} potential for organic growth`,
              how: [
                channel.strategy,
                `Content strategy: ${channel.contentStrategy || 'Educational content and community building'}`,
                `Engagement tactics: ${channel.engagementTactics || 'Regular posting and interaction'}`,
                `Growth hacks: ${channel.growthHacks || 'Viral loops and user-generated content'}`
              ],
              where: channel.sources || [],
              impact: `Expected reach: ${channel.expectedReach || '10K-50K organic impressions/month'}`,
              result: `Conversion rate: ${channel.conversionRate || '2-5% from organic traffic'}`
            }); setDetailModalOpen(true); }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">{channel.name}<Users className="w-4 h-4 text-orange-500" /></CardTitle>
              <div className="flex gap-2">
                <Badge variant={channel.potential === 'High' ? 'default' : 'secondary'}>{channel.potential} potential</Badge>
                <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{channel.timeToResults || '2-3 months'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{channel.strategy}</p>
              <div className="mt-3 flex items-center justify-between"><span className="text-xs text-green-500">Cost: {channel.cost || 'Free'}</span><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
            </CardContent>
          </Card>
        )) : <Card className="p-6"><p className="text-muted-foreground text-center">No organic channels data available.</p></Card>}
      </div>
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Paid Channels
        </h3>
        {channels?.paid?.length > 0 ? channels.paid.map((channel: any, idx: number) => (
          <Card key={idx} className="mb-3 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] border-l-4 border-l-indigo-500"
            onClick={() => { onSelect({
              type: 'channel-paid',
              title: channel.name,
              ...channel,
              why: `${channel.name} provides ${channel.effectiveness} effectiveness for paid acquisition`,
              how: [
                channel.strategy,
                `Targeting: ${channel.targeting || 'Lookalike audiences and interest-based'}`,
                `Ad formats: ${channel.adFormats || 'Video, carousel, and dynamic ads'}`,
                `Optimization: ${channel.optimization || 'A/B testing and bid optimization'}`
              ],
              where: channel.sources || [],
              impact: `ROI: ${channel.roi || '200-300%'} | LTV:CAC ratio: ${channel.ltvcac || '3:1'}`,
              result: `Monthly acquisitions: ${channel.monthlyAcquisitions || '100-500 customers'}`
            }); setDetailModalOpen(true); }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">{channel.name}<BarChart3 className="w-4 h-4 text-indigo-500" /></CardTitle>
              <div className="flex gap-2">
                <Badge>CAC: {channel.cac}</Badge>
                <Badge variant={channel.effectiveness === 'High' ? 'default' : 'secondary'}>{channel.effectiveness} effectiveness</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{channel.strategy}</p>
              <div className="mt-2 p-2 bg-muted/30 rounded"><p className="text-xs">Budget: {channel.budget}</p><p className="text-xs">Expected ROAS: {channel.roas || '2.5x'}</p></div>
              <div className="mt-2 flex items-center justify-end"><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
            </CardContent>
          </Card>
        )) : <Card className="p-6"><p className="text-muted-foreground text-center">No paid channels data available.</p></Card>}
      </div>
    </div>
  );
};

export default ChannelsPanel;
