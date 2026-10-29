# Mushroom Recognition App - Build Workflow

## Overview
This document outlines the recommended build workflow for the Grzybobranie AI app, which is designed for field use and requires production-grade builds.

## Prerequisites
- Node.js 22 or 24 (as specified in package.json)
- pnpm 10.33.4 (as specified in package.json)
- EAS CLI installed: `npm install -g eas-cli`
- Expo CLI installed: `npm install -g expo-cli`
- Android Studio and Xcode (for native builds)

## Development Environment Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up EAS project
```bash
# Initialize EAS if not already done
eas init

# Configure your project
eas build:configure
```

## Build Profiles

### Development Builds (for testing)
```bash
# For Android development
npx eas build --profile development --platform android

# For iOS development  
npx eas build --profile development --platform ios

# For web development
pnpm web
```

### Preview Builds (for internal testing)
```bash
# For Android preview
npx eas build --profile preview --platform android

# For iOS preview
npx eas build --profile preview --platform ios
```

### Production Builds
```bash
# For Android production
npx eas build --profile production --platform android

# For iOS production
npx eas build --profile production --platform ios
```

## Quality Assurance Pipeline

### 1. Code Quality Checks
```bash
# TypeScript type checking
pnpm typecheck

# Linting
pnpm lint

# Duplication detection
pnpm duplication

# Dependency checks
pnpm knip

# Architecture checks  
pnpm depcruise
```

### 2. Testing Pipeline
```bash
# Unit tests
pnpm test

# End-to-end tests
pnpm test:e2e

# Storybook builds (for UI testing)
pnpm build-storybook
```

## Recommended Development Workflow

### 1. Local Development
```bash
# Start development server
pnpm start

# Run on Android emulator/device
pnpm android

# Run on iOS simulator/device  
pnpm ios
```

### 2. Pre-Production Testing
```bash
# Create a development build for testing
npx eas build --profile development --platform android

# Run comprehensive tests
pnpm quality
pnpm test
pnpm test:e2e
```

### 3. Production Release Process
```bash
# Create production build with version increment
npx eas build --profile production --platform android

# For iOS (requires Apple Developer account setup)
npx eas build --profile production --platform ios

# Submit to stores
npx eas submit --profile production
```

## Asset Management

### Image Optimization
Since we identified the current JPEG images need upgrading to WebP:

```bash
# Install image processing tools (if needed)
pnpm install sharp --save-dev

# Create a conversion script for mushroom images
node scripts/convert-mushroom-images.js
```

### File Size Optimization
```bash
# Check asset sizes
find assets/ -type f -name "*.jpg" -o -name "*.png" | xargs ls -lh

# After WebP conversion, verify file size reduction
find assets/mushrooms/ -type f -name "*.webp" | xargs ls -lh
```

## Deployment Process

### 1. Android Deployment
```bash
# Create signed APK for production
npx eas build --profile production --platform android

# Upload to Google Play Console (after internal testing)
```

### 2. iOS Deployment  
```bash
# Create signed IPA for production
npx eas build --profile production --platform ios

# Upload to App Store Connect (after internal testing)
```

## Environment Variables Setup

### For EAS builds, create:
1. `eas.json` - Contains all build profiles
2. `.env` files for different environments
3. EAS secrets management for sensitive data

## Performance Testing

### Before Production Release:
```bash
# Test performance on actual devices
npx eas build --profile development --platform android

# Measure app size and load times
# Test on devices with different specs (low-end to high-end)
```

## Security Considerations

### For production builds:
1. All code must be properly minified
2. Remove debug logging
3. Ensure all native modules are properly configured
4. Verify asset integrity
5. Check for proper permission handling

## Best Practices

### 1. Version Control Strategy
- Use semantic versioning (major.minor.patch)
- Create release branches for production builds
- Tag releases with git tags

### 2. CI/CD Pipeline (if using GitHub Actions or similar)
```yaml
# Example workflow (add to .github/workflows/ci.yml)
name: CI Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        cache: 'pnpm'
        
    - name: Install dependencies
      run: pnpm install
      
    - name: Run quality checks
      run: |
        pnpm lint
        pnpm typecheck
        pnpm duplication
        pnpm knip
        
    - name: Run tests
      run: pnpm test
```

## Troubleshooting

### Common Issues and Solutions:

1. **Build failures due to missing native dependencies**
   - Ensure all required plugins are configured in app.json
   - Check that react-native-fast-tflite is properly linked

2. **Asset loading issues**
   - Verify assets are correctly referenced in code
   - Ensure WebP conversion was successful for image assets

3. **Performance issues on low-end devices**
   - Optimize images and assets
   - Implement lazy loading where appropriate

## Testing Strategy

### Pre-Release Testing:
1. Functional testing of all main features
2. Performance testing on various device types
3. Security audit of native modules
4. Offline functionality verification
5. Safety critical feature validation

This workflow ensures your mushroom recognition app meets the safety and performance requirements for field use while maintaining proper production-grade quality.