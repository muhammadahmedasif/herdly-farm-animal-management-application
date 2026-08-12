/**
 * Herdly — local image file management.
 *
 * Animal/calf photos are NEVER stored inside SQLite. The database keeps only a
 * local file URI. Picked images (temporary expo-image-picker URIs) are copied
 * into the app's own document directory under `animal-images/<id>.jpg`, lightly
 * re-compressed via expo-image-manipulator so file sizes stay reasonable.
 *
 * Missing source files are handled gracefully (the original URI is kept) so a
 * broken reference never crashes the app — the UI shows a placeholder instead.
 */
import { Paths, File, Directory } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const DOC = Paths.document.uri.endsWith('/') ? Paths.document.uri : `${Paths.document.uri}/`;
const IMAGE_DIR = `${DOC}animal-images/`;

let dirReady: Promise<void> | null = null;

function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = (async () => {
      const dir = new Directory(IMAGE_DIR);
      dir.create({ intermediates: true, idempotent: true });
    })().catch(() => {});
  }
  return dirReady;
}

/** True when the URI already lives inside our managed directory. */
export function isManagedUri(uri: string | null | undefined): boolean {
  return !!uri && uri.startsWith(IMAGE_DIR);
}

async function fileExists(uri: string): Promise<boolean> {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Persist (copy + compress) a source image into the managed directory, keyed by
 * the animal/calf id. Returns the permanent local URI, or '' when no image.
 *
 * If `sourceUri` is empty -> '' (callers should delete the old file).
 * If already managed -> returned unchanged.
 * If the source is missing/broken -> the original URI is returned as-is.
 */
export async function persistAnimalImage(
  id: string,
  sourceUri: string | null | undefined,
): Promise<string> {
  if (!sourceUri) return '';

  if (isManagedUri(sourceUri)) {
    return sourceUri;
  }

  await ensureDir();

  const dest = new File(IMAGE_DIR, `${id}.jpg`);

  if (await fileExists(dest.uri)) {
    try { dest.delete(); } catch { /* ignore */ }
  }

  try {
    const compressed = await manipulateAsync(sourceUri, [], {
      compress: 0.8,
      format: SaveFormat.JPEG,
    });
    const compressedFile = new File(compressed.uri);
    await compressedFile.copy(dest);
    // Clean up the manipulator's temporary output.
    try { compressedFile.delete(); } catch { /* ignore */ }
    return dest.uri;
  } catch {
    // Source file missing or unreadable — keep the reference; UI shows placeholder.
    return sourceUri;
  }
}

/** Remove a managed image file. Failures are ignored (idempotent cleanup). */
export async function deleteAnimalImage(id: string): Promise<void> {
  const dest = new File(IMAGE_DIR, `${id}.jpg`);
  if (dest.exists) {
    try { dest.delete(); } catch { /* ignore */ }
  }
}
