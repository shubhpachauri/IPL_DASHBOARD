import { NextRequest, NextResponse } from 'next/server';
import { ScheduleEntry, MatchSchedule } from '@/types';
import { createHash } from 'crypto';

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001';

/**
 * GET /api/schedule - Fetch complete IPL tournament schedule
 * Query parameters:
 * - matchType: specific match type filter (e.g., "Final", "Qualifier", "League")
 * - team: filter matches by team name
 * - venue: filter matches by venue
 * - fromDate: ISO date string to filter matches from this date onwards
 * - toDate: ISO date string to filter matches up to this date
 * - refresh: force refresh data from scraper service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchTypeFilter = searchParams.get('matchType');
    const teamFilter = searchParams.get('team');
    const venueFilter = searchParams.get('venue');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const refresh = searchParams.get('refresh') === 'true';

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

    const scheduleData: MatchSchedule = scraperResult.data;
    const filteredSchedule: MatchSchedule = {};

    // Process each match type
    Object.keys(scheduleData).forEach(matchType => {
      // Filter by match type if specified
      if (matchTypeFilter && !matchType.toLowerCase().includes(matchTypeFilter.toLowerCase())) {
        return;
      }

      let matches = scheduleData[matchType];

      // Apply filters
      if (teamFilter) {
        matches = matches.filter(match => 
          match.teamA.toLowerCase().includes(teamFilter.toLowerCase()) ||
          match.teamB.toLowerCase().includes(teamFilter.toLowerCase())
        );
      }

      if (venueFilter) {
        matches = matches.filter(match => 
          match.venue.toLowerCase().includes(venueFilter.toLowerCase())
        );
      }

      if (fromDate) {
        const fromDateTime = new Date(fromDate);
        matches = matches.filter(match => new Date(match.dateTime) >= fromDateTime);
      }

      if (toDate) {
        const toDateTime = new Date(toDate);
        matches = matches.filter(match => new Date(match.dateTime) <= toDateTime);
      }

      // Only include match type if there are matches after filtering
      if (matches.length > 0) {
        filteredSchedule[matchType] = matches;
      }
    });

    // Calculate summary statistics
    const allMatches: ScheduleEntry[] = [];
    Object.values(filteredSchedule).forEach(matches => {
      allMatches.push(...matches);
    });

    const completedMatches = allMatches.filter(match => match.verdict && match.verdict.trim() !== '');
    const upcomingMatches = allMatches.filter(match => !match.verdict || match.verdict.trim() === '');

    // Get unique teams and venues
    const teams = new Set<string>();
    const venues = new Set<string>();
    allMatches.forEach(match => {
      teams.add(match.teamA);
      teams.add(match.teamB);
      venues.add(match.venue);
    });

    const responseData = {
      schedule: filteredSchedule,
      summary: {
        totalMatches: allMatches.length,
        completedMatches: completedMatches.length,
        upcomingMatches: upcomingMatches.length,
        matchTypes: Object.keys(filteredSchedule),
        totalTeams: teams.size,
        totalVenues: venues.size,
        teams: Array.from(teams).sort(),
        venues: Array.from(venues).sort()
      },
      filters: {
        matchType: matchTypeFilter,
        team: teamFilter,
        venue: venueFilter,
        fromDate,
        toDate
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
          'Cache-Control': 'public, max-age=120, s-maxage=240', // Schedule changes less frequently
        }
      });
    }

    const response = NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      cache: {
        etag: etag,
        maxAge: 120
      }
    });

    // SWR-optimized cache headers for schedule
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=240, stale-while-revalidate=1200');
    response.headers.set('Vary', 'Accept-Encoding');
    response.headers.set('X-Data-Freshness', 'fresh');
    response.headers.set('X-Cache-Strategy', 'swr-optimized');

    return response;

  } catch (error) {
    console.error('Error fetching schedule:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch schedule data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/schedule - Force refresh schedule data
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
      message: 'Schedule data refreshed successfully',
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
    console.error('Error refreshing schedule data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh schedule data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
