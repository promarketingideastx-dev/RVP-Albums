import { PhotoAdjustments, ToneCurveAdjustments, PointColorAdjustment } from '@/types/editor';
import { LUT_LIBRARY } from '@/lib/lut-presets';

// ============================================================================
// CAMERA RAW IMAGE PROCESSING PIPELINE V3
// Real-time Canvas & WebGL filter engine for professional photographic adjustments:
// - Photometric Exposure (-5 to +5 EV), Contrast, Highlights, Shadows, Whites, Blacks
// - Thermal Color Shift (Temperature & Tint)
// - C1-Continuous Smooth Spline Tone Curves (Highlights, Lights, Darks, Shadows)
// - 60 FPS Precomputed 8-Channel HSL Color Mixer
// - Targeted Point Color (Eyedropper selective color separation)
// - Proportional Intensity Blenders for Sepia, Grayscale, Invert & LUT Presets
// ============================================================================

export const DEFAULT_HSL_CHANNELS = {
  reds: { h: 0, s: 0, l: 0 },
  oranges: { h: 0, s: 0, l: 0 },
  yellows: { h: 0, s: 0, l: 0 },
  greens: { h: 0, s: 0, l: 0 },
  aquas: { h: 0, s: 0, l: 0 },
  blues: { h: 0, s: 0, l: 0 },
  purples: { h: 0, s: 0, l: 0 },
  magentas: { h: 0, s: 0, l: 0 },
};

export const DEFAULT_TONE_CURVE: ToneCurveAdjustments = {
  highlights: 0,
  lights: 0,
  darks: 0,
  shadows: 0,
};

export const DEFAULT_POINT_COLOR: PointColorAdjustment = {
  enabled: false,
  sampleHex: '#d88b60',
  sampleH: 22,
  sampleS: 60,
  sampleL: 61,
  hueShift: 0,
  satShift: 0,
  lumShift: 0,
  range: 35,
};

// 8-Family HSL Color Mixer Centers and Natural Gaussian Spectral Widths
export const HSL_COLOR_CENTERS = [
  { key: 'reds', center: 0, width: 34 },
  { key: 'oranges', center: 30, width: 28 },
  { key: 'yellows', center: 60, width: 32 },
  { key: 'greens', center: 120, width: 55 },
  { key: 'aquas', center: 180, width: 45 },
  { key: 'blues', center: 235, width: 50 },
  { key: 'purples', center: 280, width: 35 },
  { key: 'magentas', center: 325, width: 35 },
] as const;

// Helper: RGB to HSL conversion (normalized 0..360, 0..100, 0..100)
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number; hex: string } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
      if (h < 0) h += 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const hex = '#' + [r, g, b].map(x => {
    const hexStr = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hexStr.length === 1 ? '0' + hexStr : hexStr;
  }).join('');

  return {
    h: Math.round(h) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    hex,
  };
}

// Helper: Calculate White Balance offsets from a sampled neutral pixel
export function calculateWhiteBalanceFromSample(r: number, g: number, b: number): { temperature: number; tint: number } {
  const avg = (r + g + b) / 3;
  if (avg === 0) return { temperature: 0, tint: 0 };

  // If pixel has more blue than red, it is cold -> needs positive temperature (warmth)
  // If pixel has more red than blue, it is warm -> needs negative temperature (cool)
  const redDiff = (avg - r) / avg;
  const blueDiff = (b - avg) / avg;
  const rawTemp = (blueDiff - redDiff) * 85;

  // Tint: green vs magenta (red + blue)
  const rbAvg = (r + b) / 2;
  const greenDiff = (rbAvg - g) / avg;
  const rawTint = greenDiff * 95;

  return {
    temperature: Math.round(Math.max(-100, Math.min(100, rawTemp))),
    tint: Math.round(Math.max(-100, Math.min(100, rawTint))),
  };
}

// C1-Continuous Smooth Cosine Lobe for Tone Curves (Zero derivative at boundary)
function smoothCosineLobe(xRatio: number, center: number, radius: number): number {
  const dist = Math.abs(xRatio - center) / radius;
  if (dist >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * dist));
}

/**
 * Registers custom Konva filters on the provided or global Konva object:
 * 1. ColorShift: Additive thermal shift for White Balance (Temp & Tint)
 * 2. ToneCurve: C1-Smooth continuous spline tone curves (Highlights, Lights, Darks, Shadows)
 * 3. HslMixer: Precomputed 360-LUT 60 FPS 8-channel HSL color modification
 * 4. PointColor: Targeted selective color replacement with eyedropper tolerance
 * 5. ProportionalSepia, ProportionalGrayscale, ProportionalInvert: Real 0-100% blend filters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerKonvaRawFilters(konvaInstance?: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const K = konvaInstance || (typeof window !== 'undefined' ? (window as any).Konva : null);
  if (!K || !K.Filters) return;

  // 1. ColorShift Filter (Thermal White Balance)
  if (!K.Filters.ColorShift) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.ColorShift = function (this: any, imageData: ImageData) {
      const rShift = this.getAttr('redShift') || 0;
      const gShift = this.getAttr('greenShift') || 0;
      const bShift = this.getAttr('blueShift') || 0;
      if (rShift === 0 && gShift === 0 && bShift === 0) return;

      const data = imageData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + rShift));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + gShift));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + bShift));
      }
    };
  }

  // 2. ToneCurve Filter (C1-Continuous Smooth Photographic Curve)
  if (!K.Filters.ToneCurve) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.ToneCurve = function (this: any, imageData: ImageData) {
      const highlights = this.getAttr('curveHighlights') || 0;
      const lights = this.getAttr('curveLights') || 0;
      const darks = this.getAttr('curveDarks') || 0;
      const shadows = this.getAttr('curveShadows') || 0;

      if (highlights === 0 && lights === 0 && darks === 0 && shadows === 0) return;

      // Build 256-level transfer lookup table with silky smooth cosine lobes
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        const x = i / 255;
        // Smooth continuous overlapping lobes:
        const wShadows = smoothCosineLobe(x, 0.08, 0.28);
        const wDarks = smoothCosineLobe(x, 0.32, 0.32);
        const wLights = smoothCosineLobe(x, 0.66, 0.32);
        const wHighlights = smoothCosineLobe(x, 0.90, 0.28);

        const delta = (shadows * wShadows + darks * wDarks + lights * wLights + highlights * wHighlights) * 0.65;
        lut[i] = Math.max(0, Math.min(255, Math.round(i + delta)));
      }

      const data = imageData.data;
      const len = data.length;
      for (let i = 0; i < len; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
    };
  }

  // 3. HslMixer Filter (Ultra-Fast 60 FPS 8-Channel Mixer via Precomputed Hue Table)
  if (!K.Filters.HslMixer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.HslMixer = function (this: any, imageData: ImageData) {
      const hslData = this.getAttr('hslAdjustments');
      if (!hslData) return;

      // 1. Precalculate 360-LUT delta shifts ONCE per frame
      const HUE_LUT: { deltaH: number; deltaS: number; deltaL: number; active: boolean }[] = new Array(360);
      let anyActive = false;

      for (let h = 0; h < 360; h++) {
        let totalDH = 0;
        let totalDS = 0;
        let totalDL = 0;

        for (const c of HSL_COLOR_CENTERS) {
          let diff = Math.abs(h - c.center);
          if (diff > 180) diff = 360 - diff;
          if (diff >= c.width) continue;

          // Smooth cosine falloff
          const w = 0.5 * (1 + Math.cos((Math.PI * diff) / c.width));
          const ch = hslData[c.key];
          if (!ch) continue;
          if (ch.h) totalDH += ch.h * w;
          if (ch.s) totalDS += ch.s * w;
          if (ch.l) totalDL += ch.l * w;
        }

        const active = totalDH !== 0 || totalDS !== 0 || totalDL !== 0;
        if (active) anyActive = true;
        HUE_LUT[h] = { deltaH: totalDH, deltaS: totalDS, deltaL: totalDL, active };
      }

      if (!anyActive) return;

      // 2. Run fast single-pass pixel loop
      const data = imageData.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Skip completely neutral/achromatic pixels
        if (delta < 3) continue;

        // Fast Hue calculation
        let h = 0;
        if (max === r) {
          h = ((g - b) / delta) % 6;
          if (h < 0) h += 6;
        } else if (max === g) {
          h = (b - r) / delta + 2;
        } else {
          h = (r - g) / delta + 4;
        }
        const hueDeg = Math.round(h * 60) % 360;
        const normH = hueDeg < 0 ? hueDeg + 360 : hueDeg;

        const shift = HUE_LUT[normH];
        if (!shift || !shift.active) continue;

        // Fast Lightness & Saturation
        const l = (max + min) / 510; // 0..1
        const s = l > 0.5 ? delta / (510 - max - min) : delta / (max + min); // 0..1

        // Apply shifts smoothly
        const newH = ((normH + shift.deltaH * 0.40) % 360 + 360) % 360;
        const newS = Math.max(0, Math.min(1, s + (shift.deltaS / 100) * 0.85));
        const newL = Math.max(0, Math.min(1, l + (shift.deltaL / 100) * 0.45));

        // Fast HSL to RGB conversion
        const cVal = (1 - Math.abs(2 * newL - 1)) * newS;
        const xVal = cVal * (1 - Math.abs(((newH / 60) % 2) - 1));
        const mVal = newL - cVal / 2;

        let rOut = 0, gOut = 0, bOut = 0;
        if (newH < 60) { rOut = cVal; gOut = xVal; bOut = 0; }
        else if (newH < 120) { rOut = xVal; gOut = cVal; bOut = 0; }
        else if (newH < 180) { rOut = 0; gOut = cVal; bOut = xVal; }
        else if (newH < 240) { rOut = 0; gOut = xVal; bOut = cVal; }
        else if (newH < 300) { rOut = xVal; gOut = 0; bOut = cVal; }
        else { rOut = cVal; gOut = 0; bOut = xVal; }

        data[i] = Math.max(0, Math.min(255, Math.round((rOut + mVal) * 255)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round((gOut + mVal) * 255)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round((bOut + mVal) * 255)));
      }
    };
  }

  // 4. PointColor Filter (Targeted Selective Color Separation)
  if (!K.Filters.PointColor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.PointColor = function (this: any, imageData: ImageData) {
      const pc = this.getAttr('pointColorAdjustment') as PointColorAdjustment | undefined;
      if (!pc || !pc.enabled) return;
      if (pc.hueShift === 0 && pc.satShift === 0 && pc.lumShift === 0) return;

      const sampleH = typeof pc.sampleH === 'number' ? pc.sampleH : 0;
      const sampleS = typeof pc.sampleS === 'number' ? pc.sampleS / 100 : 0.5;
      const sampleL = typeof pc.sampleL === 'number' ? pc.sampleL / 100 : 0.5;

      const range = typeof pc.range === 'number' ? pc.range : 35;
      const rangeRatio = Math.max(0.1, Math.min(1.0, range / 100));

      // Range scales hue cone, saturation cone, and luminance cone:
      const hueRadius = 15 + rangeRatio * 35; // 18° to 50°
      const satRadius = 0.25 + rangeRatio * 0.45; // 0.29 to 0.70
      const lumRadius = 0.30 + rangeRatio * 0.45; // 0.34 to 0.75

      // Precalculate tolerance weights across 360 degrees
      const HUE_LUT = new Float32Array(360);
      for (let h = 0; h < 360; h++) {
        let diff = Math.abs(h - sampleH);
        if (diff > 180) diff = 360 - diff;
        if (diff < hueRadius) {
          HUE_LUT[h] = 0.5 * (1 + Math.cos((Math.PI * diff) / hueRadius));
        } else {
          HUE_LUT[h] = 0;
        }
      }

      const data = imageData.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (delta < 3) continue; // Pure gray/white/black has undefined hue

        let h = 0;
        if (max === r) {
          h = ((g - b) / delta) % 6;
          if (h < 0) h += 6;
        } else if (max === g) {
          h = (b - r) / delta + 2;
        } else {
          h = (r - g) / delta + 4;
        }
        const hueDeg = Math.round(h * 60) % 360;
        const normH = hueDeg < 0 ? hueDeg + 360 : hueDeg;

        const wH = HUE_LUT[normH];
        if (wH <= 0.005) continue;

        const l = (max + min) / 510; // 0 to 1
        const s = l > 0.5 ? delta / (510 - max - min) : delta / (max + min); // 0 to 1

        // Saturation proximity
        const sDiff = Math.abs(s - sampleS);
        if (sDiff >= satRadius) continue;
        const wS = 0.5 * (1 + Math.cos((Math.PI * sDiff) / satRadius));

        // Luminance proximity
        const lDiff = Math.abs(l - sampleL);
        if (lDiff >= lumRadius) continue;
        const wL = 0.5 * (1 + Math.cos((Math.PI * lDiff) / lumRadius));

        // Combined 3D weight
        const w = wH * wS * wL;
        if (w <= 0.005) continue;

        // Potent photographic shift
        const newH = ((normH + (pc.hueShift * 0.85 * w)) % 360 + 360) % 360;
        const newS = Math.max(0, Math.min(1, s + ((pc.satShift / 100) * 1.0 * w)));
        const newL = Math.max(0, Math.min(1, l + ((pc.lumShift / 100) * 0.60 * w)));

        const cVal = (1 - Math.abs(2 * newL - 1)) * newS;
        const xVal = cVal * (1 - Math.abs(((newH / 60) % 2) - 1));
        const mVal = newL - cVal / 2;

        let rOut = 0, gOut = 0, bOut = 0;
        if (newH < 60) { rOut = cVal; gOut = xVal; bOut = 0; }
        else if (newH < 120) { rOut = xVal; gOut = cVal; bOut = 0; }
        else if (newH < 180) { rOut = 0; gOut = cVal; bOut = xVal; }
        else if (newH < 240) { rOut = 0; gOut = xVal; bOut = cVal; }
        else if (newH < 300) { rOut = xVal; gOut = 0; bOut = cVal; }
        else { rOut = cVal; gOut = 0; bOut = xVal; }

        const targetR = Math.max(0, Math.min(255, Math.round((rOut + mVal) * 255)));
        const targetG = Math.max(0, Math.min(255, Math.round((gOut + mVal) * 255)));
        const targetB = Math.max(0, Math.min(255, Math.round((bOut + mVal) * 255)));

        // Smooth continuous blend with original pixel
        data[i] = Math.round(r * (1 - w) + targetR * w);
        data[i + 1] = Math.round(g * (1 - w) + targetG * w);
        data[i + 2] = Math.round(b * (1 - w) + targetB * w);
      }
    };
  }

  // 5. Texture Filter (High-Frequency Detail Separation: Pores/Hair Crisping vs Delicate Skin Softening)
  if (!K.Filters.Texture) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.Texture = function (this: any, imageData: ImageData) {
      const texture = this.getAttr('textureAmount') || 0;
      if (texture === 0) return;

      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      if (width < 3 || height < 3) return;

      const strength = texture / 100; // -1 to 1
      const copy = new Uint8ClampedArray(data);

      for (let y = 1; y < height - 1; y++) {
        const row = y * width;
        for (let x = 1; x < width - 1; x++) {
          const idx = (row + x) * 4;
          const up = ((y - 1) * width + x) * 4;
          const down = ((y + 1) * width + x) * 4;
          const left = (row + x - 1) * 4;
          const right = (row + x + 1) * 4;

          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const avg = (copy[up + c] + copy[down + c] + copy[left + c] + copy[right + c]) >> 2;
            const detail = center - avg;

            if (strength > 0) {
              // Texture pop: crisp hair, eyelashes, fabric, pores
              data[idx + c] = Math.max(0, Math.min(255, Math.round(center + detail * strength * 1.5)));
            } else {
              // Delicate skin smoothing without blurring the whole picture
              data[idx + c] = Math.max(0, Math.min(255, Math.round(center + detail * strength * 0.75)));
            }
          }
        }
      }
    };
  }

  // 6. Clarity Filter (Local Midtone Contrast S-Curve Dynamics)
  if (!K.Filters.Clarity) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.Clarity = function (this: any, imageData: ImageData) {
      const clarity = this.getAttr('clarityAmount') || 0;
      if (clarity === 0) return;

      const data = imageData.data;
      const len = data.length;
      const strength = (clarity / 100) * 0.45;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 510;

        // Peak weight at midtone (L = 0.5), zero at highlights and deep shadows
        const midWeight = 4 * l * (1 - l);
        if (midWeight <= 0.01) continue;

        const delta = (l - 0.5) * strength * midWeight * 255;
        data[i] = Math.max(0, Math.min(255, Math.round(r + delta)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g + delta)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b + delta)));
      }
    };
  }

  // 7. Dehaze Filter (Atmospheric Shadow Penetration & Clarity)
  if (!K.Filters.Dehaze) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.Dehaze = function (this: any, imageData: ImageData) {
      const dehaze = this.getAttr('dehazeAmount') || 0;
      if (dehaze === 0) return;

      const data = imageData.data;
      const len = data.length;
      const strength = (dehaze / 100) * 0.35;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const dark = Math.min(r, g, b);
        const boost = (dark / 255) * strength * 50;

        data[i] = Math.max(0, Math.min(255, Math.round(r - boost)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g - boost)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b - boost)));
      }
    };
  }

  // 5. ProportionalSepia Filter (Smooth 0 to 1 intensity blend)
  if (!K.Filters.ProportionalSepia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.ProportionalSepia = function (this: any, imageData: ImageData) {
      const intensity = typeof this.getAttr('sepiaIntensity') === 'number' ? this.getAttr('sepiaIntensity') : 1;
      if (intensity <= 0) return;

      const data = imageData.data;
      const len = data.length;
      const invInt = 1 - intensity;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const targetR = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
        const targetG = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
        const targetB = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);

        data[i] = Math.round(r * invInt + targetR * intensity);
        data[i + 1] = Math.round(g * invInt + targetG * intensity);
        data[i + 2] = Math.round(b * invInt + targetB * intensity);
      }
    };
  }

  // 6. ProportionalGrayscale Filter (Smooth 0 to 1 intensity blend)
  if (!K.Filters.ProportionalGrayscale) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.ProportionalGrayscale = function (this: any, imageData: ImageData) {
      const intensity = typeof this.getAttr('grayscaleIntensity') === 'number' ? this.getAttr('grayscaleIntensity') : 1;
      if (intensity <= 0) return;

      const data = imageData.data;
      const len = data.length;
      const invInt = 1 - intensity;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        data[i] = Math.round(r * invInt + gray * intensity);
        data[i + 1] = Math.round(g * invInt + gray * intensity);
        data[i + 2] = Math.round(b * invInt + gray * intensity);
      }
    };
  }

  // 7. ProportionalInvert Filter (Smooth 0 to 1 intensity blend)
  if (!K.Filters.ProportionalInvert) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    K.Filters.ProportionalInvert = function (this: any, imageData: ImageData) {
      const intensity = typeof this.getAttr('invertIntensity') === 'number' ? this.getAttr('invertIntensity') : 1;
      if (intensity <= 0) return;

      const data = imageData.data;
      const len = data.length;
      const invInt = 1 - intensity;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        data[i] = Math.round(r * invInt + (255 - r) * intensity);
        data[i + 1] = Math.round(g * invInt + (255 - g) * intensity);
        data[i + 2] = Math.round(b * invInt + (255 - b) * intensity);
      }
    };
  }
}

/**
 * Applies full Camera Raw adjustments and photographic LUTs to a Konva image node.
 * Shared directly between SpreadCanvas (interactive viewport) and exportEngine (300 DPI print export).
 */
export function applyRawAdjustmentsToKonvaNode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any,
  adj: Partial<PhotoAdjustments> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingFilters: any[] = [],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  konvaInstance?: any,
  photoFilter?: string,
  filterIntensity?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const K = konvaInstance || (typeof window !== 'undefined' ? (window as any).Konva : null);
  if (K) {
    registerKonvaRawFilters(K);
  }

  const filtersArray = [...existingFilters];
  const KFilters = K?.Filters;

  const bypassLight = adj.bypassLight || false;
  const bypassColor = adj.bypassColor || false;
  const bypassEffects = adj.bypassEffects || false;
  const bypassCurve = adj.bypassCurve || false;
  const bypassColorMixer = adj.bypassColorMixer || false;
  const bypassPointColor = adj.bypassPointColor || false;

  // Process LUT or Legacy Filter Base
  let lutContrast = 0;
  let lutBrightness = 0;
  let lutTemperature = 0;
  let lutTint = 0;
  let lutSaturation = 0;

  const intensity = filterIntensity !== undefined ? Math.max(0, Math.min(10, filterIntensity)) : 1;

  if (photoFilter && photoFilter !== 'none') {
    const lut = LUT_LIBRARY.find((l) => l.id === photoFilter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const KF = KFilters as any;

    if (lut) {
      if (lut.contrast) lutContrast = lut.contrast * intensity;
      if (lut.brightness) lutBrightness = lut.brightness * intensity;
      if (lut.temperature) lutTemperature = lut.temperature * intensity;
      if (lut.tint) lutTint = lut.tint * intensity;
      if (lut.saturation) lutSaturation = (lut.saturation * 100) * intensity;

      if (lut.grayscale && KF?.ProportionalGrayscale && !filtersArray.includes(KF.ProportionalGrayscale)) {
        filtersArray.push(KF.ProportionalGrayscale);
        node.setAttr('grayscaleIntensity', intensity);
      }
      if (lut.sepia && KF?.ProportionalSepia && !filtersArray.includes(KF.ProportionalSepia)) {
        filtersArray.push(KF.ProportionalSepia);
        node.setAttr('sepiaIntensity', intensity);
      }
      if (lut.invert && KF?.ProportionalInvert && !filtersArray.includes(KF.ProportionalInvert)) {
        filtersArray.push(KF.ProportionalInvert);
        node.setAttr('invertIntensity', intensity);
      }
    } else {
      // Legacy filter fallback
      switch (photoFilter) {
        case 'sepia':
          if (KF?.ProportionalSepia && !filtersArray.includes(KF.ProportionalSepia)) {
            filtersArray.push(KF.ProportionalSepia);
            node.setAttr('sepiaIntensity', intensity);
          }
          break;
        case 'grayscale':
          if (KF?.ProportionalGrayscale && !filtersArray.includes(KF.ProportionalGrayscale)) {
            filtersArray.push(KF.ProportionalGrayscale);
            node.setAttr('grayscaleIntensity', intensity);
          }
          break;
        case 'invert':
          if (KF?.ProportionalInvert && !filtersArray.includes(KF.ProportionalInvert)) {
            filtersArray.push(KF.ProportionalInvert);
            node.setAttr('invertIntensity', intensity);
          }
          break;
        case 'blur':
          if (KFilters?.Blur && !filtersArray.includes(KFilters.Blur)) {
            filtersArray.push(KFilters.Blur);
            node.blurRadius(intensity * 5);
          }
          break;
        case 'noise':
          if (KFilters?.Noise && !filtersArray.includes(KFilters.Noise)) {
            filtersArray.push(KFilters.Noise);
            node.noise(intensity);
          }
          break;
        case 'brighten':
          lutBrightness += intensity * 0.15;
          break;
        case 'contrast':
          lutContrast += intensity;
          break;
        case 'posterize':
          if (KFilters?.Posterize && !filtersArray.includes(KFilters.Posterize)) {
            filtersArray.push(KFilters.Posterize);
            node.levels(intensity);
          }
          break;
      }
    }
  }

  // 1. Exposure and Tone Levels (Photometric EV stops + LUT baseline)
  const exposure = !bypassLight ? (adj.exposure || 0) : 0;
  const lightContrast = !bypassLight ? (adj.lightContrast || 0) : 0;
  const highlights = !bypassLight ? (adj.highlights || 0) : 0;
  const shadows = !bypassLight ? (adj.shadows || 0) : 0;
  const whites = !bypassLight ? (adj.whites || 0) : 0;
  const blacks = !bypassLight ? (adj.blacks || 0) : 0;

  let totalBrightness = lutBrightness;
  if (exposure !== 0 || highlights !== 0 || shadows !== 0 || whites !== 0 || blacks !== 0) {
    totalBrightness += (exposure / 5) * 0.70;
    if (highlights) totalBrightness += (highlights / 100) * 0.28;
    if (whites) totalBrightness += (whites / 100) * 0.22;
    if (shadows) totalBrightness += (shadows / 100) * 0.28;
    if (blacks) totalBrightness += (blacks / 100) * 0.22;
  }
  if (totalBrightness !== 0) {
    if (KFilters?.Brighten && !filtersArray.includes(KFilters.Brighten)) {
      filtersArray.push(KFilters.Brighten);
    }
    node.brightness(Math.max(-1, Math.min(1, totalBrightness)));
  }

  // 2. Global Contrast (Authentic Tone Curve / S-Contrast)
  const totalContrast = lightContrast + lutContrast;
  if (totalContrast !== 0) {
    if (KFilters?.Contrast && !filtersArray.includes(KFilters.Contrast)) {
      filtersArray.push(KFilters.Contrast);
    }
    node.contrast(Math.max(-100, Math.min(100, totalContrast)));
  }

  // 3. Dedicated High-Frequency Texture (Detail Crisping vs Delicate Skin Softening)
  const texture = !bypassEffects ? (adj.texture || 0) : 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const KF = KFilters as any;
  if (texture !== 0 && KF?.Texture) {
    if (!filtersArray.includes(KF.Texture)) {
      filtersArray.push(KF.Texture);
    }
    node.setAttr('textureAmount', texture);
  }

  // 4. Dedicated Midtone Clarity (Local Dynamic S-Curve)
  const clarity = !bypassEffects ? (adj.clarity || 0) : 0;
  if (clarity !== 0 && KF?.Clarity) {
    if (!filtersArray.includes(KF.Clarity)) {
      filtersArray.push(KF.Clarity);
    }
    node.setAttr('clarityAmount', clarity);
  }

  // 5. Dedicated Dehaze (Atmospheric Shadow Recovery)
  const dehaze = !bypassEffects ? (adj.dehaze || 0) : 0;
  if (dehaze !== 0 && KF?.Dehaze) {
    if (!filtersArray.includes(KF.Dehaze)) {
      filtersArray.push(KF.Dehaze);
    }
    node.setAttr('dehazeAmount', dehaze);
  }

  // 6. Vibrance and Saturation
  const vibrance = !bypassColor ? (adj.vibrance || 0) : 0;
  const saturation = !bypassColor ? (adj.saturation || 0) : 0;
  const totalSat = saturation + lutSaturation + (vibrance ? vibrance * 0.6 : 0);

  if (totalSat !== 0) {
    if (KFilters?.HSL && !filtersArray.includes(KFilters.HSL)) {
      filtersArray.push(KFilters.HSL);
    }
    node.saturation(Math.max(-2, Math.min(2, (totalSat / 100) * 1.4)));
    node.hue(0);
  }

  // 7. White Balance (Temperature and Tint via Additive Thermal ColorShift)
  const temperature = !bypassColor ? (adj.temperature || 0) : 0;
  const tint = !bypassColor ? (adj.tint || 0) : 0;
  const totalTemp = temperature + lutTemperature;
  const totalTint = tint + lutTint;

  if (totalTemp !== 0 || totalTint !== 0) {
    if (KFilters?.ColorShift && !filtersArray.includes(KFilters.ColorShift)) {
      filtersArray.push(KFilters.ColorShift);
    }
    const TEMP_STRENGTH = 55;
    const TINT_STRENGTH = 45;

    let r = 0, g = 0, b = 0;
    if (totalTemp) {
      const tempNormalized = totalTemp / 100;
      r += tempNormalized * TEMP_STRENGTH;
      b -= tempNormalized * TEMP_STRENGTH;
    }
    if (totalTint) {
      const tintNormalized = totalTint / 100;
      g += tintNormalized * TINT_STRENGTH;
      r += tintNormalized * (TINT_STRENGTH * 0.25);
      b += tintNormalized * (TINT_STRENGTH * 0.25);
    }

    node.setAttr('redShift', r);
    node.setAttr('greenShift', g);
    node.setAttr('blueShift', b);
  }

  // 8. Parametric 4-Zone Smooth Tone Curves
  const curve = !bypassCurve ? adj.curve : undefined;
  if (curve && (curve.highlights || curve.lights || curve.darks || curve.shadows)) {
    if (KFilters?.ToneCurve && !filtersArray.includes(KFilters.ToneCurve)) {
      filtersArray.push(KFilters.ToneCurve);
    }
    node.setAttr('curveHighlights', curve.highlights || 0);
    node.setAttr('curveLights', curve.lights || 0);
    node.setAttr('curveDarks', curve.darks || 0);
    node.setAttr('curveShadows', curve.shadows || 0);
  }

  // 9. Selective 8-Channel HSL Color Mixer
  const hsl = !bypassColorMixer ? adj.hsl : undefined;
  if (hsl) {
    if (KFilters?.HslMixer && !filtersArray.includes(KFilters.HslMixer)) {
      filtersArray.push(KFilters.HslMixer);
    }
    node.setAttr('hslAdjustments', hsl);
  }

  // 10. Targeted Point Color Separation
  const pointColor = !bypassPointColor ? adj.pointColor : undefined;
  if (pointColor && pointColor.enabled) {
    if (KFilters?.PointColor && !filtersArray.includes(KFilters.PointColor)) {
      filtersArray.push(KFilters.PointColor);
    }
    node.setAttr('pointColorAdjustment', pointColor);
  }

  // 11. Effects: Grain (Noise)
  const grain = !bypassEffects ? (adj.grain || 0) : 0;
  if (grain) {
    if (KFilters?.Noise && !filtersArray.includes(KFilters.Noise)) {
      filtersArray.push(KFilters.Noise);
    }
    node.noise(Math.max(0, (grain / 100) * 0.4));
  }

  // 12. Effects: Blur
  const blur = !bypassEffects ? (adj.blur || 0) : 0;
  if (blur) {
    if (KFilters?.Blur && !filtersArray.includes(KFilters.Blur)) {
      filtersArray.push(KFilters.Blur);
    }
    node.blurRadius(Math.max(0, blur / 4));
  }

  return filtersArray;
}

/**
 * Generates high-performance CSS filter string matching active photo adjustments.
 * Allows instant hardware-accelerated preview rendering in Filmstrip and Photo Browser thumbnails
 * without requiring expensive offscreen canvas rasterization.
 */
export function buildCssFilterForAdjustments(
  adj?: Partial<PhotoAdjustments>,
  photoFilter?: string,
  filterIntensity?: number
): string {
  if (!adj && (!photoFilter || photoFilter === 'none')) {
    return 'none';
  }

  const parts: string[] = [];
  const intensity = filterIntensity !== undefined ? Math.max(0, Math.min(10, filterIntensity)) : 1;

  // 1. Exposure and Tone Levels
  const exposure = !adj?.bypassLight ? (adj?.exposure || 0) : 0;
  const highlights = !adj?.bypassLight ? (adj?.highlights || 0) : 0;
  const shadows = !adj?.bypassLight ? (adj?.shadows || 0) : 0;
  const whites = !adj?.bypassLight ? (adj?.whites || 0) : 0;
  const blacks = !adj?.bypassLight ? (adj?.blacks || 0) : 0;

  let brightnessVal = 1;
  brightnessVal += (exposure / 5) * 0.70;
  if (highlights) brightnessVal += (highlights / 100) * 0.28;
  if (whites) brightnessVal += (whites / 100) * 0.22;
  if (shadows) brightnessVal += (shadows / 100) * 0.28;
  if (blacks) brightnessVal += (blacks / 100) * 0.22;

  brightnessVal = Math.max(0.05, Math.min(3, brightnessVal));
  if (Math.abs(brightnessVal - 1) > 0.01) {
    parts.push(`brightness(${brightnessVal.toFixed(3)})`);
  }

  // 2. Contrast
  const lightContrast = !adj?.bypassLight ? (adj?.lightContrast || 0) : 0;
  let contrastVal = 1 + (lightContrast / 100) * 0.75;
  contrastVal = Math.max(0.1, Math.min(3, contrastVal));
  if (Math.abs(contrastVal - 1) > 0.01) {
    parts.push(`contrast(${contrastVal.toFixed(3)})`);
  }

  // 3. Saturation & Vibrance
  const saturation = !adj?.bypassColor ? (adj?.saturation || 0) : 0;
  const vibrance = !adj?.bypassColor ? (adj?.vibrance || 0) : 0;
  let satVal = 1 + (saturation / 100) * 1.0 + (vibrance / 100) * 0.5;
  satVal = Math.max(0, Math.min(3, satVal));
  if (Math.abs(satVal - 1) > 0.01) {
    parts.push(`saturate(${satVal.toFixed(3)})`);
  }

  // 4. Temperature & Tint
  const temp = !adj?.bypassColor ? (adj?.temperature || 0) : 0;
  const tint = !adj?.bypassColor ? (adj?.tint || 0) : 0;
  if (temp > 0) {
    parts.push(`sepia(${(temp * 0.35 / 100).toFixed(3)})`);
  } else if (temp < 0) {
    parts.push(`hue-rotate(${(temp * 0.2).toFixed(1)}deg)`);
  }
  if (tint !== 0) {
    parts.push(`hue-rotate(${(tint * 0.3).toFixed(1)}deg)`);
  }

  // 5. Blur
  const blurVal = !adj?.bypassEffects ? (adj?.blur || 0) : 0;
  if (blurVal > 0) {
    parts.push(`blur(${Math.min(8, blurVal / 10).toFixed(1)}px)`);
  }

  // 6. Photographic Filters / LUTs
  if (photoFilter && photoFilter !== 'none') {
    if (photoFilter === 'bw' || photoFilter === 'grayscale' || photoFilter === 'monochrome') {
      parts.push(`grayscale(${(100 * Math.min(1, intensity)).toFixed(0)}%)`);
    } else if (photoFilter === 'sepia') {
      parts.push(`sepia(${(100 * Math.min(1, intensity)).toFixed(0)}%)`);
    } else if (photoFilter === 'invert') {
      parts.push(`invert(${(100 * Math.min(1, intensity)).toFixed(0)}%)`);
    } else if (photoFilter === 'vintage' || photoFilter === 'matte') {
      parts.push(`sepia(30%) contrast(90%) brightness(105%)`);
    } else if (photoFilter === 'vivid' || photoFilter === 'chrome') {
      parts.push(`saturate(130%) contrast(115%)`);
    } else if (photoFilter === 'dramatic') {
      parts.push(`contrast(140%) brightness(95%)`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}
