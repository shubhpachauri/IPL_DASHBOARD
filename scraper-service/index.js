#!/usr/bin/env node

import { program } from 'commander';
import { scrapeSchedule } from './scrapers/schedule.js';
import { scrapePointsTable } from './scrapers/points.js';
import { scrapeAll } from './scrapers/all.js';
import { DEFAULT_CONFIG } from './lib/types.js';

// CLI configuration
program
  .name('ipl-scraper')
  .description('IPL Data Scraping Service')
  .version('1.0.0');

// Server command
program
  .command('server')
  .description('Start the HTTP API server')
  .option('-p, --port <port>', 'Port number', '3001')
  .action(async (options) => {
    process.env.PORT = options.port;
    await import('./server.js');
  });

// Schedule scraping command
program
  .command('scrape-schedule')
  .description('Scrape IPL match schedule')
  .option('--headless', 'Run in headless mode', true)
  .action(async (options) => {
    const config = { ...DEFAULT_CONFIG, headless: options.headless };
    const result = await scrapeSchedule(config);
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });

// Points table scraping command
program
  .command('scrape-points')
  .description('Scrape IPL points table')
  .option('--headless', 'Run in headless mode', true)
  .action(async (options) => {
    const config = { ...DEFAULT_CONFIG, headless: options.headless };
    const result = await scrapePointsTable(config);
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });

// All data scraping command
program
  .command('scrape-all')
  .description('Scrape all IPL data (schedule + points table)')
  .option('--headless', 'Run in headless mode', true)
  .action(async (options) => {
    const config = { ...DEFAULT_CONFIG, headless: options.headless };
    const result = await scrapeAll(config);
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
