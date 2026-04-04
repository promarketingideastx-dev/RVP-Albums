import { EditorProject, Spread } from '@/types/editor';

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
            width: el.w_mm * mmToPx,
            height: el.h_mm * mmToPx,
            cornerRadius: appliedBorderRadius * mmToPx,
            stroke: appliedStrokeWidth > 0 ? appliedStrokeColor : undefined,
            strokeWidth: appliedStrokeWidth * mmToPx,
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
              opacity: el.filterIntensity !== undefined ? el.filterIntensity : 1,
              cornerRadius: appliedBorderRadius * mmToPx,
              stroke: appliedStrokeWidth > 0 ? appliedStrokeColor : undefined,
              strokeWidth: appliedStrokeWidth * mmToPx,
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
