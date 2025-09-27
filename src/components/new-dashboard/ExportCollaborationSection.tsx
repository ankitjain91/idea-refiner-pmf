import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, FileDown, ListChecks } from 'lucide-react';

interface ExportCollaborationSectionProps {
  onExport?: () => void;
  onShare?: () => void;
  nextSteps?: string[];
}

export const ExportCollaborationSection: React.FC<ExportCollaborationSectionProps> = ({ onExport, onShare, nextSteps = [] }) => {
  return (
    <div className="grid md:grid-cols-12 gap-4">
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileDown className="h-4 w-4"/> Export</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">Generate a PDF-style snapshot for investors or stakeholders.</p>
          <Button size="sm" variant="outline" onClick={onExport}>Export Report</Button>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Share2 className="h-4 w-4"/> Share</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">Invite collaborators or share a read-only dashboard link.</p>
          <Button size="sm" variant="outline" onClick={onShare}>Share Dashboard</Button>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ListChecks className="h-4 w-4"/> Next Steps</CardTitle></CardHeader>
        <CardContent>
          {nextSteps.length===0 && <p className="text-xs text-muted-foreground">No roadmap suggestions yet.</p>}
          <ul className="text-[11px] space-y-1 list-disc pl-4">
            {nextSteps.map((n,i)=>(<li key={i}>{n}</li>))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
