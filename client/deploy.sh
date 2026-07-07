#!/bin/bash

# 🚀 Raiyah Plus - Deployment Script for AWS EC2
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="$HOME/apps/web-portal"
APP_NAME="web-portal"
BRANCH="main"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ Error: Application directory not found at $APP_DIR${NC}"
    exit 1
fi

cd "$APP_DIR"

echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git fetch origin
git reset --hard origin/$BRANCH

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
pm2 restart $APP_NAME

echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Application Status:"
pm2 status $APP_NAME

echo ""
echo "📝 Recent logs:"
pm2 logs $APP_NAME --lines 20 --nostream
