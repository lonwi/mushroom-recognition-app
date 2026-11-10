import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { diagnosticLog } from '@/infra/diagnostics/file-log';

export async function shareDiagnosticLog(dialogTitle: string): Promise<'shared' | 'unavailable'> {
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
}
