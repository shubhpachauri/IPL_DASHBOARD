import { URLS, SELECTORS } from '../lib/types.js';
import { 
  createBrowser, 
  createPage, 
  navigateWithRetry, 
  waitForSelectorSafe, 
  createResult, 
  closeBrowser 
} from '../lib/browser.js';

export async function scrapePointsTable(config) {
  let browser;
  
  try {
    console.log('🏏 Starting IPL Points Table scraping...');
    
    browser = await createBrowser(config);
    const page = await createPage(browser, config);

    await navigateWithRetry(page, URLS.POINTS_TABLE, config);

    // Wait for the points table to load
    const tableFound = await waitForSelectorSafe(page, SELECTORS.POINTS_TABLE, 30000);
    if (!tableFound) {
      throw new Error('Points table not found on the page');
    }

    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#pointsdata tr'));
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 8) return null;
        
        return {
          position: parseInt(cells[0]?.textContent?.trim() || '-1', 10),
          team: cells[2]?.textContent?.trim() || '',
          played: parseInt(cells[3]?.textContent?.trim() || '-1', 10),
          wins: parseInt(cells[4]?.textContent?.trim() || '0', 10),
          losses: parseInt(cells[5]?.textContent?.trim() || '0', 10),
          noResult: parseInt(cells[6]?.textContent?.trim() || '0', 10),
          netRunRate: parseFloat(cells[7]?.textContent?.trim() || '0'),
          points: parseInt(cells[10]?.textContent?.trim() || '0', 10),
          for: cells[8]?.textContent?.trim() || '',
          against: cells[9]?.textContent?.trim() || '',
          performanceHistory: Array.from(cells[11]?.querySelectorAll('span') || [])
            .map(span => span.textContent?.trim())
        };
      }).filter(item => item !== null);
    });

    console.log(`✅ Successfully scraped ${data.length} teams from points table`);
    return createResult(true, data);

  } catch (error) {
    console.error('❌ Error scraping points table:', error.message);
    return createResult(false, null, error);
  } finally {
    await closeBrowser(browser);
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { DEFAULT_CONFIG } = await import('../lib/types.js');
  const result = await scrapePointsTable(DEFAULT_CONFIG);
  console.log('Points Table Result:', JSON.stringify(result, null, 2));
}
