import { EditorProject, EditorElement, Spread } from '@/types/editor';

/**
 * Loads an image from a URL with a timeout guard so offline / pending promises never hang.
 */
function loadImageWithTimeout(url: string, timeoutMs: number = 2000): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = url;
  });
}

/**
 * Generates an accurate composition thumbnail JPEG Blob of the project's first spread / studio canvas.
 */
export async function generateProjectThumbnailBlob(project: EditorProject): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;

  try {
    const spread: Spread | undefined = project.spreads?.[0];
    if (!spread) return null;

    const w_mm = project.size?.w_mm || 508;
    const h_mm = project.size?.h_mm || 254;

    const targetW = 480;
    const targetH = Math.max(100, Math.round(targetW * (h_mm / w_mm)));
    const scale = targetW / w_mm;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Render Background
    ctx.fillStyle = spread.bg_color || '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    if (spread.bg_config) {
      if (spread.bg_config.type === 'solid' && spread.bg_config.color1) {
        ctx.fillStyle = spread.bg_config.color1;
        ctx.fillRect(0, 0, targetW, targetH);
      } else if (spread.bg_config.type === 'linear' && spread.bg_config.color1 && spread.bg_config.color2) {
        const angleRad = ((spread.bg_config.gradientAngle || 0) * Math.PI) / 180;
        const x1 = targetW / 2 - (Math.cos(angleRad) * targetW) / 2;
        const y1 = targetH / 2 - (Math.sin(angleRad) * targetH) / 2;
        const x2 = targetW / 2 + (Math.cos(angleRad) * targetW) / 2;
        const y2 = targetH / 2 + (Math.sin(angleRad) * targetH) / 2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, spread.bg_config.color1);
        grad.addColorStop(1, spread.bg_config.color2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, targetW, targetH);
      }
    }

    // 2. Render Elements in zIndex order
    const elements: EditorElement[] = [...(spread.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const el of elements) {
      if (el.visible === false || el.type === 'group') continue;
      if (el.groupId) {
        const parent = elements.find((g) => g.id === el.groupId);
        if (parent && parent.visible === false) continue;
      }

      const elScale = el.scale || 1;
      const elX = el.x_mm * scale;
      const elY = el.y_mm * scale;
      const elW = el.w_mm * scale * elScale;
      const elH = el.h_mm * scale * elScale;

      ctx.save();
      ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

      // Match Konva Group origin (elX, elY) so both center-rotated and anchor-rotated elements align identically
      if (el.rotation_deg) {
        ctx.translate(elX, elY);
        ctx.rotate((el.rotation_deg * Math.PI) / 180);
        ctx.translate(-elX, -elY);
      }

      if (el.type === 'image') {
        const imgSrc = el.previewUrl || el.originalUrl || el.src;
        if (imgSrc) {
          const img = await loadImageWithTimeout(imgSrc, 1200);
          if (img) {
            // Object-fit Cover calculation
            const imgAspect = img.width / img.height;
            const boxAspect = elW / elH;
            let sx = 0;
            let sy = 0;
            let sw = img.width;
            let sh = img.height;

            if (imgAspect > boxAspect) {
              sw = img.height * boxAspect;
              sx = (img.width - sw) / 2;
            } else {
              sh = img.width / boxAspect;
              sy = (img.height - sh) / 2;
            }

            ctx.drawImage(img, sx, sy, sw, sh, elX, elY, elW, elH);
          } else {
            // Subtle placeholder box if image couldn't load in time
            ctx.fillStyle = '#262626';
            ctx.fillRect(elX, elY, elW, elH);
          }
        }
      } else if (el.type === 'shape') {
        ctx.fillStyle = el.fillColor || el.color || '#3b82f6';
        if (el.shapeType === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(elX + elW / 2, elY + elH / 2, elW / 2, elH / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(elX, elY, elW, elH);
        }
      } else if (el.type === 'text' && el.text) {
        const fontSizePx = Math.max(8, (el.fontSize || 16) * scale * 0.35);
        ctx.font = `${el.isBold ? 'bold ' : ''}${el.isItalic ? 'italic ' : ''}${fontSizePx}px ${el.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = el.textColor || el.color || '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(el.text, elX, elY);
      }

      ctx.restore();
    }

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        0.85
      );
    });
  } catch (err) {
    console.warn('Failed to generate project thumbnail blob:', err);
    return null;
  }
}

/**
 * Generates and persists the project thumbnail in IndexedDB under 'thumb_<projectId>'.
 */
export async function generateAndSaveThumbnail(project: EditorProject): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const blob = await generateProjectThumbnailBlob(project);
    if (!blob) return null;

    const { set: idbSet } = await import('idb-keyval');
    const thumbKey = `thumb_${project.id}`;
    await idbSet(thumbKey, blob);
    return thumbKey;
  } catch (err) {
    console.warn('Failed to generate and save thumbnail:', err);
    return null;
  }
}
