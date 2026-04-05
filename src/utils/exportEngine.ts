import { EditorProject, Spread } from '@/types/editor';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Project Metadata structure subset
interface ExportMeta {
  size: { w_mm: number; h_mm: number };
  pixelMultiplier?: number;
  quality?: number;
}

export async function exportSpreadToJPG(project: EditorProject, spread: Spread, meta: ExportMeta): Promise<string> {
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
  
  // Desktop canvas limits are generally 16384x16384, but Safari caps area strictly to ~16.7 million pixels (16MB).
  // A safe max dimension constraint that respects the area limit is approx 4096. 
  // Let's ensure the total area never exceeds 16,000,000 to be perfectly stable across all browsers.
  
  const maxArea = 16000000;
  if ((pxW * pxH) > maxArea) {
     const areaScale = Math.sqrt(maxArea / (pxW * pxH));
     pxW *= areaScale;
     pxH *= areaScale;
  }

  const mmToPx = pxW / physicalW; // unified dynamic scalar

  const stage = new Konva.Stage({
    container,
    width: pxW,
    height: pxH,
  });

  const layer = new Konva.Layer();
  
  const bgConfig = spread.bg_config || { type: 'none' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bgProps: any = { fill: spread.bg_color || '#ffffff' };
  
  if (bgConfig.type === 'solid' && bgConfig.color1) {
    bgProps = { fill: bgConfig.color1 };
  } else if (bgConfig.type === 'linear' && bgConfig.color1 && bgConfig.color2) {
    const angleRad = (bgConfig.gradientAngle || 0) * (Math.PI / 180);
    const cx = pxW / 2;
    const cy = pxH / 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    bgProps = {
       fillLinearGradientStartPoint: { x: cx - Math.cos(angleRad) * r, y: cy - Math.sin(angleRad) * r },
       fillLinearGradientEndPoint: { x: cx + Math.cos(angleRad) * r, y: cy + Math.sin(angleRad) * r },
       fillLinearGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  } else if (bgConfig.type === 'radial' && bgConfig.color1 && bgConfig.color2) {
    const cx = ((bgConfig.radialCenterX ?? 50) / 100) * pxW;
    const cy = ((bgConfig.radialCenterY ?? 50) / 100) * pxH;
    const maxRadius = Math.max(pxW, pxH);
    const radius = ((bgConfig.radialSize ?? 50) / 100) * maxRadius;
    bgProps = {
       fillRadialGradientStartPoint: { x: cx, y: cy },
       fillRadialGradientStartRadius: 0,
       fillRadialGradientEndPoint: { x: cx, y: cy },
       fillRadialGradientEndRadius: radius,
       fillRadialGradientColorStops: [0, bgConfig.color1, 1, bgConfig.color2]
    };
  }

  // Background Mount
  const bg = new Konva.Rect({
    x: 0,
    y: 0,
    width: pxW,
    height: pxH,
    ...bgProps
  });
  layer.add(bg);

  const objectUrlsToRevoke: string[] = [];
  const sortedElements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const rawEl of sortedElements) {
    if (rawEl.type === 'group') continue;
    if (rawEl.visible === false) continue;

    const CONSTANT_SPREAD_SCALAR = 3.779527559; // Binds DB inverse-scaled matrix natively identical to SpreadCanvas

    // Apply cascading visibility and opacity rules safely
    let el = rawEl;
    if (el.groupId) {
      const parent = sortedElements.find(g => g.id === el.groupId);
      if (parent && parent.visible === false) continue;
      if (parent && parent.opacity !== undefined) {
         const childOpacity = el.opacity !== undefined ? el.opacity : 1;
         el = { ...el, opacity: parent.opacity * childOpacity };
      }
    }

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
          const globalStyles = project.globalImageStyles;
          
          const appliedShadowColor = el.shadowColor || (!el.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowColor || '#000000') : 'transparent');
          const appliedShadowBlur = el.shadowBlur ?? (!el.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowBlur ?? 0) : 0);
          const appliedShadowOffsetX = el.shadowOffsetX ?? (!el.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetX ?? 0) : 0);
          const appliedShadowOffsetY = el.shadowOffsetY ?? (!el.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOffsetY ?? 0) : 0);
          const appliedShadowOpacity = el.shadowOpacity ?? (!el.isolateFromGlobalStyles && globalStyles?.shadowEnabled ? (globalStyles.shadowOpacity ?? 0.5) : 0.5);

          const shadowIsInvisibleArtifact = (appliedShadowBlur === 0 && appliedShadowOffsetX === 0 && appliedShadowOffsetY === 0) || appliedShadowOpacity === 0;
          const finalShadowColor = shadowIsInvisibleArtifact ? 'transparent' : appliedShadowColor;

          const strokeEnabled = !el.isolateFromGlobalStyles && (globalStyles?.strokeEnabled ?? false);
          const appliedStrokeWidth = el.strokeWidth ?? (strokeEnabled ? (globalStyles?.strokeWidth ?? 0) : 0);
          const appliedStrokeColor = el.strokeColor ?? (strokeEnabled ? (globalStyles?.strokeColor ?? '#ffffff') : undefined);
          
          const cornerRadiusEnabled = !el.isolateFromGlobalStyles && (globalStyles?.borderRadiusEnabled ?? false);
          const appliedBorderRadius = el.borderRadius ?? (cornerRadiusEnabled ? (globalStyles?.borderRadius ?? 0) : 0);

          const kGroup = new Konva.Group({
            x: (el.x_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            y: (el.y_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            width: (el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            height: (el.h_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            rotation: el.rotation_deg,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            scaleX: el.scale || 1,
            scaleY: el.scale || 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            globalCompositeOperation: (el.blendMode as any) || 'source-over',
            shadowColor: finalShadowColor,
            shadowBlur: appliedShadowBlur * mmToPx,
            shadowOffsetX: appliedShadowOffsetX * mmToPx,
            shadowOffsetY: appliedShadowOffsetY * mmToPx,
            shadowOpacity: appliedShadowOpacity,
          });

          const kBaseImg = new Konva.Image({
            image: imgObj,
            x: 0,
            y: 0,
            width: (el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            height: (el.h_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            cornerRadius: appliedBorderRadius * mmToPx,
            stroke: appliedStrokeWidth > 0 ? appliedStrokeColor : undefined,
            strokeWidth: appliedStrokeWidth * mmToPx,
          });
          kGroup.add(kBaseImg);

          // Handle Photo Filters Headless Dual Layer
          const hasLegacyFilter = el.photoFilter && el.photoFilter !== 'none';
          const hasAdj = el.photoAdjustments && Object.values(el.photoAdjustments).some(v => typeof v === 'number' && v !== 0);

          if (hasLegacyFilter || hasAdj) {
            const { LUT_LIBRARY } = await import('@/lib/lut-presets');

            const kFilterImg = new Konva.Image({
              image: imgObj,
              x: 0,
              y: 0,
              width: (el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
              height: (el.h_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
              opacity: el.filterIntensity !== undefined ? el.filterIntensity : 1,
              cornerRadius: appliedBorderRadius * mmToPx,
              stroke: appliedStrokeWidth > 0 ? appliedStrokeColor : undefined,
              strokeWidth: appliedStrokeWidth * mmToPx,
            });
            kGroup.add(kFilterImg);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtersArray: any[] = [];
            
            if (hasLegacyFilter) {
               const lut = LUT_LIBRARY.find(l => l.id === el.photoFilter);
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
            }

            if (hasAdj) {
              const adj = el.photoAdjustments!;
              
              if (adj.exposure || adj.highlights || adj.shadows || adj.whites || adj.blacks) {
                 filtersArray.push(Konva.Filters.Brighten);
                 let totalBrightness = (adj.exposure || 0) / 5;
                 if (adj.highlights) totalBrightness += (adj.highlights / 100) * 0.25;
                 if (adj.whites) totalBrightness += (adj.whites / 100) * 0.15;
                 if (adj.shadows) totalBrightness += (adj.shadows / 100) * 0.25;
                 if (adj.blacks) totalBrightness += (adj.blacks / 100) * 0.15;
                 kFilterImg.brightness(Math.max(-1, Math.min(1, totalBrightness)));
              }
              
              if (adj.lightContrast || adj.clarity || adj.dehaze || adj.texture) {
                 filtersArray.push(Konva.Filters.Contrast);
                 let totalContrast = (adj.lightContrast || 0);
                 if (adj.clarity) totalContrast += (adj.clarity / 100) * 30;
                 if (adj.dehaze) totalContrast += (adj.dehaze / 100) * 20;
                 if (adj.texture) totalContrast += (adj.texture / 100) * 15;
                 kFilterImg.contrast(Math.max(-100, Math.min(100, totalContrast))); 
              }
              
              // Advanced Color: Vibrance and Saturation
              if (adj.saturation || adj.vibrance) {
                 if (!filtersArray.includes(Konva.Filters.HSL)) filtersArray.push(Konva.Filters.HSL);
                 let totalSat = (adj.saturation || 0);
                 if (adj.vibrance) totalSat += (adj.vibrance * 0.6); 
                 kFilterImg.saturation(Math.max(-2, Math.min(2, totalSat / 100))); 
                 kFilterImg.hue(0);
              }
              
              // Advanced Color: Temperature and Tint (Thermal Curves via RGB Additives)
              if (adj.temperature || adj.tint) {
                 if (!filtersArray.includes(Konva.Filters.RGB)) filtersArray.push(Konva.Filters.RGB);
                 let r = 0, g = 0, b = 0;
                 if (adj.temperature) {
                     const temp = adj.temperature;
                     r += temp * 0.6;   
                     g += temp * 0.15;  
                     b -= temp * 0.6;   
                 }
                 if (adj.tint) {
                     const tint = adj.tint;
                     r += tint * 0.35;  
                     b += tint * 0.35;  
                     g -= tint * 0.5;   
                 }
                 if (typeof kFilterImg.red === 'function') {
                    kFilterImg.red(r);
                    kFilterImg.green(g);
                    kFilterImg.blue(b);
                 }
              }
              
              if (adj.grain) {
                 filtersArray.push(Konva.Filters.Noise);
                 kFilterImg.noise(adj.grain / 100);
              }
              
              if (adj.blur) {
                 filtersArray.push(Konva.Filters.Blur);
                 kFilterImg.blurRadius(adj.blur);
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
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Evitate Tainted Canvas
    img.onload = () => res(img);
    img.src = src;
  });
}

export async function exportToPDF(project: EditorProject, onProgress?: (current: number, total: number) => void): Promise<void> {
  const pdfW = project.size.w_mm;
  const pdfH = project.size.h_mm;
  
  // Init jsPDF natively mapped to physical bounds
  // Use orientation strictly derived from actual aspect ratio
  const orientation = pdfW > pdfH ? 'l' : 'p';
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: [pdfW, pdfH] 
  });
  
  const total = project.spreads.length;
  
  for (let i = 0; i < total; i++) {
    const spread = project.spreads[i];
    
    // Scale 12x translates ~300 DPI high resolution 
    const base64Jpg = await exportSpreadToJPG(project, spread, { size: project.size, pixelMultiplier: 12, quality: 1.0 });
    
    if (i > 0) doc.addPage([pdfW, pdfH], orientation);
    
    doc.addImage(base64Jpg, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    
    // Force aggressive GC cleanup manually helping browser RAM
    // JS engine naturally drops base64 string referenced once loops clear but keeping it minimal ensures stability
    if (onProgress) onProgress(i + 1, total);
  }
  
  const filename = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_print.pdf`;
  doc.save(filename);
}

export async function exportToJPG(project: EditorProject, onProgress?: (current: number, total: number) => void): Promise<void> {
  const zip = new JSZip();
  const safeTitle = project.title.replace(/[^a-z0-9_ -]/gi, '').trim() || 'Album';
  const folder = zip.folder(safeTitle) || zip;
  const total = project.spreads.length;
  
  for (let i = 0; i < total; i++) {
    const spread = project.spreads[i];
    const base64Jpg = await exportSpreadToJPG(project, spread, { size: project.size, pixelMultiplier: 12, quality: 1.0 });
    
    const base64Data = base64Jpg.replace(/^data:image\/jpeg;base64,/, "");
    const idxStr = String(i + 1).padStart(3, '0');
    folder.file(`Spread_${idxStr}.jpg`, base64Data, { base64: true });
    
    if (onProgress) onProgress(i + 1, total);
  }
  
  const content = await zip.generateAsync({ type: "blob" });
  const filename = `${safeTitle.replace(/\s+/g, '_').toLowerCase()}_jpgs.zip`;
  saveAs(content, filename);
}
