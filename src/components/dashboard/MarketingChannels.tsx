import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, Search, Globe, Video, Users, 
  Handshake, Mail, FileText, MessageSquare, 
  Store, Zap, ArrowRight, Clock, DollarSign,
  Target, Sparkles, BarChart3
} from 'lucide-react';

export type ChannelKey =
  | "seo" | "sem" | "linkedin" | "tiktok" | "influencers"
  | "partnerships" | "email" | "content" | "communities"
  | "marketplace" | "plg";

export interface ChannelInsight {
  channel: ChannelKey;
  why: string[];
  metrics: {
    ctr: number;
    cvr: number;
    cac: number;
    cpmOrCpc: number;
    ltvToCac: number;
    timeToImpactDays: number;
    confidence: "low" | "medium" | "high";
  };
  budgetSuggestion: { daily: number; weekly: number; currency: "USD" };
  impactEstimate: { leads: number; revenue?: number };
  experiments: { title: string; hypothesis: string }[];
}

const channelIcons: Record<ChannelKey, React.ElementType> = {
  seo: Search,
  sem: Globe,
  linkedin: Users,
  tiktok: Video,
  influencers: Sparkles,
  partnerships: Handshake,
  email: Mail,
  content: FileText,
  communities: MessageSquare,
  marketplace: Store,
  plg: Zap
};

const channelNames: Record<ChannelKey, string> = {
  seo: "SEO",
  sem: "Google Ads (SEM)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  influencers: "Influencers/KOL",
  partnerships: "Partnerships/BD",
  email: "Email/Newsletter",
  content: "Content/Blog",
  communities: "Communities",
  marketplace: "App Stores",
  plg: "Product-led Loops"
};

interface ChannelCardProps {
  insight: ChannelInsight;
  isTopChannel?: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ insight, isTopChannel }) => {
  const Icon = channelIcons[insight.channel];
  const confidenceColors = {
    low: "bg-red-500/10 text-red-400",
    medium: "bg-yellow-500/10 text-yellow-400",
    high: "bg-emerald-500/10 text-emerald-400"
  };

  return (
    <Card className={cn(
      "glass-card border-white/5 p-6 hover:border-white/10 transition-all duration-300",
      "hover:transform hover:scale-[1.01] hover:shadow-glow",
      isTopChannel && "ring-1 ring-primary/50 shadow-glow-primary"
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 backdrop-blur-xl">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{channelNames[insight.channel]}</h3>
              {isTopChannel && (
                <Badge className="mt-1 bg-primary/20 text-primary border-primary/30">
                  Top Priority
                </Badge>
              )}
            </div>
          </div>
          <Badge className={cn("capitalize", confidenceColors[insight.metrics.confidence])}>
            {insight.metrics.confidence}
          </Badge>
        </div>

        {/* Why This Channel */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Why this channel</p>
          <ul className="space-y-1">
            {insight.why.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <span className="text-primary mt-1">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label="CTR" value={`${insight.metrics.ctr}%`} />
          <MetricTile label="CVR" value={`${insight.metrics.cvr}%`} />
          <MetricTile label="CAC" value={`$${insight.metrics.cac}`} />
          <MetricTile label="LTV/CAC" value={`${insight.metrics.ltvToCac}x`} />
          <MetricTile label="Impact" value={`${insight.metrics.timeToImpactDays}d`} />
          <MetricTile 
            label={insight.metrics.cpmOrCpc > 100 ? "CPM" : "CPC"} 
            value={`$${insight.metrics.cpmOrCpc}`} 
          />
        </div>

        {/* Budget & Impact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Budget Suggestion</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">${insight.budgetSuggestion.daily}</span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Expected Impact</p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-white">{insight.impactEstimate.leads}</span>
              <span className="text-xs text-muted-foreground">leads/week</span>
            </div>
          </div>
        </div>

        {/* Experiments */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Experiment Plan</p>
          <div className="space-y-2">
            {insight.experiments.map((exp, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/3 border border-white/5">
                <p className="text-sm font-medium text-white/90">{exp.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{exp.hypothesis}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const MetricTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-2 rounded-lg bg-white/3 border border-white/5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
  </div>
);

interface MarketingChannelsProps {
  channels: ChannelInsight[];
  focusChannels: ChannelKey[];
}

export const MarketingChannels: React.FC<MarketingChannelsProps> = ({ channels, focusChannels }) => {
  return (
    <div className="space-y-6">
      {/* Focus Strip */}
      <Card className="glass-card border-white/5 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-white">Focus Now</h3>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Top 3 Priorities
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {focusChannels.map((channelKey, index) => {
            const channel = channels.find(c => c.channel === channelKey);
            if (!channel) return null;
            const Icon = channelIcons[channelKey];
            return (
              <div key={channelKey} className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                  {index + 1}
                </div>
                <Icon className="h-4 w-4 text-white/60" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{channelNames[channelKey]}</p>
                  <p className="text-xs text-muted-foreground">ROI: {channel.metrics.ltvToCac}x</p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {channels.map(channel => (
          <ChannelCard 
            key={channel.channel} 
            insight={channel} 
            isTopChannel={focusChannels.includes(channel.channel)}
          />
        ))}
      </div>
    </div>
  );
};