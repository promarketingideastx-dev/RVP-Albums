import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PhotoAdjustments } from '@/types/editor';

interface HistogramProps {
  imageSrc: string;
  photoAdjustments?: Partial<PhotoAdjustments>;
  isEs?: boolean;
}

type ChannelMode = 'rgb' | 'luma' | 'red' | 'green' | 'blue';

export const Histogram = React.memo(function Histogram({
  imageSrc,
  photoAdjustments,
  isEs = true,
}: HistogramProps) {
  const [channelMode, setChannelMode] = useState<ChannelMode>('rgb');
  const [hoverZone, setHoverZone] = useState<string | null>(null);

  // Cached base pixels from the loaded image (downsampled for ultra-fast 60fps computation)
  const basePixelsRef = useRef<Uint8ClampedArray | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // SVG dimensions
  const svgWidth = 256;
  const svgHeight = 90;

  // Load and sample the image into an offscreen canvas
  useEffect(() => {
    if (!imageSrc) return;
    let isCancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (isCancelled) return;
      try {
        const offCanvas = document.createElement('canvas');
        // Sample at 128x128 for instantaneous <0.2ms transfer function recomputation
        const sampleW = 128;
        const sampleH = Math.max(1, Math.round((img.height / img.width) * sampleW));
        offCanvas.width = sampleW;
        offCanvas.height = sampleH;
        const ctx = offCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        basePixelsRef.current = imgData.data;
        setIsLoaded(true);
      } catch {
        // Cross-origin fallback or error
      }
    };
    img.src = imageSrc;

    return () => {
      isCancelled = true;
    };
  }, [imageSrc]);

  // Compute live 256-bucket histograms whenever basePixels or photoAdjustments change
  const { rBins, gBins, bBins, lBins, shadowClipping, highlightClipping, meanLuma } = useMemo(() => {
    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);
    const lBins = new Uint32Array(256);

    const pixels = isLoaded ? basePixelsRef.current : null;
    if (!pixels || pixels.length === 0) {
      return {
        rBins,
        gBins,
        bBins,
        lBins,
        shadowClipping: false,
        highlightClipping: false,
        meanLuma: 50,
      };
    }

    const adj = photoAdjustments || {};
    const exposure = adj.exposure || 0;
    const contrast = adj.lightContrast || 0;
    const highlights = adj.highlights || 0;
    const shadows = adj.shadows || 0;
    const whites = adj.whites || 0;
    const blacks = adj.blacks || 0;
    const temp = adj.temperature || 0;
    const tint = adj.tint || 0;

    // Fast Exposure multiplier: 2^(exposure)
    const expMult = Math.pow(2, exposure);
    // Fast Contrast factor
    const contrastFactor = Math.tan(((contrast + 100) / 200) * (Math.PI / 4));
    // Color temperature & tint balance
    const rTemp = temp * 0.45;
    const bTemp = -temp * 0.45;
    const gTint = tint * 0.35;

    let totalLuma = 0;
    const numPixels = pixels.length / 4;
    let shadowClipCount = 0;
    let highlightClipCount = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      // White Balance
      r += rTemp;
      g += gTint;
      b += bTemp;

      // Exposure
      r *= expMult;
      g *= expMult;
      b *= expMult;

      // Highlights / Shadows / Whites / Blacks
      const origLuma = 0.299 * r + 0.587 * g + 0.114 * b;
      const lumaNorm = origLuma / 255;

      if (shadows !== 0 && lumaNorm < 0.5) {
        const factor = (1 - lumaNorm * 2) * (shadows / 100) * 35;
        r += factor;
        g += factor;
        b += factor;
      }
      if (highlights !== 0 && lumaNorm > 0.5) {
        const factor = ((lumaNorm - 0.5) * 2) * (highlights / 100) * 35;
        r += factor;
        g += factor;
        b += factor;
      }
      if (blacks !== 0 && lumaNorm < 0.25) {
        const factor = (1 - lumaNorm * 4) * (blacks / 100) * 30;
        r += factor;
        g += factor;
        b += factor;
      }
      if (whites !== 0 && lumaNorm > 0.75) {
        const factor = ((lumaNorm - 0.75) * 4) * (whites / 100) * 30;
        r += factor;
        g += factor;
        b += factor;
      }

      // Contrast
      if (contrast !== 0) {
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;
      }

      // Tone curve simple approximation
      if (adj.curve) {
        const cL = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const cFactor =
          (adj.curve.shadows || 0) * (1 - cL) * 0.2 +
          (adj.curve.highlights || 0) * cL * 0.2;
        r += cFactor;
        g += cFactor;
        b += cFactor;
      }

      // Clamping
      const cr = r <= 0 ? 0 : r >= 255 ? 255 : Math.round(r);
      const cg = g <= 0 ? 0 : g >= 255 ? 255 : Math.round(g);
      const cb = b <= 0 ? 0 : b >= 255 ? 255 : Math.round(b);

      const cluma = Math.round(0.299 * cr + 0.587 * cg + 0.114 * cb);

      if (cr === 0 && cg === 0 && cb === 0) shadowClipCount++;
      if (cr === 255 || cg === 255 || cb === 255) highlightClipCount++;

      rBins[cr]++;
      gBins[cg]++;
      bBins[cb]++;
      lBins[cluma]++;
      totalLuma += cluma;
    }

    const shadowClipping = (shadowClipCount / numPixels) > 0.005;
    const highlightClipping = (highlightClipCount / numPixels) > 0.005;
    const meanLuma = Math.round((totalLuma / numPixels) / 2.55);

    return {
      rBins,
      gBins,
      bBins,
      lBins,
      shadowClipping,
      highlightClipping,
      meanLuma,
    };
  }, [photoAdjustments, isLoaded]);

  // Compute SVG smooth path from 256 bins
  const makePath = useCallback(
    (bins: Uint32Array, maxHeight: number) => {
      let maxVal = 1;
      // Skip extremes (0 and 255) when scaling so clipping spikes don't flatten the body
      for (let i = 1; i < 255; i++) {
        if (bins[i] > maxVal) maxVal = bins[i];
      }

      const points: [number, number][] = [];
      const step = 4; // Sample every 4 values for smooth curve (64 points)
      for (let i = 0; i <= 256; i += step) {
        const idx = Math.min(255, i);
        const x = (idx / 255) * svgWidth;
        const norm = Math.min(1, bins[idx] / maxVal);
        const y = svgHeight - norm * maxHeight;
        points.push([x, y]);
      }

      const pathD = points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
        .join(' ');
      const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

      return { pathD, areaD };
    },
    [svgWidth, svgHeight]
  );

  const rPath = useMemo(() => makePath(rBins, 82), [makePath, rBins]);
  const gPath = useMemo(() => makePath(gBins, 82), [makePath, gBins]);
  const bPath = useMemo(() => makePath(bBins, 82), [makePath, bBins]);
  const lPath = useMemo(() => makePath(lBins, 82), [makePath, lBins]);

  return (
    <div className="px-3 pt-2 pb-1 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
      {/* Header with Channel Selectors & Clipping Indicators */}
      <div className="flex items-center justify-between mb-1 text-[10px]">
        {/* Left: Shadow Clipping Indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-3 h-3 flex items-center justify-center font-bold text-[8px] rounded transition-colors ${
              shadowClipping
                ? 'bg-[#007aff] text-white shadow-[0_0_6px_#007aff]'
                : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400'
            }`}
            title={
              shadowClipping
                ? isEs ? 'Aviso: Pérdida en sombras (Negros empastados)' : 'Warning: Shadow clipping'
                : isEs ? 'Sin pérdida en sombras' : 'No shadow clipping'
            }
          >
            ◀
          </span>
          <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
            {isEs ? 'Histograma' : 'Histogram'}
          </span>
        </div>

        {/* Center: Channel Selector Pills */}
        <div className="flex items-center bg-neutral-200 dark:bg-neutral-950 rounded p-0.5 border border-neutral-300 dark:border-neutral-800">
          {(['rgb', 'luma', 'red', 'green', 'blue'] as ChannelMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setChannelMode(mode)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                channelMode === mode
                  ? mode === 'red'
                    ? 'bg-[#ff3b30] text-white font-bold'
                    : mode === 'green'
                    ? 'bg-[#34c759] text-black font-bold'
                    : mode === 'blue'
                    ? 'bg-[#007aff] text-white font-bold'
                    : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {mode === 'rgb'
                ? 'RGB'
                : mode === 'luma'
                ? 'L'
                : mode === 'red'
                ? 'R'
                : mode === 'green'
                ? 'G'
                : 'B'}
            </button>
          ))}
        </div>

        {/* Right: Highlight Clipping Indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-neutral-500 font-mono">{meanLuma}%</span>
          <span
            className={`w-3 h-3 flex items-center justify-center font-bold text-[8px] rounded transition-colors ${
              highlightClipping
                ? 'bg-[#ff3b30] text-white shadow-[0_0_6px_#ff3b30]'
                : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400'
            }`}
            title={
              highlightClipping
                ? isEs ? 'Aviso: Pérdida en luces (Blancos quemados)' : 'Warning: Highlight clipping'
                : isEs ? 'Sin pérdida en luces' : 'No highlight clipping'
            }
          >
            ▶
          </span>
        </div>
      </div>

      {/* Interactive Histogram Graph */}
      <div
        className="relative w-full rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-950 overflow-hidden select-none cursor-crosshair"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          if (ratio < 0.25) setHoverZone(isEs ? 'Negros' : 'Blacks');
          else if (ratio < 0.5) setHoverZone(isEs ? 'Sombras' : 'Shadows');
          else if (ratio < 0.75) setHoverZone(isEs ? 'Exposición' : 'Exposure');
          else setHoverZone(isEs ? 'Blancos' : 'Whites');
        }}
        onMouseLeave={() => setHoverZone(null)}
      >
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-24 block">
          {/* 4-Zone Background Vertical Lines */}
          <line x1={svgWidth * 0.25} y1={0} x2={svgWidth * 0.25} y2={svgHeight} stroke="#222" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={svgWidth * 0.5} y1={0} x2={svgWidth * 0.5} y2={svgHeight} stroke="#282828" strokeWidth="1" />
          <line x1={svgWidth * 0.75} y1={0} x2={svgWidth * 0.75} y2={svgHeight} stroke="#222" strokeWidth="1" strokeDasharray="2,2" />

          {/* Combined RGB or Single Channel Paths */}
          {channelMode === 'rgb' ? (
            <g style={{ mixBlendMode: 'screen' }}>
              {/* Red Channel */}
              <path d={rPath.areaD} fill="rgba(255, 59, 48, 0.40)" />
              <path d={rPath.pathD} fill="none" stroke="#ff3b30" strokeWidth="1.2" />

              {/* Green Channel */}
              <path d={gPath.areaD} fill="rgba(52, 199, 89, 0.40)" />
              <path d={gPath.pathD} fill="none" stroke="#34c759" strokeWidth="1.2" />

              {/* Blue Channel */}
              <path d={bPath.areaD} fill="rgba(0, 122, 255, 0.40)" />
              <path d={bPath.pathD} fill="none" stroke="#007aff" strokeWidth="1.2" />
            </g>
          ) : channelMode === 'luma' ? (
            <g>
              <path d={lPath.areaD} fill="rgba(220, 220, 220, 0.25)" />
              <path d={lPath.pathD} fill="none" stroke="#e0e0e0" strokeWidth="1.5" />
            </g>
          ) : channelMode === 'red' ? (
            <g>
              <path d={rPath.areaD} fill="rgba(255, 59, 48, 0.45)" />
              <path d={rPath.pathD} fill="none" stroke="#ff3b30" strokeWidth="1.5" />
            </g>
          ) : channelMode === 'green' ? (
            <g>
              <path d={gPath.areaD} fill="rgba(52, 199, 89, 0.45)" />
              <path d={gPath.pathD} fill="none" stroke="#34c759" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              <path d={bPath.areaD} fill="rgba(0, 122, 255, 0.45)" />
              <path d={bPath.pathD} fill="none" stroke="#007aff" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {/* Active Zone Label on Hover */}
        {hoverZone && (
          <div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/85 text-[9px] text-[#ffcc00] font-mono border border-white/10 pointer-events-none">
            {hoverZone}
          </div>
        )}
      </div>

      {/* 4 Tonal Zone Sublabels */}
      <div className="flex justify-between text-[8px] text-[#555] font-mono mt-1 px-1">
        <span>{isEs ? 'Negros' : 'Blacks'}</span>
        <span>{isEs ? 'Sombras' : 'Shadows'}</span>
        <span>{isEs ? 'Exposición' : 'Exposure'}</span>
        <span>{isEs ? 'Blancos' : 'Whites'}</span>
      </div>
    </div>
  );
});

export default Histogram;
