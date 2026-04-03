import { v4 as uuidv4 } from 'uuid';
import { set as idbSet } from 'idb-keyval';

export async function processLocalImage(file: File): Promise<{ originalUrl: string, previewUrl: string, w_mm: number, h_mm: number, previewBlobId: string, originalBlobId: string }> {
  // Phase 3 Persistence References
  const originalBlobId = uuidv4();
  const previewBlobId = uuidv4();

  // 1. Create absolute high resolution original blob URL for internal store
  const originalUrl = URL.createObjectURL(file);
  await idbSet(originalBlobId, file); // Store natively in IDB

  // 2. Generate a downscaled preview using HTML5 Canvas to guard Konva memory limits
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      const maxDim = 1000;
      let targetW = img.width;
      let targetH = img.height;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = (targetH / targetW) * maxDim;
          targetW = maxDim;
        } else {
          targetW = (targetW / targetH) * maxDim;
          targetH = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context available for downscaling');
      ctx.drawImage(img, 0, 0, targetW, targetH);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return reject('Blob creation payload failed');
        await idbSet(previewBlobId, blob); // Store natively in IDB
        const previewUrl = URL.createObjectURL(blob);
        
        // Base mapping UX proportions explicitly via physical limits (100mm baseline)
        const w_mm = 100;
        const h_mm = 100 * (img.height / img.width);
        resolve({ originalUrl, previewUrl, w_mm, h_mm, previewBlobId, originalBlobId });
      }, 'image/webp', 0.8);
    };
    img.onerror = reject;
  });
}
