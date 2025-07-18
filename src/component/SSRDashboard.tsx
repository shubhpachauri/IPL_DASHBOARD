// SSR Dashboard Component
// This component runs on the server and pre-renders with data

import React from 'react';
import { getDashboardData } from '@/lib/serverDataFetcher';
import { ClientDashboard } from './ClientDashboard';

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

  const { lastUpdated } = dashboardData;

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
      </div>
    </div>
  );
}
