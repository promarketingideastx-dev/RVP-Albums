import { Spread } from '@/types/editor';

// Project Metadata structure subset
interface ExportMeta {
  size: { w_mm: number; h_mm: number };
}

export async function exportSpreadToJPG(spread: Spread, meta: ExportMeta): Promise<string> {
  const Konva = (await import('konva')).default;
  const { get: idbGet } = await import('idb-keyval');
  
  const container = document.createElement('div');
  
  // Mathematical resolution boundary for iOS safety
  const physicalW = meta.size.w_mm;
  const physicalH = meta.size.h_mm;
  
  // Base arbitrary logical scaler (10x translates approx. 300 dpi on standard prints)
  let pxW = physicalW * 10;
  let pxH = physicalH * 10;
  const maxDim = 4000; // Safari Canvas strict limit ~ 16MP. Stay safe.
  
  if (pxW > maxDim || pxH > maxDim) {
    const scale = Math.min(maxDim / pxW, maxDim / pxH);
    pxW *= scale;
    pxH *= scale;
  }

  const mmToPx = pxW / physicalW; // unified dynamic scalar

  const stage = new Konva.Stage({
    container,
    width: pxW,
    height: pxH,
  });

  const layer = new Konva.Layer();
  
  // Background Mount
  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: pxW,
    height: pxH,
    fill: spread.bg_color || '#ffffff',
  });
  layer.add(bg);

  const objectUrlsToRevoke: string[] = [];
  const sortedElements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sortedElements) {
    if (el.type === 'shape') {
        if (el.shapeType === 'rect') {
          layer.add(new Konva.Rect({
            x: el.x_mm * mmToPx,
            y: el.y_mm * mmToPx,
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
            fill: el.fillColor,
            rotation: el.rotation_deg,
          }));
        } else if (el.shapeType === 'ellipse') {
          layer.add(new Konva.Ellipse({
            x: el.x_mm * mmToPx,
            y: el.y_mm * mmToPx,
            radiusX: (el.w_mm / 2) * mmToPx,
            radiusY: (el.h_mm / 2) * mmToPx,
            offset: { x: -(el.w_mm / 2) * mmToPx, y: -(el.h_mm / 2) * mmToPx },
            fill: el.fillColor,
            rotation: el.rotation_deg,
          }));
        }
    } else if (el.type === 'image') {
        let url = '';
        
        // Block 1 API: Retrieve Deep Native Resolucion Blob
        if (el.originalBlobId) {
          const blob = await idbGet<Blob>(el.originalBlobId);
          if (blob) {
            url = URL.createObjectURL(blob);
            objectUrlsToRevoke.push(url);
          }
        }
        
        // Fallback for mock elements or corrupted blobs
        if (!url && el.previewUrl) url = el.previewUrl; 
        if (!url && el.src) url = el.src; 

        if (!url) continue;

        try {
          const imgObj = await loadHtmlImage(url);
          layer.add(new Konva.Image({
            image: imgObj,
            x: el.x_mm * mmToPx,
            y: el.y_mm * mmToPx,
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
            rotation: el.rotation_deg,
          }));
        } catch (e) {
          console.warn(`Export Engine failed rendering element ${el.id}`, e);
        }
    }
  }

  stage.add(layer);
  layer.draw();

  const dataURL = stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 });

  // Native Garbage Collection Cleanup
  stage.destroy();
  objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));

  return dataURL;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Evitate Tainted Canvas
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
