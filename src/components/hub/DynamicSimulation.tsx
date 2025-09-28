import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Globe, Megaphone, Clock } from "lucide-react";

interface DynamicSimulationProps {
  idea: string;
}

export function DynamicSimulation({ idea }: DynamicSimulationProps) {
  const [pricing, setPricing] = useState(29);
  const [geography, setGeography] = useState("us");
  const [channel, setChannel] = useState("tiktok");
  const [launchSpeed, setLaunchSpeed] = useState(false);

  // Calculate dynamic projections based on inputs
  const calculateAdoption = () => {
    const baseAdoption = 1000;
    const pricingMultiplier = pricing < 20 ? 1.5 : pricing > 50 ? 0.7 : 1;
    const geoMultiplier = geography === 'global' ? 3 : geography === 'us-eu' ? 2 : 1;
    return Math.round(baseAdoption * pricingMultiplier * geoMultiplier);
  };

  const calculateRevenue = () => {
    return calculateAdoption() * pricing;
  };

  const adoptionData = [
    { month: 'M1', users: calculateAdoption() * 0.1 },
    { month: 'M2', users: calculateAdoption() * 0.25 },
    { month: 'M3', users: calculateAdoption() * 0.45 },
    { month: 'M4', users: calculateAdoption() * 0.65 },
    { month: 'M5', users: calculateAdoption() * 0.85 },
    { month: 'M6', users: calculateAdoption() }
  ];

  const revenueData = adoptionData.map(d => ({
    month: d.month,
    revenue: d.users * pricing
  }));

  const channelData = [
    { channel: 'TikTok', conversion: channel === 'tiktok' ? 12 : 8, cost: channel === 'tiktok' ? 15 : 25 },
    { channel: 'LinkedIn', conversion: channel === 'linkedin' ? 18 : 12, cost: channel === 'linkedin' ? 45 : 65 },
    { channel: 'Paid Ads', conversion: channel === 'ads' ? 8 : 5, cost: channel === 'ads' ? 85 : 120 }
  ];

  const geoReachData = {
    us: { reach: '50M', growth: '25%' },
    'us-eu': { reach: '180M', growth: '35%' },
    global: { reach: '500M', growth: '55%' }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pricing Sensitivity */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Sensitivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Price Point</Label>
                  <span className="text-sm font-bold">${pricing}/mo</span>
                </div>
                <Slider
                  value={[pricing]}
                  onValueChange={([value]) => setPricing(value)}
                  min={9}
                  max={99}
                  step={10}
                  className="cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-primary">{calculateAdoption()}</p>
                  <p className="text-xs text-muted-foreground">Projected Users</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-green-500">${(calculateRevenue() / 1000).toFixed(0)}K</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `$${(value / 1000).toFixed(0)}K`} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Geography Expansion */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Geography Expansion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select value={geography} onValueChange={setGeography}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">US Only</SelectItem>
                  <SelectItem value="us-eu">US + Europe</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-primary">{geoReachData[geography as keyof typeof geoReachData].reach}</p>
                  <p className="text-xs text-muted-foreground">Total Reach</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50">
                  <p className="text-2xl font-bold text-green-500">{geoReachData[geography as keyof typeof geoReachData].growth}</p>
                  <p className="text-xs text-muted-foreground">Growth Potential</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={adoptionData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Impact */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Channel Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="ads">Paid Ads</SelectItem>
                </SelectContent>
              </Select>

              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="conversion" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cost" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <p className="text-lg font-bold">
                    {channelData.find(c => c.channel.toLowerCase() === (channel === 'ads' ? 'paid ads' : channel))?.conversion}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">CAC</p>
                  <p className="text-lg font-bold">
                    ${channelData.find(c => c.channel.toLowerCase() === (channel === 'ads' ? 'paid ads' : channel))?.cost}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time-to-Market */}
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time-to-Market Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="launch-speed">Launch Speed</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Steady</span>
                  <Switch
                    id="launch-speed"
                    checked={launchSpeed}
                    onCheckedChange={setLaunchSpeed}
                  />
                  <span className="text-sm text-muted-foreground">Fast</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{launchSpeed ? 'Fast Launch' : 'Steady Launch'}</p>
                    <Badge variant={launchSpeed ? 'default' : 'secondary'}>
                      {launchSpeed ? '6 weeks' : '12 weeks'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-sm">{launchSpeed ? 'Quick market entry' : 'Thorough testing'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-sm">{launchSpeed ? 'Early feedback' : 'Polished product'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⚠</span>
                      <span className="text-sm">{launchSpeed ? 'Higher risk' : 'Slower iteration'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}