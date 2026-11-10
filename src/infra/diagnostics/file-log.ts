import { Directory, File, Paths } from 'expo-file-system';

import {
  createDiagnosticLog,
  type DiagnosticLog,
  type DiagnosticSink,
} from '@/core/diagnostics/ring-log';

/**
 * Dziennik leży w pliku `diagnostics/log.txt` w katalogu dokumentów (Q14).
 * Nie w kv-store: ustawienia mają zostać małe i synchroniczne, a dziennik jest
 * tekstem do udostępnienia. Limit 256 KiB, najstarsze linie wypadają.
 */
function openLogFile(): File {
  const directory = new Directory(Paths.document, 'diagnostics');
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const file = new File(directory, 'log.txt');
  if (!file.exists) file.create();
  return file;
}

function fileSink(): DiagnosticSink {
  const file = openLogFile();
  return {
    read: () => (file.exists ? file.textSync() : ''),
    write: (text) => {
      file.writeSync(text);
    },
  };
}

export const diagnosticLog: DiagnosticLog = createDiagnosticLog(fileSink());
