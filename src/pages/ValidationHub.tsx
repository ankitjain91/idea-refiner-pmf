import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit3, Download, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketValidation } from "@/components/hub/MarketValidation";
import { FinancialSignals } from "@/components/hub/FinancialSignals";
import { ExecutionInsights } from "@/components/hub/ExecutionInsights";
import { EngagementSignals } from "@/components/hub/EngagementSignals";
import { DynamicSimulation } from "@/components/hub/DynamicSimulation";
import { ActionCenter } from "@/components/hub/ActionCenter";

export default function ValidationHub() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");

  useEffect(() => {
    // Get the idea from localStorage or context
    const storedIdea = localStorage.getItem('userIdea') || localStorage.getItem('currentIdea');
    if (storedIdea) {
      setIdea(storedIdea);
    }
  }, []);

  const handleEditIdea = () => {
    navigate('/ideachat');
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting report...');
  };

  const handleFindMentors = () => {
    // TODO: Implement mentor matching
    console.log('Finding mentors...');
  };

  if (!idea) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No Idea Found</h2>
          <p className="text-muted-foreground">Please submit an idea first to see the validation hub.</p>
          <Button onClick={() => navigate('/ideachat')}>
            Go to Idea Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Idea Validation & Pursuit Hub</h1>
                <p className="text-sm text-muted-foreground">
                  From brainstorming to execution — all the insights you need in one place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditIdea}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit Idea
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-1" />
                Export Report
              </Button>
              <Button variant="default" size="sm" onClick={handleFindMentors}>
                <Users className="h-4 w-4 mr-1" />
                Find Mentors
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Current Idea Display */}
      <div className="container mx-auto px-4 py-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Idea</h3>
          <p className="text-lg">{idea}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-8">
        <Tabs defaultValue="validation" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto">
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="action">Action</TabsTrigger>
          </TabsList>

          <TabsContent value="validation" className="space-y-6">
            <MarketValidation idea={idea} />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <FinancialSignals idea={idea} />
          </TabsContent>

          <TabsContent value="execution" className="space-y-6">
            <ExecutionInsights idea={idea} />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <EngagementSignals idea={idea} />
          </TabsContent>

          <TabsContent value="simulation" className="space-y-6">
            <DynamicSimulation idea={idea} />
          </TabsContent>

          <TabsContent value="action" className="space-y-6">
            <ActionCenter idea={idea} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer CTA */}
      <footer className="border-t bg-card/50 backdrop-blur mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">Ready to take the next step?</p>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline">Join Community</Button>
              <Button variant="outline">Book Mentor Session</Button>
              <Button variant="default">Start Building MVP</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}