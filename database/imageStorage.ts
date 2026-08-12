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
 *
 * expo-file-system is unsupported on web, so on web the original URIs are kept
 * as-is and no local copies are made.
 */
import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const IS_WEB = Platform.OS === 'web';

let imageDir: string | null = null;
function managedDir(): string {
  if (!imageDir) {
    const doc = Paths.document.uri;
    imageDir = `${doc.endsWith('/') ? doc : `${doc}/`}animal-images/`;
  }
  return imageDir;
}

let dirReady: Promise<void> | null = null;

function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = (async () => {
      const dir = new Directory(managedDir());
      dir.create({ intermediates: true, idempotent: true });
    })().catch(() => {});
  }
  return dirReady;
}

/** True when the URI already lives inside our managed directory. */
export function isManagedUri(uri: string | null | undefined): boolean {
  return !IS_WEB && !!uri && uri.startsWith(managedDir());
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
 * On web -> the original URI is returned unchanged (no local filesystem).
 */
export async function persistAnimalImage(
  id: string,
  sourceUri: string | null | undefined,
): Promise<string> {
  if (!sourceUri) return '';

  if (IS_WEB) {
    return sourceUri;
  }

  if (isManagedUri(sourceUri)) {
    return sourceUri;
  }

  await ensureDir();

  const dest = new File(managedDir(), `${id}.jpg`);

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
  if (IS_WEB) return;
  const dest = new File(managedDir(), `${id}.jpg`);
  if (dest.exists) {
    try { dest.delete(); } catch { /* ignore */ }
  }
}

/**
 * Resolves a stored image URI. If it's a managed local image, we rewrite the path
 * dynamically to the current app document directory since the sandbox UUID changes
 * on every new build/install.
 */
export function resolveAnimalImageUri(uri: string | null | undefined): string {
  if (!uri) return '';
  if (IS_WEB) return uri;
  
  // If it contains '/animal-images/', extract the filename and point to the current managed directory
  const match = uri.match(/\/animal-images\/([^/]+)$/);
  if (match) {
    const filename = match[1];
    return `${managedDir()}${filename}`;
  }
  return uri;
}