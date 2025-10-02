/**
 * Utility functions for formatting data
 */

/**
 * Formats a value as currency with appropriate suffix (K, M, B, T)
 */
export function formatMoney(value: number | string | undefined): string {
  if (value === undefined || value === null) return '$0';
  
  // If it's already formatted, return as is
  if (typeof value === 'string' && value.includes('$')) {
    return value;
  }
  
  // Convert to number if string
  let num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  
  if (isNaN(num)) return '$0';
  
  const isNegative = num < 0;
  num = Math.abs(num);
  
  // Format based on size
  if (num >= 1e12) {
    return `${isNegative ? '-' : ''}$${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${isNegative ? '-' : ''}$${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${isNegative ? '-' : ''}$${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${isNegative ? '-' : ''}$${(num / 1e3).toFixed(1)}K`;
  } else {
    return `${isNegative ? '-' : ''}$${num.toFixed(0)}`;
  }
}

/**
 * Formats a value as percentage
 */
export function formatPercent(value: number | string | undefined): string {
  if (value === undefined || value === null) return '0%';
  
  // If it's already formatted, return as is
  if (typeof value === 'string' && value.includes('%')) {
    return value;
  }
  
  // Convert to number if string
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  
  if (isNaN(num)) return '0%';
  
  // Cap percentage between -100 and 100
  const capped = Math.max(-100, Math.min(100, num));
  
  return `${capped.toFixed(1)}%`;
}

/**
 * Formats a large number with appropriate suffix
 */
export function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0';
  
  const isNegative = value < 0;
  const num = Math.abs(value);
  
  if (num >= 1e12) {
    return `${isNegative ? '-' : ''}${(num / 1e12).toFixed(1)}T`;
  } else if (num >= 1e9) {
    return `${isNegative ? '-' : ''}${(num / 1e9).toFixed(1)}B`;
  } else if (num >= 1e6) {
    return `${isNegative ? '-' : ''}${(num / 1e6).toFixed(1)}M`;
  } else if (num >= 1e3) {
    return `${isNegative ? '-' : ''}${(num / 1e3).toFixed(1)}K`;
  } else {
    return `${isNegative ? '-' : ''}${num.toFixed(num < 10 ? 1 : 0)}`;
  }
}

/**
 * Validates and sanitizes chart data to prevent display issues
 */
export function sanitizeChartData(charts: any[]): any[] {
  if (!Array.isArray(charts)) return [];
  
  return charts.map((chart: any) => {
    if (!chart) return chart;
    
    const sanitizedChart = { ...chart };
    
    // Fix line charts with exponential growth projections
    if (chart.type === 'line' && Array.isArray(chart.series)) {
      sanitizedChart.series = chart.series.map((point: any, index: number) => {
        if (!point || typeof point.value !== 'number') return point;
        
        // Cap growth at reasonable yearly rates (max 50% per year)
        if (index > 0 && chart.series[index - 1]?.value) {
          const prevValue = chart.series[index - 1].value;
          const maxGrowth = prevValue * 1.5; // 50% max growth
          
          // Also cap at $10T absolute maximum
          const cappedValue = Math.min(point.value, maxGrowth, 10e12);
          
          if (point.value !== cappedValue) {
            return {
              ...point,
              value: cappedValue,
              label: formatMoney(cappedValue)
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
  
  const sanitized: any = { ...data };
  
  // Auto-build metrics array for common tiles when not provided
  if (!Array.isArray(sanitized.metrics) || sanitized.metrics.length === 0) {
    const metrics: any[] = [];

    // Sentiment metrics (supports multiple shapes)
    const s = sanitized.socialSentiment || sanitized.sentiment || sanitized.data?.socialSentiment || null;
    if (s && (s.positive !== undefined && s.negative !== undefined && s.neutral !== undefined)) {
      const pos = Number(s.positive) || 0;
      const neg = Number(s.negative) || 0;
      const neu = Number(s.neutral) || 0;
      const mentions = Number(s.mentions ?? sanitized.mentions ?? 0) || 0;
      const trend = s.trend || sanitized.trend;

      metrics.push(
        { name: 'Positive', value: Math.round(pos), unit: '%', explanation: 'Share of positive mentions' },
        { name: 'Neutral', value: Math.round(neu), unit: '%', explanation: 'Neutral share of mentions' },
        { name: 'Negative', value: Math.round(neg), unit: '%', explanation: 'Share of negative mentions' },
      );
      if (mentions) metrics.push({ name: 'Total Mentions', value: mentions, unit: '', explanation: 'Estimated mentions across platforms' });
      if (trend) metrics.push({ name: 'Trend', value: trend, unit: '', explanation: 'Momentum of sentiment' });
    }

    // Competition metrics (supports competitive-landscape shape)
    const cRoot = sanitized.data?.topCompetitors ? sanitized.data : sanitized.competitiveAnalysis || sanitized;
    const topCompetitors = Array.isArray(cRoot?.topCompetitors) ? cRoot.topCompetitors : undefined;
    if (topCompetitors && topCompetitors.length > 0) {
      const top = topCompetitors[0];
      const shareNum = typeof top.marketShare === 'number' 
        ? top.marketShare 
        : parseFloat(String(top.marketShare || '').replace(/[^0-9.]/g, ''));

      if (top?.name) {
        metrics.push({ 
          name: 'Top Competitor', 
          value: top.name, 
          unit: typeof shareNum === 'number' && !isNaN(shareNum) ? `(${Math.round(shareNum)}%)` : '',
          explanation: 'Largest player by market share'
        });
      }
      metrics.push({ name: 'Competitors', value: topCompetitors.length, unit: '', explanation: 'Notable competitors identified' });
      if (cRoot.marketConcentration) metrics.push({ name: 'Market Concentration', value: cRoot.marketConcentration, unit: '', explanation: 'Fragmented vs consolidated' });
      if (cRoot.barrierToEntry) metrics.push({ name: 'Barrier to Entry', value: cRoot.barrierToEntry, unit: '', explanation: 'Estimated difficulty to enter' });
    }

    if (metrics.length && (!sanitized.metrics || (Array.isArray(sanitized.metrics) && sanitized.metrics.length === 0))) {
      sanitized.metrics = metrics;
    }
  }
  
  // Sanitize metrics
  if (Array.isArray(sanitized.metrics)) {
    // Clamp percentage-like values where relevant
    sanitized.metrics = sanitized.metrics.map((m: any) => {
      if (!m) return m;
      const metric = { ...m };
      if (metric.unit === '%' && typeof metric.value === 'number') {
        metric.value = Math.max(-100, Math.min(100, metric.value));
      }
      return metric;
    });
  } else if (sanitized.metrics) {
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