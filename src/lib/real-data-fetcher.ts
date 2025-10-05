import { SourceRef } from '@/types/pmfit-real-data';

export interface DataSourceResponse {
  status: 'ok' | 'degraded' | 'unavailable';
  reason?: string;
  raw: any;
  normalized: any;
  citations: SourceRef[];
  fetchedAtISO: string;
}

export class RealDataFetcher {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    // Use the actual Supabase project URL
    this.supabaseUrl = 'https://wppwfiiomxmnjyokxnin.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcHdmaWlvbXhtbmp5b2t4bmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzgwMzMsImV4cCI6MjA3NDMxNDAzM30.fZ9-3bEP9hSZRUIU27Pv5xwtZvXiG59dvh-1x92P7F8';
  }

  async searchWeb(query: string, recencyDays?: number): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/search-web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ query, recencyDays })
      });

      if (!response.ok) {
        console.error('Web search API error:', response.status);
        const error = await response.text();
        console.error('Error details:', error);
        return this.unavailable('Web search API error: ' + response.status);
      }

      const data = await response.json();
      console.log('Web search response:', data);
      return data;
    } catch (error) {
      console.error('Web search failed:', error);
      return this.unavailable('Web search failed: ' + String(error));
    }
  }

  async googleTrends(keyword: string, geo?: string, timeframe?: string): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/google-trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ idea: keyword, geo, timeframe })
      });

      if (!response.ok) {
        return this.unavailable('Google Trends API not configured');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('Google Trends fetch failed');
    }
  }

  async redditSearch(query: string, subreddits?: string[], sort?: string): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/reddit-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ query, subreddits, sort })
      });

      if (!response.ok) {
        return this.unavailable('Reddit API not configured');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('Reddit search failed');
    }
  }

  async youtubeSearch(q: string, timeframe?: string, max?: number): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/youtube-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ q, timeframe, max })
      });

      if (!response.ok) {
        return this.unavailable('YouTube API not configured');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('YouTube search failed');
    }
  }

  async twitterSearch(q: string, lang?: string, since?: string): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/twitter-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ q, lang, since })
      });

      if (!response.ok) {
        return this.unavailable('Twitter/X API not configured');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('Twitter search failed');
    }
  }

  async tiktokTrends(hashtags: string[]): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/tiktok-trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ hashtags })
      });

      if (!response.ok) {
        return this.unavailable('TikTok API not configured (partner API required)');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('TikTok trends fetch failed');
    }
  }

  async amazonPublic(query: string, category?: string): Promise<DataSourceResponse> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/amazon-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({ query, category })
      });

      if (!response.ok) {
        return this.unavailable('Amazon public data not available');
      }

      return await response.json();
    } catch (error) {
      return this.unavailable('Amazon search failed');
    }
  }

  async orchestrateDataCollection(idea: string, assumptions?: Record<string, any>) {
    // Parallel fetch all data sources
    const [search, trends, reddit, youtube, twitter, tiktok, amazon] = await Promise.all([
      this.searchWeb(`${idea} market competitors pricing`),
      this.googleTrends(idea),
      this.redditSearch(idea),
      this.youtubeSearch(idea),
      this.twitterSearch(idea),
      this.tiktokTrends([idea.replace(/\s+/g, '')]),
      this.amazonPublic(idea)
    ]);

    return {
      search,
      trends,
      reddit,
      youtube,
      twitter,
      tiktok,
      amazon
    };
  }

  private unavailable(reason: string): DataSourceResponse {
    return {
      status: 'unavailable',
      reason,
      raw: null,
      normalized: null,
      citations: [],
      fetchedAtISO: new Date().toISOString()
    };
  }
}