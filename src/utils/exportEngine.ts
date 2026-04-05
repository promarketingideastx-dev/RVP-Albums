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

  // Register Global Custom WebGL ColorShift Filter for Additive Raw Math (Headless Export)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && !(Konva.Filters as any).ColorShift) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Konva.Filters as any).ColorShift = function (this: any, imageData: ImageData) {
      const data = imageData.data;
      const nPixels = data.length;
      const rShift = this.getAttr('redShift') || 0;
      const gShift = this.getAttr('greenShift') || 0;
      const bShift = this.getAttr('blueShift') || 0;

      for (let i = 0; i < nPixels; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + rShift));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + gShift));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + bShift));
      }
    };
  }
  
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

          // Single Layer Image Render for uncompromising High Fidelity Export Pipeline
          const kImg = new Konva.Image({
            image: imgObj,
            x: 0,
            y: 0,
            width: (el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            height: (el.h_mm * CONSTANT_SPREAD_SCALAR) * mmToPx,
            cornerRadius: appliedBorderRadius * mmToPx,
            stroke: appliedStrokeWidth > 0 ? appliedStrokeColor : undefined,
            strokeWidth: appliedStrokeWidth * mmToPx,
            imageSmoothingEnabled: false // Export pipeline guarantee
          });
          kGroup.add(kImg);

          // Handle Photo Filters Headless Single Layer
          const hasLegacyFilter = el.photoFilter && el.photoFilter !== 'none';
          const hasAdj = el.photoAdjustments && Object.values(el.photoAdjustments).some(v => typeof v === 'number' && v !== 0);

          if (hasLegacyFilter || hasAdj) {
            const { LUT_LIBRARY } = await import('@/lib/lut-presets');
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtersArray: any[] = [];
            const intensity = el.filterIntensity !== undefined ? el.filterIntensity : 1;
            
            if (hasLegacyFilter) {
               const lut = LUT_LIBRARY.find(l => l.id === el.photoFilter);
               if (lut) {
                  if (lut.contrast && lut.contrast !== 0) {
                     filtersArray.push(Konva.Filters.Contrast);
                     kImg.contrast(lut.contrast * intensity);
                  }
                  if (lut.brightness && lut.brightness !== 0) {
                     filtersArray.push(Konva.Filters.Brighten);
                     kImg.brightness(lut.brightness * intensity);
                  }
                  if (lut.grayscale) filtersArray.push(Konva.Filters.Grayscale);
                  if (lut.sepia) filtersArray.push(Konva.Filters.Sepia);
                  if (lut.invert) filtersArray.push(Konva.Filters.Invert);
                  
                  if (lut.hue !== undefined || lut.saturation !== undefined || lut.luminance !== undefined) {
                     filtersArray.push(Konva.Filters.HSL);
                     if (lut.hue !== undefined) kImg.hue(lut.hue * intensity);
                     if (lut.saturation !== undefined) kImg.saturation(Math.max(-2, Math.min(2, lut.saturation * intensity)));
                     if (lut.luminance !== undefined) kImg.luminance(lut.luminance * intensity);
                  }
               } else {
                  switch(el.photoFilter) {
                    case 'sepia': filtersArray.push(Konva.Filters.Sepia); break;
                    case 'grayscale': filtersArray.push(Konva.Filters.Grayscale); break;
                    case 'invert': filtersArray.push(Konva.Filters.Invert); break;
                    case 'blur': 
                      filtersArray.push(Konva.Filters.Blur); 
                      kImg.blurRadius(intensity * 5); 
                      break;
                    case 'noise': 
                      filtersArray.push(Konva.Filters.Noise); 
                      kImg.noise(intensity); 
                      break;
                    case 'posterize': 
                      filtersArray.push(Konva.Filters.Posterize); 
                      kImg.levels(intensity * 4); 
                      break;
                  }
               }
            }

            if (hasAdj) {
              const adj = el.photoAdjustments!;
              
              const bypassLight = adj.bypassLight || false;
              const bypassColor = adj.bypassColor || false;
              const bypassEffects = adj.bypassEffects || false;

              const exposure = !bypassLight ? (adj.exposure || 0) : 0;
              const lightContrast = !bypassLight ? (adj.lightContrast || 0) : 0;
              const highlights = !bypassLight ? (adj.highlights || 0) : 0;
              const shadows = !bypassLight ? (adj.shadows || 0) : 0;
              const whites = !bypassLight ? (adj.whites || 0) : 0;
              const blacks = !bypassLight ? (adj.blacks || 0) : 0;

              const temperature = !bypassColor ? (adj.temperature || 0) : 0;
              const tint = !bypassColor ? (adj.tint || 0) : 0;
              const vibrance = !bypassColor ? (adj.vibrance || 0) : 0;
              const saturation = !bypassColor ? (adj.saturation || 0) : 0;

              const texture = !bypassEffects ? (adj.texture || 0) : 0;
              const clarity = !bypassEffects ? (adj.clarity || 0) : 0;
              const dehaze = !bypassEffects ? (adj.dehaze || 0) : 0;
              const grain = !bypassEffects ? (adj.grain || 0) : 0;
              const blur = !bypassEffects ? (adj.blur || 0) : 0;

              if (exposure || highlights || shadows || whites || blacks) {
                 filtersArray.push(Konva.Filters.Brighten);
                 let totalBrightness = exposure / 200;
                 if (highlights) totalBrightness += (highlights / 100) * 0.15;
                 if (whites) totalBrightness += (whites / 100) * 0.08;
                 if (shadows) totalBrightness += (shadows / 100) * 0.15;
                 if (blacks) totalBrightness += (blacks / 100) * 0.08;
                 kImg.brightness(Math.max(-1, Math.min(1, totalBrightness)));
              }
              
              if (lightContrast || clarity || dehaze || texture) {
                 filtersArray.push(Konva.Filters.Contrast);
                 let totalContrast = lightContrast * 0.6;
                 if (clarity) totalContrast += (clarity / 100) * 20;
                 if (dehaze) totalContrast += (dehaze / 100) * 15;
                 if (texture) totalContrast += (texture / 100) * 10;
                 kImg.contrast(Math.max(-100, Math.min(100, totalContrast))); 
              }
              
              // Advanced Color: Vibrance and Saturation
              if (saturation || vibrance) {
                 if (!filtersArray.includes(Konva.Filters.HSL)) filtersArray.push(Konva.Filters.HSL);
                 let totalSat = saturation;
                 if (vibrance) totalSat += (vibrance * 0.5); 
                 kImg.saturation(Math.max(-2, Math.min(2, totalSat / 100))); 
                 kImg.hue(0);
              }
              
              // Advanced Color: Temperature and Tint (Thermal Curves via Custom Additive ColorShift)
              if (temperature || tint) {
                 // CRITICAL FIX: Custom WebGL Filter used to securely add offsets to pixel color natively 
                 // avoiding RGBA solid overlaps and avoiding RGB luminance grayscale blackouts.
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 if (!filtersArray.includes((Konva.Filters as any).ColorShift)) filtersArray.push((Konva.Filters as any).ColorShift);
                 
                 let r = 0, g = 0, b = 0;
                 const TEMP_STRENGTH = 15;
                 const TINT_STRENGTH = 10;
                 
                 if (temperature) {
                     const tempNormalized = temperature / 100;
                     r = r + tempNormalized * TEMP_STRENGTH;   
                     b = b - tempNormalized * TEMP_STRENGTH;   
                 }
                 if (tint) {
                     const tintNormalized = tint / 100;
                     g = g + tintNormalized * TINT_STRENGTH;  
                     r = r + tintNormalized * (TINT_STRENGTH * 0.25);  
                     b = b + tintNormalized * (TINT_STRENGTH * 0.25);   
                 }
                 
                 kImg.setAttr('redShift', r);
                 kImg.setAttr('greenShift', g);
                 kImg.setAttr('blueShift', b);
              }
              
              if (grain) {
                 filtersArray.push(Konva.Filters.Noise);
                 kImg.noise(Math.max(0, (grain / 100) * 0.5));
              }
              
              if (blur) {
                 filtersArray.push(Konva.Filters.Blur);
                 kImg.blurRadius(Math.max(0, blur / 5));
              }
            }

            kImg.filters(filtersArray);
            
            // EXPORT PIPELINE GUARANTEE: Full Native Resolution Cache Locking with VRAM Limits
            const isMassiveAsset = imgObj.naturalWidth > 6000 || imgObj.naturalHeight > 6000;
            const exportRatio = Math.max(1, imgObj.naturalWidth / ((el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx));
            
            // If asset is brutally scaled but massive memory, clamp the multiplier safely
            const safeExportRatio = isMassiveAsset ? Math.min(exportRatio, 2.5) : exportRatio;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Export Processor] Filter Cache Applied to ${el.id} | Natural Width: ${imgObj.naturalWidth} | Target Ratio: ${exportRatio} -> Safe Applied: ${safeExportRatio}`);
            }

            kImg.cache({ pixelRatio: safeExportRatio, imageSmoothingEnabled: false });
          } else {
            // RAW Passthrough - Dev logging confirmation
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Export Processor] Raw Passthrough for ${el.id} | Zero slider values detected, cache bypassed.`);
            }
          }
          
          if (hasAdj && el.photoAdjustments?.vignette && el.photoAdjustments.vignette !== 0) {
              const vigW = (el.w_mm * CONSTANT_SPREAD_SCALAR) * mmToPx;
              const vigH = (el.h_mm * CONSTANT_SPREAD_SCALAR) * mmToPx;
              const vignetteLayer = new Konva.Rect({
                  x: 0,
                  y: 0,
                  width: vigW,
                  height: vigH,
                  cornerRadius: appliedBorderRadius * mmToPx,
                  listening: false,
                  fillRadialGradientStartPoint: { x: vigW / 2, y: vigH / 2 },
                  fillRadialGradientStartRadius: Math.min(vigW, vigH) * 0.2,
                  fillRadialGradientEndPoint: { x: vigW / 2, y: vigH / 2 },
                  fillRadialGradientEndRadius: Math.max(vigW, vigH) * 0.75,
                  fillRadialGradientColorStops: [
                     0, 'rgba(0,0,0,0)',
                     1, el.photoAdjustments.vignette < 0 
                         ? `rgba(0,0,0,${Math.min(1, Math.abs(el.photoAdjustments.vignette) / 100)})`
                         : `rgba(255,255,255,${Math.min(1, el.photoAdjustments.vignette / 100)})`
                  ]
              });
              kGroup.add(vignetteLayer);
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
  const safeTitle = project.title.replace(/[^a-z0-9_ -]/gi, '').trim().replace(/\s+/g, '_') || 'Album';
  const hasMassiveSpreads = total > 30;
  const safePixelMultiplier = hasMassiveSpreads ? 6 : 12; // ~150DPI fallback to protect browser ram on 30+ pages
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Export Pipeline] Starting PDF Render: ${safeTitle}.pdf | Multiplier: ${safePixelMultiplier}x`);
  }

  for (let i = 0; i < total; i++) {
    const spread = project.spreads[i];
    
    // Memory Guard: Dynamically intercepting base multiplier based on volume limits
    const base64Jpg = await exportSpreadToJPG(project, spread, { size: project.size, pixelMultiplier: safePixelMultiplier, quality: 1.0 });
    
    if (i > 0) doc.addPage([pdfW, pdfH], orientation);
    
    doc.addImage(base64Jpg, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    
    if (onProgress) onProgress(i + 1, total);
  }
  
  const filename = `${safeTitle}.pdf`;
  doc.save(filename);
}

export async function exportToJPG(project: EditorProject, onProgress?: (current: number, total: number) => void): Promise<void> {
  const zip = new JSZip();
  const safeTitle = project.title.replace(/[^a-z0-9_ -]/gi, '').trim().replace(/\s+/g, '_') || 'Album';
  const folder = zip.folder(safeTitle) || zip;
  const total = project.spreads.length;
  const hasMassiveSpreads = total > 30;
  const safePixelMultiplier = hasMassiveSpreads ? 6 : 12;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Export Pipeline] Starting JPG Render Pack: ${safeTitle}.zip | Multiplier: ${safePixelMultiplier}x`);
  }

  for (let i = 0; i < total; i++) {
    const spread = project.spreads[i];
    const base64Jpg = await exportSpreadToJPG(project, spread, { size: project.size, pixelMultiplier: safePixelMultiplier, quality: 1.0 });
    
    const base64Data = base64Jpg.replace(/^data:image\/jpeg;base64,/, "");
    const idxStr = String(i + 1).padStart(2, '0');
    // Mandated Exact Format: Maria_Wedding_Spread_01.jpg
    folder.file(`${safeTitle}_Spread_${idxStr}.jpg`, base64Data, { base64: true });
    
    if (onProgress) onProgress(i + 1, total);
  }
  
  const content = await zip.generateAsync({ type: "blob" });
  const filename = `${safeTitle}.zip`;
  saveAs(content, filename);
}
