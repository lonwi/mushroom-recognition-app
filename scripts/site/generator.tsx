import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import prettier from 'prettier';

import { routes, type RouteMeta } from './routes';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DataDeletionPage } from './pages/DataDeletionPage';
import { LicensesPage } from './pages/LicensesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { generateCss } from './styles';
import { pl } from './i18n/pl';
import { en } from './i18n/en';

const ROOT_DIR = process.cwd();
const SITE_DIR = path.join(ROOT_DIR, 'site');

function computeAssetPrefix(outputFile: string, routeId?: string): string {
  if (routeId === 'not-found' && process.env.SITE_BASE_PATH?.trim()) {
    return process.env.SITE_BASE_PATH.trim().replace(/\/+$/, '');
  }
  const depth = outputFile.split('/').length - 1;
  if (depth === 0) return '.';
  return Array.from({ length: depth }, () => '..').join('/');
}

function renderPageComponent(route: RouteMeta, assetPrefix: string): React.ReactElement {
  switch (route.id) {
    case 'home':
      return <HomePage route={route} />;
    case 'privacy':
      return <PrivacyPage route={route} assetPrefix={assetPrefix} />;
    case 'data-deletion':
      return <DataDeletionPage route={route} />;
    case 'licenses':
      return <LicensesPage route={route} />;
    case 'not-found':
      return <NotFoundPage route={route} assetPrefix={assetPrefix} />;
  }
}

function getRouteMeta(route: RouteMeta): { title: string; description: string } {
  const strings = route.locale === 'pl' ? pl : en;
  switch (route.id) {
    case 'home':
      return strings.meta.home;
    case 'privacy':
      return strings.meta.privacy;
    case 'data-deletion':
      return strings.meta.dataDeletion;
    case 'licenses':
      return strings.meta.licenses;
    case 'not-found':
      return strings.meta.notFound;
  }
}

async function writeFormattedFile(file: string, content: string): Promise<void> {
  const config = await prettier.resolveConfig(file);
  const formatted = await prettier.format(content, { ...config, filepath: file });
  writeFileSync(file, formatted, 'utf8');
}

export async function buildSite(): Promise<void> {
  console.log('🍄 [build:site] Generowanie strony statycznej Grzybobranie AI...');
  mkdirSync(SITE_DIR, { recursive: true });
  mkdirSync(path.join(SITE_DIR, 'css'), { recursive: true });

  // 1. Generowanie CSS
  const css = generateCss();
  await writeFormattedFile(path.join(SITE_DIR, 'css', 'site.css'), css);
  console.log('✓ Wygenerowano site/css/site.css');

  // 2. Kopiowanie icon.svg
  const iconSource = path.join(ROOT_DIR, 'assets', 'icon.svg');
  const iconTarget = path.join(SITE_DIR, 'icon.svg');
  copyFileSync(iconSource, iconTarget);
  console.log('✓ Skopiowano site/icon.svg');

  // 3. Generowanie robots.txt (strony EN mają meta noindex, nofollow, co wymaga braku blokady pobierania)
  const robotsTxt = ['User-agent: *', 'Allow: /', ''].join('\n');
  writeFileSync(path.join(SITE_DIR, 'robots.txt'), robotsTxt, 'utf8');
  console.log('✓ Wygenerowano site/robots.txt (Allow: /)');

  // 4. Generowanie stron HTML
  for (const route of routes) {
    const assetPrefix = computeAssetPrefix(route.outputFile, route.id);
    const { title, description } = getRouteMeta(route);

    const pageContent = renderPageComponent(route, assetPrefix);
    const fullTree = (
      <Layout route={route} title={title} description={description} assetPrefix={assetPrefix}>
        {pageContent}
      </Layout>
    );

    const rawMarkup = '<!DOCTYPE html>\n' + renderToStaticMarkup(fullTree);
    const unescapedMarkup = rawMarkup.replace(/&#x27;/g, "'");
    const targetPath = path.join(SITE_DIR, route.outputFile);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    await writeFormattedFile(targetPath, unescapedMarkup);
    console.log(`✓ Wygenerowano site/${route.outputFile}`);
  }

  console.log('🎉 [build:site] Sukces! Wygenerowano wszystkie pliki w katalogu site/');
}

// Wywołanie CLI gdy skrypt jest uruchamiany bezpośrednio
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSite().catch((error) => {
    console.error('❌ Błąd podczas budowy strony:', error);
    process.exit(1);
  });
}
