// Data Hub Types

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
  fetchedAt: string;
  relevanceScore: number;
}

export interface NewsItem {
  publisher: string;
  title: string;
}

export interface CompetitorData {
  name: string;
  website: string;
  description: string;
  features: string[];
  pricing: any[];
  foundedYear?: number;
  employees?: number;
  funding?: number;
  revenue?: number;
  score: number;
}

export interface ReviewData {
  source: string;
  rating: number;
  text: string;
  author: string;
  date: string;
  url: string;
}

export interface SocialData {
  platform: string;
  content: string;
  author: string;
  date: string;
  likes: number;
  engagement: number;
  sentiment: number;
}

export interface PriceData {
  source: string;
  price: number;
  unit: string;
  date: string;
}

export interface TrendsData {
  keyword: string;
  interestOverTime: { date: string; value: number }[];
  relatedQueries: string[];
  breakoutTerms: string[];
}