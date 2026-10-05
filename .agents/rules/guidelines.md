# Agent Guidelines for Grzybobranie AI

- **Package Manager**: Use `pnpm` exclusively (`pnpm.cmd` on Windows).
- **Safe Area**: Always import `SafeAreaView` from `react-native-safe-area-context`, never from `react-native`.
- **UI Framework**: Use React Native Paper (MD3 theme from `src/theme/paperTheme.ts`).
- **Offline ML**: Do not emit a species or a confidence unless a packaged TFLite model read the photo's pixels and the calibrated energy gate accepted the image. A missing or uncalibrated model returns recognition unavailable, with no confidence floor and no fake inference time. Never show an edibility verdict from the model. Training photos must be CC0 or CC-BY.
- **Testing**:
  - Run `pnpm test` for Jest & RTL tests (`@testing-library/react-native`). Use `await render(...)` for RNTL v14+.
  - Run `pnpm test:e2e` for Playwright E2E browser tests.
  - Run `pnpm build-storybook` to verify Storybook 8 web builds.
- **Safety First**: Never bypass or weaken edibility badges, look-alike alerts, or Sanepid toxicology disclaimers.
