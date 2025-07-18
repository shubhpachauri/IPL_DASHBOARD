# IPL Scraper Service

A standalone Node.js microservice for scraping IPL (Indian Premier League) data from official websites. This service runs independently of Next.js and provides a clean API for accessing IPL match schedules and points table data.

## Features

- 🏏 **Match Schedule Scraping**: Extracts comprehensive match information including teams, dates, venues, and results
- 🏆 **Points Table Scraping**: Gets current team standings with wins, losses, points, and performance history
- 🔄 **Automatic Scheduling**: Runs scraping jobs every 2 hours automatically
- 📊 **Caching System**: Serves cached data when fresh scraping isn't needed
- 🌐 **REST API**: Clean HTTP endpoints for accessing data
- 🛡️ **Anti-Detection**: Uses Puppeteer with stealth plugin to avoid bot detection
- ⚡ **Multiple Run Modes**: CLI commands and HTTP server modes

## Quick Start

### 1. Install Dependencies

```bash
cd scraper-service
npm install
```

### 2. Start the HTTP Server

```bash
npm run server
```

The server will start on port 3001 and automatically perform an initial data scrape.

### 3. Use the API

```bash
# Get match schedule
curl http://localhost:3001/api/schedule

# Get points table
curl http://localhost:3001/api/points-table

# Get all data
curl http://localhost:3001/api/all

# Force refresh data
curl http://localhost:3001/api/schedule?refresh=true
```

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "IPL Scraper Service"
}
```

### `GET /api/schedule`
Get IPL match schedule data.

**Query Parameters:**
- `refresh=true` - Force fresh scraping instead of using cache

**Response:**
```json
{
  "success": true,
  "data": {
    "PRE SEASON": [],
    "LEAGUE": [...],
    "PLAYOFFS": [...],
    "FINAL": [...]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "scraping"
}
```

### `GET /api/points-table`
Get IPL points table data.

**Query Parameters:**
- `refresh=true` - Force fresh scraping instead of using cache

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "position": 1,
      "team": "Mumbai Indians",
      "played": 14,
      "wins": 10,
      "losses": 4,
      "points": 20,
      "netRunRate": 0.758,
      "performanceHistory": ["W", "W", "L", "W", "W"]
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "cache"
}
```

### `GET /api/all`
Get both schedule and points table data in one request.

### `POST /api/scrape`
Manually trigger scraping.

**Body:**
```json
{
  "type": "all" // "schedule", "points", or "all"
}
```

## CLI Usage

### Available Commands

```bash
# Start HTTP server
npm run server
# or
node index.js server

# Scrape schedule only
npm run scrape:schedule
# or
node index.js scrape-schedule

# Scrape points table only
npm run scrape:points
# or
node index.js scrape-points

# Scrape all data
npm run scrape:all
# or
node index.js scrape-all

# Run with custom options
node index.js scrape-all --headless
```

## Configuration

The service uses environment variables for configuration:

```bash
# Server port (default: 3001)
PORT=3001

# Chrome executable path (auto-detected on macOS)
CHROME_EXECUTABLE_PATH=/path/to/chrome
```

## Data Storage

Scraped data is automatically saved to the `data/` directory:

- `ipl-schedule-data.json` - Match schedule data
- `ipl-points-table.json` - Points table data  
- `ipl-combined-data.json` - Combined results from all scrapers

## Scheduled Scraping

The service automatically runs scraping jobs:

- **Frequency**: Every 2 hours
- **Data**: Complete scrape of both schedule and points table
- **Caching**: Data is cached for 1 hour to reduce unnecessary scraping

## Integration with Next.js

Update your Next.js API routes to call this service instead of running Puppeteer directly:

```javascript
// pages/api/schedule.js
export default async function handler(req, res) {
  try {
    const response = await fetch('http://localhost:3001/api/schedule');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule data' });
  }
}
```

## Deployment Options

### 1. Local Development
```bash
npm run dev  # Runs with --watch for automatic restarts
```

### 2. Production Server
```bash
npm start
```

### 3. Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### 4. AWS Lambda (Serverless)
The service can be deployed as a Lambda function for on-demand scraping. The scheduled scraping would need to be handled by CloudWatch Events.

### 5. Heroku/Railway/Vercel
Deploy as a standard Node.js application with the server command.

## Architecture Benefits

- ✅ **Separation of Concerns**: Scraping logic is isolated from Next.js
- ✅ **Performance**: Next.js build process is not affected by Puppeteer
- ✅ **Scalability**: Can be scaled independently
- ✅ **Reliability**: Dedicated error handling and retry logic
- ✅ **Flexibility**: Can be deployed anywhere that supports Node.js
- ✅ **Caching**: Built-in caching reduces scraping frequency
- ✅ **Monitoring**: Centralized logging and health checks

## Error Handling

The service includes comprehensive error handling:

- **Network Failures**: Automatic retries with exponential backoff
- **Page Load Issues**: Fallback selectors and timeouts
- **Data Parsing Errors**: Graceful degradation with partial data
- **Browser Crashes**: Automatic browser cleanup and restart

## Development

### File Structure
```
scraper-service/
├── index.js              # Main CLI entry point
├── server.js             # HTTP server
├── package.json          # Dependencies
├── lib/
│   ├── types.js          # Constants and configuration
│   └── browser.js        # Browser utilities
├── scrapers/
│   ├── schedule.js       # Schedule scraping logic
│   ├── points.js         # Points table scraping logic
│   └── all.js           # Combined scraping

```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Chrome not found**: Set `CHROME_EXECUTABLE_PATH` environment variable
2. **Port conflicts**: Change the PORT environment variable
3. **Scraping failures**: Check network connectivity and website availability
4. **Memory issues**: Ensure adequate memory allocation for Puppeteer

### Logs

The service provides detailed logging:
- ✅ Success indicators
- ❌ Error messages with context
- 📊 Data extraction summaries
- ⏰ Scheduled job status
