import { MatchSchedule } from '@/types';
import { mockUpcomingMatches, mockLiveMatches, mockCompletedMatches } from './mockMatches';

export function getMockDataByStatus(status?: string): MatchSchedule {
  switch (status?.toLowerCase()) {
    case 'live':
      return mockLiveMatches;
    case 'completed':
      return mockCompletedMatches;
    case 'upcoming':
    default:
      return mockUpcomingMatches;
  }
}

export function getAllMockData(): MatchSchedule {
  const allData: MatchSchedule = {};
  
  const dataSources = [mockCompletedMatches, mockLiveMatches, mockUpcomingMatches];
  
  dataSources.forEach(source => {
    Object.keys(source).forEach(matchType => {
      if (!allData[matchType]) {
        allData[matchType] = [];
      }
      allData[matchType].push(...source[matchType]);
    });
  });
  
  return allData;
}

export function shouldUseMockData(): boolean {
  // Force mock data in development or when explicitly enabled
  return process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';
}

export function getFallbackMockData(statusFilter?: string): MatchSchedule {
  console.log('Using fallback mock data due to scraper service failure');
  return statusFilter ? getMockDataByStatus(statusFilter) : getAllMockData();
}
