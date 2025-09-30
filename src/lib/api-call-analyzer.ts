/**
 * API Call Analyzer - Tracks and analyzes API calls across the application
 * This helps identify duplicate calls and optimization opportunities
 */

import { supabase } from '@/integrations/supabase/client';

interface APICallMetrics {
  endpoint: string;
  count: number;
  averageTime: number;
  lastCalled: Date;
  duplicationRate: number;
  errors: number;
  successRate: number;
}

interface ServiceMetrics {
  serviceName: string;
  totalCalls: number;
  duplicateCalls: number;
  failedCalls: number;
  apiKeys: string[];
  estimatedCost: number;
  recommendations: string[];
}

export class APICallAnalyzer {
  private static instance: APICallAnalyzer;
  private callHistory: Map<string, APICallMetrics> = new Map();
  private serviceMetrics: Map<string, ServiceMetrics> = new Map();
  private duplicateTracker: Map<string, number> = new Map();
  private callTimestamps: Map<string, Date[]> = new Map();

  private constructor() {
    this.initializeServiceMetrics();
  }

  static getInstance(): APICallAnalyzer {
    if (!APICallAnalyzer.instance) {
      APICallAnalyzer.instance = new APICallAnalyzer();
    }
    return APICallAnalyzer.instance;
  }

  private initializeServiceMetrics() {
    // Initialize metrics for all known services
    const services = [
      { name: 'reddit-sentiment', apiKey: 'REDDIT_CLIENT_ID', cost: 0.001 },
      { name: 'market-trends', apiKey: 'SERPER_API_KEY', cost: 0.005 },
      { name: 'google-trends', apiKey: 'SERPAPI_KEY', cost: 0.003 },
      { name: 'competition', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'hub-batch-data', apiKey: 'INTERNAL', cost: 0 },
      { name: 'gdelt-news', apiKey: 'PUBLIC', cost: 0 },
      { name: 'generate-recommendations', apiKey: 'LOVABLE_API_KEY', cost: 0.003 },
      { name: 'web-search-optimized', apiKey: 'TAVILY_API_KEY', cost: 0.004 },
      { name: 'market-size', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'generate-ai-insights', apiKey: 'LOVABLE_API_KEY', cost: 0.003 },
      { name: 'competitor-analysis', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'market-insights', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'growth-projections', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'web-search-profitability', apiKey: 'SERPER_API_KEY', cost: 0.005 },
      { name: 'launch-timeline', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'smoothbrains-score', apiKey: 'INTERNAL', cost: 0 },
      { name: 'user-engagement', apiKey: 'INTERNAL', cost: 0 },
      { name: 'sentiment', apiKey: 'OPENAI_API_KEY', cost: 0.002 },
      { name: 'generate-session-title', apiKey: 'OPENAI_API_KEY', cost: 0.001 },
      { name: 'generate-session-composite-name', apiKey: 'OPENAI_API_KEY', cost: 0.001 },
      { name: 'generate-session-name', apiKey: 'OPENAI_API_KEY', cost: 0.001 },
      { name: 'generate-analysis-suggestions', apiKey: 'OPENAI_API_KEY', cost: 0.001 },
    ];

    services.forEach(service => {
      this.serviceMetrics.set(service.name, {
        serviceName: service.name,
        totalCalls: 0,
        duplicateCalls: 0,
        failedCalls: 0,
        apiKeys: [service.apiKey],
        estimatedCost: service.cost,
        recommendations: []
      });
    });
  }

  /**
   * Track an API call
   */
  trackCall(endpoint: string, success: boolean = true, duration: number = 0) {
    const now = new Date();
    const key = this.generateCallKey(endpoint);
    
    // Update call history
    const existing = this.callHistory.get(key) || {
      endpoint,
      count: 0,
      averageTime: 0,
      lastCalled: now,
      duplicationRate: 0,
      errors: 0,
      successRate: 100
    };

    existing.count++;
    existing.averageTime = (existing.averageTime * (existing.count - 1) + duration) / existing.count;
    existing.lastCalled = now;
    
    if (!success) {
      existing.errors++;
    }
    existing.successRate = ((existing.count - existing.errors) / existing.count) * 100;

    this.callHistory.set(key, existing);

    // Track duplicates
    const timestamps = this.callTimestamps.get(key) || [];
    timestamps.push(now);
    
    // Check for duplicates within 5 seconds
    const recentCalls = timestamps.filter(t => 
      (now.getTime() - t.getTime()) < 5000
    );
    
    if (recentCalls.length > 1) {
      const duplicates = this.duplicateTracker.get(key) || 0;
      this.duplicateTracker.set(key, duplicates + 1);
      existing.duplicationRate = (duplicates + 1) / existing.count * 100;
    }

    this.callTimestamps.set(key, timestamps.slice(-100)); // Keep last 100 timestamps

    // Update service metrics
    const serviceName = this.extractServiceName(endpoint);
    const serviceMetric = this.serviceMetrics.get(serviceName);
    if (serviceMetric) {
      serviceMetric.totalCalls++;
      if (!success) serviceMetric.failedCalls++;
      if (recentCalls.length > 1) serviceMetric.duplicateCalls++;
    }
  }

  /**
   * Get comprehensive metrics report
   */
  getMetricsReport(): {
    summary: {
      totalAPICalls: number;
      uniqueEndpoints: number;
      totalDuplicates: number;
      averageDuplicationRate: number;
      totalErrors: number;
      estimatedTotalCost: number;
    };
    byService: ServiceMetrics[];
    byEndpoint: APICallMetrics[];
    recommendations: string[];
  } {
    const allMetrics = Array.from(this.callHistory.values());
    const serviceMetricsArray = Array.from(this.serviceMetrics.values());

    const totalCalls = allMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalDuplicates = Array.from(this.duplicateTracker.values()).reduce((sum, d) => sum + d, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);

    // Calculate estimated costs
    let estimatedTotalCost = 0;
    serviceMetricsArray.forEach(service => {
      estimatedTotalCost += service.totalCalls * service.estimatedCost;
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(allMetrics, serviceMetricsArray);

    return {
      summary: {
        totalAPICalls: totalCalls,
        uniqueEndpoints: this.callHistory.size,
        totalDuplicates,
        averageDuplicationRate: totalCalls > 0 ? (totalDuplicates / totalCalls) * 100 : 0,
        totalErrors,
        estimatedTotalCost
      },
      byService: serviceMetricsArray.sort((a, b) => b.totalCalls - a.totalCalls),
      byEndpoint: allMetrics.sort((a, b) => b.count - a.count),
      recommendations
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metrics: APICallMetrics[], 
    services: ServiceMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for high duplication rates
    metrics.forEach(metric => {
      if (metric.duplicationRate > 20) {
        recommendations.push(
          `⚠️ ${metric.endpoint} has ${metric.duplicationRate.toFixed(1)}% duplicate calls - implement caching`
        );
      }
    });

    // Check for services with high error rates
    services.forEach(service => {
      const errorRate = service.totalCalls > 0 
        ? (service.failedCalls / service.totalCalls) * 100 
        : 0;
      
      if (errorRate > 10) {
        recommendations.push(
          `❌ ${service.serviceName} has ${errorRate.toFixed(1)}% error rate - check API key and implementation`
        );
      }

      if (service.duplicateCalls > service.totalCalls * 0.3) {
        recommendations.push(
          `♻️ ${service.serviceName} has ${service.duplicateCalls} duplicate calls - use batching or caching`
        );
      }
    });

    // Check for expensive services
    const expensiveServices = services
      .filter(s => s.totalCalls * s.estimatedCost > 0.1)
      .sort((a, b) => (b.totalCalls * b.estimatedCost) - (a.totalCalls * a.estimatedCost));

    if (expensiveServices.length > 0) {
      recommendations.push(
        `💰 Top expensive services: ${expensiveServices.slice(0, 3).map(s => s.serviceName).join(', ')}`
      );
    }

    // General recommendations
    if (metrics.some(m => m.averageTime > 3000)) {
      recommendations.push('🐌 Some APIs are slow (>3s) - consider implementing loading states or parallel fetching');
    }

    if (services.filter(s => s.totalCalls > 0).length > 10) {
      recommendations.push('📊 Consider implementing a unified API gateway to batch multiple service calls');
    }

    return recommendations;
  }

  private generateCallKey(endpoint: string): string {
    return endpoint.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private extractServiceName(endpoint: string): string {
    // Extract service name from endpoint
    const match = endpoint.match(/functions\/v1\/([^\/\?]+)/);
    return match ? match[1] : endpoint;
  }

  /**
   * Log current metrics to console
   */
  logMetrics() {
    const report = this.getMetricsReport();
    
    console.group('📊 API Call Analysis Report');
    
    console.group('📈 Summary');
    console.table(report.summary);
    console.groupEnd();

    console.group('🔧 Services by Usage');
    console.table(
      report.byService
        .filter(s => s.totalCalls > 0)
        .map(s => ({
          Service: s.serviceName,
          'Total Calls': s.totalCalls,
          'Duplicate Calls': s.duplicateCalls,
          'Failed Calls': s.failedCalls,
          'API Key': s.apiKeys[0],
          'Est. Cost ($)': (s.totalCalls * s.estimatedCost).toFixed(4)
        }))
    );
    console.groupEnd();

    console.group('🎯 Top Endpoints');
    console.table(
      report.byEndpoint.slice(0, 10).map(e => ({
        Endpoint: e.endpoint.substring(0, 50),
        Calls: e.count,
        'Duplication %': e.duplicationRate.toFixed(1),
        'Avg Time (ms)': e.averageTime.toFixed(0),
        'Success %': e.successRate.toFixed(1)
      }))
    );
    console.groupEnd();

    console.group('💡 Recommendations');
    report.recommendations.forEach(rec => console.log(rec));
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.callHistory.clear();
    this.duplicateTracker.clear();
    this.callTimestamps.clear();
    this.initializeServiceMetrics();
  }
}

// Export singleton instance
export const apiCallAnalyzer = APICallAnalyzer.getInstance();