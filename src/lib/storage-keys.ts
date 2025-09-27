// Centralized localStorage key constants
export const LS_KEYS = {
  analysisBrief: 'pmf.analysis.brief',
  analysisBriefSuggestionsCache: 'pmf.analysis.briefSuggestionsCache',
  analysisCompleted: 'pmf.analysis.completed',
  pmfScore: 'pmf.analysis.score',
  ideaMetadata: 'pmf.analysis.metadata',
  currentSessionTitle: 'pmf.session.title',
  currentSessionId: 'pmf.session.id',
  returnToChat: 'pmf.ui.returnToChat',
  userIdea: 'pmf.user.idea',
  userAnswers: 'pmf.user.answers'
} as const;

// UI feature state keys (add new keys below cautiously to avoid collisions)
export const LS_UI_KEYS = {
  aiQnAToggleActive: 'pmf.ui.aiQnAToggleActive'
} as const;

export type StorageKey = typeof LS_KEYS[keyof typeof LS_KEYS];
