/**
 * Utility functions for formatting data into human-readable values
 */

/**
 * Formats a number into a human-readable money string
 */
export function formatMoney(value: number | string | undefined): string {
  if (!value && value !== 0) return '$0';
  
  let num: number;
  if (typeof value === 'string') {
    // Remove any existing formatting
    const cleaned = value.replace(/[^0-9.-]/g, '');
    num = parseFloat(cleaned);
    if (isNaN(num)) return '$0';
  } else {
    num = value;
  }
  
  // Handle negative values
  const negative = num < 0;
  num = Math.abs(num);
  
  let formatted: string;
  if (num >= 1e12) {
    formatted = `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    formatted = `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    formatted = `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    formatted = `${(num / 1e3).toFixed(1)}K`;
  } else {
    formatted = num.toFixed(0);
  }
  
  return `${negative ? '-' : ''}$${formatted}`;
}

/**
 * Formats a percentage value
 */
export function formatPercent(value: number | string | undefined): string {
  if (!value && value !== 0) return '0%';
  
  let num: number;
  if (typeof value === 'string') {
    // Extract first number from string (handles "12% CAGR" etc)
    const match = value.match(/(\d+\.?\d*)/);
    num = match ? parseFloat(match[1]) : 0;
  } else {
    num = value;
  }
  
  // Cap at reasonable ranges
  if (num > 100) num = 100;
  if (num < -100) num = -100;
  
  return `${num.toFixed(1)}%`;
}

/**
 * Formats large numbers into human-readable strings
 */
export function formatNumber(value: number | undefined): string {
  if (!value && value !== 0) return '0';
  
  const num = Math.abs(value);
  const negative = value < 0;
  
  let formatted: string;
  if (num >= 1e12) {
    formatted = `${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    formatted = `${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    formatted = `${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    formatted = `${(num / 1e3).toFixed(1)}K`;
  } else {
    formatted = num.toFixed(num < 10 ? 1 : 0);
  }
  
  return `${negative ? '-' : ''}${formatted}`;
}

/**
 * Sanitizes chart data to ensure human-readable values
 */
export function sanitizeChartData(charts: any[]): any[] {
  if (!Array.isArray(charts)) return [];
  
  return charts.map(chart => {
    if (!chart || !chart.series) return chart;
    
    const sanitizedChart = { ...chart };
    
    if (chart.type === 'line' && Array.isArray(chart.series)) {
      // Fix exponential growth projections
      sanitizedChart.series = chart.series.map((point: any, index: number) => {
        if (!point || typeof point.value !== 'number') return point;
        
        // Cap growth at reasonable yearly rates (max 50% per year)
        if (index > 0 && chart.series[index - 1]?.value) {
          const prevValue = chart.series[index - 1].value;
          const maxGrowth = prevValue * 1.5; // 50% max growth
          
          if (point.value > maxGrowth) {
            return {
              ...point,
              value: maxGrowth,
              label: formatMoney(maxGrowth)
            };
          }
        }
        
        // Fix scientific notation in labels
        return {
          ...point,
          label: formatMoney(point.value)
        };
      });
    } else if (chart.type === 'waterfall' && Array.isArray(chart.series)) {
      sanitizedChart.series = chart.series.map((point: any) => ({
        ...point,
        value: typeof point.value === 'number' ? 
          parseFloat(point.value.toFixed(1)) : point.value
      }));
    }
    
    return sanitizedChart;
  });
}

/**
 * Validates and sanitizes tile data
 */
export function sanitizeTileData(data: any): any {
  if (!data) return data;
  
  const sanitized = { ...data };
  
  // Sanitize metrics
  if (sanitized.metrics) {
    const metrics = { ...sanitized.metrics };
    
    // Fix monetary values
    ['tam', 'sam', 'som', 'revenue', 'arpu', 'cac', 'ltv'].forEach(key => {
      if (typeof metrics[key] === 'number' && metrics[key] > 1e15) {
        // Cap at reasonable values (max $10T)
        metrics[key] = Math.min(metrics[key], 10e12);
      }
    });
    
    // Fix growth rates (cap at 100% annual)
    if (typeof metrics.growthRate === 'number' && metrics.growthRate > 100) {
      metrics.growthRate = Math.min(metrics.growthRate, 100);
    }
    
    sanitized.metrics = metrics;
  }
  
  // Sanitize charts
  if (Array.isArray(sanitized.charts)) {
    sanitized.charts = sanitizeChartData(sanitized.charts);
  }
  
  // Sanitize JSON data
  if (sanitized.json) {
    const json = { ...sanitized.json };
    
    // Format monetary values in JSON
    ['TAM', 'SAM', 'SOM'].forEach(key => {
      if (json[key] && typeof json[key] === 'string') {
        // Extract number and reformat
        const num = parseFloat(json[key].replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) {
          json[key] = formatMoney(num * (json[key].includes('B') ? 1e9 : 
                                         json[key].includes('M') ? 1e6 :
                                         json[key].includes('T') ? 1e12 : 1));
        }
      }
    });
    
    sanitized.json = json;
  }
  
  return sanitized;
}