import { Directory, File, Paths } from 'expo-file-system';

import {
  createDiagnosticLog,
  type DiagnosticLog,
  type DiagnosticSink,
} from '@/core/diagnostics/ring-log';
import { isPlatformWeb } from '@/infra/platform';

/**
 * Dziennik leży w pliku `diagnostics/log.txt` w katalogu dokumentów (Q14).
 * Nie w kv-store: ustawienia mają zostać małe i synchroniczne, a dziennik jest
 * tekstem do udostępnienia. Limit 256 KiB, najstarsze linie wypadają.
 * Na platformie Web expo-file-system nie posiada wsparcia dla Paths.document,
 * dlatego używany jest sink pamięciowy.
 */
function openLogFile(): File | null {
  if (isPlatformWeb()) return null;
  try {
    const directory = new Directory(Paths.document, 'diagnostics');
    if (!directory.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
    const file = new File(directory, 'log.txt');
    if (!file.exists) file.create();
    return file;
  } catch {
    return null;
  }
}

function fileSink(): DiagnosticSink {
  let memoryLog = '';
  const file = openLogFile();
  if (!file) {
    return {
      read: () => memoryLog,
      write: (text) => {
        memoryLog = text;
      },
    };
  }
  return {
    read: () => (file.exists ? file.textSync() : ''),
    write: (text) => {
      file.writeSync(text);
    },
  };
}

export const diagnosticLog: DiagnosticLog = createDiagnosticLog(fileSink());
