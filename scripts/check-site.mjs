// Site check. `pnpm quality` runs this. Markup can also go to https://validator.w3.org/nu/
import fs from 'node:fs';
import path from 'node:path';
import * as safetyRules from '../src/data/safetyRules.ts';
import { digitsOnly, numbersOutside, phoneNumbersInHtml } from '../src/site/publicPhones.ts';

const root = path.resolve('site');
const cssPath = path.join(root, 'css', 'site.css');
const textEncoding = 'utf8';
const issuesUrl = 'https://github.com/lonwi/mushroom-recognition-app/issues';
const pageName = 'index.html';
const pairs = [
  [pageName, `en/${pageName}`],
  [`prywatnosc/${pageName}`, `en/privacy/${pageName}`],
  [`licencje/${pageName}`, `en/licenses/${pageName}`],
];
const balanced = ['html', 'head', 'body', 'header', 'main', 'footer', 'nav'];
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
];

const errors = [];

function report(message) {
  errors.push(message);
}

function emergencyNumbers() {
  return safetyRules.EMERGENCY_CALLS.map((call) => call.number);
}

function emergencyTelHref(number) {
  return `tel:${digitsOnly(number)}`;
}

function pushAddressParts(fragments, address) {
  fragments.push(address);
  for (const part of address.split(',')) {
    const piece = part.trim();
    if (piece.length >= 8) fragments.push(piece);
  }
}

function toxicologyFragments() {
  const fragments = [];
  for (const center of safetyRules.TOXICOLOGY_CENTERS) {
    pushAddressParts(fragments, center.address);
    for (const phone of center.phones) {
      fragments.push(phone);
      fragments.push(digitsOnly(phone));
    }
  }
  return fragments;
}

function walk(dir) {
  const found = [];
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
  return walk(root).filter((file) => file.endsWith('.html')).sort();
}

function langFor(file) {
  return rel(file).startsWith('en/') ? 'en' : 'pl';
}

function checkLang(file, text) {
  const expected = langFor(file);
  const mark = text.match(/<html[^>]*\blang="([^"]+)"/i);
  if (!mark) report(`${rel(file)}: missing lang`);
  else if (mark[1] !== expected) report(`${rel(file)}: lang ${mark[1]}, expected ${expected}`);
  if (!text.includes('charset="utf-8"') && !text.includes("charset='utf-8'")) {
    report(`${rel(file)}: missing utf-8 charset`);
  }
  if (!text.includes('name="viewport"')) report(`${rel(file)}: missing viewport`);
  if (!/<title>[^<]+<\/title>/.test(text)) report(`${rel(file)}: missing title`);
  const headings = text.match(/<h1[\s>]/g);
  if (!headings || headings.length !== 1) report(`${rel(file)}: expected one h1`);
}

function checkBalance(file, text) {
  for (const tag of balanced) {
    const open = text.match(new RegExp(`<${tag}[\\s>]`, 'gi'))?.length ?? 0;
    const close = text.match(new RegExp(`</${tag}>`, 'gi'))?.length ?? 0;
    if (open !== close) report(`${rel(file)}: <${tag}> ${open} vs </${tag}> ${close}`);
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

function resolves(fromFile, href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return;
  if (clean.startsWith('https://')) return;
  if (emergencyNumbers().some((number) => clean === emergencyTelHref(number))) return;
  if (/^[a-z]+:/i.test(clean)) {
    report(`${rel(fromFile)}: link scheme not allowed: ${href}`);
    return;
  }
  const target = path.normalize(path.join(path.dirname(fromFile), clean));
  if (!inside(target)) {
    report(`${rel(fromFile)}: link leaves site/: ${href}`);
    return;
  }
  const index = path.join(target, pageName);
  const fileHit = fs.existsSync(target) && fs.statSync(target).isFile();
  const indexHit = fs.existsSync(index) && fs.statSync(index).isFile();
  if (!fileHit && !indexHit) report(`${rel(fromFile)}: missing target ${href}`);
}

function linkedTo(file, text, other) {
  const want = path.resolve(root, other);
  for (const href of rawLinks(text)) {
    const clean = href.split('#')[0].split('?')[0];
    if (!clean || /^[a-z]+:/i.test(clean)) continue;
    const target = path.normalize(path.join(path.dirname(file), clean));
    const index = path.join(target, pageName);
    if (target === want || index === want) return;
  }
  report(`${rel(file)}: no link to ${other}`);
}

function checkCss() {
  const css = fs.readFileSync(cssPath, textEncoding);
  if (/fonts\.googleapis|fonts\.gstatic|@import\s+url\(/i.test(css)) {
    report('css: external font or import');
  }
  if (/border-left|border-inline-start|border-right\s*:/i.test(css)) {
    report('css: side border');
  }
  const radiusRule = /(?:border-radius|--radius-[\w-]+)\s*:\s*([^;}{]+)/g;
  let match = radiusRule.exec(css);
  while (match) {
    const numbers = match[1].match(/(\d+(?:\.\d+)?)px/g) ?? [];
    for (const token of numbers) {
      const size = Number.parseFloat(token);
      if (size < 3 || size > 6) report(`css: radius ${token} is outside 3–6px`);
    }
    match = radiusRule.exec(css);
  }
}

function sameNumbers(left, right) {
  return [...left].sort().join() === [...right].sort().join();
}

function checkEmergencyNumbers(files) {
  const allowed = emergencyNumbers().map((number) => digitsOnly(number));
  const found = new Set();
  const pages = files.map((file) => fs.readFileSync(file, textEncoding));
  for (const html of pages) {
    for (const number of phoneNumbersInHtml(html)) found.add(number);
  }
  if (!sameNumbers(found, allowed)) {
    report(`site phones [${[...found].sort().join(' ')}] != EMERGENCY_CALLS [${[...allowed].sort().join(' ')}]`);
  }
  const corpus = pages.join('\n');
  for (const number of numbersOutside(allowed, [safetyRules])) {
    if (corpus.includes(number)) report(`site contains a non-emergency number from safetyRules (${number})`);
  }
  for (const center of safetyRules.TOXICOLOGY_CENTERS) {
    for (const phone of center.phones) {
      if (corpus.includes(phone) || corpus.includes(digitsOnly(phone))) {
        report(`site contains the ${center.city} toxicology line`);
      }
    }
  }
}

function requireIncludes(text, label, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) report(`${label} missing ${needle}`);
  }
}

function checkPagePairs(names) {
  for (const [left, right] of pairs) {
    if (!names.has(left)) report(`missing ${left}`);
    if (!names.has(right)) report(`missing ${right}`);
  }
}

function checkRequired(files) {
  checkPagePairs(new Set(files.map(rel)));
  const home = fs.readFileSync(path.join(root, pageName), textEncoding);
  const english = fs.readFileSync(path.join(root, `en/${pageName}`), textEncoding);
  const numbers = emergencyNumbers();
  requireIncludes(home, 'Polish home', numbers);
  requireIncludes(english, 'English home', numbers);
  requireIncludes(home, 'Polish home', ['grzyboznawc', 'klasyfikator', 'Pomoc', 'Makieta']);
  requireIncludes(english, 'English home', ['grzyboznawca', 'Pomoc', 'Placeholder']);
  for (const privacy of [`prywatnosc/${pageName}`, `en/privacy/${pageName}`]) {
    const text = fs.readFileSync(path.join(root, privacy), textEncoding);
    if (!text.includes(issuesUrl)) report(`${privacy}: missing issues link`);
  }
}

const files = htmlFiles();
if (!fs.existsSync(cssPath)) report('missing css/site.css');
else checkCss();

for (const file of files) {
  const text = fs.readFileSync(file, textEncoding);
  const where = rel(file);
  checkLang(file, text);
  checkBalance(file, text);
  if (!text.includes('id="tresc"')) report(`${where}: missing main id`);
  for (const href of rawLinks(text)) resolves(file, href);
  const lowered = text.toLowerCase();
  if (lowered.includes('http://')) report(`${where}: http link`);
  for (const needle of trackerNeedles) {
    if (lowered.includes(needle)) report(`${where}: blocked ${needle}`);
  }
  if (!text.includes('http-equiv="Content-Security-Policy"') || !text.includes("default-src 'none'")) {
    report(`${where}: missing strict Content-Security-Policy`);
  }
  for (const fragment of toxicologyFragments()) {
    if (text.includes(fragment)) report(`${where}: toxicology detail`);
  }
}

for (const [left, right] of pairs) {
  const leftFile = path.join(root, left);
  const rightFile = path.join(root, right);
  if (!fs.existsSync(leftFile) || !fs.existsSync(rightFile)) continue;
  linkedTo(leftFile, fs.readFileSync(leftFile, textEncoding), right);
  linkedTo(rightFile, fs.readFileSync(rightFile, textEncoding), left);
}

checkRequired(files);
checkEmergencyNumbers(files);

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(`site check ok (${files.length} pages)`);
