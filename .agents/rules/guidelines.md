# Agent Guidelines for Grzybobranie AI

- **Package Manager**: Use `pnpm` exclusively (`pnpm.cmd` on Windows).
- **Safe Area**: Always import `SafeAreaView` from `react-native-safe-area-context`, never from `react-native`.
- **UI Framework**: Use React Native Paper (MD3 theme from `src/theme/paperTheme.ts`).
- **Offline ML**: TensorFlow.js operations in `src/services/classifierService.ts` must use `tf.tidy()` to avoid memory leaks.
- **Testing**:
  - Run `pnpm test` for Jest & RTL tests (`@testing-library/react-native`). Use `await render(...)` for RNTL v14+.
  - Run `pnpm test:e2e` for Playwright E2E browser tests.
  - Run `pnpm build-storybook` to verify Storybook 8 web builds.
- **Safety First**: Never bypass or weaken edibility badges, look-alike alerts, or Sanepid toxicology disclaimers.
