/**
 * Calculate PMF category based on score and metrics
 */
export function calculatePMFCategory(score: number): string {
  if (score >= 85) return "Market Leader";
  if (score >= 70) return "Strong Fit";
  if (score >= 55) return "Moderate Fit";
  if (score >= 40) return "Early Stage";
  if (score >= 25) return "Needs Work";
  return "High Risk";
}

/**
 * Get detailed PMF insights based on score and metrics
 */
export function getPMFInsights(score: number, metrics?: any): {
  category: string;
  trend: number;
  recommendation: string;
} {
  const category = calculatePMFCategory(score);
  
  // Calculate trend based on metrics
  let trend = 0;
  if (metrics) {
    const growth = metrics.growth || 0;
    const sentiment = metrics.sentiment || 0;
    const demand = metrics.demand || 0;
    
    // Trend is positive if growth indicators are strong
    if (growth > 70 && sentiment > 60 && demand > 60) {
      trend = 1;
    } else if (growth < 40 || sentiment < 40 || demand < 40) {
      trend = -1;
    }
  }
  
  // Generate contextual recommendation
  let recommendation = "";
  if (score >= 70) {
    recommendation = "Your idea shows strong product-market fit. Focus on scaling and capturing market share.";
  } else if (score >= 50) {
    recommendation = "Moderate fit detected. Consider refining your value proposition and targeting specific customer segments.";
  } else {
    recommendation = "Early indicators suggest more validation needed. Focus on customer discovery and problem-solution fit.";
  }
  
  return { category, trend, recommendation };
}