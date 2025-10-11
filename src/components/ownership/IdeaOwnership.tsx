import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Shield, 
  Lock, 
  CheckCircle, 
  Info, 
  Loader2, 
  Crown,
  FileText,
  Clock,
  Sparkles,
  Eye,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLedger } from '@/hooks/useLedger';
import { motion } from 'framer-motion';

interface IdeaOwnershipProps {
  ideaId: string;
  ideaText: string;
  className?: string;
  compact?: boolean;
}

export function IdeaOwnership({ ideaId, ideaText, className = '', compact = false }: IdeaOwnershipProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createOwnership, getOwnershipProof, loading } = useLedger();
  const [isOwned, setIsOwned] = useState(false);
  const [ownershipData, setOwnershipData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  // Check if idea is already owned on component mount
  useEffect(() => {
    checkOwnership();
  }, [ideaId]);

  const checkOwnership = async () => {
    const proof = await getOwnershipProof(ideaId);
    if (proof) {
      setIsOwned(true);
      setOwnershipData(proof);
    }
  };

  const handleClaimOwnership = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to claim ownership of this idea.',
        variant: 'destructive'
      });
      return;
    }

    setClaiming(true);
    try {
      const result = await createOwnership(ideaId, {
        idea_text: ideaText,
        claimed_at: new Date().toISOString(),
        metadata: {
          source: 'dashboard_claim',
          user_agent: navigator.userAgent
        }
      });

      if (result) {
        setIsOwned(true);
        setOwnershipData({
          ownership_token: result.token,
          proof_hash: result.proof
        });
        
        toast({
          title: 'Ownership Claimed!',
          description: 'This idea now belongs to you and is secured on the blockchain.',
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Failed to claim ownership:', error);
      toast({
        title: 'Ownership Claim Failed',
        description: 'Unable to claim ownership. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setClaiming(false);
    }
  };

  if (isOwned && ownershipData) {
    if (compact) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex items-center gap-3 text-sm text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-full border border-green-200 shadow-sm ${className}`}
        >
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-green-600" />
            <span className="font-medium">Idea Owned & Secured</span>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open('/owned-ideas', '_blank')}
            className="h-7 px-3 text-xs hover:bg-green-100 text-green-700 gap-1"
          >
            <Eye className="h-3 w-3" />
            View All
          </Button>
        </motion.div>
      );
    }

    return (
      <Card className={`border-green-200 bg-green-50/50 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Crown className="h-5 w-5" />
            Idea Owned
          </CardTitle>
          <CardDescription className="text-green-700">
            You are the verified owner of this idea
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Blockchain Secured</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Owned
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm text-green-700">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Ownership Token:</p>
                <p className="font-mono text-xs break-all">{ownershipData.ownership_token?.substring(0, 32)}...</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5" />
              <div>
                <p className="font-medium">Proof Hash:</p>
                <p className="font-mono text-xs break-all">{ownershipData.proof_hash?.substring(0, 32)}...</p>
              </div>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => window.open('/owned-ideas', '_blank')}
            className="w-full"
          >
            View All Owned Ideas
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex items-center gap-3 ${className}`}
        >
          <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-2 rounded-full border border-primary/20 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Your idea is ready!</span>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleClaimOwnership}
                disabled={claiming || loading || !user}
                variant="default"
                size="sm"
                className="gap-2 text-sm h-9 px-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg border-0"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Securing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Claim Ownership
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Secure Your Intellectual Property
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Cryptographically secure your idea on blockchain</li>
                  <li>• Get timestamped proof of creation</li>
                  <li>• Protection against plagiarism</li>
                  <li>• Transferable ownership rights</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Free for all users • Takes ~30 seconds
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          
          {!user && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              Sign in to claim
            </span>
          )}
        </motion.div>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`h-full ${className}`}
    >
      <Card className="h-full border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg"
          >
            <Crown className="h-8 w-8 text-white" />
          </motion.div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Own Your Innovation
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Transform your idea into a blockchain-secured intellectual property asset
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Benefits */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What You Get
            </h4>
            <div className="grid gap-3">
              {[
                { icon: Shield, title: "Blockchain Protection", desc: "Immutable proof of creation" },
                { icon: Clock, title: "Timestamp Verified", desc: "Legal precedence established" },
                { icon: Lock, title: "Anti-Plagiarism", desc: "Cryptographic security" },
                { icon: FileText, title: "Ownership Certificate", desc: "Transferable digital asset" }
              ].map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-white/5 border border-primary/10"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Process Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Quick Process
            </h4>
            <div className="space-y-2">
              {[
                "Generate cryptographic signature",
                "Register on blockchain ledger", 
                "Issue ownership certificate",
                "Activate protection rights"
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{step}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="pt-4"
          >
            <Button 
              onClick={handleClaimOwnership}
              disabled={claiming || loading || !user}
              className="w-full gap-3 h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg transition-all duration-200"
              size="lg"
            >
              {claiming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Securing Your Idea...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Claim Ownership • Free
                </>
              )}
            </Button>

            {!user && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center text-sm text-muted-foreground mt-3 p-3 bg-muted/30 rounded-lg"
              >
                🔐 Please sign in to secure your intellectual property
              </motion.p>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}