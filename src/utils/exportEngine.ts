import { Spread } from '@/types/editor';

// Project Metadata structure subset
interface ExportMeta {
  size: { w_mm: number; h_mm: number };
  pixelMultiplier?: number;
  quality?: number;
}

export async function exportSpreadToJPG(spread: Spread, meta: ExportMeta): Promise<string> {
  const Konva = (await import('konva')).default;
  const { get: idbGet } = await import('idb-keyval');
  
  const container = document.createElement('div');
  
  // Mathematical resolution boundary for iOS safety
  const physicalW = meta.size.w_mm;
  const physicalH = meta.size.h_mm;
  
  // Base arbitrary logical scaler (default 10x translates approx. 300 dpi on standard prints)
  const multiplier = meta.pixelMultiplier || 12; // 12x means ~514 * 12 = 6168px
  let pxW = physicalW * multiplier;
  let pxH = physicalH * multiplier;
  
  // Desktop canvas limits are generally 16384x16384, but Safari caps area. 8192 is safe for Desktop Print.
  const maxDim = 8192; 
  
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
            opacity: el.opacity !== undefined ? el.opacity : 1,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
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
            opacity: el.opacity !== undefined ? el.opacity : 1,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
          }));
        }
    } else if (el.type === 'image' || el.type === 'decoration') {
        let url = '';
        
        // Deep local IndexedDB payload resolving
        if (el.originalBlobId) {
          const blob = await idbGet<Blob>(el.originalBlobId);
          if (blob) {
            url = URL.createObjectURL(blob);
            objectUrlsToRevoke.push(url);
          }
        }
        
        // Native DB & SVGs fallback
        if (!url && el.previewUrl) url = el.previewUrl; 
        if (!url && el.src) url = el.src; 

        if (!url) continue;

        try {
          const imgObj = await loadHtmlImage(url);
          const kGroup = new Konva.Group({
            x: el.x_mm * mmToPx,
            y: el.y_mm * mmToPx,
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
            rotation: el.rotation_deg,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalCompositeOperation: (el.blendMode as any) || 'source-over',
            shadowColor: el.shadowColor || 'transparent',
            shadowBlur: el.shadowBlur || 0,
            shadowOffsetX: el.shadowOffsetX || 0,
            shadowOffsetY: el.shadowOffsetY || 0,
            shadowOpacity: el.shadowOpacity !== undefined ? el.shadowOpacity : 0.5,
          });

          const kBaseImg = new Konva.Image({
            image: imgObj,
            x: 0,
            y: 0,
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
          });
          kGroup.add(kBaseImg);

          // Handle Photo Filters Headless Dual Layer
          if (el.photoFilter && el.photoFilter !== 'none') {
            const { LUT_LIBRARY } = await import('@/lib/lut-presets');
            const lut = LUT_LIBRARY.find(l => l.id === el.photoFilter);

            const kFilterImg = new Konva.Image({
              image: imgObj,
              x: 0,
              y: 0,
              width: el.w_mm * mmToPx,
              height: el.h_mm * mmToPx,
              opacity: el.filterIntensity !== undefined ? el.filterIntensity : 1
            });
            kGroup.add(kFilterImg);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtersArray: any[] = [];
            
            if (lut) {
               if (lut.contrast && lut.contrast !== 0) {
                  filtersArray.push(Konva.Filters.Contrast);
                  kFilterImg.contrast(lut.contrast);
               }
               if (lut.brightness && lut.brightness !== 0) {
                  filtersArray.push(Konva.Filters.Brighten);
                  kFilterImg.brightness(lut.brightness);
               }
               if (lut.grayscale) filtersArray.push(Konva.Filters.Grayscale);
               if (lut.sepia) filtersArray.push(Konva.Filters.Sepia);
               if (lut.invert) filtersArray.push(Konva.Filters.Invert);
               
               if (lut.hue !== undefined || lut.saturation !== undefined || lut.luminance !== undefined) {
                  filtersArray.push(Konva.Filters.HSL);
                  if (lut.hue !== undefined) kFilterImg.hue(lut.hue);
                  if (lut.saturation !== undefined) kFilterImg.saturation(lut.saturation);
                  if (lut.luminance !== undefined) kFilterImg.luminance(lut.luminance);
               }
            } else {
               switch(el.photoFilter) {
                 case 'sepia': filtersArray.push(Konva.Filters.Sepia); break;
                 case 'grayscale': filtersArray.push(Konva.Filters.Grayscale); break;
                 case 'invert': filtersArray.push(Konva.Filters.Invert); break;
                 case 'blur': 
                   filtersArray.push(Konva.Filters.Blur); 
                   kFilterImg.blurRadius(el.filterIntensity !== undefined ? el.filterIntensity : 5); 
                   break;
                 case 'noise': 
                   filtersArray.push(Konva.Filters.Noise); 
                   kFilterImg.noise(el.filterIntensity !== undefined ? el.filterIntensity : 1); 
                   break;
                 case 'brighten': 
                   filtersArray.push(Konva.Filters.Brighten); 
                   kFilterImg.brightness(el.filterIntensity !== undefined ? el.filterIntensity : 0.5); 
                   break;
                 case 'contrast': 
                   filtersArray.push(Konva.Filters.Contrast); 
                   kFilterImg.contrast(el.filterIntensity !== undefined ? el.filterIntensity : 20); 
                   break;
                 case 'posterize': 
                   filtersArray.push(Konva.Filters.Posterize); 
                   kFilterImg.levels(el.filterIntensity !== undefined ? el.filterIntensity : 4); 
                   break;
               }
            }
            kFilterImg.filters(filtersArray);
            kFilterImg.cache();
          }

          layer.add(kGroup);
        } catch (e) {
          console.warn(`Export Engine failed rendering element ${el.id}`, e);
        }
    } else if (el.type === 'text') {
        layer.add(new Konva.Text({
            x: el.x_mm * mmToPx,
            y: el.y_mm * mmToPx,
            text: el.textTransform === 'uppercase' ? (el.text || '').toUpperCase() : el.textTransform === 'lowercase' ? (el.text || '').toLowerCase() : (el.text || ''),
            fontSize: (el.fontSize || 32) * mmToPx,
            fontFamily: el.fontFamily || 'Inter',
            letterSpacing: el.letterSpacing || 0,
            lineHeight: el.lineHeight || 1,
            fill: el.textColor || el.fillColor || el.color || '#000000',
            align: el.textAlign || 'left',
            fontStyle: (el.isBold ? 'bold ' : '') + (el.isItalic ? 'italic' : ''),
            rotation: el.rotation_deg,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
            width: el.w_mm ? el.w_mm * mmToPx : undefined,
            height: el.h_mm ? el.h_mm * mmToPx : undefined,
            stroke: el.strokeColor || undefined,
            strokeWidth: el.strokeWidth ? el.strokeWidth * mmToPx : 0,
            shadowColor: el.shadowColor || 'black',
            shadowBlur: el.shadowBlur ? el.shadowBlur * mmToPx : 0,
            shadowOffsetX: el.shadowOffsetX ? el.shadowOffsetX * mmToPx : 0,
            shadowOffsetY: el.shadowOffsetY ? el.shadowOffsetY * mmToPx : 0,
            shadowOpacity: el.shadowOpacity !== undefined ? el.shadowOpacity : 0.5,
        }));
    }
  }

  stage.add(layer);
  layer.draw();

  const dataURL = stage.toDataURL({ mimeType: 'image/jpeg', quality: meta.quality || 0.95 });

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
