import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Globe, Clock, TrendingUp } from "lucide-react";

interface RefinementControlsProps {
  refinements: {
    budget: string;
    market: string;
    timeline: string;
  };
  onChange: (key: string, value: string) => void;
}

const RefinementControls = ({ refinements, onChange }: RefinementControlsProps) => {
  const controls = [
    {
      key: "budget",
      label: "Budget Range",
      icon: DollarSign,
      color: "text-success",
      options: [
        { value: "bootstrapped", label: "Bootstrapped (<$10k)", description: "Self-funded, lean approach" },
        { value: "seed", label: "Seed ($10k-$500k)", description: "Friends, family, angels" },
        { value: "series-a", label: "Series A ($500k+)", description: "VC funding ready" },
      ],
    },
    {
      key: "market",
      label: "Target Market",
      icon: Globe,
      color: "text-primary",
      options: [
        { value: "niche", label: "Niche Market", description: "Specialized audience" },
        { value: "mainstream", label: "Mainstream", description: "Broad consumer appeal" },
        { value: "enterprise", label: "Enterprise", description: "B2B corporate clients" },
      ],
    },
    {
      key: "timeline",
      label: "Launch Timeline",
      icon: Clock,
      color: "text-accent",
      options: [
        { value: "mvp", label: "MVP (1-3 months)", description: "Quick validation" },
        { value: "6-months", label: "6 Months", description: "Polished product" },
        { value: "1-year", label: "1 Year", description: "Full feature set" },
      ],
    },
  ];

  return (
    <Card className="glass-card p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-display font-semibold">Refinement Controls</h3>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Auto-Optimize
          </Badge>
        </div>

        <div className="grid gap-4">
          {controls.map((control) => {
            const Icon = control.icon;
            return (
              <div key={control.key} className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Icon className={`w-4 h-4 ${control.color}`} />
                  {control.label}
                </Label>
                <Select
                  value={refinements[control.key as keyof typeof refinements]}
                  onValueChange={(value) => onChange(control.key, value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder={`Select ${control.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                    {control.options.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="hover:bg-primary/10"
                      >
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Adjusting these parameters will instantly update your PMF score and analysis
          </p>
        </div>
      </div>
    </Card>
  );
};

export default RefinementControls;