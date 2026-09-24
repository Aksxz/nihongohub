import { idb } from '../db/idb';

/**
 * Triggers a browser download of the complete IndexedDB backup in JSON format.
 */
export async function downloadBackup(): Promise<void> {
  const jsonString = await idb.exportAllData();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `nihongohub-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reads a JSON file uploaded by the user and parses it.
 */
export async function readJsonFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as string) || '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
