/**
 * Cleans and fixes corrupted idea text
 */
export function cleanIdeaText(idea: string | null | undefined): string {
  if (!idea) return "";
  
  // Fix common typos and corruptions
  let cleaned = idea
    .replace(/smopopthbrains/gi, "smoothbrains")
    .replace(/webiste/gi, "website")
    .replace(/thisi\s+current/gi, "this current")
    .replace(/refininf/gi, "refining")
    .replace(/capabiltities/gi, "capabilities")
    .replace(/thinkabout/gi, "think about")
    .trim();
  
  // If the text seems too corrupted, provide a fallback
  if (cleaned.length < 10 || cleaned.split(' ').length < 3) {
    return "AI-powered startup idea validation and analysis platform";
  }
  
  // Ensure proper capitalization
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Remove duplicate spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned;
}

/**
 * Updates all stored idea values with cleaned text
 */
export function cleanAllStoredIdeas(): void {
  const keys = ['dashboardIdea', 'currentIdea', 'userIdea', 'pmfCurrentIdea'];
  
  keys.forEach(key => {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      const cleaned = cleanIdeaText(storedValue);
      if (cleaned !== storedValue) {
        localStorage.setItem(key, cleaned);
        console.log(`[IdeaCleaner] Cleaned ${key}:`, cleaned.substring(0, 50));
      }
    }
  });
}