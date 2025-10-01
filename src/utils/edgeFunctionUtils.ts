/**
 * Utility functions for handling edge function responses
 */

/**
 * Extracts data from edge function response, handling various nested structures
 * @param response - The response from supabase.functions.invoke
 * @param dataKey - Optional key to extract nested data (e.g., 'financials', 'market_size')
 * @returns The extracted data or null
 */
export function extractEdgeFunctionData(response: any, dataKey?: string): any {
  if (!response) return null;
  
  // If there's an error in the response, return null
  if (response.error) {
    console.error('Edge function error:', response.error);
    return null;
  }
  
  const data = response.data;
  if (!data) return null;
  
  // If no specific key is provided, try to intelligently extract the data
  if (!dataKey) {
    // If data has a 'success' field and another field, extract the other field
    if (data.success !== undefined && typeof data === 'object') {
      const keys = Object.keys(data).filter(k => k !== 'success' && k !== 'error');
      if (keys.length === 1) {
        return data[keys[0]];
      }
    }
    // Otherwise return the data as is
    return data;
  }
  
  // Extract nested data by key
  return data[dataKey] || data;
}

/**
 * Standardizes the response structure from edge functions
 * Ensures consistent data format across all components
 */
export function normalizeEdgeFunctionResponse(data: any, expectedStructure: Record<string, any>): any {
  if (!data) return expectedStructure;
  
  // Create a normalized object with all expected keys
  const normalized = { ...expectedStructure };
  
  // Copy over any matching keys from the data
  Object.keys(expectedStructure).forEach(key => {
    if (data[key] !== undefined) {
      normalized[key] = data[key];
    }
  });
  
  return normalized;
}
