export interface PageViewEvent {
  id: string;
  sessionId: string;
  path: string;
  referrer: string;
  timestamp: number;
}

export interface ScrollDropOffRecord {
  id: string;
  sessionId: string;
  targetId: string; // article id or page key
  targetTitle: string;
  maxScrollDepth: number; // 25, 50, 75, 100
  lastBlockId: string;
  lastBlockLabel: string;
  timeSpentSeconds: number;
  timestamp: number;
}

export interface DropOffFunnel {
  totalReaders: number;
  reached25: number;
  reached50: number;
  reached75: number;
  completed100: number;
}

export interface ExitBlockStatistic {
  blockId: string;
  blockLabel: string;
  exitCount: number;
  exitPercentage: number;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  totalArticles: number;
  totalContacts: number;
  funnel: DropOffFunnel;
  exitBlocks: ExitBlockStatistic[];
  dailyViews: Array<{ date: string; views: number }>;
}

