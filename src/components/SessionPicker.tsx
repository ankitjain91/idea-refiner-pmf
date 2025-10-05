import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, User, Clock, Trash2, Edit2, Copy, Sparkles, Shuffle, Info, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SessionPickerProps {
  open: boolean;
  onSessionSelected: () => void;
  allowClose?: boolean;
  onClose?: () => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({ open, onSessionSelected, allowClose = false, onClose }) => {
  const { user } = useAuth();
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
  const { toast } = useToast();
  
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  
  console.log('[SessionPicker] Render - open:', open, 'user:', user?.email, 'allowClose:', allowClose);

  const generateFunName = () => {
    const adjectives = ['Brilliant', 'Creative', 'Innovative', 'Strategic', 'Visionary', 'Bold', 'Clever', 'Dynamic', 'Epic', 'Fresh'];
    const nouns = ['Venture', 'Quest', 'Journey', 'Mission', 'Project', 'Vision', 'Dream', 'Spark', 'Wave', 'Storm'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj} ${randomNoun}`;
  };

  useEffect(() => {
    if (open && user) {
      loadSessions();
    }
  }, [open, user, loadSessions]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    setIsCreating(true);
    try {
      await createSession(newSessionName.trim(), isAnonymous);
      setNewSessionName('');
      setIsAnonymous(false);
      setShowCreateForm(false);
      onSessionSelected();
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };



  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadSession(sessionId);
      
      // Get the loaded session details
      const loadedSession = sessions.find(s => s.id === sessionId);
      const messageCount = loadedSession?.data?.chatHistory?.length || 0;
      
      toast({
        title: "Session Loaded",
        description: `"${loadedSession?.name || 'Session'}" restored with ${messageCount} message${messageCount !== 1 ? 's' : ''}`,
      });
      
      onSessionSelected();
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
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

  const handleDuplicateSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await duplicateSession(sessionId);
    } catch (error) {
      console.error('Error duplicating session:', error);
    }
  };

  const startEditing = (sessionId: string, currentName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingSession(sessionId);
    setEditName(currentName);
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={allowClose ? (open) => !open && onClose?.() : () => {}}>
        <DialogContent 
          className="max-w-md" 
          data-hide-close={!allowClose ? "true" : undefined}
          onPointerDownOutside={allowClose ? undefined : (e) => e.preventDefault()} 
          onEscapeKeyDown={allowClose ? undefined : (e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Start Your Session
            </DialogTitle>
            <CardDescription>
              You need to be logged in to save your sessions, or you can use anonymous mode.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Anonymous Session</CardTitle>
                <CardDescription>
                  Start brainstorming without signing up. Your session won't be saved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter session name..."
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                  />
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setNewSessionName(generateFunName())}
                    title="Generate AI name"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
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
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="anonymous" 
                    checked={true}
                    disabled={true}
                  />
                  <label htmlFor="anonymous" className="text-sm text-muted-foreground">
                    Anonymous mode (session won't be saved)
                  </label>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
      <Dialog open={open} onOpenChange={allowClose ? (open) => !open && onClose?.() : () => {}}>
        <DialogContent 
          className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
          data-hide-close={!allowClose ? "true" : undefined}
          onPointerDownOutside={allowClose ? undefined : (e) => e.preventDefault()} 
          onEscapeKeyDown={allowClose ? undefined : (e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Sessions
            </DialogTitle>
            <DialogDescription>
              Create a new session or continue with an existing one
            </DialogDescription>
          </DialogHeader>
        <div className="space-y-6">
          {/* Create New Session */}
          <div className="relative min-h-[60px] transition-all duration-500 ease-\[cubic-bezier(0.32,0.72,0,1)\]">
            {!showCreateForm ? (
              <div 
                className="opacity-100 transition-all duration-500 ease-\[cubic-bezier(0.32,0.72,0,1)\]"
                style={{
                  animation: 'slideUp 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
                }}
              >
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full h-20 border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-700 ease-\[cubic-bezier(0.32,0.72,0,1)\] hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                  variant="outline"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-8 w-8 text-primary/60" />
                    <span className="text-sm font-medium text-muted-foreground">Create New Session</span>
                  </div>
                </Button>
              </div>
            ) : (
              <div 
                className="opacity-100"
                style={{
                  animation: 'expandIn 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards',
                }}
              >
                <Card className="transition-all duration-500 ease-\[cubic-bezier(0.32,0.72,0,1)\] border-primary/20 shadow-sm hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg opacity-0" style={{ animation: 'fadeSlideIn 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.1s forwards' }}>
                      Create New Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div 
                      className="flex gap-2 opacity-0" 
                      style={{ 
                        animation: 'fadeSlideIn 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.15s forwards' 
                      }}
                    >
                      <Input
                        placeholder="Enter session name..."
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateSession();
                          if (e.key === 'Escape') {
                            setShowCreateForm(false);
                            setNewSessionName('');
                          }
                        }}
                        autoFocus
                        className="transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\] focus:scale-[1.01] focus:shadow-sm"
                      />
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => setNewSessionName(generateFunName())}
                        title="Generate AI name"
                        className="transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\] hover:rotate-12 active:scale-95"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button 
                        onClick={handleCreateSession}
                        disabled={!newSessionName.trim() || isCreating}
                        className="transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\] active:scale-95"
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                    <div 
                      className="flex items-center space-x-2 opacity-0" 
                      style={{ 
                        animation: 'fadeSlideIn 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.2s forwards' 
                      }}
                    >
                      <Checkbox 
                        id="anonymous" 
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                        className="transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\]"
                      />
                      <label 
                        htmlFor="anonymous" 
                        className="text-sm text-muted-foreground cursor-pointer transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\] hover:text-foreground"
                      >
                        Create as anonymous (won't be saved to your account)
                      </label>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewSessionName('');
                        setIsAnonymous(false);
                      }}
                      className="w-full transition-all duration-300 ease-\[cubic-bezier(0.32,0.72,0,1)\] hover:bg-muted/50 active:scale-[0.98] opacity-0"
                      style={{ 
                        animation: 'fadeSlideIn 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.25s forwards' 
                      }}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
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

          {/* Existing Sessions */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading sessions...</span>
            </div>
          ) : sessions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Choose Existing Session ({sessions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="space-y-2">
                  {sessions
                    .filter(session => 
                      session.name.toLowerCase().includes(sessionSearch.toLowerCase())
                    )
                    .map((session) => (
                    <div
                      key={session.id}
                      className="group flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleLoadSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
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
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {session.data.currentIdea}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                              </span>
                              {session.data.analysisCompleted && (
                                <span className="text-green-600 text-xs">
                                  ✓ Analysis Complete
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => startEditing(session.id, session.name, e)}
                          title="Rename session"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleDuplicateSession(session.id, e)}
                          title="Duplicate session"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* No results message */}
                {sessions.filter(session => 
                  session.name.toLowerCase().includes(sessionSearch.toLowerCase())
                ).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No sessions found matching "{sessionSearch}"
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No sessions found. Create your first session above!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};