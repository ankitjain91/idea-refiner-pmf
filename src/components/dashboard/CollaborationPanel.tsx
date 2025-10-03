import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Users, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CollaborationPanel() {
  const { canAccess } = useSubscription();
  const navigate = useNavigate();
  const hasAccess = canAccess('collaboration');

  if (!hasAccess) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex items-center justify-center">
          <div className="text-center px-4">
            <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro to collaborate with your team
            </p>
            <Button onClick={() => navigate('/pricing')} size="sm">
              Upgrade to Pro
            </Button>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Projects
          </CardTitle>
          <CardDescription>Recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 opacity-40">
            <div className="p-3 rounded border border-border/40">
              <p className="text-sm">Alex updated "AI SaaS Tool"</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
            <div className="p-3 rounded border border-border/40">
              <p className="text-sm">Jordan commented on "Mobile App"</p>
              <p className="text-xs text-muted-foreground">5 hours ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Projects
        </CardTitle>
        <CardDescription>Recent team activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground text-center py-4">
          No recent team activity
        </div>
      </CardContent>
    </Card>
  );
}
