# Build Instructions for Grzybobranie AI

## Overview
This document provides comprehensive build instructions for the Grzybobranie AI mushroom recognition app.

## Prerequisites

### Software Requirements:
- Node.js 22 or 24 (as specified in package.json)
- pnpm 10.33.4 (as specified in package.json)
- EAS CLI installed: `npm install -g eas-cli`
- Expo CLI installed: `npm install -g expo-cli`

### Platform Requirements:
- Android Studio (for Android builds)
- Xcode (for iOS builds)

## Development Environment Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Initialize EAS Project
```bash
# If not already initialized
eas init

# Configure project settings
eas build:configure
```

## Build Profiles

### Development Builds (for local testing)
```bash
# For Android development
npx eas build --profile development --platform android

# For iOS development  
npx eas build --profile development --platform ios
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

### Code Quality Checks
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

### Testing Pipeline
```bash
# Unit tests
pnpm test

# End-to-end tests
pnpm test:e2e

# Storybook builds (for UI testing)
pnpm build-storybook
```

## Image Optimization Process

### Converting JPEG to WebP Format
The app currently uses JPEG images which are being upgraded to WebP format for better compression:

```bash
# Install ImageMagick first (if needed):
# Ubuntu/Debian: sudo apt-get install imagemagick
# macOS: brew install imagemagick

# Run the conversion script:
node scripts/convert-mushroom-images.js

# After conversion, update the import paths in src/utils/mushroomImages.ts
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

## Performance Optimization

### Image Size Reduction
The WebP conversion should provide:
- 25-35% smaller file sizes compared to JPEG
- Better compression quality
- Modern web standard support

### Testing on Target Devices
```bash
# Test performance on various devices:
# - Low-end Android phones
# - Mid-range devices  
# - High-end devices
```

## Deployment Process

### Android Deployment
```bash
# Create signed APK for production
npx eas build --profile production --platform android

# Upload to Google Play Console (after internal testing)
```

### iOS Deployment  
```bash
# Create signed IPA for production
npx eas build --profile production --platform ios

# Upload to App Store Connect (after internal testing)
```

## Troubleshooting

### Common Issues:

1. **Build failures due to missing native dependencies**
   - Ensure all required plugins are configured in app.json
   - Check that react-native-fast-tflite is properly linked

2. **Asset loading issues**
   - Verify assets are correctly referenced in code
   - Ensure WebP conversion was successful for image assets

3. **Performance issues on low-end devices**
   - Optimize images and assets
   - Implement lazy loading where appropriate

## Best Practices

### Version Control Strategy:
- Use semantic versioning (major.minor.patch)
- Create release branches for production builds
- Tag releases with git tags

### Security Considerations:
- All code must be properly minified for production
- Remove debug logging in production builds
- Ensure all native modules are properly configured
- Verify asset integrity
- Check for proper permission handling

## Testing Strategy

### Pre-Release Testing:
1. Functional testing of all main features
2. Performance testing on various device types
3. Security audit of native modules
4. Offline functionality verification
5. Safety critical feature validation

This comprehensive build workflow ensures your mushroom recognition app meets the safety and performance requirements for field use while maintaining proper production-grade quality.