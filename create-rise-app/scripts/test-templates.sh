#!/bin/bash
set -e

echo "🧪 Testing create-rise-app templates..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test a single template
test_template() {
  local template=$1
  echo -e "\n${YELLOW}Testing $template template...${NC}"
  
  # Create test app
  echo "Creating test app..."
  cd /tmp
  rm -rf test-$template
  
  # Use the local create-rise-app
  node /workspace/create-rise-app/bin/cli.js test-$template --template $template --no-git --no-install
  
  cd test-$template
  
  # Install dependencies
  echo "Installing dependencies..."
  npm install --silent
  
  # Test frontend build
  echo "Building frontend..."
  cd frontend
  npm run build
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $template template builds successfully!${NC}"
  else
    echo -e "${RED}✗ $template template build failed!${NC}"
    exit 1
  fi
  
  # Cleanup
  cd /tmp
  rm -rf test-$template
}

# Test base template (most important)
test_template "chat"

echo -e "\n${GREEN}✅ All template tests passed!${NC}"