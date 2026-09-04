/**
 * File System Access API helper with graceful fallback for all browsers.
 * Allows opening and saving projects directly to/from the local disk without repeated downloads.
 */

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

export async function openProjectWithPicker(): Promise<{
  file: File;
  handle?: FileSystemFileHandle;
} | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }
  try {
    const handles = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Art Draw Studio Project (*.ads.json, *.json)',
          accept: {
            'application/json': ['.ads.json', '.ads', '.json'],
          },
        },
      ],
      multiple: false,
    });
    if (!handles || handles.length === 0) return null;
    const handle = handles[0] as FileSystemFileHandle;
    const file = await handle.getFile();
    return { file, handle };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled picker
      return null;
    }
    console.warn('File System Access open failed, falling back:', err);
    return null;
  }
}

export async function saveProjectWithPicker(
  jsonContent: string,
  options: {
    handle?: FileSystemFileHandle;
    suggestedName: string;
    forceSaveAs?: boolean;
  }
): Promise<{
  success: boolean;
  handle?: FileSystemFileHandle;
  fileName?: string;
  cancelled?: boolean;
}> {
  const cleanName = options.suggestedName.replace(/\.[^/.]+$/, '');
  const targetFileName = `${cleanName}.ads.json`;

  // 1. If we already have a valid fileHandle and forceSaveAs is false, write directly to existing file
  if (options.handle && !options.forceSaveAs) {
    try {
      if (typeof (options.handle as any).queryPermission === 'function') {
        const status = await (options.handle as any).queryPermission({ mode: 'readwrite' });
        if (status !== 'granted') {
          const req = await (options.handle as any).requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') {
            throw new Error('Permission to write to file was not granted');
          }
        }
      }
      const writable = await (options.handle as any).createWritable();
      await writable.write(jsonContent);
      await writable.close();
      return { success: true, handle: options.handle, fileName: options.handle.name };
    } catch (err: any) {
      console.warn('Direct write to handle failed, prompting save picker:', err);
      // If direct write fails (e.g. file removed or permission revoked), fall through to save picker
    }
  }

  // 2. Use showSaveFilePicker if supported
  if (isFileSystemAccessSupported()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: targetFileName,
        types: [
          {
            description: 'Art Draw Studio Project (*.ads.json)',
            accept: {
              'application/json': ['.ads.json', '.json'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonContent);
      await writable.close();
      return { success: true, handle, fileName: handle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User deliberately cancelled the save dialog
        return { success: false, cancelled: true };
      }
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // 3. Fallback: browser blob download
  fallbackDownload(jsonContent, targetFileName, 'application/json');
  return { success: true, fileName: targetFileName };
}

export function fallbackDownload(
  content: string,
  fileName: string,
  mimeType: string = 'application/json'
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
