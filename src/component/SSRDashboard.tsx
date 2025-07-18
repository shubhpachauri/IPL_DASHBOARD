// SSR Dashboard Component
// This component runs on the server and pre-renders with data

import React from 'react';
import { getDashboardData } from '@/lib/serverDataFetcher';
import { ClientDashboard } from './ClientDashboard';
import { ScheduleEntry } from '@/types';

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

export async function SSRDashboard() {
  // Fetch data on the server
  const dashboardData = await getDashboardData();

  if (!dashboardData) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Failed to Load Dashboard Data
        </h2>
        <p className="text-red-600">
          Unable to fetch IPL data. Please try refreshing the page.
        </p>
      </div>
    );
  }

  const { matches, schedule, lastUpdated } = dashboardData;

  // Helper function to clean team names (remove score info)
  const cleanTeamName = (teamName: string): string => {
    if (!teamName) return '';
    return teamName.replace(/\s+\d+\/\d+\s*\(\d+\.?\d*\s*OV\)/gi, '')
                   .replace(/\s+[A-Z]{2,4}\s+\d+\/\d+/gi, '') // Remove "LSG 227/3" patterns
                   .trim();
  };

  
  // Extract schedule data and clean team names
  const rawScheduleData = schedule?.data?.schedule || {};
  const scheduleData = Object.keys(rawScheduleData).reduce((acc, matchType) => {
    acc[matchType] = rawScheduleData[matchType].map((match: ScheduleEntry) => ({
      ...match,
      teamA: cleanTeamName(match.teamA),
      teamB: cleanTeamName(match.teamB)
    }));
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);
  
  // Extract matches array from the API response structure for recent matches
  const rawMatchesArray = matches?.data?.matches || [];
  // Clean team names in matches data  
  const matchesArray = rawMatchesArray.map((match: ScheduleEntry) => ({
    ...match,
    teamA: cleanTeamName(match.teamA),
    teamB: cleanTeamName(match.teamB)
  }));
  
  const recentMatches = matchesArray.filter((match: ScheduleEntry) => {
    return match.verdict && match.verdict.trim() !== '';
  }) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hydrate with client-side functionality for real-time updates */}
        <ClientDashboard initialData={dashboardData} />
        {/* Server-rendered content */}
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>Last updated: {formatDate(lastUpdated)}</span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium inline-block w-fit">
              Server-Side Rendered
            </span>
          </div>
        </div>


        {/* Match Schedule Section */}
        {Object.keys(scheduleData).length > 0 && (
          <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3 sm:p-6 shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold text-indigo-800 dark:text-indigo-200 mb-3 sm:mb-4 flex items-center">
              🗓️ Tournament Schedule
            </h2>
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(scheduleData).map(([matchType, matches]) => (
                <div key={matchType} className="bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-600 p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center">
                    <span className="mr-2">
                      {matchType === 'FINAL' ? '🏆' : 
                       matchType === 'PLAYOFFS' ? '🎯' : 
                       matchType === 'LEAGUE' ? '⚔️' : '🏏'}
                    </span>
                    {matchType} ({(matches as ScheduleEntry[]).length} matches)
                  </h3>
                  <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-300 dark:scrollbar-thumb-indigo-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
                    <div className="grid gap-3 sm:gap-4 pr-2">
                      {(matches as ScheduleEntry[]).map((match: ScheduleEntry, index: number) => (
                        <div key={match.id || index} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3 sm:p-4 hover:shadow-lg transition-all duration-300">
                          {/* Match Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <div className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                                  {match.teamA} vs {match.teamB}
                                </div>
                                {match.matchNumber && (
                                  <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full w-fit">
                                    Match #{match.matchNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                📍 {match.venue}
                              </div>
                              {match.matchType && match.matchType !== 'LEAGUE' && (
                                <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                                  {match.matchType}
                                </div>
                              )}
                            </div>
                            <div className="text-right mt-2 sm:mt-0">
                              {match.dateTime && (
                                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                                  🕐 {match.dateTime}
                                </div>
                              )}
                              {match.verdict && (
                                <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                                  ✅ Completed
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Scores Section */}
                          {(match.teamAStatus || match.teamBStatus) && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-300 dark:border-gray-600">
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">📊 Match Score</h4>
                              <div className="grid gap-2">
                                {match.teamAStatus && (
                                  <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                                    <span className="font-medium text-blue-800 dark:text-blue-200">{match.teamA}</span>
                                    <div className="text-right">
                                      <span className="font-bold text-blue-900 dark:text-blue-100">
                                        {match.teamAStatus.score || match.teamAStatus.runs}
                                        {(match.teamAStatus.wickets || match.teamAStatus.wickets === 0) && `/${match.teamAStatus.wickets}`}
                                      </span>
                                      {(match.teamAStatus.overs !== null && match.teamAStatus.overs !== undefined) && (
                                        <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                                          ({match.teamAStatus.overs} ov)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {match.teamBStatus && (
                                  <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                                    <span className="font-medium text-orange-800 dark:text-orange-200">{match.teamB}</span>
                                    <div className="text-right">
                                      <span className="font-bold text-orange-900 dark:text-orange-100">
                                        {match.teamBStatus.score || match.teamBStatus.runs}
                                        {(match.teamBStatus.wickets || match.teamBStatus.wickets === 0) && `/${match.teamBStatus.wickets}`}
                                      </span>
                                      {(match.teamBStatus.overs !== null && match.teamBStatus.overs !== undefined) && (
                                        <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                                          ({match.teamBStatus.overs} ov)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Match Result */}
                          {match.verdict && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-3 mb-3 border border-green-200 dark:border-green-700">
                              <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1 flex items-center">
                                🏆 Match Result
                              </h4>
                              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                {match.verdict}
                              </p>
                            </div>
                          )}

                          {/* Action Links */}
                          {(match.matchReportUrl || match.matchHighlightsUrl || match.matchCenterUrl) && (
                            <div className="flex flex-wrap gap-2">
                              {match.matchReportUrl && (
                                <a
                                  href={match.matchReportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs font-medium px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  📄 Match Report
                                </a>
                              )}
                              {match.matchHighlightsUrl && (
                                <a
                                  href={match.matchHighlightsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs font-medium px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                                >
                                  🎥 Highlights
                                </a>
                              )}
                              {match.matchCenterUrl && match.matchCenterUrl !== match.matchReportUrl && (
                                <a
                                  href={match.matchCenterUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs font-medium px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                  🎯 Match Center
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Matches Section */}
        {recentMatches.length > 0 && (
          <section className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              📋 Recent Results
            </h2>
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-700">
              <div className="grid gap-4 pr-2">
                {recentMatches.map((match: ScheduleEntry, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{match.teamA} vs {match.teamB}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{match.venue}</div>
                    {match.verdict && (
                      <div className="text-sm font-medium text-green-700 dark:text-green-300 mt-2 bg-green-50 dark:bg-green-900/30 p-2 rounded">
                        {match.verdict}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
