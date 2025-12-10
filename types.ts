// --- START OF FILE types.ts ---
export interface StatSnapshot {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  createdAt?: string; // Timestamp of creation
  timeRegistered?: string; // New field for specific time
  subscribers: number;
  videos: number;
  views: number;
}

export interface Competitor {
  id: string;
  channelName: string;
  influencerName: string;
  channelUrl: string;
  avatarUrl?: string; // Optional avatar URL
  customCategory?: string; // Nova coluna de categoria personalizada
  country: string;
  youtubeJoinDate: string; // ISO string
  registrationDate: string; // ISO string
  isMyChannel?: boolean;
  isHidden?: boolean;
  isPinned?: boolean; // New field for manual fixing
  snapshots: StatSnapshot[];
}

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface GrowthMetrics {
  period: Period;
  subscribers: number;
  views: number;
  videos: number;
}

export interface AIAnalysisResult {
  analysis: string;
  timestamp: number;
}