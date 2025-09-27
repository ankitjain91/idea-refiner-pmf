import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useSession } from '@/contexts/SimpleSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Plus, User, Clock, Trash2, Edit2, Copy, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionPickerProps {
  open: boolean;
  onSessionSelected: () => void;
}

export const SessionPicker: React.FC<SessionPickerProps> = ({ open, onSessionSelected }) => {
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
  
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (open && user) {
      loadSessions();
    }
  }, [open, user, loadSessions]);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    setIsCreating(true);
    try {
      await createSession(newSessionName.trim());
      setNewSessionName('');
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
      onSessionSelected();
    } catch (error) {
      console.error('Error loading session:', error);
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
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Start Brainstorming</DialogTitle>
            <CardDescription>
              You need to be logged in to save your sessions, or you can use anonymous mode.
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4">

          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Choose Your Session
            </DialogTitle>
            <DialogDescription>
              Select an existing brainstorm session or create a new one to continue your PMF analysis journey.
            </DialogDescription>
          </DialogHeader>        <div className="space-y-6">
          {/* Create New Session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Session</CardTitle>
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

          {/* Existing Sessions */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading sessions...</span>
            </div>
          ) : sessions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Sessions ({sessions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessions.map((session) => (
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
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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