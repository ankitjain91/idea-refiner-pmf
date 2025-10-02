/**
 * Summarizes a query to 5-7 words for optimal scraper API performance
 */
export function summarizeQuery(query: string): string {
  // Remove special characters and extra spaces
  const cleaned = query.replace(/[^\\w\\s]/g, ' ').replace(/\\s+/g, ' ').trim();
  
  // Split into words
  const words = cleaned.split(' ');
  
  // If already 5-7 words, return as is
  if (words.length >= 5 && words.length <= 7) {
    return cleaned;
  }
  
  // If less than 5 words, return as is (don't pad)
  if (words.length < 5) {
    return cleaned;
  }
  
  // If more than 7 words, we need to summarize
  // Priority words to keep (in order of importance)
  const priorityKeywords = [
    'market', 'size', 'competitors', 'funding', 'revenue', 'growth',
    'trends', 'analysis', 'forecast', 'statistics', 'demographics',
    'benchmarks', 'risks', 'regulations', 'sentiment', 'news',
    'alternatives', 'similar', 'TAM', 'SAM', 'SOM', 'CAC', 'LTV'
  ];
  
  // Extract the main subject (usually first 1-3 words that aren't common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const subjectWords = words.slice(0, 5).filter(w => !commonWords.has(w.toLowerCase())).slice(0, 3);
  
  // Find priority keywords in the query
  const foundKeywords = words.filter(w => 
    priorityKeywords.includes(w.toLowerCase())
  ).slice(0, 4); // Take max 4 keywords
  
  // Combine subject + keywords
  let summarized = [...new Set([...subjectWords, ...foundKeywords])];
  
  // If still too long, take first 7 words
  if (summarized.length > 7) {
    summarized = summarized.slice(0, 7);
  }
  
  // If too short after deduplication, add some context words
  if (summarized.length < 5 && words.length >= 5) {
    const additionalWords = words.filter(w => 
      !summarized.includes(w) && !commonWords.has(w.toLowerCase())
    );
    summarized = [...summarized, ...additionalWords.slice(0, 5 - summarized.length)];
  }
  
  return summarized.join(' ');
}
