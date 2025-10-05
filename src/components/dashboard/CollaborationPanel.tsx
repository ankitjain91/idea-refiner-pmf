import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Users, Lock, UserPlus, Clock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

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

export function CollaborationPanel() {
  const { canAccess } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccess('collaboration');
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!user || !hasAccess) return;

    const fetchCollaborations = async () => {
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && !error) {
        setCollaborations(data);
      }
      setLoading(false);
    };

    fetchCollaborations();
  }, [user, hasAccess]);

  if (!hasAccess) {
    return (
      <Card className="relative overflow-hidden border-dashed">
        <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex items-center justify-center">
          <div className="text-center px-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Team Collaboration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Collaborate with your team and share ideas
              </p>
            </div>
            <Button onClick={() => navigate('/pricing')} size="sm" className="bg-gradient-to-r from-primary to-accent">
              Upgrade to Pro
            </Button>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Collaboration
          </CardTitle>
          <CardDescription>Share and work together on ideas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <div className="text-sm text-muted-foreground opacity-40">
              Team collaboration features available with Pro plan
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      accepted: 'default',
      rejected: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Collaboration
            </CardTitle>
            <CardDescription>Recent collaboration activity</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Team
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
        ) : collaborations.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">No collaboration activity yet</p>
              <p className="text-xs text-muted-foreground">
                Start collaborating with your team on ideas
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {collaborations.map((collab) => (
              <div
                key={collab.id}
                className="p-3 rounded-lg border border-border/40 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(collab.status)}
                      <p className="text-sm font-medium truncate">
                        {collab.requester_id === user?.id ? 'Sent' : 'Received'} collaboration request
                      </p>
                    </div>
                    {collab.message && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{collab.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(collab.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={getStatusBadge(collab.status)} className="shrink-0">
                    {collab.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
