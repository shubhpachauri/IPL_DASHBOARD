import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import NodeCache from 'node-cache';
import { scrapeSchedule } from './scrapers/schedule.js';
import { scrapePointsTable } from './scrapers/points.js';
import { scrapeAll } from './scrapers/all.js';
import { DEFAULT_CONFIG } from './lib/types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize in-memory cache with TTL of 90 minutes (5400 seconds)
const cache = new NodeCache({
  stdTTL: 5400, // 90 minutes cache to cover gap between 2-hour scheduled scrapes
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, 
  maxKeys: 10, // Limit number of cached items
  errorOnMissing: false, // Don't throw error when key is missing
  deleteOnExpire: true // Delete expired keys automatically
});

cache.on('set', (key, value) => {
  console.log(`🗂️ Cache SET: ${key}`);
});

cache.on('del', (key, value) => {
  console.log(`🗑️ Cache DEL: ${key}`);
});

cache.on('expired', (key, value) => {
  console.log(`⏰ Cache EXPIRED: ${key}`);
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'IPL Scraper Service'
  });
});

// Get schedule data (either from cache or fresh scrape)
app.get('/api/schedule', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = 'schedule-data';
    
    // If force refresh is requested, clear the cache first
    if (forceRefresh) {
      cache.del(cacheKey);
      console.log('🗑️ Force refresh: Schedule cache cleared');
    } else {
      // Try to serve from cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log('📋 Serving cached schedule data');
        return res.json({
          success: true,
          data: cachedData.data,
          timestamp: cachedData.timestamp,
          source: 'cache'
        });
      }
    }
    
    // Fresh scrape
    console.log('🔄 Performing fresh schedule scrape...');
    const result = await scrapeSchedule(DEFAULT_CONFIG);
    
    // Cache the result if successful
    if (result.success) {
      cache.set(cacheKey, {
        data: result.data,
        timestamp: result.timestamp
      });
      console.log('💾 Schedule data cached successfully');
    } else if (!forceRefresh) {
      // If scraping fails and it's not a force refresh, try to serve stale cache
      const staleData = cache.get(cacheKey);
      if (staleData) {
        console.log('⚠️ Scraping failed, serving stale cached data');
        return res.json({
          success: true,
          data: staleData.data,
          timestamp: staleData.timestamp,
          source: 'stale-cache',
          warning: 'Data may be outdated due to scraping failure'
        });
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/schedule:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get points table data (either from cache or fresh scrape)
app.get('/api/points-table', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = 'points-table-data';
    
    // If force refresh is requested, clear the cache first
    if (forceRefresh) {
      cache.del(cacheKey);
      console.log('🗑️ Force refresh: Points table cache cleared');
    } else {
      // Try to serve from cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log('📋 Serving cached points table data');
        return res.json({
          success: true,
          data: cachedData.data,
          timestamp: cachedData.timestamp,
          source: 'cache'
        });
      }
    }

    // Fresh scrape
    console.log('🔄 Performing fresh points table scrape...');
    const result = await scrapePointsTable(DEFAULT_CONFIG);

    // Cache the result if successful
    if (result.success) {
      cache.set(cacheKey, {
        data: result.data,
        timestamp: result.timestamp
      });
      console.log('💾 Points table data cached successfully');
    } else if (!forceRefresh) {
      // If scraping fails and it's not a force refresh, try to serve stale cache
      const staleData = cache.get(cacheKey);
      if (staleData) {
        console.log('⚠️ Scraping failed, serving stale cached data');
        return res.json({
          success: true,
          data: staleData.data,
          timestamp: staleData.timestamp,
          source: 'stale-cache',
          warning: 'Data may be outdated due to scraping failure'
        });
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/points-table:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all data (schedule + points table)
app.get('/api/all', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = 'combined-data';
    
    // If force refresh is requested, clear all related caches
    if (forceRefresh) {
      cache.del(cacheKey);
      cache.del('schedule-data');
      cache.del('points-table-data');
      console.log('🗑️ Force refresh: All caches cleared');
    } else {
      // Try to serve combined cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData && cachedData.schedule?.success && cachedData.pointsTable?.success) {
        console.log('📋 Serving cached combined data');
        return res.json({
          success: true,
          ...cachedData,
          source: 'cache'
        });
      }
    }

    // Fresh scrape of all data
    console.log('🔄 Performing fresh comprehensive scrape...');
    const result = await scrapeAll(DEFAULT_CONFIG);
    
    // Cache the result if successful
    if (result.success) {
      cache.set(cacheKey, {
        schedule: result.schedule,
        pointsTable: result.pointsTable,
        timestamp: result.timestamp
      });
      // Also update individual caches for consistency
      if (result.schedule?.success) {
        cache.set('schedule-data', {
          data: result.schedule.data,
          timestamp: result.timestamp
        });
      }
      if (result.pointsTable?.success) {
        cache.set('points-table-data', {
          data: result.pointsTable.data,
          timestamp: result.timestamp
        });
      }
      console.log('💾 Combined data cached successfully');
    } else if (!forceRefresh) {
      // If scraping fails and it's not a force refresh, try to serve stale cache
      const staleData = cache.get(cacheKey);
      if (staleData && staleData.schedule?.success && staleData.pointsTable?.success) {
        console.log('⚠️ Scraping failed, serving stale cached data');
        return res.json({
          success: true,
          ...staleData,
          source: 'stale-cache',
          warning: 'Data may be outdated due to scraping failure'
        });
      }
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/all:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Manual trigger for scraping
app.post('/api/scrape', async (req, res) => {
  try {
    const { type = 'all' } = req.body;
    
    console.log(`🎯 Manual scrape triggered for: ${type}`);
    
    let result;
    switch (type) {
      case 'schedule':
        result = await scrapeSchedule(DEFAULT_CONFIG);
        if (result.success) {
          cache.set('schedule-data', {
            data: result.data,
            timestamp: result.timestamp
          });
          console.log('💾 Schedule data cached after manual scrape');
        }
        break;
      case 'points':
        result = await scrapePointsTable(DEFAULT_CONFIG);
        if (result.success) {
          cache.set('points-table-data', {
            data: result.data,
            timestamp: result.timestamp
          });
          console.log('💾 Points table data cached after manual scrape');
        }
        break;
      case 'all':
      default:
        result = await scrapeAll(DEFAULT_CONFIG);
        if (result.success) {
          // Cache individual components
          if (result.schedule?.success) {
            cache.set('schedule-data', {
              data: result.schedule.data,
              timestamp: result.timestamp
            });
          }
          if (result.pointsTable?.success) {
            cache.set('points-table-data', {
              data: result.pointsTable.data,
              timestamp: result.timestamp
            });
          }
          // Cache combined data
          cache.set('combined-data', {
            schedule: result.schedule,
            pointsTable: result.pointsTable,
            timestamp: result.timestamp
          });
          console.log('💾 All data cached after manual scrape');
        }
        break;
    }
    
    res.json({
      message: `Scraping ${type} completed`,
      result
    });
    
  } catch (error) {
    console.error('Error in manual scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  const stats = cache.getStats();
  const keys = cache.keys();
  const cacheData = {};
  
  // Get detailed info for each cached item
  keys.forEach(key => {
    const data = cache.get(key);
    if (data) {
      cacheData[key] = {
        hasData: !!data,
        timestamp: data.timestamp || 'Unknown',
        dataSize: JSON.stringify(data).length
      };
    }
  });
  
  res.json({
    success: true,
    stats: {
      ...stats,
      cachedKeys: keys,
      cacheSize: keys.length,
      ttl: cache.options.stdTTL,
      checkPeriod: cache.options.checkperiod,
      maxKeys: cache.options.maxKeys
    },
    cacheDetails: cacheData,
    timestamp: new Date().toISOString()
  });
});

// Add cache clear endpoint
app.post('/api/cache/clear', (req, res) => {
  const { key } = req.body;
  
  if (key) {
    // Clear specific key
    const result = cache.del(key);
    res.json({
      success: true,
      message: `Cache key '${key}' ${result ? 'cleared' : 'not found'}`,
      timestamp: new Date().toISOString()
    });
  } else {
    // Clear all cache
    cache.flushAll();
    res.json({
      success: true,
      message: 'All cache cleared',
      timestamp: new Date().toISOString()
    });
  }
});

// Schedule automatic scraping (every 2 hours)
cron.schedule('0 */2 * * *', async () => {
  console.log('⏰ Scheduled scraping started...');
  try {
    const result = await scrapeAll(DEFAULT_CONFIG);
    if (result.success) {
      // Update cache with fresh data
      if (result.schedule?.success) {
        cache.set('schedule-data', {
          data: result.schedule.data,
          timestamp: result.timestamp
        });
      }
      if (result.pointsTable?.success) {
        cache.set('points-table-data', {
          data: result.pointsTable.data,
          timestamp: result.timestamp
        });
      }
      cache.set('combined-data', {
        schedule: result.schedule,
        pointsTable: result.pointsTable,
        timestamp: result.timestamp
      });
      console.log('💾 Cache updated with scheduled scrape data');
    }
    console.log('✅ Scheduled scraping completed successfully');
  } catch (error) {
    console.error('❌ Scheduled scraping failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 IPL Scraper Service started!');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/schedule - Get match schedule`);
  console.log(`   GET  /api/points-table - Get points table`);
  console.log(`   GET  /api/all - Get all data`);
  console.log(`   POST /api/scrape - Manual scrape trigger`);
  console.log(`   GET  /api/cache/stats - Cache statistics`);
  console.log(`   POST /api/cache/clear - Clear cache`);
  console.log(`⏰ Scheduled scraping: Every 2 hours`);
  console.log(`💾 In-memory cache: TTL 90 minutes, max 10 keys`);
  
  // Ensure data directory exists (for file persistence if needed in future)
  fs.ensureDirSync(path.join(process.cwd(), 'data'));
  
  // Run initial scrape to populate cache
  setTimeout(async () => {
    try {
      const hasScheduleCache = cache.has('schedule-data');
      const hasPointsCache = cache.has('points-table-data');
      
      if (!hasScheduleCache || !hasPointsCache) {
        console.log('🔄 No cached data found, running initial scrape...');
        const result = await scrapeAll(DEFAULT_CONFIG);
        if (result.success) {
          // Populate cache with initial data
          if (result.schedule?.success) {
            cache.set('schedule-data', {
              data: result.schedule.data,
              timestamp: result.timestamp
            });
          }
          if (result.pointsTable?.success) {
            cache.set('points-table-data', {
              data: result.pointsTable.data,
              timestamp: result.timestamp
            });
          }
          cache.set('combined-data', {
            schedule: result.schedule,
            pointsTable: result.pointsTable,
            timestamp: result.timestamp
          });
          console.log('💾 Initial cache populated successfully');
        }
      } else {
        console.log('📋 Cache data available, server ready');
      }
    } catch (error) {
      console.error('❌ Initial scrape failed:', error);
    }
  }, 1000);
});
