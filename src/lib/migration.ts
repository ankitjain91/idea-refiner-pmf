/**
 * Migration utility to cleanup old localStorage keys on app initialization
 */

export const runMigrations = () => {
  console.log('[Migration] Running localStorage cleanup...');
  
  // Old idea-related keys that are no longer used
  const oldKeys = [
    'dashboardIdea',
    'currentIdea', 
    'userIdea',
    'ideaText',
    'pmfCurrentIdea',
    'dashboardConversationHistory'
  ];
  
  let cleanedCount = 0;
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`[Migration] Cleaned up ${cleanedCount} old localStorage keys`);
  }
};
