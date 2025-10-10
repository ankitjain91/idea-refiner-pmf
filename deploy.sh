#!/bin/bash

# 🚀 SmoothBrains AI Assistant Deployment Script
# This script will deploy your complete AI assistant with blockchain ledger

set -e  # Exit on any error

echo "🚀 Starting SmoothBrains AI Assistant Deployment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Installing..."
    brew install supabase/tap/supabase
fi

# Check if bun is available, fallback to npm
if command -v bun &> /dev/null; then
    PACKAGE_MANAGER="bun"
    INSTALL_CMD="bun install"
    BUILD_CMD="bun run build"
else
    PACKAGE_MANAGER="npm"
    INSTALL_CMD="npm install"
    BUILD_CMD="npm run build"
fi

print_success "Using $PACKAGE_MANAGER as package manager"

# Check environment variables
print_status "Checking environment configuration..."

if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create one with your Supabase credentials."
    exit 1
fi

# Load environment variables
source .env

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    print_error "Missing required environment variables. Please check your .env file."
    exit 1
fi

# Extract project reference from URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).supabase.co/\1/')
print_success "Project reference: $PROJECT_REF"

# Step 1: Install dependencies
print_status "Installing dependencies..."
$INSTALL_CMD

# Step 2: Login to Supabase (if not already logged in)
print_status "Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    print_warning "Not logged into Supabase. Please login..."
    supabase login
fi

# Step 3: Link to Supabase project
print_status "Linking to Supabase project..."
supabase link --project-ref $PROJECT_REF

# Step 4: Apply database migrations
print_status "Applying database migrations..."
print_warning "This will apply the SmoothBrains schema and blockchain ledger..."

# Apply the main schema
if [ -f "supabase/migrations/20251009_smoothbrains_schema.sql" ]; then
    print_status "Applying SmoothBrains AI schema..."
    supabase db push
    print_success "Database schema applied"
else
    print_warning "Main schema migration not found"
fi

# Step 5: Deploy Edge Functions
print_status "Deploying Edge Functions..."

# Priority functions for SmoothBrains AI Assistant
PRIORITY_FUNCTIONS=(
    "refresh-live-context"
    "compute-pmf-and-next-steps" 
    "generate-pitch-deck"
    "slack-team-digest"
    "idea-ledger"
    "idea-chat"
    "groq-synthesis"
)

# Deploy priority functions first
for func in "${PRIORITY_FUNCTIONS[@]}"; do
    if [ -d "supabase/functions/$func" ]; then
        print_status "Deploying $func..."
        supabase functions deploy $func --project-ref $PROJECT_REF
        print_success "$func deployed"
    else
        print_warning "$func directory not found, skipping..."
    fi
done

# Ask if user wants to deploy all other functions
echo ""
print_warning "Deploy all remaining edge functions? This may take several minutes..."
read -p "Deploy all functions? (y/N): " deploy_all

if [[ $deploy_all =~ ^[Yy]$ ]]; then
    print_status "Deploying all edge functions..."
    
    # Get all function directories
    for func_dir in supabase/functions/*/; do
        func_name=$(basename "$func_dir")
        
        # Skip if already deployed
        if [[ " ${PRIORITY_FUNCTIONS[@]} " =~ " ${func_name} " ]]; then
            continue
        fi
        
        # Skip shared directory
        if [ "$func_name" = "_shared" ]; then
            continue
        fi
        
        print_status "Deploying $func_name..."
        supabase functions deploy $func_name --project-ref $PROJECT_REF
        print_success "$func_name deployed"
    done
fi

# Step 6: Set up environment variables for functions
print_status "Setting up environment variables for Edge Functions..."

# You'll need to set these in the Supabase dashboard
echo ""
print_warning "IMPORTANT: Please set the following environment variables in your Supabase Dashboard:"
echo "Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
echo "Required environment variables:"
echo "- OPENAI_API_KEY=your_openai_key"
echo "- GROQ_API_KEY=your_groq_key" 
echo "- SERPER_API_KEY=your_serper_key"
echo "- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
echo ""

# Step 7: Build the frontend
print_status "Building frontend application..."
$BUILD_CMD
print_success "Frontend built successfully"

# Step 8: Deployment options
echo ""
print_status "Choose your deployment platform:"
echo "1) Vercel (Recommended)"
echo "2) Netlify" 
echo "3) Manual (build only, deploy yourself)"
echo "4) Skip frontend deployment"

read -p "Enter your choice (1-4): " deploy_choice

case $deploy_choice in
    1)
        print_status "Setting up Vercel deployment..."
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            print_warning "Vercel CLI not found. Installing..."
            npm install -g vercel
        fi
        
        # Create vercel.json if it doesn't exist
        if [ ! -f "vercel.json" ]; then
            print_status "Creating vercel.json configuration..."
            cat > vercel.json << EOF
{
  "framework": "vite",
  "buildCommand": "$BUILD_CMD",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "VITE_SUPABASE_URL": "$VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "$VITE_SUPABASE_PUBLISHABLE_KEY"
  }
}
EOF
        fi
        
        print_status "Deploying to Vercel..."
        vercel --prod
        print_success "Deployed to Vercel!"
        ;;
        
    2)
        print_status "Setting up Netlify deployment..."
        
        # Check if Netlify CLI is installed
        if ! command -v netlify &> /dev/null; then
            print_warning "Netlify CLI not found. Installing..."
            npm install -g netlify-cli
        fi
        
        # Create netlify.toml if it doesn't exist
        if [ ! -f "netlify.toml" ]; then
            print_status "Creating netlify.toml configuration..."
            cat > netlify.toml << EOF
[build]
  command = "$BUILD_CMD"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_SUPABASE_URL = "$VITE_SUPABASE_URL"
  VITE_SUPABASE_PUBLISHABLE_KEY = "$VITE_SUPABASE_PUBLISHABLE_KEY"
EOF
        fi
        
        print_status "Deploying to Netlify..."
        netlify deploy --prod --dir=dist
        print_success "Deployed to Netlify!"
        ;;
        
    3)
        print_success "Build complete. Deploy the 'dist' folder to your hosting provider."
        ;;
        
    4)
        print_status "Skipping frontend deployment."
        ;;
        
    *)
        print_warning "Invalid choice. Skipping frontend deployment."
        ;;
esac

# Step 9: Final checks and summary
echo ""
print_success "🎉 SmoothBrains AI Assistant Deployment Complete!"
echo "=================================================="
echo ""
print_status "Deployment Summary:"
echo "✅ Database schema applied with blockchain ledger"
echo "✅ Edge functions deployed for AI operations"
echo "✅ Frontend built successfully"
echo ""
print_status "Next Steps:"
echo "1. Set environment variables in Supabase Dashboard"
echo "2. Test the AI chat functionality"
echo "3. Verify blockchain ledger ownership system"
echo "4. Configure authentication providers"
echo ""
print_status "Important URLs:"
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "🔗 Functions: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "🔗 Database: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo ""
print_warning "Remember to:"
echo "- Set your API keys in Supabase Functions settings"
echo "- Test all AI integrations (Groq, OpenAI, Serper)"  
echo "- Verify blockchain ledger functionality"
echo "- Set up monitoring and alerts"
echo ""
print_success "Happy deploying! 🚀"