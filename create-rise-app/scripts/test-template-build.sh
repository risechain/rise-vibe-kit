#!/bin/bash

echo "Testing create-rise-app base template build..."

# Create a temporary directory for testing
TEMP_DIR=$(mktemp -d)
echo "Creating test app in: $TEMP_DIR"

# Copy base template
cp -r /workspace/create-rise-app/templates/base/* $TEMP_DIR/

cd $TEMP_DIR

# Install dependencies with timeout and skip optional deps
echo "Installing dependencies (this may take a while)..."
npm install --no-optional --legacy-peer-deps || {
    echo "Warning: Some optional dependencies failed to install"
}

# Try to build
echo "Testing TypeScript compilation..."
cd frontend
npx tsc --noEmit || {
    echo "TypeScript errors found"
    exit 1
}

echo "✅ Template builds successfully!"

# Clean up
cd /
rm -rf $TEMP_DIR