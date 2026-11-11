import { foldForSearch } from '@/core/db/fold-search';
import { redactEmergencyNumbers } from '@/core/safety/emergency-contacts';

export function preparationHits(text: string, phrases: readonly string[]): string[] {
  const folded = foldForSearch(text);
  return phrases.filter((phrase) => folded.includes(foldForSearch(phrase)));
}

/** Wycina zdania ze słownika obróbki. Reszta tekstu dawcy zostaje. */
function stripPreparedSentences(
  text: string,
  phrases: readonly string[],
): { text: string; hits: string[] } {
  const hits: string[] = [];
  const keptChunks: string[] = [];
  for (const chunk of text.split(/\n+/)) {
    const sentences = chunk.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
    const kept: string[] = [];
    for (const sentence of sentences) {
      const found = preparationHits(sentence, phrases);
      if (found.length > 0) hits.push(...found);
      else kept.push(sentence.trim());
    }
    if (kept.length > 0) keptChunks.push(kept.join(' '));
  }
  return { text: keptChunks.join('\n').trim(), hits };
}

export function cleanCardText(
  text: string | null | undefined,
  phrases: readonly string[],
): { text: string; hits: string[] } {
  if (!text) return { text: '', hits: [] };
  return stripPreparedSentences(redactEmergencyNumbers(text), phrases);
}
