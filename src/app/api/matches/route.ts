import { NextRequest, NextResponse } from 'next/server';
import { ScheduleEntry, MatchSchedule } from '@/types';
import { createHash } from 'crypto';
import { getMockDataByStatus, getAllMockData, shouldUseMockData, getFallbackMockData } from '@/stubs/mockDataUtils';

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001';

/**
 * GET /api/matches - Fetch IPL matches with various filters
 * Query parameters:
 * - status: filter by match status ('live', 'upcoming', 'completed')
 * - team: filter matches by team name
 * - venue: filter matches by venue
 * - matchType: specific match type filter (e.g., "Final", "Qualifier", "League")
 * - fromDate: ISO date string to filter matches from this date onwards
 * - toDate: ISO date string to filter matches up to this date
 * - limit: maximum number of matches to return
 * - refresh: force refresh data from scraper service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const teamFilter = searchParams.get('team');
    const venueFilter = searchParams.get('venue');
    const matchTypeFilter = searchParams.get('matchType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const refresh = searchParams.get('refresh') === 'true';

    let scheduleData: MatchSchedule;
    let usingMockData = false;

    // Check if we should use mock data or try to fetch from scraper service
    if (shouldUseMockData()) {
      scheduleData = statusFilter ? getMockDataByStatus(statusFilter) : getAllMockData();
      usingMockData = true;
    } else {
      try {
        // Fetch data from scraper service
        const scraperUrl = new URL('/api/schedule', SCRAPER_SERVICE_URL);
        if (refresh) {
          scraperUrl.searchParams.set('refresh', 'true');
        }

        const scraperResponse = await fetch(scraperUrl.toString(), {
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout
          signal: AbortSignal.timeout(30000),
        });

        if (!scraperResponse.ok) {
          throw new Error(`Scraper service responded with status: ${scraperResponse.status}`);
        }

        const scraperResult = await scraperResponse.json();

        if (!scraperResult.success) {
          throw new Error(`Scraper service error: ${scraperResult.error}`);
        }

        scheduleData = scraperResult.data;
      } catch (scraperError) {
        console.warn('Scraper service unavailable, falling back to mock data:', scraperError);
        scheduleData = getFallbackMockData(statusFilter || undefined);
        usingMockData = true;
      }
    }
    let allMatches: ScheduleEntry[] = [];

    // Flatten all matches from different match types
    Object.keys(scheduleData).forEach(matchType => {
      // Filter by match type if specified
      if (matchTypeFilter && !matchType.toLowerCase().includes(matchTypeFilter.toLowerCase())) {
        return;
      }

      const matches = scheduleData[matchType].map(match => ({
        ...match,
        matchType: matchType
      }));

      allMatches.push(...matches);
    });

    // Apply filters
    if (teamFilter) {
      allMatches = allMatches.filter(match => 
        match.teamA.toLowerCase().includes(teamFilter.toLowerCase()) ||
        match.teamB.toLowerCase().includes(teamFilter.toLowerCase())
      );
    }

    if (venueFilter) {
      allMatches = allMatches.filter(match => 
        match.venue.toLowerCase().includes(venueFilter.toLowerCase())
      );
    }

    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      allMatches = allMatches.filter(match => new Date(match.dateTime) >= fromDateTime);
    }

    if (toDate) {
      const toDateTime = new Date(toDate);
      allMatches = allMatches.filter(match => new Date(match.dateTime) <= toDateTime);
    }

    // Filter by status
    if (statusFilter) {
      const now = new Date();
      
      switch (statusFilter.toLowerCase()) {
        case 'live':
          allMatches = allMatches.filter(match => {
            const matchDate = new Date(match.dateTime);
            const timeDiff = now.getTime() - matchDate.getTime();
            const hoursFromStart = timeDiff / (1000 * 60 * 60);
            // Assume a match is live if it started within the last 4 hours and has no verdict yet
            return hoursFromStart >= 0 && hoursFromStart <= 4 && (!match.verdict || match.verdict.trim() === '');
          });
          break;
          
        case 'upcoming':
          allMatches = allMatches.filter(match => {
            const matchDate = new Date(match.dateTime);
            return matchDate > now && (!match.verdict || match.verdict.trim() === '');
          });
          break;
          
        case 'completed':
          allMatches = allMatches.filter(match => 
            match.verdict && match.verdict.trim() !== ''
          );
          break;
      }
    }

    allMatches.sort((a, b) => {
      const dateA = new Date(a.dateTime);
      const dateB = new Date(b.dateTime);
      
      if (statusFilter === 'completed') {
        return dateB.getTime() - dateA.getTime(); // Most recent first
      } else {
        return dateA.getTime() - dateB.getTime(); // Nearest first
      }
    });

    if (limit && limit > 0) {
      allMatches = allMatches.slice(0, limit);
    }


    const completedMatches = allMatches.filter(match => match.verdict && match.verdict.trim() !== '');
    const upcomingMatches = allMatches.filter(match => !match.verdict || match.verdict.trim() === '');
    const liveMatches = allMatches.filter(match => {
      const now = new Date();
      const matchDate = new Date(match.dateTime);
      const timeDiff = now.getTime() - matchDate.getTime();
      const hoursFromStart = timeDiff / (1000 * 60 * 60);
      return hoursFromStart >= 0 && hoursFromStart <= 4 && (!match.verdict || match.verdict.trim() === '');
    });

    const teams = new Set<string>();
    const venues = new Set<string>();
    allMatches.forEach(match => {
      teams.add(match.teamA);
      teams.add(match.teamB);
      venues.add(match.venue);
    });

    const responseData = {
      matches: allMatches,
      summary: {
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        upcomingMatches: upcomingMatches.length,
        liveMatches: liveMatches.length,
        totalTeams: teams.size,
        totalVenues: venues.size,
        teams: Array.from(teams).sort(),
        venues: Array.from(venues).sort()
      },
      filters: {
        status: statusFilter,
        team: teamFilter,
        venue: venueFilter,
        matchType: matchTypeFilter,
        fromDate,
        toDate,
        limit
      },
      meta: {
        usingMockData,
        dataSource: usingMockData ? 'mock' : 'scraper'
      }
    };

    // Generate ETag for SWR cache optimization
    const dataString = JSON.stringify(responseData);
    const etag = `"${createHash('md5').update(dataString).digest('hex')}"`;

    // Check for conditional request (ETag)
    const clientETag = request.headers.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=60, s-maxage=120', // Matches data changes more frequently
        }
      });
    }

    const response = NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      cache: {
        etag: etag,
        maxAge: 60
      }
    });

    // SWR-optimized cache headers for matches
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', usingMockData ? 'public, max-age=300, s-maxage=600' : 'public, max-age=60, s-maxage=120, stale-while-revalidate=600');
    response.headers.set('Vary', 'Accept-Encoding');
    response.headers.set('X-Data-Freshness', usingMockData ? 'mock' : 'fresh');
    response.headers.set('X-Cache-Strategy', 'swr-optimized');
    response.headers.set('X-Data-Source', usingMockData ? 'mock' : 'scraper');

    return response;

  } catch (error) {
    console.error('Error fetching matches:', error);
    
    // Fallback to mock data on error
    try {
      const { searchParams } = new URL(request.url);
      const statusFilter = searchParams.get('status');
      const scheduleData = statusFilter ? getMockDataByStatus(statusFilter) : getAllMockData();
      
      const allMatches: ScheduleEntry[] = [];
      Object.keys(scheduleData).forEach(matchType => {
        const matches = scheduleData[matchType].map(match => ({
          ...match,
          matchType: matchType
        }));
        allMatches.push(...matches);
      });

      return NextResponse.json({
        success: true,
        data: {
          matches: allMatches,
          summary: {
            totalMatches: allMatches.length,
            completedMatches: 0,
            upcomingMatches: allMatches.length,
            liveMatches: 0,
            totalTeams: 0,
            totalVenues: 0,
            teams: [],
            venues: []
          },
          meta: {
            usingMockData: true,
            dataSource: 'mock-fallback',
            error: 'Primary data source failed, using mock data'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch matches data',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        { status: 500 }
      );
    }
  }
}

/**
 * POST /api/matches - Force refresh matches data
 */
export async function POST() {
  try {
    // Force a fresh scrape via the scraper service
    const scraperUrl = new URL('/api/scrape', SCRAPER_SERVICE_URL);
    
    const scraperResponse = await fetch(scraperUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'schedule' }),
      signal: AbortSignal.timeout(60000), // Longer timeout for scraping
    });

    if (!scraperResponse.ok) {
      throw new Error(`Scraper service responded with status: ${scraperResponse.status}`);
    }

    const scraperResult = await scraperResponse.json();
    
    if (!scraperResult.result.success) {
      throw new Error(`Scraper service error: ${scraperResult.result.error}`);
    }

    const scheduleData: MatchSchedule = scraperResult.result.data;
    
    // Calculate summary for response
    const allMatches: ScheduleEntry[] = [];
    Object.values(scheduleData).forEach(matches => {
      allMatches.push(...(matches as ScheduleEntry[]));
    });

    const apiResponse = NextResponse.json({
      success: true,
      message: 'Matches data refreshed successfully',
      data: {
        totalMatches: allMatches.length,
        matchTypes: Object.keys(scheduleData),
        lastUpdated: new Date().toISOString(),
        refreshedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Clear cache on manual refresh for SWR
    apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    apiResponse.headers.set('X-Data-Freshness', 'force-refreshed');
    
    return apiResponse;

  } catch (error) {
    console.error('Error refreshing matches data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh matches data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
