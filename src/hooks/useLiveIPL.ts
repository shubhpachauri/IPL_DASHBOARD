"use client";

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import { ScheduleEntry, PointsEntry, MatchSchedule } from '@/types';

// SWR Configuration (inline for now)
const swrConfig = {
  matches: {
    refreshInterval: 300000, // Auto-refresh every 5 minutes for live match data
    revalidateOnFocus: true, // Refetch data when user returns to the tab/window
    dedupingInterval: 3000, // Prevent duplicate requests within 3 seconds
    refreshWhenHidden: true, // Continue polling even when tab is not visible
    refreshWhenOffline: false, // Stop polling when user goes offline
  },
  pointsTable: {
    refreshInterval: 600000, // Auto-refresh every 10 mins for points table
    revalidateOnFocus: true, // Refetch when user focuses on the tab
    dedupingInterval: 10000, // Prevent duplicate requests within 10 seconds
    refreshWhenHidden: false, // Don't poll when tab is hidden (save resources)
    refreshWhenOffline: false, // Stop polling when offline
  },
  schedule: {
    refreshInterval: 120000, // Auto-refresh every 2 minutes for schedule 
    revalidateOnFocus: false, // Don't auto-refetch on focus (schedule changes less often)
    dedupingInterval: 30000, // Prevent duplicate requests within 30 seconds
    refreshWhenHidden: false, // Don't poll when tab is hidden
    refreshWhenOffline: false, // Stop polling when offline
  },
};

// SWR keys for consistent cache management
const swrKeys = {
  matches: (status?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (limit && limit !== 10) params.append('limit', limit.toString());
    const query = params.toString();
    return `/api/matches${query ? `?${query}` : ''}`;
  },
  
  pointsTable: (sort?: string, order?: string) => {
    const params = new URLSearchParams();
    if (sort && sort !== 'position') params.append('sort', sort);
    if (order && order !== 'asc') params.append('order', order);
    const query = params.toString();
    return `/api/points-table${query ? `?${query}` : ''}`;
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
    return `/api/schedule${query ? `?${query}` : ''}`;
  },
};

// Custom fetcher with error handling
const apiConfig = {
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
      // Add refresh=true query parameter to trigger server force refresh
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('refresh', 'true');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Force refresh failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Force refresh failed:', error);
      throw error;
    }
  },
};

// Types for API responses
interface MatchesResponse {
  matches: ScheduleEntry[];
  total: number;
  filtered: boolean;
  status: string;
}

interface PointsTableResponse {
  pointsTable: PointsEntry[];
  statistics: {
    totalTeams: number;
    totalMatches: number;
    averagePointsPerTeam: number;
    topTeam: PointsEntry | undefined;
    bottomTeam: PointsEntry | undefined;
  };
  sortedBy: string;
  order: string;
}

interface ScheduleResponse {
  schedule: MatchSchedule;
  summary: {
    totalMatches: number;
    completedMatches: number;
    upcomingMatches: number;
    matchTypes: string[];
    totalTeams: number;
    totalVenues: number;
    teams: string[];
    venues: string[];
  };
  filters: {
    matchType?: string;
    team?: string;
    venue?: string;
    fromDate?: string;
    toDate?: string;
  };
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  cache?: {
    etag: string;
    maxAge: number;
  };
}

// Main hook for live IPL data
export function useLiveIPL() {
  // Fetch live matches with aggressive polling
  const { 
    data: liveMatchesData, 
    error: liveMatchesError, 
    isLoading: liveMatchesLoading,
    mutate: mutateLiveMatches 
  } = useSWR<APIResponse<MatchesResponse>>(
    swrKeys.matches('live'),
    apiConfig.fetcher,
    {
      ...swrConfig.matches,
      refreshInterval: 10000, // 10 seconds for live matches
      refreshWhenHidden: true,
      refreshWhenOffline: false,
    }
  );

  // Fetch upcoming matches
  const { 
    data: upcomingMatchesData, 
    error: upcomingMatchesError,
    isLoading: upcomingMatchesLoading,
    mutate: mutateUpcomingMatches 
  } = useSWR<APIResponse<MatchesResponse>>(
    swrKeys.matches('upcoming', 5),
    apiConfig.fetcher,
    {
      ...swrConfig.matches,
      refreshInterval: 30000, // 30 seconds for upcoming
    }
  );

  // Fetch points table
  const { 
    data: pointsTableData, 
    error: pointsTableError,
    isLoading: pointsTableLoading,
    mutate: mutatePointsTable 
  } = useSWR<APIResponse<PointsTableResponse>>(
    swrKeys.pointsTable(),
    apiConfig.fetcher,
    swrConfig.pointsTable
  );

  // Fetch matches for the current season
  const { 
    data: matchesData, 
    error: matchesError,
    isLoading: matchesLoading,
    mutate: mutateMatches 
  } = useSWR<APIResponse<MatchesResponse>>(
    swrKeys.matches('all', 75), // Fetch all matches with a limit of 75
    apiConfig.fetcher,
    {
      ...swrConfig.matches,
      refreshInterval: 600000, // 1 minute for all matches
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  );

  // Extract data from responses
  const liveMatches = liveMatchesData?.data.matches || [];
  const upcomingMatches = upcomingMatchesData?.data.matches || [];
  const pointsTable = pointsTableData?.data.pointsTable || [];
  const statistics = pointsTableData?.data.statistics;
  const matches = matchesData?.data.matches || [];

  // Computed values
  const hasLiveMatches = liveMatches.length > 0;
  const isAnyLoading = liveMatchesLoading || upcomingMatchesLoading || pointsTableLoading || matchesLoading;
  const hasAnyError = liveMatchesError || upcomingMatchesError || pointsTableError || matchesError;

  // Force refresh all data
  const forceRefreshAll = useCallback(async () => {
    try {
      // Step 1: Clear SWR cache first
      await Promise.all([
        mutateLiveMatches(undefined, false), // Clear cache without revalidation
        mutateUpcomingMatches(undefined, false),
        mutatePointsTable(undefined, false),
      ]);
      
      // Step 2: Trigger force refresh on server
      await Promise.all([
        apiConfig.forceRefresh('/api/schedule'),
        apiConfig.forceRefresh('/api/points-table'),
      ]);
      
      // Step 3: Revalidate SWR cache with fresh data
      await Promise.all([
        mutateLiveMatches(),
        mutateUpcomingMatches(),
        mutatePointsTable(),
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Force refresh failed:', error);
      return { success: false, error };
    }
  }, [mutateLiveMatches, mutateUpcomingMatches, mutatePointsTable]);

  // Get data freshness info
  const dataFreshness = useMemo(() => {
    const now = Date.now();
    const liveTimestamp = liveMatchesData?.timestamp ? new Date(liveMatchesData.timestamp).getTime() : 0;
    const pointsTimestamp = pointsTableData?.timestamp ? new Date(pointsTableData.timestamp).getTime() : 0;
    
    const liveAge = (now - liveTimestamp) / 1000; // seconds
    const pointsAge = (now - pointsTimestamp) / 1000;
    
    return {
      live: liveAge < 30 ? 'fresh' : liveAge < 120 ? 'stale' : 'old',
      points: pointsAge < 120 ? 'fresh' : pointsAge < 300 ? 'stale' : 'old',
    };
  }, [liveMatchesData?.timestamp, pointsTableData?.timestamp]);

  return {
    // Live matches data
    liveMatches,
    hasLiveMatches,
    liveMatchesError,
    liveMatchesLoading,
    
    // Upcoming matches data
    upcomingMatches,
    upcomingMatchesError,
    upcomingMatchesLoading,
    
    // Points table data
    pointsTable,
    statistics,
    pointsTableError,
    pointsTableLoading,
    
    // matches data
    matches,

    // Combined states
    isLoading: isAnyLoading,
    hasError: hasAnyError,
    
    // Actions
    forceRefreshAll,
    mutateLiveMatches,
    mutateUpcomingMatches,
    mutatePointsTable,
    mutateMatches,

    // Meta information
    dataFreshness,
    lastUpdated: {
      live: liveMatchesData?.timestamp,
      points: pointsTableData?.timestamp,
    },
  };
}

// Hook for matches with flexible filtering
export function useMatches(status: 'live' | 'upcoming' | 'completed' | 'all' = 'all', limit = 10) {
  const refreshInterval = useMemo(() => {
    switch (status) {
      case 'live': return 10000; // 10 seconds
      case 'upcoming': return 30000; // 30 seconds
      case 'completed': return 60000; // 1 minute
      default: return 30000;
    }
  }, [status]);

  const { data, error, isLoading, mutate } = useSWR<APIResponse<MatchesResponse>>(
    swrKeys.matches(status, limit),
    apiConfig.fetcher,
    {
      ...swrConfig.matches,
      refreshInterval,
      refreshWhenHidden: status === 'live',
    }
  );

  const forceRefresh = useCallback(async () => {
    try {
      // Clear SWR cache first
      await mutate(undefined, false);
      
      // Trigger server refresh
      await apiConfig.forceRefresh('/api/schedule');
      
      // Revalidate with fresh data
      await mutate();
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  return {
    matches: data?.data.matches || [],
    total: data?.data.total || 0,
    filtered: data?.data.filtered || false,
    status: data?.data.status || status,
    error,
    isLoading,
    forceRefresh,
    mutate,
    lastUpdated: data?.timestamp,
  };
}

// Hook for points table with sorting
export function usePointsTable(sortBy: string = 'position', order: 'asc' | 'desc' = 'asc') {
  const { data, error, isLoading, mutate } = useSWR<APIResponse<PointsTableResponse>>(
    swrKeys.pointsTable(sortBy, order),
    apiConfig.fetcher,
    swrConfig.pointsTable
  );

  const forceRefresh = useCallback(async () => {
    try {
      // Clear SWR cache first
      await mutate(undefined, false);
      
      // Trigger server refresh
      await apiConfig.forceRefresh('/api/points-table');
      
      // Revalidate with fresh data
      await mutate();
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  return {
    pointsTable: data?.data.pointsTable || [],
    statistics: data?.data.statistics,
    sortedBy: data?.data.sortedBy || sortBy,
    order: data?.data.order || order,
    error,
    isLoading,
    forceRefresh,
    mutate,
    lastUpdated: data?.timestamp,
  };
}

// Hook for schedule with filtering
export function useSchedule(filters?: {
  matchType?: string;
  team?: string;
  venue?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR<APIResponse<ScheduleResponse>>(
    swrKeys.schedule(filters),
    apiConfig.fetcher,
    swrConfig.schedule
  );

  const forceRefresh = useCallback(async () => {
    try {
      // Clear SWR cache first
      await mutate(undefined, false);
      
      // Trigger server refresh
      await apiConfig.forceRefresh('/api/schedule');
      
      // Revalidate with fresh data
      await mutate();
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [mutate]);

  // Helper to get matches for a specific team
  const getTeamMatches = useCallback((teamName: string) => {
    if (!data?.data.schedule) return [];
    
    const allMatches: ScheduleEntry[] = [];
    Object.values(data.data.schedule).forEach(matches => {
      allMatches.push(...matches.filter(match => 
        match.teamA.toLowerCase().includes(teamName.toLowerCase()) ||
        match.teamB.toLowerCase().includes(teamName.toLowerCase())
      ));
    });
    
    return allMatches.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [data?.data.schedule]);

  // Helper to get matches by match type
  const getMatchesByType = useCallback((matchType: string) => {
    return data?.data.schedule[matchType] || [];
  }, [data?.data.schedule]);

  return {
    schedule: data?.data.schedule || {},
    summary: data?.data.summary,
    filters: data?.data.filters,
    error,
    isLoading,
    forceRefresh,
    mutate,
    lastUpdated: data?.timestamp,
    
    // Helper functions
    getTeamMatches,
    getMatchesByType,
    
    // Computed values
    totalMatches: data?.data.summary?.totalMatches || 0,
    completedMatches: data?.data.summary?.completedMatches || 0,
    upcomingMatches: data?.data.summary?.upcomingMatches || 0,
    teams: data?.data.summary?.teams || [],
    venues: data?.data.summary?.venues || [],
  };
}

// Hook for team-specific data
export function useTeamData(teamName: string) {
  const { matches: allMatches } = useMatches('all', 50);
  const { pointsTable } = usePointsTable();
  const { getTeamMatches } = useSchedule();

  const teamMatches = useMemo(() => {
    return allMatches.filter(match => 
      match.teamA.toLowerCase().includes(teamName.toLowerCase()) ||
      match.teamB.toLowerCase().includes(teamName.toLowerCase())
    );
  }, [allMatches, teamName]);

  const teamStanding = useMemo(() => {
    return pointsTable.find(team => 
      team.team.toLowerCase().includes(teamName.toLowerCase())
    );
  }, [pointsTable, teamName]);

  const teamSchedule = getTeamMatches(teamName);

  const teamStats = useMemo(() => {
    if (!teamStanding) return null;
    
    return {
      position: teamStanding.position,
      points: teamStanding.points,
      played: teamStanding.played,
      wins: teamStanding.wins,
      losses: teamStanding.losses,
      netRunRate: teamStanding.netRunRate,
      winPercentage: teamStanding.played > 0 ? (teamStanding.wins / teamStanding.played * 100).toFixed(1) : '0',
      recentForm: teamStanding.performanceHistory?.slice(-5) || [],
    };
  }, [teamStanding]);

  return {
    teamName,
    teamMatches,
    teamStanding,
    teamSchedule,
    teamStats,
    hasData: !!teamStanding,
  };
}

// Hook for tournament overview
export function useTournamentOverview() {
  const { hasLiveMatches, liveMatches } = useLiveIPL();
  const { pointsTable, statistics } = usePointsTable();
  const { summary } = useSchedule();

  const tournamentStats = useMemo(() => {
    const totalMatches = summary?.totalMatches || 0;
    const completedMatches = summary?.completedMatches || 0;
    
    return {
      totalTeams: statistics?.totalTeams || 0,
      totalMatches,
      completedMatches,
      upcomingMatches: summary?.upcomingMatches || 0,
      liveMatches: liveMatches.length,
      hasLiveMatches,
      
      // Progress percentage
      progressPercentage: totalMatches > 0 
        ? Math.round((completedMatches / totalMatches) * 100)
        : 0,
        
      // Top performers
      topTeam: pointsTable[0],
      topScorer: statistics?.topTeam, // This could be enhanced with player stats
      
      // Venues and match types
      totalVenues: summary?.totalVenues || 0,
      venues: summary?.venues || [],
    };
  }, [statistics, summary, liveMatches.length, hasLiveMatches, pointsTable]);

  return tournamentStats;
}