#!/bin/bash
# Build workflow script for Grzybobranie AI

set -e  # Exit on any error

echo "=== Starting Grzybobranie AI Build Workflow ==="

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Run quality checks
echo "Running code quality checks..."
pnpm lint
pnpm typecheck
pnpm duplication
pnpm knip
pnpm depcruise

# Run tests
echo "Running tests..."
pnpm test
pnpm test:e2e

# Build Storybook
echo "Building Storybook..."
pnpm build-storybook

# Create development builds
echo "Creating development builds..."

# Android development build
echo "Creating Android development build..."
npx eas build --profile development --platform android || echo "Android build failed but continuing..."

# iOS development build  
echo "Creating iOS development build..."
npx eas build --profile development --platform ios || echo "iOS build failed but continuing..."

echo "=== Build workflow completed ==="