import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Download, Lock, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCORE_LABEL, BRAND } from '@/branding';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface ShareableReportCardProps {
  ideaTitle: string;
  score: number;
  marketSize?: string;
  insights: string[];
  isPaid?: boolean;
  showBranding?: boolean;
}

export function ShareableReportCard({ 
  ideaTitle, 
  score, 
  marketSize,
  insights,
  isPaid = false,
  showBranding = true
}: ShareableReportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scoreColor = score >= 80 ? 'text-green-600 dark:text-green-400' : 
                     score >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                     'text-orange-600 dark:text-orange-400';

  const exportAsImage = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `${BRAND}-report-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Image exported!",
        description: "Your report card has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${BRAND}-report-${Date.now()}.pdf`);
      
      toast({
        title: "PDF exported!",
        description: "Your pitch deck slide has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const shareOnTwitter = () => {
    const text = `My idea scored ${score} on ${BRAND}! 🧠\n\n"${ideaTitle}"\n\nIdeas with scores over 80 have a 3x higher chance of success. What's your score?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareOnReddit = () => {
    const text = `My idea scored ${score} on ${BRAND}! Check out this market validation tool`;
    const url = `https://reddit.com/submit?title=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(url, '_blank', 'width=800,height=600');
  };

  const copyShareText = () => {
    const text = `My idea scored ${score} on ${BRAND}! 🧠\n\n"${ideaTitle}"\n\nIdeas with scores over 80 have a 3x higher chance of success.\n\nValidate your idea at ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Share text copied to clipboard.",
    });
  };

  return (
    <div className="space-y-4">
      {/* Shareable Card */}
      <div 
        ref={cardRef}
        className={cn(
          "bg-gradient-to-br from-background to-accent/5 rounded-xl p-8 border-2 border-primary/20 shadow-2xl",
          !showBranding && "p-12"
        )}
      >
        {/* Header */}
        <div className="text-center space-y-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            {ideaTitle}
          </h2>
          
          {/* Score Badge */}
          <div className="flex flex-col items-center gap-2">
            <div className={cn("text-7xl font-black", scoreColor)}>
              {score}
            </div>
            <Badge variant="default" className="text-lg px-4 py-1">
              {SCORE_LABEL}
            </Badge>
          </div>
        </div>

        {/* Market Size */}
        {marketSize && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Estimated Market Size</p>
            <p className="text-2xl font-bold text-foreground">{marketSize}</p>
          </div>
        )}

        {/* Top Insights */}
        {insights.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-foreground text-center">Key Insights</h3>
            {insights.slice(0, 2).map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-card/50 p-3 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{idx + 1}</span>
                </div>
                <p className="text-sm text-foreground flex-1">{insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Branding Footer */}
        {showBranding && (
          <div className="border-t border-border/50 pt-4 mt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🧠</span>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">{BRAND}</p>
                <p className="text-xs">Validate your ideas at smoothbrains.app</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Motivation Message */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <p className="text-center text-sm text-foreground">
          {score >= 80 ? (
            <span className="font-semibold">🎉 Outstanding! Ideas with scores over 80 have a 3x higher chance of success.</span>
          ) : score >= 60 ? (
            <span>Ideas with scores over 60 show strong potential. Keep refining!</span>
          ) : (
            <span>Every great idea starts somewhere. Use these insights to improve!</span>
          )}
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Share your {SCORE_LABEL} and inspire other founders
        </p>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Social Sharing */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shareOnTwitter}
            className="gap-2"
          >
            <Twitter className="w-4 h-4" />
            <span className="hidden sm:inline">Twitter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareOnLinkedIn}
            className="gap-2"
          >
            <Linkedin className="w-4 h-4" />
            <span className="hidden sm:inline">LinkedIn</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={shareOnReddit}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Reddit</span>
          </Button>
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={exportAsImage}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Image
          </Button>
          <Button
            variant="secondary"
            onClick={exportAsPDF}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Pitch Deck Slide
          </Button>
        </div>

        {/* Copy Share Text */}
        <Button
          variant="outline"
          onClick={copyShareText}
          className="w-full gap-2"
        >
          <Share2 className="w-4 h-4" />
          Copy Bragging Rights Text
        </Button>

        {/* Upsell for Free Users */}
        {!isPaid && (
          <Card className="p-4 bg-gradient-to-r from-accent/10 to-primary/10 border-primary/30">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Want clean, unbranded reports?
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to remove {BRAND} branding and unlock professional exports for pitches and presentations.
                </p>
                <Button size="sm" className="w-full mt-2">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
