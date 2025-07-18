# IPL Dashboard Project - Full Stack Documentation

This document provides a comprehensive overview of the IPL Dashboard project, covering both the **frontend Next.js application** and the **backend scraper microservice**. It includes architecture decisions, API usage, caching strategies, hooks, and deployment considerations.

---

## 🏗️ Project Architecture

### ⚙️ 1. Microservice (Scraper Service)

* Data is scraped directly from [https://www.iplt20.com](https://www.iplt20.com)
* Built using **Node.js** with **Puppeteer** and `puppeteer-extra-plugin-stealth`
* Stealth plugin helps bypass bot protections such as Akamai
* Spoofed headers and window dimensions to mimic a real browser session
* Standalone service with REST API endpoints
* Runs scraping jobs at a configurable time interval
* Caches results in local JSON files for speed and reliability

**Puppeteer Setup Example:**

```js
const browser = await puppeteer.launch({
  headless: config.headless,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  defaultViewport: config.viewport,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--start-maximized',
    `--window-size=${config.viewport.width},${config.viewport.height}`
  ]
});

await page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
});
```

### ⚛️ 2. Next.js Frontend

* Built with `create-next-app` using the **App Router**
* Uses **SSR for initial rendering** and **SWR** for real-time updates
* Custom React hooks provide modular access to data
* Proxy API routes connect the frontend to the scraper service

---

## 🚀 Getting Started

### 🔧 Initial Setup

Run the setup script from the project root:

```bash
./setup.sh
```

### 🖥️ Start Both Servers

```bash
npm run dev:full
```

This will run both the scraper service and the Next.js frontend.

---

## 🔌 API Overview

### Scraper Service (Port 3001)

* `GET /api/health` – Health check to verify if the server is running
* `GET /api/schedule` – Returns match schedule
* `GET /api/points-table` – Returns points table
* `GET /api/all` – Combined data
* `POST /api/scrape` – Manual trigger (body: `{ type: "all" | "schedule" | "points" }`)

**Note:** Append `?refresh=true` to any `GET` endpoint to force an update and trigger fresh scraping.

### Frontend API (Proxy via Next.js)

* `/api/schedule?refresh=true`
* `/api/points-table`
* `/api/matches?type=live|upcoming|completed`

---

## 🪝 Custom React Hooks (with SWR)

### `useLiveIPL()`

* Combining live matches, upcoming matches, and the points table
* Polling intervals: 5 minutes (live), 5 (upcoming), 10 minutes (points)
* Includes `forceRefreshAll()` and freshness tracking

### `useMatches(status, limit)`

* Fetches matches based on status: `live`, `upcoming`, `completed`, `all`

### `usePointsTable(sortBy, order)`

* Sortable table with team standings and summary stats

### `useSchedule(filters)`

* Full schedule with filters: team, venue, date range

### `useTeamData(teamName)`

* Team-specific overview: matches, standings, form, stats

### `useTournamentOverview()`

* High-level stats: total matches, top team, completion %

---

## 🧠 Data Loading Architecture

### Flow:

```
IPL Websites → Scraper Service → API Routes (Next.js) → SSRDashboard → SWR Hooks
```

### SSR Layer (`SSRDashboard.tsx`)

* Preloads data using `getDashboardData()`
* Combines `getMatches`, `getPointsTable`, and `getSchedule`
* Uses React `cache()` for request deduplication

### SWR Layer

* Polling intervals:

  * Points table: 10 minutes
  * Live matches: 5 minutes

* Periodic revalidation

* On-focus and on-reconnect refresh

* Deduplication with interval control

---

## 🧹 Caching Strategy

To meet the demands of a live data dashboard like this IPL project, I adopted a multi-layered caching strategy tailored for performance, scalability, and developer ergonomics.

### Strategic Choices

* **Node-cache at the microservice level:** I use `node-cache` to cache scraped results in memory with TTL-based expiry. This significantly reduces redundant scraping of upstream sources while ensuring reasonably fresh data for our API consumers. It suits our use case perfectly, where match schedules and points tables do not change second-to-second, but still require updates multiple times per hour.

* **SWR on the frontend:** React’s `useSWR` provides intelligent client-side revalidation, polling, and caching. It helps maintain UI responsiveness while limiting unnecessary network requests. Its compatibility with the Next.js App Router architecture makes it a natural fit.

* **Server-side SSR caching:** The SSR entry point (`SSRDashboard`) uses server fetchers wrapped in React’s `cache()` utility. This deduplicates data requests across components and ensures fast TTFB (time to first byte).

* **URL-based cache invalidation (`?refresh=true`) and tag-based revalidation:** These features give developers or users control to override stale cache data during critical moments (e.g., mid-match surges or on-demand refresh triggers).

###

---

## 🛠 File Structure

```
scraper-service/
├── index.js           # CLI entry
├── server.js          # HTTP server
├── scrapers/          # Puppeteer logic

next-app/
├── src/hooks/         # Custom SWR hooks
├── src/lib/           # Server fetchers, configs
├── src/component/     # SSR Dashboard
├── src/app/api/       # Proxy routes
```

---

---

## 🧪 Stubs

Since the IPL season is over, there are no ongoing or upcoming real-time matches. To maintain dashboard functionality and visual consistency, I’ve implemented **stub fallback data** for live and upcoming matches.

### How It Works

* When the scraper returns no live or upcoming data, the system automatically falls back to predefined stub objects.
* A match is classified as **live** if:

  * The match verdict is `""` (i.e., undecided)
  * The match start time is within 4 hours of the current time

### Example Stub (Upcoming Match):

```json
"League": [
  {
    "id": "upcoming-match-1",
    "matchType": "League",
    "dateTime": "2025-07-18T19:30:00.000Z",
    "teamA": "Mumbai Indians",
    "teamAStatus": { "runs": 0, "overs": "0.0", "wickets": 0 },
    "teamB": "Chennai Super Kings",
    "teamBStatus": { "runs": 0, "overs": "0.0", "wickets": 0 },
    "venue": "Wankhede Stadium, Mumbai",
    "matchReportUrl": "",
    "matchHighlightsUrl": "",
    "matchCenterUrl": "",
    "verdict": ""
  }
]
```

### Benefits

* Prevents empty UI during off-season
* Ensures live testing and demos remain functional year-round
* Allows developers and reviewers to view layout, polling, and component behavior in a realistic setting

---

## 📊 Performance Features

* Server-side rendering for first paint
* Data polling with sensible intervals
* Optimised `useSWR` configuration
* Lightweight React components with memoisation
* Conditional fetching and error boundaries

---

## 🔍 Debugging & Monitoring

* SWR DevTools for inspecting live cache
* Health check endpoint: `GET /health`
* Structured logs in the scraper service
* Console logs for all cache invalidation steps

---

## 🧩 Future Enhancements

* WebSocket live updates for scores
* GraphQL support
* Redis-based cache layer
* Edge API deployment

---

## 🏁 Summary

This IPL Dashboard demonstrates:

* Real-world microservice integration
* Clean separation of concerns
* Hybrid SSR + SWR model for optimal performance
* Production-grade caching and error handling
* Developer-friendly CLI, docs, and API design

This structure ensures a scalable, maintainable, and performant frontend architecture suitable for live sports dashboards or any real-time data platform.

---

