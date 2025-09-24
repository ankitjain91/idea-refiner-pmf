import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MapPin, Briefcase, DollarSign, Brain, Target } from "lucide-react";
import { useEffect, useState } from "react";

interface DemographicsAnalysisProps {
  idea: string;
  market: string;
}

const DemographicsAnalysis = ({ idea, market }: DemographicsAnalysisProps) => {
  const [demographics, setDemographics] = useState({
    ageGroup: "25-34",
    income: "$50k-$100k",
    location: "Urban",
    profession: "Tech Professional",
    interests: ["Innovation", "Efficiency", "Growth"],
    marketSize: "2.5M potential users",
  });

  useEffect(() => {
    // Simulate demographic analysis based on market selection
    if (market === "enterprise") {
      setDemographics({
        ageGroup: "35-54",
        income: "$100k+",
        location: "Global",
        profession: "Enterprise Decision Makers",
        interests: ["ROI", "Scalability", "Security"],
        marketSize: "50k companies",
      });
    } else if (market === "mainstream") {
      setDemographics({
        ageGroup: "18-44",
        income: "$30k-$80k",
        location: "Suburban/Urban",
        profession: "Various",
        interests: ["Convenience", "Value", "Trends"],
        marketSize: "10M+ potential users",
      });
    } else {
      setDemographics({
        ageGroup: "25-34",
        income: "$50k-$100k",
        location: "Urban",
        profession: "Tech Professional",
        interests: ["Innovation", "Efficiency", "Growth"],
        marketSize: "2.5M potential users",
      });
    }
  }, [market]);

  const segments = [
    { label: "Early Adopters", value: 65, color: "bg-primary" },
    { label: "Mainstream", value: 25, color: "bg-accent" },
    { label: "Late Majority", value: 10, color: "bg-muted" },
  ];

  return (
    <Card className="glass-card p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Demographics Analysis
          </h3>
          <Badge variant="outline" className="text-xs">
            AI-Powered Insights
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-3 h-3" />
              Age Group
            </div>
            <p className="font-medium">{demographics.ageGroup}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              Income
            </div>
            <p className="font-medium">{demographics.income}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              Location
            </div>
            <p className="font-medium">{demographics.location}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="w-3 h-3" />
              Profession
            </div>
            <p className="font-medium">{demographics.profession}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="w-3 h-3" />
            Key Interests
          </div>
          <div className="flex flex-wrap gap-2">
            {demographics.interests.map((interest, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Market Segments</span>
            <span className="font-medium gradient-text">{demographics.marketSize}</span>
          </div>
          
          {segments.map((segment, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{segment.label}</span>
                <span className="font-medium">{segment.value}%</span>
              </div>
              <Progress value={segment.value} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default DemographicsAnalysis;