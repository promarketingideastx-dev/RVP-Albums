import { v4 as uuidv4 } from 'uuid';

export interface StorageQuotaInfo {
  quotaBytes?: number;
  usageBytes?: number;
  availableBytes?: number;
  isNearFull: boolean;
}

/**
 * Checks available storage quota in browser IndexedDB before ingesting files.
 */
export async function getStorageQuotaEstimate(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = Math.max(0, quota - usage);
      return {
        quotaBytes: quota,
        usageBytes: usage,
        availableBytes: available,
        isNearFull: available < 50 * 1024 * 1024, // Warning if less than 50MB free
      };
    } catch {
      // Fallback
    }
  }
  return { isNearFull: false };
}

export interface IngestedImageResult {
  originalUrl: string;
  previewUrl: string;
  thumbnailUrl: string;
  w_mm: number;
  h_mm: number;
  previewBlobId: string;
  originalBlobId: string;
  thumbnailBlobId: string;
  widthPx?: number;
  heightPx?: number;
}

/**
 * Ingests a local photographic file safely into IndexedDB with dual-tier proxy resolution:
 * 1. Original file blob stored untouched in IndexedDB.
 * 2. 1600px WebP preview for high-resolution develop and canvas viewing.
 * 3. 320px WebP thumbnail for ultra-fast, low-memory Photo Browser grid scrolling.
 */
export async function processLocalImage(file: File): Promise<IngestedImageResult> {
  // Validate format
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const rawExtensions = ['cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'pef', 'raf'];

  if (rawExtensions.includes(ext)) {
    throw new Error(
      `El archivo "${file.name}" es un formato RAW no decodificable nativamente en el navegador. Por favor utiliza exportaciones JPEG, PNG o WebP para revelado e importación.`
    );
  }

  if (!supportedTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    throw new Error(`Formato no soportado para "${file.name}". Utiliza JPEG, PNG o WebP.`);
  }

  // Check storage quota
  const quota = await getStorageQuotaEstimate();
  if (quota.isNearFull && quota.availableBytes !== undefined && quota.availableBytes < file.size * 2) {
    throw new Error(
      `Almacenamiento del navegador casi lleno. Espacio disponible: ${Math.round(
        (quota.availableBytes || 0) / (1024 * 1024)
      )} MB. Libera espacio o elimina proyectos antiguos.`
    );
  }

  const originalBlobId = uuidv4();
  const previewBlobId = uuidv4();
  const thumbnailBlobId = uuidv4();

  const originalUrl = URL.createObjectURL(file);
  const { set: idbSet } = await import('idb-keyval');

  try {
    await idbSet(originalBlobId, file);
  } catch {
    throw new Error(
      `Error de cuota de almacenamiento al guardar "${file.name}". IndexedDB agotó el espacio disponible.`
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = originalUrl;
    img.onload = async () => {
      try {
        const origW = img.width;
        const origH = img.height;

        // 1. Generate High-Fidelity 2560px Preview Canvas (Crisp 2K/4K display)
        const maxPreviewDim = 2560;
        let pW = origW;
        let pH = origH;
        if (pW > maxPreviewDim || pH > maxPreviewDim) {
          if (pW > pH) {
            pH = Math.round((pH / pW) * maxPreviewDim);
            pW = maxPreviewDim;
          } else {
            pW = Math.round((pW / pH) * maxPreviewDim);
            pH = maxPreviewDim;
          }
        }

        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = pW;
        previewCanvas.height = pH;
        const pCtx = previewCanvas.getContext('2d');
        if (!pCtx) return reject(new Error('No se pudo inicializar canvas para vista previa'));
        pCtx.drawImage(img, 0, 0, pW, pH);

        const previewBlob = await new Promise<Blob | null>((res) =>
          previewCanvas.toBlob(res, 'image/webp', 0.92)
        );

        if (!previewBlob) return reject(new Error('Fallo al generar blob de vista previa'));
        await idbSet(previewBlobId, previewBlob);
        const previewUrl = URL.createObjectURL(previewBlob);

        // 2. Generate 320px Low-Memory Thumbnail Canvas (for Photo Browser grid)
        const maxThumbDim = 320;
        let tW = origW;
        let tH = origH;
        if (tW > maxThumbDim || tH > maxThumbDim) {
          if (tW > tH) {
            tH = Math.round((tH / tW) * maxThumbDim);
            tW = maxThumbDim;
          } else {
            tW = Math.round((tW / tH) * maxThumbDim);
            tH = maxThumbDim;
          }
        }

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = tW;
        thumbCanvas.height = tH;
        const tCtx = thumbCanvas.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(previewCanvas, 0, 0, tW, tH);
        }

        const thumbBlob = await new Promise<Blob | null>((res) =>
          thumbCanvas.toBlob(res, 'image/webp', 0.80)
        );

        let thumbnailUrl = previewUrl;
        if (thumbBlob) {
          try {
            await idbSet(thumbnailBlobId, thumbBlob);
            thumbnailUrl = URL.createObjectURL(thumbBlob);
          } catch {
            thumbnailUrl = previewUrl;
          }
        }

        const w_mm = 100;
        const h_mm = 100 * (origH / origW);

        resolve({
          originalUrl,
          previewUrl,
          thumbnailUrl,
          w_mm,
          h_mm,
          previewBlobId,
          originalBlobId,
          thumbnailBlobId,
          widthPx: origW,
          heightPx: origH,
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`No se pudo decodificar la imagen "${file.name}".`));
  });
}
