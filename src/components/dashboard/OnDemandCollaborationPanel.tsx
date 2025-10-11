import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Users, Lock, UserPlus, Clock, CheckCircle, XCircle, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { OnDemandTile } from "@/components/ui/OnDemandTile";

interface Collaboration {
  id: string;
  requester_id: string;
  recipient_id: string;
  idea_id: string;
  status: string;
  message: string | null;
  created_at: string;
  requester_email?: string;
  recipient_email?: string;
}

export function OnDemandCollaborationPanel() {
  const { canAccess } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccess('collaboration');
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchCollaborations = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!hasAccess) {
      setError('Collaboration feature requires Pro or Enterprise plan');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('collaborations')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setCollaborations(data || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching collaborations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'accepted': return CheckCircle;
      case 'rejected': return XCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'accepted': return 'text-green-500';
      case 'rejected': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const renderUpgradePrompt = () => (
    <div className="text-center space-y-4">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full w-fit mx-auto">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-sm mb-2">Collaboration Available with Pro</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Invite team members to collaborate on ideas, share sessions, and work together in real-time.
        </p>
        <Button 
          onClick={() => navigate('/pricing')}
          size="sm"
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      </div>
    </div>
  );

  const renderCollaborationsContent = () => {
    if (!hasAccess) {
      return renderUpgradePrompt();
    }

    if (!hasLoaded) return null;

    if (collaborations.length === 0) {
      return (
        <div className="text-center space-y-4">
          <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-sm mb-2">No Collaborations Yet</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Start collaborating by inviting team members to work on your ideas together.
            </p>
            <Button 
              onClick={() => navigate('/collaborate')}
              size="sm"
              className="bg-gradient-to-r from-primary to-accent"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Collaborators
            </Button>
          </div>
        </div>
      );
    }

    const pendingCollabs = collaborations.filter(c => c.status === 'pending');
    const activeCollabs = collaborations.filter(c => c.status === 'accepted');

    return (
      <div className="space-y-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-primary">{collaborations.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-500">{pendingCollabs.length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-3 bg-muted/20 rounded-lg text-center">
            <div className="text-lg font-bold text-green-500">{activeCollabs.length}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
        </div>

        {/* Recent Collaborations */}
        {collaborations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Collaborations
            </h3>
            <div className="space-y-2">
              {collaborations.slice(0, 3).map((collab) => {
                const StatusIcon = getStatusIcon(collab.status);
                const isRequestedByMe = collab.requester_id === user?.id;
                const timeAgo = formatDistanceToNow(new Date(collab.created_at), { addSuffix: true });

                return (
                  <div 
                    key={collab.id}
                    className="group p-3 bg-gradient-to-r from-card to-card/80 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(collab.status)}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {isRequestedByMe ? 'Sent to collaborator' : 'Received collaboration request'}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={collab.status === 'accepted' ? 'default' : collab.status === 'pending' ? 'secondary' : 'destructive'}
                          className="text-xs capitalize"
                        >
                          {collab.status}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    {collab.message && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {collab.message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/collaborate')}
            className="flex-1"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/collaborations')}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>
    );
  };

  if (!hasAccess) {
    return (
      <OnDemandTile
        title="Team Collaboration"
        icon={Users}
        description="Unlock powerful collaboration features to work with your team on ideas, share sessions, and brainstorm together in real-time."
        features={[
          "Invite team members to collaborate on ideas",
          "Real-time session sharing and co-editing",
          "Permission management and access controls",
          "Collaborative brainstorming tools",
          "Team activity tracking and insights"
        ]}
        estimatedLoadTime="Available with Pro Plan"
        isLoading={false}
        error={null}
        data={null}
        onLoad={() => navigate('/pricing')}
        className="border-primary/20"
        badge={{
          text: "Pro Feature",
          variant: "secondary"
        }}
      >
        {renderUpgradePrompt()}
      </OnDemandTile>
    );
  }

  return (
    <OnDemandTile
      title="Team Collaboration"
      icon={Users}
      description="Manage your team collaborations, view pending invitations, and coordinate on shared ideas and projects."
      features={[
        "Active collaboration requests and invitations",
        "Team member activity and status tracking",
        "Shared idea access and permissions",
        "Collaboration history and analytics",
        "Quick invite and management tools"
      ]}
      estimatedLoadTime="~5 seconds"
      isLoading={loading}
      error={error}
      data={hasLoaded ? collaborations : null}
      onLoad={fetchCollaborations}
      onRefresh={fetchCollaborations}
      className="border-primary/20"
      badge={{
        text: collaborations.length > 0 ? `${collaborations.length} Active` : "Ready",
        variant: collaborations.length > 0 ? "default" : "outline"
      }}
    >
      {renderCollaborationsContent()}
    </OnDemandTile>
  );
}