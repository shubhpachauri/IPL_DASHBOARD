"use client";

import React, { useEffect, useState } from 'react';
import { useLiveIPL } from '@/hooks/useLiveIPL';
import { useCacheManagement } from '@/lib/cacheUtils';
import { ScheduleEntry, PointsEntry } from '@/types';

interface ClientDashboardProps {
  initialData: {
    matches: unknown;
    pointsTable: unknown;
    schedule: unknown;
    lastUpdated: string;
  } | null;
}

// Helper function for consistent date formatting across server and client
const formatDate = (dateString: string | Date): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return String(dateString);
  }
};

export function ClientDashboard({ initialData }: ClientDashboardProps) {
  const [isClient, setIsClient] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const {
    forceRefreshAll,
    dataFreshness,
    lastUpdated,
    isLoading,
    liveMatches: liveMatchesFromHook,
    upcomingMatches: upcomingMatchesFromHook,
    pointsTable: pointsTableFromHook,
    statistics,
  } = useLiveIPL();
  
  const { cacheDebug } = useCacheManagement();

  // Auto-refresh every 30 seconds for live updates
  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(async () => {
      const result = await forceRefreshAll();
      if (result.success) {
        setLastRefreshTime(new Date().toISOString());
        cacheDebug.logCacheStatus('auto-refresh', true, new Date().toISOString());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [forceRefreshAll, cacheDebug]);

  const handleManualRefresh = async () => {
    const result = await forceRefreshAll();
    if (result.success) {
      setLastRefreshTime(new Date().toISOString());
      cacheDebug.logCacheStatus('manual-refresh', true, new Date().toISOString());
    } else {
      console.error('Manual refresh failed:', result.error);
    }
  };

  // Use live data from hook if available, otherwise fall back to initial data
  const currentData = (liveMatchesFromHook && liveMatchesFromHook.length > 0) || 
                     (pointsTableFromHook && pointsTableFromHook.length > 0) 
    ? {
        matches: { data: { matches: [] } }, // Hook doesn't provide general matches
        liveMatches: { data: { matches: liveMatchesFromHook || [] } },
        pointsTable: { 
          data: { 
            pointsTable: pointsTableFromHook || [], 
            statistics: statistics 
          } 
        },
        schedule: initialData?.schedule,
        lastUpdated: lastUpdated.live || lastUpdated.points || new Date().toISOString()
      }
    : initialData;
  
  if (!currentData) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          No Data Available
        </h2>
        <p className="text-red-600">
          Unable to load live data. Please try refreshing.
        </p>
      </div>
    );
  }

  // Helper function to clean team names (remove score info)
  const cleanTeamName = (teamName: string): string => {
    if (!teamName) return '';
    return teamName.replace(/\s+\d+\/\d+\s*\(\d+\.?\d*\s*OV\)/gi, '')
                   .replace(/\s+[A-Z]{2,4}\s+\d+\/\d+/gi, '') // Remove "LSG 227/3" patterns
                   .trim();
  };

  // Extract data from current source
  const matches = currentData?.matches;
  const liveMatchesData = currentData?.liveMatches;
  const pointsTable = currentData?.pointsTable;
  
  // Extract matches array from the API response structure
  const rawMatchesArray = matches?.data?.matches || [];
  const matchesArray = rawMatchesArray.map((match: ScheduleEntry) => ({
    ...match,
    teamA: cleanTeamName(match.teamA),
    teamB: cleanTeamName(match.teamB)
  }));

  const liveMatchesFromAPI = liveMatchesData?.data?.matches || [];
  const liveMatchesFiltered = matchesArray.filter((match: ScheduleEntry) => {
    if (!match.dateTime) return false;
    const now = new Date();
    const matchDate = new Date(match.dateTime);
    const timeDiff = now.getTime() - matchDate.getTime();
    const hoursFromStart = timeDiff / (1000 * 60 * 60);
    // Consider live if match started within the last 4 hours and no verdict yet
    return hoursFromStart >= 0 && hoursFromStart <= 4 && (!match.verdict || match.verdict.trim() === '');
  });
  
  // Use API live matches if available, otherwise use filtered matches, or hook data
  const liveMatches = liveMatchesFromAPI.length > 0 
    ? liveMatchesFromAPI.map((match: ScheduleEntry) => ({
        ...match,
        teamA: cleanTeamName(match.teamA),
        teamB: cleanTeamName(match.teamB)
      })) 
    : liveMatchesFromHook && liveMatchesFromHook.length > 0
      ? liveMatchesFromHook.map((match: ScheduleEntry) => ({
          ...match,
          teamA: cleanTeamName(match.teamA),
          teamB: cleanTeamName(match.teamB)
        }))
      : liveMatchesFiltered;
  
  const upcomingMatches = upcomingMatchesFromHook && upcomingMatchesFromHook.length > 0
    ? upcomingMatchesFromHook.map((match: ScheduleEntry) => ({
        ...match,
        teamA: cleanTeamName(match.teamA),
        teamB: cleanTeamName(match.teamB)
      }))
    : matchesArray.filter((match: ScheduleEntry) => {
        if (!match.dateTime) return false;
        const now = new Date();
        const matchDate = new Date(match.dateTime);
        return matchDate > now && !match.verdict;
      }) || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Live Updates Control Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            🔄 Live Updates
          </h3>
          <span className="text-xs text-blue-600 dark:text-blue-400 px-2 py-1 bg-blue-100 dark:bg-blue-800/50 rounded">
            Client-Side Hydrated
          </span>
        </div>
        
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
          <div>
            Data freshness: 
            <span className="font-medium ml-1">
              Live Matches: {dataFreshness.live}, Points Table: {dataFreshness.points}
            </span>
          </div>
          <div>
            Last updated: 
            <span className="font-medium ml-1">
              Live Matches: {lastUpdated.live ? new Date(lastUpdated.live).toLocaleString() : 'Not updated'}, 
              Points Table: {lastUpdated.points ? new Date(lastUpdated.points).toLocaleString() : 'Not updated'}
            </span>
          </div>
          
          {lastRefreshTime && (
            <div>
              Last manual refresh: 
              <span className="font-medium ml-1">
                {new Date(lastRefreshTime).toLocaleString()}
              </span>
            </div>
          )}
          
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Refreshing...' : 'Force Refresh'}
          </button>
        </div>
        
        <div className="text-xs text-blue-500 dark:text-blue-400 mt-3">
          💡 This section provides real-time updates on top of the SSR content bellow.
          Data is automatically refreshed. Points table :- 10 mins interval, Live matches :- 5 mins interval.
          {initialData && isClient && (
            <div className="mt-1">
              Server data loaded at: {new Date(initialData.lastUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Live Matches Section */}
      {liveMatches.length > 0 ? (
        <section className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-green-800 dark:text-green-200 mb-3 sm:mb-4 flex items-center">
            🔴 Live Matches ({liveMatches.length})
          </h2>
          <div className="grid gap-3 sm:gap-4">
            {liveMatches.map((match: ScheduleEntry, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-green-300 dark:border-green-600 shadow-sm hover:shadow-md transition-shadow touch-manipulation">
                <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{match.teamA} vs {match.teamB}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{match.venue}</div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1">{formatDate(match.dateTime)}</div>
                {((match.teamAStatus?.runs && match.teamAStatus.runs > 0) || (match.teamBStatus?.runs && match.teamBStatus.runs > 0)) && (
                  <div className="text-xs sm:text-sm font-medium mt-2 text-gray-900 dark:text-gray-100 break-all">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-green-600 dark:text-green-400">
                        {match.teamA}: {match.teamAStatus?.runs}/{match.teamAStatus?.wickets} ({match.teamAStatus?.overs})
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        {match.teamB}: {match.teamBStatus?.runs}/{match.teamBStatus?.wickets} ({match.teamBStatus?.overs})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-200 mb-3 sm:mb-4 flex items-center">
            ❌ No Live Matches Found
          </h2>
        </section>
      )}
      
      {/* Upcoming Matches Section */}
      {upcomingMatches.length > 0 && (
        <section className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-orange-800 dark:text-orange-200 mb-3 sm:mb-4">
            📅 Upcoming Matches ({upcomingMatches.length})
          </h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {upcomingMatches.slice(0, 6).map((match: ScheduleEntry, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-orange-300 dark:border-orange-600 shadow-sm hover:shadow-md transition-shadow touch-manipulation">
                <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{match.teamA} vs {match.teamB}</div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">{match.venue}</div>
                <div className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mt-1">{formatDate(match.dateTime)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Points Table Section */}
      {pointsTable?.data?.pointsTable && (
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 dark:text-blue-200 mb-3 sm:mb-4">📊 Points Table</h2>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-full inline-block align-middle px-3 sm:px-0">
              <table className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <thead className="bg-blue-100 dark:bg-blue-900/50">
                  <tr>
                    <th className="p-2 sm:p-3 text-left text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">Pos</th>
                    <th className="p-2 sm:p-3 text-left text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm min-w-[100px]">Team</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">P</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">W</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">L</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm hidden sm:table-cell">N/R</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm hidden md:table-cell">For</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm hidden md:table-cell">Against</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">Pts</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm">NRR</th>
                    <th className="p-2 sm:p-3 text-center text-gray-900 dark:text-gray-100 font-semibold text-xs sm:text-sm hidden lg:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTable.data.pointsTable.map((team: PointsEntry, index: number) => (
                    <tr key={index} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="p-2 sm:p-3 font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{team.position}</td>
                      <td className="p-2 sm:p-3 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium">{team.team}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{team.played}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{team.wins}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{team.losses}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell">{team.noResult}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">{team.for}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">{team.against}</td>
                      <td className="p-2 sm:p-3 text-center font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{team.points}</td>
                      <td className="p-2 sm:p-3 text-center text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{team.netRunRate.toFixed(3)}</td>
                      <td className="p-2 sm:p-3 text-center hidden lg:table-cell">
                        <div className="flex justify-center items-center gap-1 px-1">
                          {team.performanceHistory && team.performanceHistory.slice(-5).map((result, idx) => {
                            let bgColor, borderColor, title;
                            
                            switch(result) {
                              case 'W':
                                bgColor = 'bg-green-500';
                                borderColor = 'border-green-600';
                                title = 'Win';
                                break;
                              case 'L':
                                bgColor = 'bg-red-500';
                                borderColor = 'border-red-600';
                                title = 'Loss';
                                break;
                              case 'N':
                                bgColor = 'bg-gray-500';
                                borderColor = 'border-gray-600';
                                title = 'No Result/Draw';
                                break;
                              default:
                                bgColor = 'bg-gray-400';
                                borderColor = 'border-gray-500';
                                title = 'Unknown';
                            }
                            
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full shadow-sm transition-transform hover:scale-110 text-white ${bgColor} ${borderColor}`}
                                title={title}
                              >
                                {result}
                              </span>
                            );
                          })}
                          {(!team.performanceHistory || team.performanceHistory.length === 0) && (
                            <span className="text-gray-400 dark:text-gray-500 text-xs py-2">No data</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Statistics Section */}
      {pointsTable?.data?.statistics && (
        <section className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 sm:p-6 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold text-purple-800 dark:text-purple-200 mb-3 sm:mb-4">📈 Tournament Statistics</h2>
          
          {/* Overall Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-600 text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{pointsTable.data.statistics.totalTeams}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Teams</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-600 text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{pointsTable.data.statistics.totalMatches}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Matches</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-600 text-center col-span-2 md:col-span-1">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{pointsTable.data.statistics.averagePointsPerTeam}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Avg Points/Team</div>
            </div>
          </div>

          {/* Top and Bottom Teams */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {pointsTable.data.statistics.topTeam && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-700">
                <h3 className="text-base sm:text-lg font-semibold text-green-800 dark:text-green-200 mb-2 sm:mb-3 flex items-center">
                  🏆 Top Team
                </h3>
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl text-green-900 dark:text-green-100">{pointsTable.data.statistics.topTeam.team}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="text-gray-700 dark:text-gray-300">Position: <span className="font-semibold">{pointsTable.data.statistics.topTeam.position}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Points: <span className="font-semibold">{pointsTable.data.statistics.topTeam.points}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Played: <span className="font-semibold">{pointsTable.data.statistics.topTeam.played}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Won: <span className="font-semibold">{pointsTable.data.statistics.topTeam.wins}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Lost: <span className="font-semibold">{pointsTable.data.statistics.topTeam.losses}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">NRR: <span className="font-semibold">{pointsTable.data.statistics.topTeam.netRunRate.toFixed(3)}</span></div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recent Form:</div>
                    <div className="flex gap-1">
                      {pointsTable.data.statistics.topTeam.performanceHistory?.slice(-5).map((result: string, idx: number) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full text-white ${
                            result === 'W' ? 'bg-green-500' : result === 'L' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Team */}
            {pointsTable.data.statistics.bottomTeam && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 p-3 sm:p-4 rounded-lg border border-red-200 dark:border-red-700">
                <h3 className="text-base sm:text-lg font-semibold text-red-800 dark:text-red-200 mb-2 sm:mb-3 flex items-center">
                  📉 Bottom Team
                </h3>
                <div className="space-y-2">
                  <div className="font-bold text-lg sm:text-xl text-red-900 dark:text-red-100">{pointsTable.data.statistics.bottomTeam.team}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="text-gray-700 dark:text-gray-300">Position: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.position}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Points: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.points}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Played: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.played}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Won: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.wins}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">Lost: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.losses}</span></div>
                    <div className="text-gray-700 dark:text-gray-300">NRR: <span className="font-semibold">{pointsTable.data.statistics.bottomTeam.netRunRate.toFixed(3)}</span></div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Recent Form:</div>
                    <div className="flex gap-1">
                      {pointsTable.data.statistics.bottomTeam.performanceHistory?.slice(-5).map((result: string, idx: number) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full text-white ${
                            result === 'W' ? 'bg-green-500' : result === 'L' ? 'bg-red-500' : 'bg-gray-500'
                          }`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
