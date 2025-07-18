import { cache } from 'react';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com'
  : 'http://localhost:3000';

// Cache the data fetching functions to avoid duplicate requests during SSR
export const getMatches = cache(async (status: string = 'all', forceRefresh = false) => {
  try {
    const url = new URL(`${BASE_URL}/api/matches`);
    url.searchParams.set('status', status);
    if (forceRefresh) {
      url.searchParams.set('refresh', 'true');
      url.searchParams.set('_t', Date.now().toString()); // Cache busting
    }

    const response = await fetch(url.toString(), {
      next: forceRefresh ? { revalidate: 0 } : { revalidate: 30 },
      // Add cache busting headers for force refresh
      ...(forceRefresh && {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store' as RequestCache
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch matches:', error);
    return null;
  }
});

export const getPointsTable = cache(async (forceRefresh = false) => {
  try {
    const url = new URL(`${BASE_URL}/api/points-table`);
    if (forceRefresh) {
      url.searchParams.set('refresh', 'true');
      url.searchParams.set('_t', Date.now().toString()); // Cache busting
    }

    const response = await fetch(url.toString(), {
      next: forceRefresh ? { revalidate: 0 } : { revalidate: 60 },
      // Add cache busting headers for force refresh
      ...(forceRefresh && {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store' as RequestCache
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch points table:', error);
    return null;
  }
});

export const getSchedule = cache(async (forceRefresh = false) => {
  try {
    const url = new URL(`${BASE_URL}/api/schedule`);
    if (forceRefresh) {
      url.searchParams.set('refresh', 'true');
      url.searchParams.set('_t', Date.now().toString()); // Cache busting
    }

    const response = await fetch(url.toString(), {
      next: forceRefresh ? { revalidate: 0 } : { revalidate: 300 },
      // Add cache busting headers for force refresh
      ...(forceRefresh && {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store' as RequestCache
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch schedule:', error);
    return null;
  }
});

// Combined data fetcher for the dashboard
export const getDashboardData = cache(async (forceRefresh = false) => {
  try {
    const [matches, liveMatches, pointsTable, schedule] = await Promise.all([
      getMatches('all', forceRefresh),
      getMatches('live', forceRefresh),
      getPointsTable(forceRefresh),
      getSchedule(forceRefresh),
    ]);

    return {
      matches,
      liveMatches,
      pointsTable,
      schedule,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return null;
  }
});

// Add a non-cached version for force refresh scenarios
export const getDashboardDataFresh = async () => {
  try {
    // Use cache-busting parameters to force fresh data
    const timestamp = Date.now().toString();
    const [matches, liveMatches, pointsTable, schedule] = await Promise.all([
      fetch(`${BASE_URL}/api/matches?status=all&refresh=true&_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/matches?status=live&refresh=true&_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/points-table?refresh=true&_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/schedule?refresh=true&_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(r => r.json()),
    ]);

    return {
      matches,
      liveMatches,
      pointsTable,
      schedule,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch fresh dashboard data:', error);
    return null;
  }
};
