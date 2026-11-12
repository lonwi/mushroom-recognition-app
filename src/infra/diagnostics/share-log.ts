import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { diagnosticLog } from '@/infra/diagnostics/file-log';
import { isPlatformWeb } from '@/infra/platform';

export async function shareDiagnosticLog(dialogTitle: string): Promise<'shared' | 'unavailable'> {
  if (isPlatformWeb()) return 'unavailable';
  try {
    const file = new File(Paths.cache, 'grzybobranie-diagnostyka.txt');
    if (!file.exists) file.create();
    file.writeSync(diagnosticLog.text());
    const available = await Sharing.isAvailableAsync();
    if (!available) return 'unavailable';
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      dialogTitle,
    });
    return 'shared';
  } catch {
    return 'unavailable';
  }
}
