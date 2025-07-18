#!/bin/bash

echo "🏏 IPL Dashboard - Microservice Setup"
echo "===================================="

echo "📦 Installing dependencies for main Next.js app..."
npm install

echo "📦 Installing dependencies for scraper service..."
cd scraper-service && npm install && cd ..

echo "✅ Setup complete!"
echo ""
echo "🚀 To start both services:"
echo "   npm run dev:full"
echo ""
echo "Or start them separately:"
echo "   Terminal 1: npm run scraper:start"
echo "   Terminal 2: npm run dev"
echo ""
echo "📡 Services will run on:"
echo "   - Next.js App: http://localhost:3000"
echo "   - Scraper Service: http://localhost:3001"
