import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { revalidateTag } from 'next/cache';
import { PointsEntry } from '@/types';

const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3001';

/**
 * GET /api/points-table - Fetch current IPL points table
 * Query parameters:
 * - sort: "position" | "points" | "nrr" | "wins" (default: "position")
 * - order: "asc" | "desc" (default: "asc" for position, "desc" for others)
 * - refresh: force refresh data from scraper service
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'position';
    const order = searchParams.get('order') || (sortBy === 'position' ? 'asc' : 'desc');
    const refresh = searchParams.get('refresh') === 'true';

    // Fetch data from scraper service
    const scraperUrl = new URL('/api/points-table', SCRAPER_SERVICE_URL);
    if (refresh) {
      scraperUrl.searchParams.set('refresh', 'true');
    }

    const scraperResponse = await fetch(scraperUrl.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!scraperResponse.ok) {
      throw new Error(`Scraper service responded with status: ${scraperResponse.status}`);
    }

    const scraperResult = await scraperResponse.json();

    if (!scraperResult.success) {
      throw new Error(`Scraper service error: ${scraperResult.error}`);
    }

    const pointsTableData: PointsEntry[] = scraperResult.data;

    // Sort the data based on query parameters
    const sortedData = [...pointsTableData];
    
    sortedData.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'points':
        case 'pts':
          comparison = a.points - b.points;
          break;
        case 'nrr':
          comparison = a.netRunRate - b.netRunRate;
          break;
        case 'wins':
          comparison = a.wins - b.wins;
          break;
        case 'played':
          comparison = a.played - b.played;
          break;
        case 'position':
        default:
          comparison = a.position - b.position;
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    // Calculate additional statistics
    const avgPointsPerTeam = sortedData.reduce((acc, team) => acc + team.points, 0) / sortedData.length;

    const responseData = {
      pointsTable: sortedData,
      statistics: {
        totalTeams: sortedData.length,
        totalMatches:74,
        averagePointsPerTeam: Math.round(avgPointsPerTeam * 100) / 100,
        topTeam: sortedData.find(team => team.position === 1),
        bottomTeam: sortedData.find(team => team.position === sortedData.length)
      },
      sortedBy: sortBy,
      order: order
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
          'Cache-Control': 'public, max-age=60, s-maxage=120', // Points table changes less frequently
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

    // SWR-optimized cache headers for points table
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=600');
    response.headers.set('Vary', 'Accept-Encoding');
    response.headers.set('X-Data-Freshness', 'fresh');
    response.headers.set('X-Cache-Strategy', 'swr-optimized');
    response.headers.set('Next-Cache-Tags', 'points-table,ipl-data');

    return response;

  } catch (error) {
    console.error('Error fetching points table:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch points table data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/points-table - Force refresh points table data
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
      body: JSON.stringify({ type: 'points' }),
      signal: AbortSignal.timeout(60000),
    });

    if (!scraperResponse.ok) {
      throw new Error(`Scraper service responded with status: ${scraperResponse.status}`);
    }

    const scraperResult = await scraperResponse.json();
    
    if (!scraperResult.result.success) {
      throw new Error(`Scraper service error: ${scraperResult.result.error}`);
    }

    const pointsTableData: PointsEntry[] = scraperResult.result.data;

    // Revalidate cache tags
    revalidateTag('points-table');
    revalidateTag('ipl-data');

    const apiResponse = NextResponse.json({
      success: true,
      message: 'Points table data refreshed successfully',
      data: {
        totalTeams: pointsTableData.length,
        topTeam: pointsTableData.find((team: PointsEntry) => team.position === 1)?.team || 'Unknown',
        lastUpdated: new Date().toISOString(),
        refreshedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Proper cache headers for force refresh
    apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    apiResponse.headers.set('Pragma', 'no-cache');
    apiResponse.headers.set('Expires', '0');
    apiResponse.headers.set('X-Data-Freshness', 'force-refreshed');
    // Remove or update ETag to ensure cache invalidation
    apiResponse.headers.set('ETag', `"force-refresh-${Date.now()}"`);
    
    return apiResponse;
  } catch (error) {
    console.error('Error refreshing points table data:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh points table data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
