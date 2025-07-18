import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { DEFAULT_CONFIG } from './types.js';

puppeteer.use(StealthPlugin());

/**
 * Creates a browser instance with optimized settings for scraping
 */
export async function createBrowser(config = DEFAULT_CONFIG) {
  const browser = await puppeteer.launch({
    headless: config.headless,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    defaultViewport: config.viewport,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      `--window-size=${config.viewport.width},${config.viewport.height}` // This will now use 1920x1080
    ]
  });

  return browser;
}
/**
 * Creates a page instance with anti-detection measures
 */
export async function createPage(browser, config = DEFAULT_CONFIG) {
  const page = await browser.newPage();

  // Set user agent to avoid bot detection
  await page.setUserAgent(config.userAgent);

  // Enable request interception to block unnecessary resources
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Add extra headers to mimic real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });

  return page;
}


export async function navigateWithRetry(page, url, config = DEFAULT_CONFIG) {
  let retries = config.retries;
  
  while (retries > 0) {
    try {
      await Promise.race([
        page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: config.timeout
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), config.timeout)
        )
      ]);
      
      console.log(`✅ Successfully navigated to ${url}`);
      return;
    } catch (error) {
      console.error(`❌ Navigation attempt failed (${retries} retries left):`, error.message);
      retries--;
      
      if (retries === 0) {
        throw new Error(`Failed to navigate to ${url} after ${config.retries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }
  }
}

export async function waitForSelectorSafe(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    console.log(`✅ Found selector: ${selector}`);
    return true;
  } catch (error) {
    console.error(`❌ Selector not found: ${selector}`, error.message);
    return false;
  }
}


export function createResult(success, data = null, error = null, source = 'scraping') {
  return {
    success,
    data,
    error: error?.message || error,
    timestamp: new Date().toISOString(),
    source
  };
}

/**
 * Safe browser cleanup
 */
export async function closeBrowser(browser) {
  try {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed successfully');
    }
  } catch (error) {
    console.error('❌ Error closing browser:', error.message);
  }
}
