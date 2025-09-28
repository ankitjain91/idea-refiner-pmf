import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Archive, GitCompare, Sparkles, Trash2, ChevronRight, Lightbulb } from 'lucide-react';
import { useIdeaManagement } from '@/hooks/useIdeaManagement';
import { toast } from 'sonner';

interface Idea {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: 'active' | 'archived' | 'comparing';
  createdAt: Date;
  updatedAt: Date;
  score?: number;
  insights?: {
    marketSize?: string;
    competition?: string;
    potential?: string;
  };
}

export function IdeaBoard() {
  const { handleIdeaSubmit, confirmIdea } = useIdeaManagement();
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: '', description: '', keywords: '' });
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);

  const handleAddIdea = () => {
    if (!newIdea.title || !newIdea.description) {
      toast.error('Please provide both title and description');
      return;
    }

    const keywords = newIdea.keywords.split(',').map(k => k.trim()).filter(k => k);
    const idea: Idea = {
      id: Date.now().toString(),
      title: newIdea.title,
      description: newIdea.description,
      keywords,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store idea locally (in real app, would sync with backend)
    const existingIdeas = JSON.parse(localStorage.getItem('ideaBoard') || '[]');
    existingIdeas.push(idea);
    localStorage.setItem('ideaBoard', JSON.stringify(existingIdeas));

    // Submit to main flow
    handleIdeaSubmit(newIdea.description, { title: newIdea.title, keywords });
    
    toast.success('Idea added successfully');
    setNewIdea({ title: '', description: '', keywords: '' });
    setShowNewIdeaDialog(false);
  };

  const handleArchiveIdea = (id: string) => {
    const ideas = JSON.parse(localStorage.getItem('ideaBoard') || '[]');
    const updated = ideas.map((idea: Idea) => 
      idea.id === id ? { ...idea, status: 'archived', updatedAt: new Date() } : idea
    );
    localStorage.setItem('ideaBoard', JSON.stringify(updated));
    toast.success('Idea archived');
  };

  const handleDeleteIdea = (id: string) => {
    const ideas = JSON.parse(localStorage.getItem('ideaBoard') || '[]');
    const updated = ideas.filter((idea: Idea) => idea.id !== id);
    localStorage.setItem('ideaBoard', JSON.stringify(updated));
    toast.success('Idea deleted');
  };

  const toggleCompareSelect = (id: string) => {
    if (selectedIdeas.includes(id)) {
      setSelectedIdeas(selectedIdeas.filter(i => i !== id));
    } else if (selectedIdeas.length < 3) {
      setSelectedIdeas([...selectedIdeas, id]);
    } else {
      toast.error('You can compare up to 3 ideas at once');
    }
  };

  const startComparison = () => {
    if (selectedIdeas.length < 2) {
      toast.error('Select at least 2 ideas to compare');
      return;
    }
    setCompareMode(true);
  };

  const storedIdeas = JSON.parse(localStorage.getItem('ideaBoard') || '[]');
  const activeIdeas = storedIdeas.filter((idea: Idea) => idea.status === 'active');
  const archivedIdeas = storedIdeas.filter((idea: Idea) => idea.status === 'archived');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Idea Board
              </CardTitle>
              <CardDescription>Manage, refine, and compare your startup ideas</CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedIdeas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startComparison}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare ({selectedIdeas.length})
                </Button>
              )}
              <Dialog open={showNewIdeaDialog} onOpenChange={setShowNewIdeaDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Idea
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Idea</DialogTitle>
                    <DialogDescription>
                      Capture your startup idea and we'll help you validate it
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Give your idea a memorable name"
                        value={newIdea.title}
                        onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your idea in detail..."
                        rows={4}
                        value={newIdea.description}
                        onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                      <Input
                        id="keywords"
                        placeholder="e.g., healthcare, AI, SaaS, mobile"
                        value={newIdea.keywords}
                        onChange={(e) => setNewIdea({ ...newIdea, keywords: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewIdeaDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddIdea}>
                      Add Idea
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Active Ideas */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Active Ideas</h3>
              {activeIdeas.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No ideas yet. Add your first idea to get started!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeIdeas.map((idea: Idea) => (
                    <div
                      key={idea.id}
                      className={`p-4 border rounded-lg transition-all ${
                        selectedIdeas.includes(idea.id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {compareMode && (
                              <input
                                type="checkbox"
                                checked={selectedIdeas.includes(idea.id)}
                                onChange={() => toggleCompareSelect(idea.id)}
                                className="rounded"
                              />
                            )}
                            <h4 className="font-semibold">{idea.title}</h4>
                            {idea.score && (
                              <Badge variant="secondary">Score: {idea.score}/100</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{idea.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {idea.keywords.map((keyword, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                          {idea.insights && (
                            <div className="mt-3 text-xs text-muted-foreground space-y-1">
                              {idea.insights.marketSize && <p>Market: {idea.insights.marketSize}</p>}
                              {idea.insights.competition && <p>Competition: {idea.insights.competition}</p>}
                              {idea.insights.potential && <p>Potential: {idea.insights.potential}</p>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button size="icon" variant="ghost" onClick={() => setEditingIdea(idea)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleArchiveIdea(idea.id)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteIdea(idea.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Ideas */}
            {archivedIdeas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Archived Ideas</h3>
                <div className="grid gap-2">
                  {archivedIdeas.map((idea: Idea) => (
                    <div key={idea.id} className="p-3 border rounded-lg opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{idea.title}</h4>
                          <p className="text-xs text-muted-foreground">{idea.description.substring(0, 100)}...</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            const ideas = JSON.parse(localStorage.getItem('ideaBoard') || '[]');
                            const updated = ideas.map((i: Idea) => 
                              i.id === idea.id ? { ...i, status: 'active', updatedAt: new Date() } : i
                            );
                            localStorage.setItem('ideaBoard', JSON.stringify(updated));
                            toast.success('Idea restored');
                          }}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compare Mode */}
      {compareMode && selectedIdeas.length >= 2 && (
        <IdeaComparison 
          ideaIds={selectedIdeas}
          ideas={storedIdeas}
          onClose={() => {
            setCompareMode(false);
            setSelectedIdeas([]);
          }}
        />
      )}
    </div>
  );
}

function IdeaComparison({ ideaIds, ideas, onClose }: { ideaIds: string[]; ideas: Idea[]; onClose: () => void }) {
  const selectedIdeas = ideas.filter(idea => ideaIds.includes(idea.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Idea Comparison</CardTitle>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedIdeas.map((idea) => (
            <div key={idea.id} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{idea.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{idea.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium">{idea.score || 'Not evaluated'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Keywords:</span>
                  <span className="font-medium">{idea.keywords.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{new Date(idea.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}