/** Lokalny dziennik (D-16, Q14). Bufor tekstowy, bez współrzędnych. */

const DIAGNOSTIC_LOG_MAX_BYTES = 256 * 1024;

const coordinatePair = /-?\d{1,3}\.\d{3,}\s*[,;]\s*-?\d{1,3}\.\d{3,}/;
const namedCoordinate = /\b(?:lat|latitude|lon|lng|longitude)\b\s*[:=]\s*-?\d+(?:\.\d+)?/gi;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function sanitizeDiagnosticLine(line: string): string {
  const single = line.replace(/[\r\n]+/g, ' ').trim();
  if (single.length === 0) return '';
  if (coordinatePair.test(single)) return '[usunięto: współrzędne]';
  return single.replace(namedCoordinate, '[współrzędna]');
}

function byteLength(value: string): number {
  return encoder.encode(value).length;
}

export function appendDiagnosticLine(
  existing: string,
  line: string,
  maxBytes = DIAGNOSTIC_LOG_MAX_BYTES,
): string {
  const clean = sanitizeDiagnosticLine(line);
  if (clean.length === 0) return existing;
  const next = existing.length === 0 ? clean : `${existing}\n${clean}`;
  if (byteLength(next) <= maxBytes) return next;
  const lines = next.split('\n');
  while (lines.length > 1 && byteLength(lines.join('\n')) > maxBytes) {
    lines.shift();
  }
  let joined = lines.join('\n');
  if (byteLength(joined) > maxBytes) {
    const bytes = encoder.encode(joined);
    joined = decoder.decode(bytes.slice(bytes.length - maxBytes));
  }
  return joined;
}

export interface DiagnosticSink {
  read(): string;
  write(text: string): void;
}

export interface DiagnosticLog {
  append(line: string): void;
  text(): string;
  clear(): void;
}

export function createDiagnosticLog(
  sink: DiagnosticSink,
  maxBytes = DIAGNOSTIC_LOG_MAX_BYTES,
): DiagnosticLog {
  let buffer = sink.read();
  return {
    append(line) {
      buffer = appendDiagnosticLine(buffer, line, maxBytes);
      sink.write(buffer);
    },
    text() {
      return buffer;
    },
    clear() {
      buffer = '';
      sink.write(buffer);
    },
  };
}
