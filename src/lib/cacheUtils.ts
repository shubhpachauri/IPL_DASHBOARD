/**
 * Cache Management Utilities for IPL Dashboard
 * Provides centralized cache invalidation and management functions
 */

import { mutate } from 'swr';
import { swrKeys } from '@/configs/swrConfig';

// Types for cache parameters
interface MatchesParams {
  status?: string;
  limit?: number;
}

interface PointsTableParams {
  sort?: string;
  order?: string;
}

interface ScheduleParams {
  matchType?: string;
  team?: string;
  venue?: string;
  fromDate?: string;
  toDate?: string;
}

type CacheParams = MatchesParams | PointsTableParams | ScheduleParams;

// Cache invalidation utility
export const cacheUtils = {
  // Clear all SWR caches
  clearAllSWRCache: async () => {
    try {
      await Promise.all([
        mutate(swrKeys.matches(), undefined, false),
        mutate(swrKeys.matches('live'), undefined, false),
        mutate(swrKeys.matches('upcoming'), undefined, false),
        mutate(swrKeys.pointsTable(), undefined, false),
        mutate(swrKeys.schedule(), undefined, false),
      ]);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear SWR cache:', error);
      return { success: false, error };
    }
  },

  // Revalidate all SWR caches
  revalidateAllSWRCache: async () => {
    try {
      await Promise.all([
        mutate(swrKeys.matches()),
        mutate(swrKeys.matches('live')),
        mutate(swrKeys.matches('upcoming')),
        mutate(swrKeys.pointsTable()),
        mutate(swrKeys.schedule()),
      ]);
      return { success: true };
    } catch (error) {
      console.error('Failed to revalidate SWR cache:', error);
      return { success: false, error };
    }
  },

  // Clear specific endpoint cache
  clearEndpointCache: async (endpoint: 'matches' | 'points-table' | 'schedule', params?: CacheParams) => {
    try {
      let key: string;
      switch (endpoint) {
        case 'matches':
          const matchParams = params as MatchesParams;
          key = swrKeys.matches(matchParams?.status, matchParams?.limit);
          break;
        case 'points-table':
          const pointsParams = params as PointsTableParams;
          key = swrKeys.pointsTable(pointsParams?.sort, pointsParams?.order);
          break;
        case 'schedule':
          const scheduleParams = params as ScheduleParams;
          key = swrKeys.schedule(scheduleParams);
          break;
        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      await mutate(key, undefined, false);
      return { success: true };
    } catch (error) {
      console.error(`Failed to clear cache for ${endpoint}:`, error);
      return { success: false, error };
    }
  },

  // Get cache key for debugging
  getCacheKey: (endpoint: 'matches' | 'points-table' | 'schedule', params?: CacheParams) => {
    switch (endpoint) {
      case 'matches':
        const matchParams = params as MatchesParams;
        return swrKeys.matches(matchParams?.status, matchParams?.limit);
      case 'points-table':
        const pointsParams = params as PointsTableParams;
        return swrKeys.pointsTable(pointsParams?.sort, pointsParams?.order);
      case 'schedule':
        const scheduleParams = params as ScheduleParams;
        return swrKeys.schedule(scheduleParams);
      default:
        return null;
    }
  },

  // Check if data is stale
  isDataStale: (timestamp: string, maxAgeInSeconds: number = 300) => {
    const dataTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    return (now - dataTime) > (maxAgeInSeconds * 1000);
  },

  // Generate cache busting timestamp
  getCacheBustingTimestamp: () => Date.now().toString(),

  // Create force refresh URL with cache busting
  createForceRefreshUrl: (baseUrl: string, additionalParams?: Record<string, string>) => {
    const url = new URL(baseUrl, process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com'
      : 'http://localhost:3000'
    );
    
    url.searchParams.set('refresh', 'true');
    url.searchParams.set('_t', cacheUtils.getCacheBustingTimestamp());
    
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  },
};

// Cache debugging utilities
export const cacheDebug = {
  // Log cache status
  logCacheStatus: (endpoint: string, data: unknown, timestamp?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🗂️ Cache Status - ${endpoint}`);
      console.log('Data exists:', !!data);
      console.log('Timestamp:', timestamp || 'N/A');
      if (timestamp) {
        console.log('Age (seconds):', Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
        console.log('Is stale (>5min):', cacheUtils.isDataStale(timestamp, 300));
      }
      console.groupEnd();
    }
  },

  // Log force refresh operation
  logForceRefresh: (endpoint: string, success: boolean, error?: Error | unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔄 Force Refresh - ${endpoint}`);
      console.log('Success:', success);
      if (error) {
        console.error('Error:', error);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  },
};

// React hook for cache management
export const useCacheManagement = () => {
  const forceRefreshEndpoint = async (endpoint: 'matches' | 'points-table' | 'schedule', params?: CacheParams) => {
    try {
      // Step 1: Clear SWR cache
      await cacheUtils.clearEndpointCache(endpoint, params);
      
      // Step 2: Trigger server refresh
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Force refresh failed: ${response.status}`);
      }
      
      // Step 3: Revalidate cache
      const key = cacheUtils.getCacheKey(endpoint, params);
      if (key) {
        await mutate(key);
      }
      
      cacheDebug.logForceRefresh(endpoint, true);
      return { success: true, data: await response.json() };
    } catch (error) {
      cacheDebug.logForceRefresh(endpoint, false, error);
      return { success: false, error };
    }
  };

  const clearAllCache = async () => {
    return await cacheUtils.clearAllSWRCache();
  };

  const revalidateAllCache = async () => {
    return await cacheUtils.revalidateAllSWRCache();
  };

  return {
    forceRefreshEndpoint,
    clearAllCache,
    revalidateAllCache,
    cacheUtils,
    cacheDebug,
  };
};
