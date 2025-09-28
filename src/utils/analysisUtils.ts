import { LS_KEYS } from '@/lib/storage-keys';

/**
 * Handle analysis ready event and prepare dashboard data
 */
export function handleAnalysisReady(
  idea: string, 
  metadata: any,
  navigate: (path: string) => void
) {
  // Store all necessary data for dashboard
  localStorage.setItem('pmfCurrentIdea', idea);
  localStorage.setItem(LS_KEYS.userIdea, idea);
  localStorage.setItem(LS_KEYS.userAnswers, JSON.stringify(metadata?.answers || {}));
  localStorage.setItem(LS_KEYS.ideaMetadata, JSON.stringify(metadata || {}));
  localStorage.setItem(LS_KEYS.analysisCompleted, 'true');
  
  try {
    // Upgrade existing grant (if any) or create new
    const raw = localStorage.getItem('dashboardAccessGrant');
    let grant: any = null;
    try { 
      grant = raw ? JSON.parse(raw) : null; 
    } catch { 
      grant = null; 
    }
    
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const newNonce = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    const sessionId = localStorage.getItem('currentSessionId') || null;
    const expiresMs = Date.now() + 10 * 60 * 1000; // 10 minute validity window
    
    const upgraded = {
      v: 1,
      state: 'granted',
      nonce: newNonce,
      sid: sessionId,
      ts: Date.now(),
      exp: expiresMs
    };
    
    localStorage.setItem('dashboardAccessGrant', JSON.stringify(upgraded));
  } catch {}
  
  if (metadata?.pmfAnalysis) {
    localStorage.setItem('pmfAnalysisData', JSON.stringify(metadata.pmfAnalysis));
  }
  
  // Notify and navigate
  try {
    window.dispatchEvent(new CustomEvent('analysis:completed', { detail: { idea, metadata } }));
  } catch {}
  
  navigate('/dashboard');
}