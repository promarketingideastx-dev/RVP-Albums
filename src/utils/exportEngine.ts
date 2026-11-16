import { EditorProject, Spread, EditorElement } from '@/types/editor';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Professional JPEG Quality Scale (1-12) inspired by Adobe Photoshop.
 * Note: This scale maps to HTML5 Canvas encoder quality (0.20 to 1.00).
 * It provides intuitive tiering without claiming mathematical equivalence
 * to proprietary Adobe Photoshop DCT quantization tables.
 */
export const JPEG_QUALITY_SCALE_MAP: Record<number, number> = {
  1: 0.20,
  2: 0.30,
  3: 0.40,
  4: 0.50, // Low (1-4)
  5: 0.60,
  6: 0.68,
  7: 0.75, // Medium (5-7)
  8: 0.82,
  9: 0.88,
  10: 0.92, // High (8-10)
  11: 0.96,
  12: 1.00, // Maximum (11-12)
};

export type QualityTier = 'low' | 'medium' | 'high' | 'maximum';

export function getQualityTier(level: number): QualityTier {
  if (level <= 4) return 'low';
  if (level <= 7) return 'medium';
  if (level <= 10) return 'high';
  return 'maximum';
}

export function sanitizeFileName(name: string, fallback = 'Export'): string {
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, '_').trim().replace(/\s+/g, '_');
  return sanitized || fallback;
}

export function base64ToBlob(base64DataUrl: string, mimeType = 'image/jpeg'): Blob {
  const base64Clean = base64DataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export interface ProfessionalExportOptions {
  moduleContext: 'album' | 'studio' | 'camera_raw';
  format: 'jpg' | 'pdf';
  rangeMode: 'current' | 'all' | 'custom' | 'selected';
  rangeStart?: number; // 0-indexed
  rangeEnd?: number;   // 0-indexed
  activeSpreadIndex?: number;
  selectedElementId?: string;
  dpi: number;
  jpegQualityLevel: number; // 1 - 12
  fileNameBase: string;
  sequentialDigits?: 2 | 3;
  saveDestination: 'browser_download' | 'directory_picker';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targetFileHandle?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targetDirHandle?: any;
  onProgress?: (current: number, total: number, message?: string) => void;
}

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
  
  // Desktop canvas limits are generally 16384x16384 (268 megapixels).
  // Raising maxArea to 100,000,000 (100MP) to allow 10MB-15MB exports at 1.0 quality without capping for professional desktop use.
  const maxArea = 100000000;
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
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
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
            const exportRatio = Math.max(1, imgObj.naturalWidth / (el.w_mm * mmToPx));
            
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
              const vigW = el.w_mm * mmToPx;
              const vigH = el.h_mm * mmToPx;
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

  try {
    stage.add(layer);
    layer.draw();
    const dataURL = stage.toDataURL({ mimeType: 'image/jpeg', quality: meta.quality || 0.95 });
    return dataURL;
  } finally {
    // Native Garbage Collection Cleanup
    stage.destroy();
    objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Evitate Tainted Canvas
    img.onload = () => res(img);
    img.src = src;
  });
}

export interface AdvancedExportOptions {
  type: 'print' | 'web';
  webQuality?: 'low' | 'medium' | 'high';
  rangeStart?: number;
  rangeEnd?: number;
  onProgress?: (current: number, total: number) => void;
}

export interface PDFExportOptions {
  rangeStart?: number;
  rangeEnd?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function exportStudioPrintToJPG(project: EditorProject, options: ProfessionalExportOptions): Promise<void> {
  const onProgress = options.onProgress;
  const spread = project.spreads[options.activeSpreadIndex ?? 0] || project.spreads[0];
  if (!spread) throw new Error('No spread found in studio project');

  if (onProgress) onProgress(0, 1, 'Iniciando renderizado de estudio...');

  const quality = JPEG_QUALITY_SCALE_MAP[options.jpegQualityLevel] ?? 1.0;
  const pixelMultiplier = options.dpi / 25.4;

  const base64Jpg = await exportSpreadToJPG(project, spread, {
    size: project.size,
    pixelMultiplier,
    quality,
  });

  const blob = base64ToBlob(base64Jpg, 'image/jpeg');
  const safeName = sanitizeFileName(options.fileNameBase || project.title || 'Studio_Print');
  const w_in = Math.round(project.size.w_mm / 25.4);
  const h_in = Math.round(project.size.h_mm / 25.4);
  const fileName = `${safeName}_${w_in}x${h_in}.jpg`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileHandle = options.targetFileHandle;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!fileHandle && options.saveDestination === 'directory_picker' && typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JPEG Image',
          accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
        }],
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn("SaveFilePicker failed, falling back to download:", err);
    }
  }

  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      if (onProgress) onProgress(1, 1);
      return;
    } catch (err) {
      console.error("Failed to write to fileHandle, falling back to download:", err);
    }
  }

  saveAs(blob, fileName);
  if (onProgress) onProgress(1, 1);
}

export async function exportRawPhotoToJPG(project: EditorProject, options: ProfessionalExportOptions): Promise<void> {
  const onProgress = options.onProgress;
  const Konva = (await import('konva')).default;
  const { get: idbGet } = await import('idb-keyval');

  let targetElement: EditorElement | null = null;
  for (const spread of project.spreads) {
    const found = spread.elements.find(el => el.id === options.selectedElementId && (el.type === 'image' || el.type === 'decoration'));
    if (found) {
      targetElement = found;
      break;
    }
  }

  if (!targetElement) {
    const activeSpread = project.spreads[options.activeSpreadIndex ?? 0] || project.spreads[0];
    targetElement = activeSpread?.elements.find(el => el.type === 'image') || null;
  }

  if (!targetElement) {
    throw new Error('No photograph selected for Camera Raw export.');
  }

  if (onProgress) onProgress(0, 1, 'Cargando fotografía original...');

  let url = '';
  if (targetElement.originalBlobId) {
    const blob = await idbGet<Blob>(targetElement.originalBlobId);
    if (blob) url = URL.createObjectURL(blob);
  }
  if (!url && targetElement.previewUrl) url = targetElement.previewUrl;
  if (!url && targetElement.src) url = targetElement.src;

  if (!url) throw new Error('Could not resolve image data for selected photograph.');

  const imgObj = await loadHtmlImage(url);
  const nativeW = imgObj.naturalWidth || 4000;
  const nativeH = imgObj.naturalHeight || 3000;

  const container = document.createElement('div');
  const stage = new Konva.Stage({
    container,
    width: nativeW,
    height: nativeH,
  });

  const layer = new Konva.Layer();
  const kImg = new Konva.Image({
    image: imgObj,
    x: 0,
    y: 0,
    width: nativeW,
    height: nativeH,
    imageSmoothingEnabled: false,
  });

  // Apply filters & adjustments if present
  const hasLegacyFilter = targetElement.photoFilter && targetElement.photoFilter !== 'none';
  const hasAdj = targetElement.photoAdjustments && Object.values(targetElement.photoAdjustments).some(v => typeof v === 'number' && v !== 0);

  if (hasLegacyFilter || hasAdj) {
    const { LUT_LIBRARY } = await import('@/lib/lut-presets');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtersArray: any[] = [];
    const intensity = targetElement.filterIntensity !== undefined ? targetElement.filterIntensity : 1;

    if (hasLegacyFilter) {
      const lut = LUT_LIBRARY.find(l => l.id === targetElement!.photoFilter);
      if (lut) {
        if (lut.contrast) { filtersArray.push(Konva.Filters.Contrast); kImg.contrast(lut.contrast * intensity); }
        if (lut.brightness) { filtersArray.push(Konva.Filters.Brighten); kImg.brightness(lut.brightness * intensity); }
        if (lut.grayscale) filtersArray.push(Konva.Filters.Grayscale);
        if (lut.sepia) filtersArray.push(Konva.Filters.Sepia);
        if (lut.invert) filtersArray.push(Konva.Filters.Invert);
        if (lut.hue !== undefined || lut.saturation !== undefined || lut.luminance !== undefined) {
          filtersArray.push(Konva.Filters.HSL);
          if (lut.hue !== undefined) kImg.hue(lut.hue * intensity);
          if (lut.saturation !== undefined) kImg.saturation(Math.max(-2, Math.min(2, lut.saturation * intensity)));
          if (lut.luminance !== undefined) kImg.luminance(lut.luminance * intensity);
        }
      }
    }

    if (hasAdj) {
      const adj = targetElement.photoAdjustments!;
      const exposure = !adj.bypassLight ? (adj.exposure || 0) : 0;
      const lightContrast = !adj.bypassLight ? (adj.lightContrast || 0) : 0;
      const highlights = !adj.bypassLight ? (adj.highlights || 0) : 0;
      const shadows = !adj.bypassLight ? (adj.shadows || 0) : 0;
      const whites = !adj.bypassLight ? (adj.whites || 0) : 0;
      const blacks = !adj.bypassLight ? (adj.blacks || 0) : 0;

      const temperature = !adj.bypassColor ? (adj.temperature || 0) : 0;
      const tint = !adj.bypassColor ? (adj.tint || 0) : 0;
      const vibrance = !adj.bypassColor ? (adj.vibrance || 0) : 0;
      const saturation = !adj.bypassColor ? (adj.saturation || 0) : 0;

      const texture = !adj.bypassEffects ? (adj.texture || 0) : 0;
      const clarity = !adj.bypassEffects ? (adj.clarity || 0) : 0;
      const dehaze = !adj.bypassEffects ? (adj.dehaze || 0) : 0;
      const grain = !adj.bypassEffects ? (adj.grain || 0) : 0;
      const blur = !adj.bypassEffects ? (adj.blur || 0) : 0;

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

      if (saturation || vibrance) {
        if (!filtersArray.includes(Konva.Filters.HSL)) filtersArray.push(Konva.Filters.HSL);
        let totalSat = saturation;
        if (vibrance) totalSat += (vibrance * 0.5);
        kImg.saturation(Math.max(-2, Math.min(2, totalSat / 100)));
        kImg.hue(0);
      }

      if (temperature || tint) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!filtersArray.includes((Konva.Filters as any).ColorShift)) filtersArray.push((Konva.Filters as any).ColorShift);
        let r = 0, g = 0, b = 0;
        if (temperature) {
          const tempNorm = temperature / 100;
          r += tempNorm * 15;
          b -= tempNorm * 15;
        }
        if (tint) {
          const tintNorm = tint / 100;
          g += tintNorm * 10;
          r += tintNorm * 2.5;
          b += tintNorm * 2.5;
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
    kImg.cache({ pixelRatio: 1, imageSmoothingEnabled: false });
  }

  layer.add(kImg);
  stage.add(layer);
  layer.draw();

  const quality = JPEG_QUALITY_SCALE_MAP[options.jpegQualityLevel] ?? 1.0;
  const dataURL = stage.toDataURL({ mimeType: 'image/jpeg', quality });

  stage.destroy();
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);

  const blob = base64ToBlob(dataURL, 'image/jpeg');
  const safeName = sanitizeFileName(options.fileNameBase || 'CameraRaw_Photo');
  const fileName = `${safeName}.jpg`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileHandle = options.targetFileHandle;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!fileHandle && options.saveDestination === 'directory_picker' && typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JPEG Image',
          accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
        }],
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn("SaveFilePicker failed, falling back to download:", err);
    }
  }

  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      if (onProgress) onProgress(1, 1);
      return;
    } catch (err) {
      console.error("Failed to write to fileHandle, falling back to download:", err);
    }
  }

  saveAs(blob, fileName);
  if (onProgress) onProgress(1, 1);
}

export async function exportToPDF(project: EditorProject, options?: PDFExportOptions | ProfessionalExportOptions): Promise<void> {
  const onProgress = options?.onProgress;
  const pdfW = project.size.w_mm;
  const pdfH = project.size.h_mm;
  
  const orientation = pdfW > pdfH ? 'l' : 'p';
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: [pdfW, pdfH] 
  });
  
  const total = project.spreads.length;
  const isProf = options && 'fileNameBase' in options;
  const safeTitle = sanitizeFileName(isProf ? options.fileNameBase : (project.title || 'Album'));
  
  let startIdx = 0;
  let endIdx = total - 1;

  if (isProf) {
    const profOpts = options as ProfessionalExportOptions;
    if (profOpts.rangeMode === 'current') {
      startIdx = Math.max(0, Math.min(total - 1, profOpts.activeSpreadIndex ?? 0));
      endIdx = startIdx;
    } else if (profOpts.rangeMode === 'custom') {
      startIdx = Math.max(0, profOpts.rangeStart ?? 0);
      endIdx = Math.min(total - 1, profOpts.rangeEnd ?? (total - 1));
    }
  } else if (options) {
    const pdfOpts = options as PDFExportOptions;
    startIdx = Math.max(0, pdfOpts.rangeStart ?? 0);
    endIdx = Math.min(total - 1, pdfOpts.rangeEnd ?? (total - 1));
  }

  const processCount = endIdx - startIdx + 1;
  const targetDpi = isProf ? (options as ProfessionalExportOptions).dpi : 300;
  const pixelMultiplier = targetDpi / 25.4;

  let pagesAdded = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    const spread = project.spreads[i];
    
    // Skip completely empty pages
    const hasValidContent = spread.elements.some(el => {
       if (el.type === 'text' || el.type === 'shape') return true;
       if ((el.type === 'image' || el.type === 'decoration') && (el.originalBlobId || el.previewUrl || el.src)) return true;
       return false;
    });
    if (!hasValidContent) continue;
    
    // Memory relaxation gap between spreads
    await new Promise(r => setTimeout(r, 25));

    const base64Jpg = await exportSpreadToJPG(project, spread, {
      size: project.size,
      pixelMultiplier,
      quality: 1.0,
    });
    
    if (pagesAdded > 0) doc.addPage([pdfW, pdfH], orientation);
    doc.addImage(base64Jpg, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    
    pagesAdded++;
    if (onProgress) onProgress(pagesAdded, processCount);
  }
  
  const filename = `${safeTitle}.pdf`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileHandle = isProf ? (options as ProfessionalExportOptions).targetFileHandle : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!fileHandle && isProf && options && (options as ProfessionalExportOptions).saveDestination === 'directory_picker' && typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] },
        }],
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn("SaveFilePicker failed for PDF, falling back to download:", err);
    }
  }

  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      const pdfBlob = doc.output('blob');
      await writable.write(pdfBlob);
      await writable.close();
      return;
    } catch (err) {
      console.error("Failed to write to PDF fileHandle:", err);
    }
  }

  doc.save(filename);
}

export async function exportToJPG(project: EditorProject, options: AdvancedExportOptions | ProfessionalExportOptions): Promise<void> {
  const isProf = 'moduleContext' in options;

  if (isProf) {
    const profOpts = options as ProfessionalExportOptions;
    if (profOpts.moduleContext === 'studio') {
      return exportStudioPrintToJPG(project, profOpts);
    }
    if (profOpts.moduleContext === 'camera_raw') {
      return exportRawPhotoToJPG(project, profOpts);
    }
  }

  // Album export
  const onProgress = options.onProgress;
  const safeTitle = sanitizeFileName(isProf ? (options as ProfessionalExportOptions).fileNameBase : (project.title || 'Album'));
  const total = project.spreads.length;

  let startIdx = 0;
  let endIdx = total - 1;
  let pixelMultiplier = 12;
  let jpQuality = 1.0;
  let sequentialDigits = 3;

  if (isProf) {
    const profOpts = options as ProfessionalExportOptions;
    if (profOpts.rangeMode === 'current') {
      startIdx = Math.max(0, Math.min(total - 1, profOpts.activeSpreadIndex ?? 0));
      endIdx = startIdx;
    } else if (profOpts.rangeMode === 'custom') {
      startIdx = Math.max(0, profOpts.rangeStart ?? 0);
      endIdx = Math.min(total - 1, profOpts.rangeEnd ?? (total - 1));
    }
    pixelMultiplier = (profOpts.dpi || 300) / 25.4;
    jpQuality = JPEG_QUALITY_SCALE_MAP[profOpts.jpegQualityLevel] ?? 1.0;
    sequentialDigits = profOpts.sequentialDigits || 3;
  } else {
    const advOpts = options as AdvancedExportOptions;
    startIdx = Math.max(0, advOpts.rangeStart ?? 0);
    endIdx = Math.min(total - 1, advOpts.rangeEnd ?? (total - 1));
    if (advOpts.type === 'web') {
      pixelMultiplier = 4;
      if (advOpts.webQuality === 'low') { jpQuality = 0.6; pixelMultiplier = 2; }
      else if (advOpts.webQuality === 'medium') { jpQuality = 0.75; pixelMultiplier = 3; }
      else { jpQuality = 0.9; pixelMultiplier = 4; }
    } else {
      const hasMassiveSpreads = (endIdx - startIdx + 1) > 30;
      pixelMultiplier = hasMassiveSpreads ? 6 : 12;
    }
  }

  const processCount = endIdx - startIdx + 1;

  // Single spread export optimization: Direct JPG download (no unnecessary ZIP!)
  if (processCount === 1) {
    const spread = project.spreads[startIdx];
    if (spread) {
      if (onProgress) onProgress(0, 1);
      const base64Jpg = await exportSpreadToJPG(project, spread, {
        size: project.size,
        pixelMultiplier,
        quality: jpQuality,
      });
      const blob = base64ToBlob(base64Jpg, 'image/jpeg');
      const idxStr = String(startIdx + 1).padStart(sequentialDigits, '0');
      const singleFileName = `${safeTitle}_${idxStr}.jpg`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fileHandle = isProf ? (options as ProfessionalExportOptions).targetFileHandle : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!fileHandle && isProf && (options as ProfessionalExportOptions).saveDestination === 'directory_picker' && typeof window !== 'undefined' && (window as any).showSaveFilePicker) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: singleFileName,
            types: [{
              description: 'JPEG Image',
              accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
            }],
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          console.warn("SaveFilePicker failed, falling back to download:", err);
        }
      }

      if (fileHandle) {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          if (onProgress) onProgress(1, 1);
          return;
        } catch (err) {
          console.error("Failed to write to fileHandle:", err);
        }
      }

      saveAs(blob, singleFileName);
      if (onProgress) onProgress(1, 1);
      return;
    }
  }

  // Multiple spreads export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dirHandle: any = isProf ? (options as ProfessionalExportOptions).targetDirHandle : null;
  const wantDir = isProf ? (options as ProfessionalExportOptions).saveDestination === 'directory_picker' : true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!dirHandle && wantDir && typeof window !== 'undefined' && (window as any).showDirectoryPicker) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dirHandle = await (window as any).showDirectoryPicker({ id: 'rvp-export', mode: 'readwrite' });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn("Directory picker failed, falling back to ZIP:", err);
    }
  }

  const zip = !dirHandle ? new JSZip() : null;
  const folder = zip ? (zip.folder(safeTitle) || zip) : null;

  let processedCount = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    const spread = project.spreads[i];

    // Skip empty spreads
    const hasValidContent = spread.elements.some(el => {
      if (el.type === 'text' || el.type === 'shape') return true;
      if ((el.type === 'image' || el.type === 'decoration') && (el.originalBlobId || el.previewUrl || el.src)) return true;
      return false;
    });
    if (!hasValidContent) continue;

    // Memory relaxation gap
    await new Promise(r => setTimeout(r, 25));

    const base64Jpg = await exportSpreadToJPG(project, spread, {
      size: project.size,
      pixelMultiplier,
      quality: jpQuality,
    });

    const base64Data = base64Jpg.replace(/^data:image\/jpeg;base64,/, "");
    const idxStr = String(i + 1).padStart(sequentialDigits, '0');
    const fileName = `${safeTitle}_${idxStr}.jpg`;

    if (dirHandle) {
      try {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        const blob = base64ToBlob(base64Jpg, 'image/jpeg');
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        console.error(`Failed to write file ${fileName} to directory`, err);
      }
    } else if (folder) {
      folder.file(fileName, base64Data, { base64: true });
    }

    processedCount++;
    if (onProgress) onProgress(processedCount, processCount);
  }

  if (!dirHandle && zip) {
    const content = await zip.generateAsync({ type: "blob" });
    const filename = `${safeTitle}.zip`;
    saveAs(content, filename);
  }
}

