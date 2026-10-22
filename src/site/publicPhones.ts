const GROUPED_PHONE = /(?<!\d)\d{2,4}(?:[ \u00a0-]\d{2,4}){2,}(?!\d)/g;
const STANDALONE_THREE = /(?<!\d)\d{3}(?!\d)/g;
const LONG_RUN = /(?<!\d)\d{9,}(?!\d)/g;
const TEL_HREF = /href="tel:([^"]+)"/gi;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function remember(found: Set<string>, raw: string, minimumDigits: number): void {
  const digits = digitsOnly(raw);
  if (digits.length >= minimumDigits) found.add(digits);
}

/** Phone-like numbers: 3-digit emergency lines, 9+ digit runs, and spaced groups of 9+ digits. */
function phoneNumbersInText(text: string): Set<string> {
  const found = new Set<string>();
  GROUPED_PHONE.lastIndex = 0;
  STANDALONE_THREE.lastIndex = 0;
  LONG_RUN.lastIndex = 0;
  for (const match of text.matchAll(GROUPED_PHONE)) remember(found, match[0], 9);
  for (const match of text.matchAll(LONG_RUN)) found.add(match[0]);
  for (const match of text.matchAll(STANDALONE_THREE)) found.add(match[0]);
  return found;
}

function visibleText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, ' ');
}

export function phoneNumbersInHtml(html: string): Set<string> {
  const found = phoneNumbersInText(visibleText(html));
  TEL_HREF.lastIndex = 0;
  for (const match of html.matchAll(TEL_HREF)) remember(found, match[1], 1);
  return found;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

/** Phone-like numbers in `roots` that are not in `allowed`. */
export function numbersOutside(allowed: readonly string[], roots: readonly unknown[]): Set<string> {
  const permit = new Set(allowed.map(digitsOnly));
  const outside = new Set<string>();
  const strings: string[] = [];
  for (const root of roots) collectStrings(root, strings);
  for (const text of strings) {
    for (const number of phoneNumbersInText(text)) {
      if (!permit.has(number)) outside.add(number);
    }
  }
  return outside;
}
