import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());


export async function scrapePointsTable() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Visit the IPL points table page with retry mechanism
    let retries = 3;
    while (retries > 0) {
      try {
        await Promise.race([
          page.goto('https://www.iplt20.com/points-table/men', {
            waitUntil: 'networkidle2',
            timeout: 30000
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Navigation timeout')), 30000)
          )
        ]);
        break;
      } catch (error) {
        console.error(`Navigation attempt failed (${retries} retries left):`, error);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Wait for the points table to load with timeout
    await page.waitForSelector('#pointsdata', { timeout: 10000 });

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
          pts: parseInt(cells[10]?.textContent?.trim() || '0', 10),
          performanceHistory: Array.from(cells[11]?.querySelectorAll('span') || [])
            .map(span => span.textContent?.trim())
            .filter(text => text === 'W' || text === 'L')
        };
      }).filter(item => item !== null);
    });

    console.log('IPL Points Table Data:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error scraping points table:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Self-executing when run directly as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapePointsTable()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
