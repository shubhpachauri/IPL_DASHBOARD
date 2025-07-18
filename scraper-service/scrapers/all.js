import { scrapeSchedule } from './schedule.js';
import { scrapePointsTable } from './points.js';
import { DEFAULT_CONFIG } from '../lib/types.js';


async function scrapeAll(config = DEFAULT_CONFIG) {
  console.log('🚀 Starting comprehensive IPL data scraping...');
  console.log('📅 Current date:', new Date().toISOString());
  
  const results = {
    schedule: null,
    pointsTable: null,
    timestamp: new Date().toISOString(),
    success: false,
    errors: []
  };

  try {
    // Scrape schedule
    console.log('\n📊 Scraping match schedule...');
    const scheduleResult = await scrapeSchedule(config);
    results.schedule = scheduleResult;
    
    if (!scheduleResult.success) {
      results.errors.push(`Schedule scraping failed: ${scheduleResult.error}`);
    }

    // Scrape points table
    console.log('\n🏆 Scraping points table...');
    const pointsResult = await scrapePointsTable(config);
    results.pointsTable = pointsResult;
    
    if (!pointsResult.success) {
      results.errors.push(`Points table scraping failed: ${pointsResult.error}`);
    }

    results.success = scheduleResult.success || pointsResult.success;
    
    console.log('\n🎉 Scraping process completed!');
    console.log(`✅ Schedule: ${scheduleResult.success ? 'Success' : 'Failed'}`);
    console.log(`✅ Points Table: ${pointsResult.success ? 'Success' : 'Failed'}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    return results;
    
  } catch (error) {
    console.error('\n💥 Critical error in scraping process:', error.message);
    results.errors.push(`Critical error: ${error.message}`);
    return results;
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await scrapeAll();
  process.exit(result.success ? 0 : 1);
}

export { scrapeAll };
