#!/bin/bash

# Test all templates to ensure they build correctly

set -e

echo "🧪 Testing all RISE Vibe Kit templates..."
echo "========================================"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLI_PATH="$SCRIPT_DIR/../bin/cli.js"
TEST_DIR="$SCRIPT_DIR/../../test-templates"

# Clean up any previous test runs
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

# Array of templates to test
TEMPLATES=("base" "chat" "pump" "frenpet" "perps")

# Function to test a template
test_template() {
    local template=$1
    local project_name="test-$template"
    local project_path="$TEST_DIR/$project_name"
    
    echo ""
    echo "🔧 Testing template: $template"
    echo "----------------------------------------"
    
    # Create project with template
    echo "📦 Creating project..."
    node "$CLI_PATH" "$project_path" --template "$template" --no-git --no-install || {
        echo "❌ Failed to create project for template: $template"
        return 1
    }
    
    cd "$project_path"
    
    # Install dependencies
    echo "📥 Installing dependencies..."
    npm install --silent || {
        echo "❌ Failed to install dependencies for template: $template"
        return 1
    }
    
    # Run TypeScript check
    echo "🔍 Running TypeScript check..."
    cd frontend
    npm run type-check || {
        echo "❌ TypeScript check failed for template: $template"
        return 1
    }
    
    # Run linting
    echo "🔍 Running ESLint..."
    npm run lint || {
        echo "❌ Linting failed for template: $template"
        return 1
    }
    
    # Run build
    echo "🏗️  Running build..."
    npm run build || {
        echo "❌ Build failed for template: $template"
        return 1
    }
    
    # Check if build output exists
    if [ ! -d ".next" ]; then
        echo "❌ Build output not found for template: $template"
        return 1
    fi
    
    # Test contract compilation
    echo "⚒️  Testing contract compilation..."
    cd ../contracts
    forge build || {
        echo "❌ Contract compilation failed for template: $template"
        return 1
    }
    
    echo "✅ Template $template passed all tests!"
    
    return 0
}

# Track results
PASSED=0
FAILED=0
FAILED_TEMPLATES=()

# Test each template
for template in "${TEMPLATES[@]}"; do
    if test_template "$template"; then
        ((PASSED++))
    else
        ((FAILED++))
        FAILED_TEMPLATES+=("$template")
    fi
done

# Clean up
cd "$SCRIPT_DIR"
rm -rf "$TEST_DIR"

# Print summary
echo ""
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"

if [ ${#FAILED_TEMPLATES[@]} -gt 0 ]; then
    echo ""
    echo "Failed templates:"
    for template in "${FAILED_TEMPLATES[@]}"; do
        echo "  - $template"
    done
    exit 1
else
    echo ""
    echo "🎉 All templates passed!"
    exit 0
fi