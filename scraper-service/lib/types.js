// Configuration and constants for the IPL scraper service

export const URLS = {
  MATCHES: 'https://www.iplt20.com/matches',
  POINTS_TABLE: 'https://www.iplt20.com/points-table/men',
};

// ...existing code...
export const DEFAULT_CONFIG = {
  headless: true, // Changed from true to false
  timeout: 30000, // Increased from 20000 to 30000
  delay: 5000, // Increased from 2000 to 5000
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', // Changed to Windows user agent
  viewport: {
    width: 1920, // Increased from 1280
    height: 1080 // Increased from 720
  },
  retries: 3 // Added retries property
};
// ...existing code...
// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  maxMemoryUsage: 512 * 1024 * 1024, // 512MB
  maxExecutionTime: 120000, // 2 minutes
  gcInterval: 30000, // 30 seconds
};

// Cache configuration
export const CACHE_CONFIG = {
  schedule: {
    ttl: 1800, // 30 minutes
    maxSize: 5
  },
  points: {
    ttl: 3600, // 1 hour
    maxSize: 3
  },
  combined: {
    ttl: 1800, // 30 minutes
    maxSize: 3
  }
};

export const SELECTORS = {
  MATCH_CONTAINER: '.panel',
  MATCH_DETAILS: '.panel-body',
  TEAM_NAMES: '.team-name',
  MATCH_TYPE: '.match-type',
  DATE_TIME: '.date-time',
  VENUE: '.venue',
  VERDICT: '.verdict',
  SCORE: '.score',
  POINTS_TABLE: '#pointsdata',
  POINTS_ROW: '#pointsdata tr'
};
