import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  MessageSquare, 
  Calendar,
  BarChart3,
  ArrowLeft,
  Search
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { UserMenu } from '@/components/UserMenu';
import { ThemeToggle } from '@/components/ThemeToggle';

const IdeaJournal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    sessions, 
    loading, 
    loadSessions, 
    createSession, 
    loadSession, 
    deleteSession,
    renameSession,
    duplicateSession
  } = useSession();
  
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    setIsCreating(true);
    try {
      await createSession(newSessionName.trim());
      setNewSessionName('');
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      navigate('/ideachat');
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await deleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editName.trim()) return;
    
    try {
      await renameSession(sessionId, editName.trim());
      setEditingSession(null);
      setEditName('');
    } catch (error) {
      console.error('Error renaming session:', error);
    }
  };

  const handleDuplicateSession = async (sessionId: string) => {
    try {
      await duplicateSession(sessionId);
    } catch (error) {
      console.error('Error duplicating session:', error);
    }
  };

  const startEditing = (sessionId: string, currentName: string) => {
    setEditingSession(sessionId);
    setEditName(currentName);
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    navigate('/', { state: { from: { pathname: '/ideajournal' }, openAuthModal: true } });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/ideachat')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Idea Journal</h1>
              <p className="text-sm text-muted-foreground">
                Manage your brainstorming sessions
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Create New Session */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Session
            </CardTitle>
            <CardDescription>
              Start a new brainstorming session for your idea
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="Enter session name..."
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              />
              <Button 
                onClick={handleCreateSession}
                disabled={!newSessionName.trim() || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading sessions...</span>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingSession === session.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSession(session.id);
                              if (e.key === 'Escape') setEditingSession(null);
                            }}
                            className="text-lg font-semibold"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handleRenameSession(session.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSession(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                            {session.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {session.data.chatHistory?.length || 0} messages
                            </Badge>
                            {session.data.analysisCompleted && (
                              <Badge variant="default" className="text-xs">
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Analyzed
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(session.id, session.name);
                        }}
                        title="Rename session"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateSession(session.id);
                        }}
                        title="Duplicate session"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        title="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {session.data.currentIdea && (
                      <div>
                        <p className="text-sm text-muted-foreground">Current Idea:</p>
                        <p className="text-sm line-clamp-2">{session.data.currentIdea}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                      </div>
                      <div>
                        {format(new Date(session.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full mt-3" 
                      onClick={() => handleLoadSession(session.id)}
                    >
                      Open Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No sessions match your search.' : 'Create your first brainstorming session to get started!'}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default IdeaJournal;