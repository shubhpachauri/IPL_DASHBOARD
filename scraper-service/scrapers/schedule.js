import { URLS } from '../lib/types.js';
import { 
  createBrowser, 
  createPage, 
  navigateWithRetry, 
  createResult, 
  closeBrowser 
} from '../lib/browser.js';

/**
 * Scrapes the IPL match schedule
 */
export async function scrapeSchedule(config) {
  let browser;
  
  try {
    console.log('🏏 Starting IPL Schedule scraping...');
    
    browser = await createBrowser(config);
    const page = await createPage(browser, config);

    await navigateWithRetry(page, URLS.MATCHES, config);

    // Extract matches directly - the function will handle selector validation
    const matches = await extractAllMatches(page);
    const organizedSchedule = organizeMatchesByType(matches);

    console.log(`✅ Successfully scraped ${matches.length} matches`);
    console.log(`📊 Match types found: ${Object.keys(organizedSchedule).join(', ')}`);
    
    return createResult(true, organizedSchedule);

  } catch (error) {
    console.error('❌ Error scraping schedule:', error.message);
    return createResult(false, null, error);
  } finally {
    await closeBrowser(browser);
  }
}

/**
 * Extracts all match data from the page
 */

async function extractAllMatches(page) {
  console.log('📊 Extracting match data...');
  
  const data = await page.evaluate(() => {
    // Target the specific ul element with id team_archive
    const teamArchiveUl = document.querySelector('#team_archive');
    
    let rows = [];
    if (teamArchiveUl) {
      rows = Array.from(teamArchiveUl.querySelectorAll('li'));
      console.log(`✅ Found ${rows.length} matches in #team_archive ul`);
    }

    // Fallback to other selectors if team_archive is not found
    if (rows.length === 0) {
      console.log('⚠️ No matches found in #team_archive, trying other selectors');
      const matchSelectors = [
        '.vn-sheduleList li',
        '[ng-repeat="list in resultList"] li',
        '.team_achive ul li', 
        '.vn-resultsList li',
        '.js-match-card',
        '.match-card',
        '.vn-matchCard'
      ];

      let matchElements = [];
      for (const selector of matchSelectors) {
        matchElements = document.querySelectorAll(selector);
        if (matchElements.length > 0) {
          console.log(`✅ Found ${matchElements.length} matches with selector: ${selector}`);
          rows = Array.from(matchElements);
          break;
        }
      }
    }

    if (rows.length === 0) {
      console.log('❌ No match elements found with any selector');
      return [];
    }

    return rows.map((row, index) => {
      try {
        // Always use the list element extraction for team_archive structure
        return extractFromListElement(row, index);
        
      } catch (error) {
        console.error(`Error parsing match ${index + 1}:`, error);
        return null;
      }
    }).filter(item => item !== null);

    function extractFromListElement(element, index) {
      // Extract data using the specific class names from team_archive structure
      
      // Extract verdict
      const verdict = element.querySelector('.vn-ticketTitle.ng-binding.ng-scope')?.textContent?.trim() || '';
      
      // Extract match type/order
      const matchType = element.querySelector('.vn-matchOrder.ng-binding.ng-scope')?.textContent?.trim() || `Match ${74 - index}`;
      
      // Extract venue (can be either ng-binding or ng-binding ng-scope)
      const venue = element.querySelector('.ng-binding:not(.vn-ticketTitle):not(.vn-matchOrder):not(.vn-teamName):not(.vn-teamCode):not(.ov-display), .ng-binding.ng-scope:not(.vn-ticketTitle):not(.vn-matchOrder):not(.vn-teamName):not(.vn-teamCode):not(.ov-display)')?.textContent?.trim() || '';
      
      // Extract team names and codes from the structured divs
      const teamDivs = element.querySelectorAll('.vn-shedTeam');
      const teamNames = element.querySelectorAll('.vn-teamName h3');
      const teamCodes = element.querySelectorAll('.vn-teamCode h3');
      
      let teamA = '', teamB = '';
      let teamACode = '', teamBCode = '';
      
      if (teamNames.length >= 2) {
        teamA = teamNames[0].textContent.trim();
        teamB = teamNames[1].textContent.trim();
      }
      
      if (teamCodes.length >= 2) {
        teamACode = teamCodes[0].textContent.trim();
        teamBCode = teamCodes[1].textContent.trim();
      }
      
      // Use team codes as team names if names are not available
      if (!teamA && teamACode) teamA = teamACode;
      if (!teamB && teamBCode) teamB = teamBCode;

      // Initialize team status objects
      let teamAStatus = { score: '0', overs: '0.0', wickets: 0 };
      let teamBStatus = { score: '0', overs: '0.0', wickets: 0 };

      // Extract data from each team div separately
      const scoreRegex = /(\d+)\/(\d+)/;
      const simpleScoreRegex = /^(\d+)$/;
      const oversRegex = /\((\d+\.?\d*)\s*OV\s*\)/i;

      // Process first team (teamA)
      if (teamDivs.length >= 1) {
        const teamADiv = teamDivs[0];
        
        // Extract score for team A
        const teamAScoreElements = teamADiv.querySelectorAll('p.ng-binding, p.ng-binding.ng-scope');
        for (let i = 0; i < teamAScoreElements.length; i++) {
          const text = teamAScoreElements[i].textContent.trim();
          const scoreMatch = scoreRegex.exec(text);
          if (scoreMatch) {
            teamAStatus.score = scoreMatch[1];
            teamAStatus.wickets = parseInt(scoreMatch[2]);
            break;
          } else {
            const simpleMatch = simpleScoreRegex.exec(text);
            if (simpleMatch && parseInt(simpleMatch[1]) >= 0 && parseInt(simpleMatch[1]) <= 999) {
              teamAStatus.score = simpleMatch[1];
              teamAStatus.wickets = 10; // All out if simple score
              break;
            }
          }
        }
        
        // Extract overs for team A
        const teamAOversElements = teamADiv.querySelectorAll('span.ov-display');
        for (let i = 0; i < teamAOversElements.length; i++) {
          const text = teamAOversElements[i].textContent.trim();
          const oversMatch = oversRegex.exec(text);
          if (oversMatch) {
            teamAStatus.overs = oversMatch[1];
            break;
          }
        }
      }

      // Process second team (teamB)
      if (teamDivs.length >= 2) {
        const teamBDiv = teamDivs[1];
        
        // Extract score for team B
        const teamBScoreElements = teamBDiv.querySelectorAll('p.ng-binding, p.ng-binding.ng-scope, p.match-det');
        for (let i = 0; i < teamBScoreElements.length; i++) {
          const text = teamBScoreElements[i].textContent.trim();
          const scoreMatch = scoreRegex.exec(text);
          if (scoreMatch) {
            teamBStatus.score = scoreMatch[1];
            teamBStatus.wickets = parseInt(scoreMatch[2]);
            break;
          } else {
            const simpleMatch = simpleScoreRegex.exec(text);
            if (simpleMatch && parseInt(simpleMatch[1]) >= 0 && parseInt(simpleMatch[1]) <= 999) {
              teamBStatus.score = simpleMatch[1];
              teamBStatus.wickets = 10; // All out if simple score
              break;
            }
          }
        }
        
        // Extract overs for team B
        const teamBOversElements = teamBDiv.querySelectorAll('span.ov-display');
        for (let i = 0; i < teamBOversElements.length; i++) {
          const text = teamBOversElements[i].textContent.trim();
          const oversMatch = oversRegex.exec(text);
          if (oversMatch) {
            teamBStatus.overs = oversMatch[1];
            break;
          }
        }
      }

      // Generate match data
      const matchNumber = 74 - index;
      const dateTime = element.querySelector('.vn-matchDateTime')?.textContent?.trim() || '';

      return {
        id: `${dateTime || index}-${teamA}-${teamB}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''),
        matchNumber,
        matchType,
        dateTime,
        teamA,
        teamACode,
        teamAStatus,
        teamB,
        teamBCode,
        teamBStatus,
        venue,
        matchReportUrl: element.querySelector('a[href*="report"]')?.href || '',
        matchHighlightsUrl: element.querySelector('a[href*="highlights"]')?.href || '',
        matchCenterUrl: element.querySelector('.vn-matchBtn, a[href*="match"]')?.href || '',
        verdict
      };
    }

  });

  console.log(`📊 Extracted ${data.length} matches`);
  return data;
}

/**
 * Organizes matches by their type/category - More efficient version
 */
function organizeMatchesByType(matches) {
  const schedule = {
    "PRE SEASON": [],
    "LEAGUE": [],
    "PLAYOFFS": [],
    "FINAL": []
  };
  
  // Use includes() for simple string matching - faster than regex
  matches.forEach(match => {
    const type = match.matchType || 'LEAGUE';
    const lowerType = type.toLowerCase();
    
    // More efficient categorization using string includes
    if (lowerType.includes('pre') || lowerType.includes('practice')) {
      schedule["PRE SEASON"].push(match);
    } else if (lowerType.includes('final')) {
      schedule["FINAL"].push(match);
    } else if (lowerType.includes('playoff') || lowerType.includes('qualifier') || lowerType.includes('eliminator')) {
      schedule["PLAYOFFS"].push(match);
    } else {
      schedule["LEAGUE"].push(match);
    }
  });
  
  return schedule;
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { DEFAULT_CONFIG } = await import('../lib/types.js');
  const result = await scrapeSchedule(DEFAULT_CONFIG);
  console.log('Schedule Result:', JSON.stringify(result, null, 2));
}
