// SWR Configuration for IPL Dashboard

export const swrConfig = {
  default: {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
    loadingTimeout: 30000,
    focusThrottleInterval: 5000,
  },
  
  matches: {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    dedupingInterval: 3000,
    refreshWhenHidden: true,
    refreshWhenOffline: false,
  },
  
  pointsTable: {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  },
  
  schedule: {
    refreshInterval: 120000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  },
};

// API endpoint configurations
export const apiEndpoints = {
  matches: '/api/matches',
  pointsTable: '/api/points-table',
  schedule: '/api/schedule',
} as const;

// SWR keys for consistent cache management
export const swrKeys = {
  matches: (status?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (limit && limit !== 10) params.append('limit', limit.toString());
    const query = params.toString();
    return `${apiEndpoints.matches}${query ? `?${query}` : ''}`;
  },
  
  pointsTable: (sort?: string, order?: string) => {
    const params = new URLSearchParams();
    if (sort && sort !== 'position') params.append('sort', sort);
    if (order && order !== 'asc') params.append('order', order);
    const query = params.toString();
    return `${apiEndpoints.pointsTable}${query ? `?${query}` : ''}`;
  },
  
  schedule: (filters?: {
    matchType?: string;
    team?: string;
    venue?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.matchType) params.append('matchType', filters.matchType);
    if (filters?.team) params.append('team', filters.team);
    if (filters?.venue) params.append('venue', filters.venue);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    const query = params.toString();
    return `${apiEndpoints.schedule}${query ? `?${query}` : ''}`;
  },
} as const;

// Custom fetcher with error handling
export const apiConfig = {
  fetcher: async (url: string) => {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = new Error('API request failed');
      throw error;
    }

    return response.json();
  },

  forceRefresh: async (endpoint: string) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Force refresh failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error: unknown) {
      console.error('Force refresh failed:', error);
      throw error;
    }
  },
};

// Utility functions for SWR management
export const swrUtils = {
  getMatchesRefreshInterval: (hasLiveMatches: boolean) => {
    return hasLiveMatches ? 10000 : 30000;
  },

  isDataStale: (timestamp: string, maxAgeInSeconds: number) => {
    const dataTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return (now - dataTime) > (maxAgeInSeconds * 1000);
  },

  getConditionalConfig: (dataFreshness: 'fresh' | 'stale' | 'unknown') => {
    switch (dataFreshness) {
      case 'fresh':
        return { refreshInterval: 60000 };
      case 'stale':
        return { refreshInterval: 10000 };
      default:
        return swrConfig.default;
    }
  },
};