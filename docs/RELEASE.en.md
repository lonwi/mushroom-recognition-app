# Grzybobranie AI Release Guide

> 🇵🇱 [Polska wersja](RELEASE.md)

A `vX.Y.Z` git tag triggers [`.github/workflows/release.yml`](../.github/workflows/release.yml). First, the `verify` job ensures the tagged commit is on `origin/main`, executes typechecking, `pnpm test`, and E2E tests, and asserts that the version following `v` matches `expo.version`. Next, the `build` job (`release-build` environment) executes `eas build --profile production --platform all --non-interactive --json` and captures the Android and iOS build IDs. Finally, the `submit` job awaits approval on the `production` environment and submits specifically those two build IDs via `eas submit --id`.

The release workflow pins actions to commit SHAs and uses `eas-cli` **24.12.0**. Use the matching version locally: `npx eas-cli@24.12.0`.

---

## 1. Expo Account and `eas init`

1. Create an Expo account at [https://expo.dev/signup](https://expo.dev/signup) if you do not already have one. The owner name or organization will be used as `expo.owner`.
2. Install project dependencies (`pnpm install`) and log in:
   ```bash
   npx eas-cli@24.12.0 login
   ```
3. Initialize the EAS project:
   ```bash
   npx eas-cli@24.12.0 init
   ```
   Select your existing Expo account and confirm linking.

---

## 2. GitHub Environments and Secrets

Configure two GitHub environments in **Settings → Environments**:

### Environment `release-build`
- **Secret**: `EXPO_TOKEN` — Personal access token generated from your Expo account settings with permissions to build.
- **Deployment branches**: Restrict to tags matching `v*`.

### Environment `production`
- **Secret**: `EXPO_TOKEN` — Same or dedicated submission token.
- **Required reviewers**: Configure repository owner review required before the `submit` job runs.
- **Deployment branches**: Restrict to tags matching `v*`.

---

## 3. Store Credentials

Configure signing credentials for iOS (Apple Developer Program) and Android (Google Play Console) through EAS:
```bash
npx eas-cli@24.12.0 credentials
```
Ensure production keystores and distribution certificates are securely managed in EAS secrets, never committed to Git.

---

## 4. Release Checklist

1. Verify all tests and quality gates pass on `main`:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm quality
   pnpm build-storybook && pnpm test:e2e
   ```
2. Verify `version` in `package.json` and `expo.version` in `app.json` are synchronized to `X.Y.Z`.
3. Create and push the release tag:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. Monitor the GitHub Actions workflow. Once `verify` and `build` succeed, approve the `production` environment deployment to proceed with store submission.
