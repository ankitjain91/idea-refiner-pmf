import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/EnhancedAuthContext';
import { LS_KEYS } from '@/lib/storage-keys';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, ShieldAlert, Sparkles } from 'lucide-react';
import AIInsightChat from '@/components/dashboard/AIInsightChat';
import { cn } from '@/lib/utils';

// Simplified AI-driven dashboard (legacy panels removed)
const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<{ idea: string; metadata: any } | null>(null);
  const [planNonce, setPlanNonce] = useState<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const analysisCompleted = localStorage.getItem(LS_KEYS.analysisCompleted) === 'true';
    const idea = localStorage.getItem(LS_KEYS.userIdea);
    const metaRaw = localStorage.getItem(LS_KEYS.ideaMetadata);
    if (!analysisCompleted || !idea || !metaRaw) {
      navigate('/ideachat', { replace: true });
      return;
    }
    try {
      const metadata = JSON.parse(metaRaw);
      setAnalysis({ idea, metadata });
      setReady(true);
    } catch {
      navigate('/ideachat', { replace: true });
    }
  }, [loading, user, navigate]);

  // Redirect unauthenticated
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !ready) {
    return <div className='min-h-screen flex items-center justify-center'><Loader2 className='h-6 w-6 animate-spin text-primary' /></div>;
  }
  if (!user || !analysis) return null;

  const { idea, metadata } = analysis;

  const handleReturn = () => {
    try { localStorage.setItem('returnToChat','1'); } catch {}
    navigate('/ideachat');
  };

  const pmfScore = metadata?.pmfScore || metadata?.meta?.pmfScore || 0;
  const competitors = (metadata?.competitors || []).length;
  const refinements = (metadata?.refinements || []).length;

  return (
    <div className='min-h-screen flex w-full bg-background/40 backdrop-fade'>
      <AppSidebar />
      <div className='flex-1 flex flex-col h-screen'>
        <div className='flex items-center justify-between px-6 py-4 border-b glass-super-surface'>
          <div className='space-y-1'>
            <h1 className='text-lg font-semibold flex items-center gap-2'><Brain className='h-5 w-5 text-primary' /> Insight Dashboard</h1>
            <p className='text-xs text-muted-foreground line-clamp-1'>AI exploration workspace for: <span className='font-medium'>{idea}</span></p>
          </div>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' onClick={handleReturn}>Return to Chat</Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <div className='flex-1 grid xl:grid-cols-3 gap-4 p-4 auto-rows-min'>
          <div className='space-y-4 xl:col-span-1'>
            <div className='grid grid-cols-3 gap-3'>
              <MetricCard label='PMF Score' value={pmfScore} accent='from-emerald-500 to-emerald-600' />
              <MetricCard label='Competitors' value={competitors} accent='from-violet-500 to-violet-600' />
              <MetricCard label='Refinements' value={refinements} accent='from-cyan-500 to-cyan-600' />
            </div>
            <FocusPanel metadata={metadata} onAskPlan={() => setPlanNonce(Date.now())} />
          </div>
          <div className='xl:col-span-2 flex flex-col min-h-[520px]'>
            <AIInsightChat idea={idea} metadata={metadata} planTrigger={planNonce} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

const MetricCard: React.FC<{ label: string; value: number|string; accent: string }> = ({ label, value, accent }) => (
  <div className={cn('rounded-xl p-3 bg-gradient-to-br text-white shadow-sm flex flex-col gap-1', accent)}>
    <span className='text-[10px] uppercase tracking-wide opacity-80 font-medium'>{label}</span>
    <span className='text-xl font-semibold tabular-nums'>{value}</span>
  </div>
);

const FocusPanel: React.FC<{ metadata: any; onAskPlan?: () => void }> = ({ metadata, onAskPlan }) => {
  const refinements = (metadata?.refinements || []).slice(0,5);
  const scoreBreakdown = metadata?.scoreBreakdown || {};
  const weakest: { k: string; v: number }[] = Object.entries(scoreBreakdown as Record<string, any>)
    .sort((a, b) => ((a[1] as number)||0) - ((b[1] as number)||0))
    .slice(0, 2)
    .map(([k, v]) => ({ k, v: (typeof v === 'number' ? v : Number(v) || 0) }));
  return (
    <div className='rounded-xl border glass-super-surface p-4 space-y-4'>
      <h2 className='text-xs font-semibold uppercase tracking-wide flex items-center gap-2 text-muted-foreground'><ShieldAlert className='h-4 w-4 text-amber-500' /> Priority Focus</h2>
      {weakest.length === 0 && refinements.length === 0 && <p className='text-xs text-muted-foreground'>No focus items detected.</p>}
      {weakest.length > 0 && (
        <div>
          <p className='text-[11px] font-medium mb-1'>Weakest Areas</p>
          <ul className='text-xs space-y-1 list-disc ml-4'>
            {weakest.map((w) => (<li key={w.k}>{w.k}: <span className='font-medium'>{w.v}</span></li>))}
          </ul>
        </div>
      )}
      {refinements.length > 0 && (
        <div>
          <p className='text-[11px] font-medium mb-1'>Suggested Improvements</p>
          <ul className='text-xs space-y-1 list-disc ml-4'>
            {refinements.map((r:any,i:number)=>(<li key={i}>{r.title || r.heading || r.name}</li>))}
          </ul>
        </div>
      )}
      <div className='pt-1'>
        <Button size='sm' variant='secondary' className='h-7 px-2 gap-1 text-[11px]' onClick={onAskPlan}>
          <Sparkles className='h-3.5 w-3.5 text-primary' /> Ask AI for Plan
        </Button>
      </div>
    </div>
  );
};