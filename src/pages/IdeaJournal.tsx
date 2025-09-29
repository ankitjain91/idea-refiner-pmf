import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Search,
  Sparkles,
  ChartBar,
  ExternalLink
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

  const handleLoadDashboard = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      navigate('/hub');
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

  const generateFunName = () => {
    const adjectives = ['Creative', 'Bold', 'Innovative', 'Disruptive', 'Strategic', 'Dynamic', 'Visionary', 'Brilliant'];
    const nouns = ['Venture', 'Concept', 'Breakthrough', 'Solution', 'Revolution', 'Blueprint', 'Framework', 'Initiative'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj} ${randomNoun}`;
  };

  const filteredSessions = sessions.filter(session =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    navigate('/', { state: { from: { pathname: '/ideajournal' }, openAuthModal: true } });
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
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

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Create New Session or Show Sessions */}
        <div className="space-y-6">
          {/* Create New Session Button/Form */}
          <div className="relative min-h-[100px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {!isCreating ? (
              <Button 
                onClick={() => setIsCreating(true)}
                className="w-full h-24 border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                variant="outline"
                size="lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-10 w-10 text-primary/60" />
                  <span className="text-base font-medium text-muted-foreground">Create New Session</span>
                </div>
              </Button>
            ) : (
              <Card className="transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] border-primary/20 shadow-sm hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create New Session
                  </CardTitle>
                  <CardDescription>
                    Start a new brainstorming session for your idea
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter session name..."
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateSession();
                          if (e.key === 'Escape') {
                            setIsCreating(false);
                            setNewSessionName('');
                          }
                        }}
                        autoFocus
                        className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:scale-[1.01] focus:shadow-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setNewSessionName(generateFunName())}
                        title="Generate a fun name"
                        className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:rotate-12 active:scale-95"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleCreateSession}
                        disabled={!newSessionName.trim()}
                        className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
                      >
                        Create
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setNewSessionName('');
                      }}
                      className="w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/50 active:scale-[0.98]"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Divider with OR */}
          {sessions.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">OR</span>
              </div>
            </div>
          )}

          {/* Sessions List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading sessions...</span>
            </div>
          ) : sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Sessions ({filteredSessions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                {/* Sessions List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <div
                        key={session.id}
                        className="group flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadSession(session.id)}>
                          {editingSession === session.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameSession(session.id);
                                  if (e.key === 'Escape') setEditingSession(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameSession(session.id);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium truncate">{session.name}</h3>
                              {session.data.currentIdea && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {session.data.currentIdea}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                                </span>
                                {session.data.chatHistory && session.data.chatHistory.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {session.data.chatHistory.length}
                                  </span>
                                )}
                                {session.data.analysisCompleted && (
                                  <Badge variant="default" className="text-xs">
                                    <BarChart3 className="h-3 w-3 mr-1" />
                                    Analyzed
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadSession(session.id);
                            }}
                            title="Open in Chat"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {session.data.analysisCompleted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadDashboard(session.id);
                              }}
                              title="View Dashboard"
                            >
                              <ChartBar className="h-4 w-4" />
                            </Button>
                          )}
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
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No sessions match your search.' : 'No sessions yet.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeaJournal;