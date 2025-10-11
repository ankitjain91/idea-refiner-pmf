import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Crown, 
  ArrowLeft, 
  Trash2, 
  Share, 
  Eye, 
  Calendar,
  Shield,
  FileText,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLedger } from '@/hooks/useLedger';
import { formatDistanceToNow } from 'date-fns';

interface OwnedIdea {
  id: string;
  original_idea: string;
  refined_idea?: string;
  category?: string;
  created_at: string;
  ownership: {
    ownership_token: string;
    proof_hash: string;
    created_at: string;
  };
}

export default function OwnedIdeas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getOwnershipProof } = useLedger();
  const [ownedIdeas, setOwnedIdeas] = useState<OwnedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOwnedIdeas();
    }
  }, [user]);

  const loadOwnedIdeas = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all ideas owned by the user
      const { data: ownershipRecords, error } = await supabase
        .from('idea_ownership')
        .select(`
          idea_id,
          ownership_token,
          proof_hash,
          created_at,
          ideas (
            id,
            original_idea,
            refined_idea,
            category,
            created_at
          )
        `)
        .eq('current_owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedIdeas: OwnedIdea[] = (ownershipRecords || [])
        .filter(record => record.ideas) // Filter out records without ideas
        .map(record => ({
          id: record.ideas.id,
          original_idea: record.ideas.original_idea,
          refined_idea: record.ideas.refined_idea,
          category: record.ideas.category,
          created_at: record.ideas.created_at,
          ownership: {
            ownership_token: record.ownership_token,
            proof_hash: record.proof_hash,
            created_at: record.created_at
          }
        }));

      setOwnedIdeas(formattedIdeas);
    } catch (error) {
      console.error('Error loading owned ideas:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your owned ideas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOwnership = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete ownership of this idea? This action cannot be undone.')) {
      return;
    }

    setDeletingId(ideaId);
    try {
      // Delete ownership record
      const { error } = await supabase
        .from('idea_ownership')
        .delete()
        .eq('idea_id', ideaId)
        .eq('current_owner_id', user?.id);

      if (error) throw error;

      // Remove from local state
      setOwnedIdeas(prev => prev.filter(idea => idea.id !== ideaId));
      
      toast({
        title: 'Ownership Deleted',
        description: 'You have successfully deleted ownership of this idea.',
      });
    } catch (error) {
      console.error('Error deleting ownership:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ownership.',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleTransferOwnership = (ideaId: string) => {
    // TODO: Implement ownership transfer
    toast({
      title: 'Coming Soon',
      description: 'Ownership transfer functionality will be available soon.',
    });
  };

  const handleViewIdea = (ideaId: string) => {
    navigate(`/ideachat?idea=${ideaId}`);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4 px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Owned Ideas</h1>
              <p className="text-sm text-muted-foreground">Loading your blockchain-secured ideas...</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading owned ideas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                Owned Ideas
              </h1>
              <p className="text-sm text-muted-foreground">
                {ownedIdeas.length} idea{ownedIdeas.length !== 1 ? 's' : ''} secured on the blockchain
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/ideachat')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Idea
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {ownedIdeas.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Owned Ideas Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start creating and claiming ownership of your ideas to see them here.
              </p>
              <Button onClick={() => navigate('/ideachat')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Idea
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Your Ownership Rights:</strong> These ideas are cryptographically secured and timestamped on our blockchain. 
                You have full ownership rights including the ability to transfer or delete ownership.
              </AlertDescription>
            </Alert>

            <div className="grid gap-6">
              {ownedIdeas.map((idea) => (
                <Card key={idea.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5" />
                          Idea #{idea.id.substring(0, 8)}
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Crown className="h-3 w-3 mr-1" />
                            Owned
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Claimed {formatDistanceToNow(new Date(idea.ownership.created_at))} ago
                          {idea.category && (
                            <Badge variant="outline" className="ml-2">
                              {idea.category}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Original Idea:</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {idea.original_idea}
                      </p>
                    </div>

                    {idea.refined_idea && (
                      <div>
                        <h4 className="font-medium mb-2">Refined Version:</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {idea.refined_idea}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-muted-foreground">Ownership Token:</p>
                        <p className="font-mono break-all">{idea.ownership.ownership_token.substring(0, 32)}...</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Proof Hash:</p>
                        <p className="font-mono break-all">{idea.ownership.proof_hash.substring(0, 32)}...</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewIdea(idea.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTransferOwnership(idea.id)}
                      >
                        <Share className="h-4 w-4 mr-1" />
                        Transfer
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteOwnership(idea.id)}
                        disabled={deletingId === idea.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === idea.id ? (
                          <>
                            <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}