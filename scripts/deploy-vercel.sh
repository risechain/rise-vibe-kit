#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Default values
ENVIRONMENT="production"
FORCE_DEPLOY=false
SKIP_BUILD_CHECK=false
VERBOSE=false

# Help function
show_help() {
    echo "Usage: ./deploy-vercel.sh [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env <env>         Environment to deploy to (production, preview, development)"
    echo "  -f, --force            Force deployment without pre-checks"
    echo "  -s, --skip-checks      Skip build verification checks"
    echo "  -v, --verbose          Verbose output"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy-vercel.sh                           # Deploy to production"
    echo "  ./deploy-vercel.sh -e preview                # Deploy to preview"
    echo "  ./deploy-vercel.sh -f                        # Force deploy, skip checks"
    echo "  ./deploy-vercel.sh -e production -v          # Verbose production deploy"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        -s|--skip-checks)
            SKIP_BUILD_CHECK=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verbose logging function
log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

echo -e "${GREEN} RISE Vibe Kit - Vercel Deployment${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}📦 Vercel CLI not found. Installing globally...${NC}"
    npm install -g vercel
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Vercel CLI${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Vercel CLI installed successfully${NC}"
fi

# Check Vercel authentication
echo -e "${YELLOW}🔐 Checking Vercel authentication...${NC}"
vercel whoami > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}🔑 Not authenticated with Vercel. Please log in:${NC}"
    vercel login
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Vercel authentication failed${NC}"
        exit 1
    fi
fi

USER=$(vercel whoami)
echo -e "${GREEN}✅ Authenticated as: $USER${NC}"

# Navigate to frontend directory
cd "$PROJECT_ROOT/frontend" || {
    echo -e "${RED}❌ Frontend directory not found${NC}"
    exit 1
}

log_verbose "Changed to frontend directory: $(pwd)"

# Pre-deployment checks (unless forced or skipped)
if [ "$FORCE_DEPLOY" = false ] && [ "$SKIP_BUILD_CHECK" = false ]; then
    echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found in frontend directory${NC}"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi
    fi
    
    # TypeScript check
    echo -e "${YELLOW}🔧 Running TypeScript check...${NC}"
    npm run type-check > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ TypeScript errors found. Run 'npm run type-check' to see details${NC}"
        echo -e "${YELLOW}💡 Use --force to deploy anyway${NC}"
        exit 1
    fi
    log_verbose "TypeScript check passed"
    
    # ESLint check with auto-fix
    echo -e "${YELLOW}🧹 Running ESLint check...${NC}"
    npm run lint:fix > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  ESLint issues found but attempting auto-fix...${NC}"
        npm run lint:fix
    fi
    log_verbose "ESLint check completed"
    
    # Test build
    echo -e "${YELLOW}🏗️  Testing production build...${NC}"
    npm run build > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed. Please fix errors before deploying${NC}"
        echo -e "${YELLOW}💡 Run 'npm run build' to see build errors${NC}"
        echo -e "${YELLOW}💡 Use --force to skip build check${NC}"
        exit 1
    fi
    log_verbose "Production build test passed"
    
    echo -e "${GREEN}✅ All pre-deployment checks passed${NC}"
else
    if [ "$FORCE_DEPLOY" = true ]; then
        echo -e "${YELLOW}⚠️  Skipping pre-deployment checks (forced deployment)${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping build verification checks${NC}"
    fi
fi

# Set up environment variables for deployment
echo -e "${YELLOW}🔧 Setting up environment variables...${NC}"

# Check if .env.local exists and warn about environment variables
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}📋 Found .env.local file. Make sure to set these variables in Vercel:${NC}"
    grep -E "^[^#].*=" .env.local | while read -r line; do
        VAR_NAME=$(echo "$line" | cut -d'=' -f1)
        echo -e "${BLUE}   - $VAR_NAME${NC}"
    done
    echo ""
fi

# Prepare deployment command based on environment
DEPLOY_CMD="vercel"
DEPLOY_FLAGS=""

case $ENVIRONMENT in
    production)
        DEPLOY_FLAGS="--prod"
        log_verbose "Deploying to production"
        ;;
    preview)
        DEPLOY_FLAGS=""
        log_verbose "Deploying to preview"
        ;;
    development)
        DEPLOY_FLAGS=""
        log_verbose "Deploying to development"
        ;;
    *)
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        echo -e "${YELLOW}Valid environments: production, preview, development${NC}"
        exit 1
        ;;
esac

# Add verbose flag if requested
if [ "$VERBOSE" = true ]; then
    DEPLOY_FLAGS="$DEPLOY_FLAGS --debug"
fi

# Confirm deployment
if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE_DEPLOY" = false ]; then
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION${NC}"
    echo -e "${YELLOW}This will update your live site. Continue? (y/N)${NC}"
    read -r CONFIRM
    
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🛑 Deployment cancelled${NC}"
        exit 0
    fi
fi

# Execute deployment
echo -e "${GREEN} Deploying to Vercel ($ENVIRONMENT)...${NC}"
echo -e "${BLUE}Command: $DEPLOY_CMD $DEPLOY_FLAGS .${NC}"
echo ""

# Run the deployment with current directory (frontend)
eval "$DEPLOY_CMD $DEPLOY_FLAGS ."
DEPLOY_EXIT_CODE=$?

# Check deployment result
if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    
    # Get deployment URL
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${GREEN}🌐 Your app is live at your production domain${NC}"
    else
        echo -e "${GREEN}🌐 Preview deployment created${NC}"
    fi
    
    # Provide helpful next steps
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${BLUE}   • Test your deployment${NC}"
    echo -e "${BLUE}   • Check Vercel dashboard for analytics${NC}"
    echo -e "${BLUE}   • Monitor for any runtime errors${NC}"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${BLUE}   • Share your live RISE dApp!${NC}"
    fi
    
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting:${NC}"
    echo -e "${YELLOW}   • Check your Vercel project settings${NC}"
    echo -e "${YELLOW}   • Verify environment variables are set${NC}"
    echo -e "${YELLOW}   • Run with --verbose for more details${NC}"
    echo -e "${YELLOW}   • Check Vercel dashboard for error logs${NC}"
    exit 1
fi