import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, DollarSign, Globe, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelWeights {
  tiktok: number;
  instagram: number;
  reddit: number;
  youtube: number;
  linkedin: number;
}

interface RefinementControlsProps {
  refinements: {
    ageRange: number[];
    regionFocus: string;
    pricePoint: number;
    channelWeights: ChannelWeights;
    b2b: boolean;
    premium: boolean;
    niche: boolean;
  };
  onChange: (refinements: any) => void;
}

export default function RefinementControlsAdvanced({ refinements, onChange }: RefinementControlsProps) {
  const handleSliderChange = (key: string, value: number[]) => {
    onChange({ ...refinements, [key]: value });
  };

  const handleSingleSliderChange = (key: string, value: number[]) => {
    onChange({ ...refinements, [key]: value[0] });
  };

  const handleToggleChange = (key: string, checked: boolean) => {
    onChange({ ...refinements, [key]: checked });
  };

  const handleSelectChange = (key: string, value: string) => {
    onChange({ ...refinements, [key]: value });
  };

  const handleChannelWeightChange = (channel: keyof ChannelWeights, value: number[]) => {
    const newWeights = { ...refinements.channelWeights, [channel]: value[0] / 100 };
    
    // Normalize weights to sum to 1
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      Object.keys(newWeights).forEach(key => {
        newWeights[key as keyof ChannelWeights] = newWeights[key as keyof ChannelWeights] / total;
      });
    }
    
    onChange({ ...refinements, channelWeights: newWeights });
  };

  const channelIcons = {
    tiktok: '📱',
    instagram: '📸',
    reddit: '💬',
    youtube: '📺',
    linkedin: '💼'
  };

  return (
    <Card className="sticky top-6 shadow-2xl border-0 bg-card/95 backdrop-blur">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Live Controls
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Age Range Slider */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Age Range: {refinements.ageRange[0]} - {refinements.ageRange[1]}
          </Label>
          <Slider
            value={refinements.ageRange}
            onValueChange={(value) => handleSliderChange('ageRange', value)}
            min={13}
            max={65}
            step={1}
            className="py-4"
          />
        </div>

        {/* Price Point Slider */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Price Point: ${refinements.pricePoint}
          </Label>
          <Slider
            value={[refinements.pricePoint]}
            onValueChange={(value) => handleSingleSliderChange('pricePoint', value)}
            min={0}
            max={500}
            step={10}
            className="py-4"
          />
        </div>

        {/* Region Focus */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            Region Focus
          </Label>
          <Select
            value={refinements.regionFocus}
            onValueChange={(value) => handleSelectChange('regionFocus', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="north-america">North America</SelectItem>
              <SelectItem value="europe">Europe</SelectItem>
              <SelectItem value="asia">Asia Pacific</SelectItem>
              <SelectItem value="latam">Latin America</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Channel Weights */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-600" />
            Channel Focus
          </Label>
          <div className="space-y-3">
            {Object.entries(refinements.channelWeights).map(([channel, weight]) => (
              <div key={channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 capitalize">
                    <span>{channelIcons[channel as keyof typeof channelIcons]}</span>
                    {channel}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(weight * 100)}%
                  </Badge>
                </div>
                <Slider
                  value={[weight * 100]}
                  onValueChange={(value) => handleChannelWeightChange(channel as keyof ChannelWeights, value)}
                  min={0}
                  max={100}
                  step={5}
                  className="h-1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Toggle Switches */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="b2b" className="flex items-center gap-2 cursor-pointer">
              <Target className="h-4 w-4 text-purple-600" />
              B2B Focus
            </Label>
            <Switch
              id="b2b"
              checked={refinements.b2b}
              onCheckedChange={(checked) => handleToggleChange('b2b', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="premium" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">💎</span>
              Premium Positioning
            </Label>
            <Switch
              id="premium"
              checked={refinements.premium}
              onCheckedChange={(checked) => handleToggleChange('premium', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="niche" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">🎯</span>
              Niche Market
            </Label>
            <Switch
              id="niche"
              checked={refinements.niche}
              onCheckedChange={(checked) => handleToggleChange('niche', checked)}
            />
          </div>
        </div>

        {/* Impact Indicator */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Real-time Impact</span>
            <Badge variant="outline" className="text-xs animate-pulse">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" />
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Changes update PM-Fit score instantly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}