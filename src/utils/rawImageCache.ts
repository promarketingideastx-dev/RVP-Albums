"use client";

const MAX_CACHED_IMAGES = 3;

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

export async function preloadRawImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached) {
    imageCache.delete(url);
    imageCache.set(url, cached);
    return cached;
  }

  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // Some browsers can still draw a loaded image if decode fails.
      }

      imageCache.set(url, img);

      while (imageCache.size > MAX_CACHED_IMAGES) {
        const oldest = imageCache.keys().next().value;
        if (oldest === undefined) break;
        imageCache.delete(oldest);
      }

      resolve(img);
    };

    img.onerror = () => reject(new Error('Image preload failed'));
    img.src = url;
  });

  pendingLoads.set(url, promise);

  try {
    return await promise;
  } finally {
    pendingLoads.delete(url);
  }
}

export function getCachedRawImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(url);
}

export function clearRawImageCache(): void {
  imageCache.clear();
  pendingLoads.clear();
}
