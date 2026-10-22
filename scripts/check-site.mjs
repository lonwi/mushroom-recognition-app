// Local check for site/. Not part of pnpm quality.
// Markup can also be sent to https://validator.w3.org/nu/
import fs from 'node:fs';
import path from 'node:path';

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
const blockedFragments = [
  '619 63 01',
  '226196301',
  '12 411 99 99',
  '124119999',
  '58 682 04 04',
  '586820404',
  '61 847 69 46',
  '618476946',
  '42 657 99 00',
  '426579900',
  '71 343 30 08',
  '713433008',
  'Solidarności 67',
  'Jakubowskiego',
  'Powstania Styczniowego',
  'Teresy 8',
  'Fieldorfa',
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
];

const errors = [];

function report(message) {
  errors.push(message);
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
  if (clean === 'tel:112' || clean === 'tel:999') return;
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

function checkRequired(files) {
  const names = new Set(files.map(rel));
  for (const [left, right] of pairs) {
    if (!names.has(left)) report(`missing ${left}`);
    if (!names.has(right)) report(`missing ${right}`);
  }
  const home = fs.readFileSync(path.join(root, pageName), textEncoding);
  const english = fs.readFileSync(path.join(root, `en/${pageName}`), textEncoding);
  for (const needle of ['112', '999', 'grzyboznawc', 'klasyfikator', 'Pomoc', 'Makieta']) {
    if (!home.includes(needle)) report(`Polish home missing ${needle}`);
  }
  for (const needle of ['112', '999', 'grzyboznawca', 'Pomoc', 'Placeholder']) {
    if (!english.includes(needle)) report(`English home missing ${needle}`);
  }
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
  for (const fragment of blockedFragments) {
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

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(`site check ok (${files.length} pages)`);
