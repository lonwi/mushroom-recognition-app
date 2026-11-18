// Site check. `pnpm quality` runs this.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { execSync } from 'node:child_process';
import { emergencyContacts } from '../src/core/safety/emergency-contacts.ts';

const root = path.resolve('site');
const cssPath = path.join(root, 'css', 'site.css');
const textEncoding = 'utf8';
const issuesUrl = 'https://github.com/lonwi/mushroom-recognition-app/issues';
const contactEmail = 'hello@astigmatic.dev';
const pageName = 'index.html';

const expectedPages = [
  pageName,
  '404.html',
  `prywatnosc/${pageName}`,
  `usuniecie-danych/${pageName}`,
  `licencje/${pageName}`,
  `en/${pageName}`,
  `en/privacy/${pageName}`,
  `en/data-deletion/${pageName}`,
  `en/licenses/${pageName}`,
];

const trackerNeedles = [
  'fonts.googleapis',
  'fonts.gstatic',
  'googletagmanager',
  'google-analytics',
  'gtag(',
  'plausible.io',
  'cdnjs.cloudflare',
  'jsdelivr.net',
  'unpkg.com',
  'hotjar',
  'facebook.net',
  'doubleclick',
  '<script',
  '<iframe',
];

const errors = [];

function report(message) {
  errors.push(message);
}

function digitsOnly(value) {
  return value.replace(/\D/g, '');
}

function verifiedEmergencyNumbers() {
  return emergencyContacts
    .filter((contact) => contact.verified && contact.phone.trim().length > 0)
    .map((contact) => digitsOnly(contact.phone));
}

function walk(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function inside(file) {
  const fromRoot = path.relative(root, file);
  return fromRoot === '' || (!fromRoot.startsWith('..') && !path.isAbsolute(fromRoot));
}

function htmlFiles() {
  return walk(root)
    .filter((file) => file.endsWith('.html'))
    .sort();
}

function langFor(file) {
  return rel(file).startsWith('en/') ? 'en' : 'pl';
}

function checkLangAndMetadata(file, text) {
  const expected = langFor(file);
  const mark = text.match(/<html[^>]*\blang="([^"]+)"/i);
  if (!mark) report(`${rel(file)}: missing lang`);
  else if (mark[1] !== expected) report(`${rel(file)}: lang ${mark[1]}, expected ${expected}`);

  if (!text.includes('charset="utf-8"') && !text.includes('charSet="utf-8"')) {
    report(`${rel(file)}: missing utf-8 charset`);
  }
  if (!text.includes('name="viewport"')) report(`${rel(file)}: missing viewport`);
  if (!/<title>[^<]+<\/title>/.test(text)) report(`${rel(file)}: missing title`);

  const headings = text.match(/<h1[\s>]/g);
  if (!headings || headings.length !== 1) report(`${rel(file)}: expected exactly one h1`);

  // D-05: Strony PL nie mogą linkować do EN
  if (expected === 'pl' && /hreflang="en"/i.test(text)) {
    report(`${rel(file)}: PL page must not link to EN (D-05)`);
  }
  // Strony EN powinny posiadać alternate hreflang="pl"
  if (expected === 'en' && !/hreflang="pl"/i.test(text) && !rel(file).includes('404')) {
    report(`${rel(file)}: EN page missing alternate hreflang="pl"`);
  }
}

function rawLinks(text) {
  const found = [];
  const pattern = /\s(?:href|src)="([^"]*)"/gi;
  let match = pattern.exec(text);
  while (match) {
    found.push(match[1]);
    match = pattern.exec(text);
  }
  return found;
}

function extractElementIds(html) {
  const ids = new Set();
  const pattern = /\sid="([^"]+)"/gi;
  let match = pattern.exec(html);
  while (match) {
    ids.add(match[1]);
    match = pattern.exec(html);
  }
  return ids;
}

function resolvesLinkAndAnchor(fromFile, href, targetHtmlCache) {
  if (!href) return;
  const [cleanPath, anchor] = href.split('#');

  // Dozwolone schematy zewnętrzne
  if (cleanPath.startsWith('https://') || cleanPath.startsWith('mailto:')) return;
  if (cleanPath.startsWith('tel:')) {
    const num = digitsOnly(cleanPath);
    if (!verifiedEmergencyNumbers().includes(num)) {
      report(`${rel(fromFile)}: unverified tel link: ${href}`);
    }
    return;
  }
  if (/^[a-z]+:/i.test(cleanPath)) {
    report(`${rel(fromFile)}: link scheme not allowed: ${href}`);
    return;
  }

  // Odnośnik kotwicy w obrębie tego samego pliku
  if (!cleanPath && anchor) {
    let ids = targetHtmlCache.get(fromFile);
    if (!ids) {
      ids = extractElementIds(fs.readFileSync(fromFile, textEncoding));
      targetHtmlCache.set(fromFile, ids);
    }
    if (!ids.has(anchor)) {
      report(`${rel(fromFile)}: local anchor #${anchor} does not exist in file`);
    }
    return;
  }

  // Weryfikacja ścieżki pliku
  const target = path.normalize(path.join(path.dirname(fromFile), cleanPath));
  if (!inside(target)) {
    report(`${rel(fromFile)}: link leaves site/: ${href}`);
    return;
  }

  const index = path.join(target, pageName);
  let resolvedFilePath = null;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    resolvedFilePath = target;
  } else if (fs.existsSync(index) && fs.statSync(index).isFile()) {
    resolvedFilePath = index;
  } else {
    report(`${rel(fromFile)}: missing target ${href}`);
    return;
  }

  // Weryfikacja kotwicy w pliku docelowym
  if (anchor && resolvedFilePath) {
    let ids = targetHtmlCache.get(resolvedFilePath);
    if (!ids) {
      ids = extractElementIds(fs.readFileSync(resolvedFilePath, textEncoding));
      targetHtmlCache.set(resolvedFilePath, ids);
    }
    if (!ids.has(anchor)) {
      report(
        `${rel(fromFile)}: anchor #${anchor} does not exist in target ${rel(resolvedFilePath)}`,
      );
    }
  }
}

function checkCss() {
  const css = fs.readFileSync(cssPath, textEncoding);
  if (/fonts\.googleapis|fonts\.gstatic|@import\s+url\(/i.test(css)) {
    report('css: external font or import');
  }
}

function checkEmergencyNumbers(files) {
  const allowed = verifiedEmergencyNumbers();
  const phoneRegex = /\b(?:112|999|998|997)\b|\b\d{3}[-\s]\d{3}[-\s]\d{3}\b/g;

  for (const file of files) {
    const text = fs.readFileSync(file, textEncoding);
    const matches = text.match(phoneRegex) ?? [];
    for (const match of matches) {
      const digits = digitsOnly(match);
      if (!allowed.includes(digits)) {
        report(`${rel(file)}: phone number '${match}' is not in verified emergency contacts (Q19)`);
      }
    }
  }
}

function checkRobotsTxt() {
  const robotsPath = path.join(root, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    report('missing site/robots.txt');
    return;
  }
  const text = fs.readFileSync(robotsPath, textEncoding);
  if (!text.includes('Disallow: /en/')) {
    report('site/robots.txt missing Disallow: /en/ (D-05)');
  }
}

function checkLicensesAndAttributions() {
  const plLic = path.join(root, 'licencje', pageName);
  const enLic = path.join(root, 'en', 'licenses', pageName);

  for (const file of [plLic, enLic]) {
    if (!fs.existsSync(file)) {
      report(`missing ${rel(file)}`);
      continue;
    }
    const text = fs.readFileSync(file, textEncoding);
    if (!text.includes('Apache-2.0')) {
      report(`${rel(file)}: missing Apache-2.0 reference for Keras code`);
    }
    const rightsReserved = /wszelkie prawa zastrzeżone|all rights reserved/i.test(text);
    if (!rightsReserved) {
      report(`${rel(file)}: missing all rights reserved notice for model weights / app code`);
    }
  }
}

function checkContactAndRODO(files) {
  for (const file of files) {
    const text = fs.readFileSync(file, textEncoding);
    if (file.endsWith('404.html')) continue;
    if (!text.includes(contactEmail)) {
      report(`${rel(file)}: missing contact email ${contactEmail}`);
    }
    if (!text.includes(issuesUrl)) {
      report(`${rel(file)}: missing GitHub issues URL`);
    }
  }
}

function checkHtmlValidate() {
  try {
    execSync('pnpm exec html-validate "site/**/*.html"', {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    report(`html-validate failed:\n${error.stdout || error.stderr || error.message}`);
  }
}

function checkFreshness() {
  if (process.env.CI || process.argv.includes('--freshness')) {
    try {
      execSync('git diff --exit-code site/', { stdio: 'pipe' });
    } catch {
      report('site/ is out of date with generator. Run `pnpm build:site` and commit the changes.');
    }
  }
}

// -------------------------------------------------------------
// Główny ciąg weryfikacji
// -------------------------------------------------------------

console.log('🔍 [check:site] Rozpoczynanie weryfikacji katalogu site/...');

const files = htmlFiles();
if (files.length === 0) {
  report('site/ is empty or contains no HTML files. Run pnpm build:site first.');
}

for (const expected of expectedPages) {
  const expectedPath = path.join(root, expected);
  if (!fs.existsSync(expectedPath)) {
    report(`missing expected page: site/${expected}`);
  }
}

if (!fs.existsSync(cssPath)) {
  report('missing css/site.css');
} else {
  checkCss();
}

checkRobotsTxt();

const targetHtmlCache = new Map();

for (const file of files) {
  const text = fs.readFileSync(file, textEncoding);
  const where = rel(file);

  checkLangAndMetadata(file, text);

  if (!text.includes('id="tresc"')) {
    report(`${where}: missing main id="tresc"`);
  }

  for (const href of rawLinks(text)) {
    resolvesLinkAndAnchor(file, href, targetHtmlCache);
  }

  const lowered = text.toLowerCase();
  if (lowered.includes('http://')) {
    report(`${where}: insecure http:// link found`);
  }

  for (const needle of trackerNeedles) {
    if (lowered.includes(needle)) {
      report(`${where}: blocked external tracker/needle found: ${needle}`);
    }
  }

  if (
    !text.includes('http-equiv="Content-Security-Policy"') ||
    !text.includes("default-src 'none'")
  ) {
    report(`${where}: missing strict Content-Security-Policy meta tag`);
  }
}

checkEmergencyNumbers(files);
checkLicensesAndAttributions();
checkContactAndRODO(files);
checkHtmlValidate();
checkFreshness();

if (errors.length > 0) {
  console.error('\n❌ [check:site] Wykryto błędy weryfikacji strony:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  `✅ [check:site] Weryfikacja zakończona sukcesem (${files.length} stron HTML, zero błędów).`,
);
