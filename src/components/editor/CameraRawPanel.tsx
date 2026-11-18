import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { EditorElement, PhotoAdjustments } from '@/types/editor';
import { useEditorStore } from '@/store/useEditorStore';
import {
  DEFAULT_HSL_CHANNELS,
  DEFAULT_TONE_CURVE,
  DEFAULT_POINT_COLOR,
  rgbToHsl,
  calculateWhiteBalanceFromSample,
} from '@/utils/rawImagePipeline';
import { Histogram } from './Histogram';
import { BeforeAfterModal } from './BeforeAfterModal';

interface CameraRawPanelProps {
  element: EditorElement;
  activeSpreadId: string;
  disabled?: boolean;
}

const pauseHistory = () => {
  try {
    useEditorStore.temporal.getState().pause();
  } catch {
    // ignore
  }
};

const resumeHistory = () => {
  try {
    useEditorStore.temporal.getState().resume();
  } catch {
    // ignore
  }
};

interface ContinuousRawSliderProps {
  label: string;
  paramKey: string;
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
  precision?: number;
  trackGradient?: string;
  disabled?: boolean;
  onUpdate: (key: string, value: number, isDragging: boolean) => void;
}

const ContinuousRawSlider = React.memo(function ContinuousRawSlider({
  label,
  paramKey,
  value,
  min,
  max,
  defaultValue = 0,
  step = 1,
  precision = 0,
  trackGradient,
  disabled = false,
  onUpdate,
}: ContinuousRawSliderProps) {
  const formatVal = useCallback(
    (v: number) => {
      if (!Number.isFinite(v)) return '0';
      return precision === 0 ? Math.round(v).toString() : Number(v.toFixed(precision)).toString();
    },
    [precision]
  );

  const [localVal, setLocalVal] = useState<number>(value);
  const [textVal, setTextVal] = useState<string>(() => formatVal(value));
  const isDraggingRef = useRef(false);
  const isEditingTextRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalVal(value);
      if (!isEditingTextRef.current) {
        setTextVal(formatVal(value));
      }
    }
  }, [value, formatVal]);

  const computeValueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return localVal;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return localVal;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      const clamped = Math.max(min, Math.min(max, Number(stepped.toFixed(precision))));
      return clamped;
    },
    [min, max, step, precision, localVal]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    isDraggingRef.current = true;
    pauseHistory();

    const newVal = computeValueFromClientX(e.clientX);
    setLocalVal(newVal);
    setTextVal(formatVal(newVal));
    onUpdateRef.current(paramKey, newVal, true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      const next = computeValueFromClientX(ev.clientX);
      setLocalVal(next);
      setTextVal(formatVal(next));
      onUpdateRef.current(paramKey, next, true);
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      const finalVal = computeValueFromClientX(ev.clientX);
      setLocalVal(finalVal);
      setTextVal(formatVal(finalVal));
      onUpdateRef.current(paramKey, finalVal, false);

      setTimeout(() => {
        resumeHistory();
      }, 50);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    setLocalVal(defaultValue);
    setTextVal(formatVal(defaultValue));
    onUpdateRef.current(paramKey, defaultValue, false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextVal(e.target.value);
  };

  const handleTextBlur = () => {
    isEditingTextRef.current = false;
    const parsed = parseFloat(textVal);
    if (!Number.isFinite(parsed)) {
      setTextVal(formatVal(localVal));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Number(parsed.toFixed(precision))));
    setLocalVal(clamped);
    setTextVal(formatVal(clamped));
    onUpdateRef.current(paramKey, clamped, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setTextVal(formatVal(localVal));
      isEditingTextRef.current = false;
      (e.target as HTMLInputElement).blur();
    }
  };

  const pct = Math.max(0, Math.min(100, ((localVal - min) / (max - min)) * 100));

  return (
    <div className="mb-2.5 px-3 select-none">
      <div className="flex justify-between items-center mb-1">
        <span
          className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer hover:text-black dark:hover:text-white transition-colors"
          onDoubleClick={handleDoubleClick}
          title="Doble clic para restablecer"
        >
          {label}
        </span>
        <input
          type="text"
          value={textVal}
          disabled={disabled}
          onChange={handleTextChange}
          onFocus={() => {
            isEditingTextRef.current = true;
          }}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          className="w-12 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-right px-1 py-0.5 text-[10px] rounded focus:outline-none focus:border-blue-500 font-mono shadow-sm"
        />
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={`relative h-4 flex items-center group cursor-ew-resize ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div
          className="absolute w-full h-[3px] rounded opacity-80 group-hover:opacity-100 transition-opacity"
          style={{
            background: trackGradient || 'linear-gradient(to right, #9ca3af, #4b5563)',
          }}
        />

        {min < 0 && max > 0 && (
          <div
            className="absolute w-[2px] h-2 bg-neutral-400 dark:bg-neutral-500 transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
          />
        )}

        <div
          className="absolute w-2 h-3.5 bg-neutral-200 dark:bg-neutral-300 group-hover:bg-white border border-neutral-400 dark:border-neutral-600 shadow-sm transform -translate-x-1/2 pointer-events-none transition-transform group-active:scale-110"
          style={{
            left: `${pct}%`,
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
          }}
        />
      </div>
    </div>
  );
});

// C1-Continuous smooth cosine lobe for SVG Tone Curve Visualizer
function smoothCosineLobe(xRatio: number, center: number, radius: number): number {
  const dist = Math.abs(xRatio - center) / radius;
  if (dist >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * dist));
}

// SVG Interactive Tone Curve Visualization (Smooth C1 Spline)
const ToneCurveVisualizer = React.memo(function ToneCurveVisualizer({
  highlights,
  lights,
  darks,
  shadows,
  isEs,
}: {
  highlights: number;
  lights: number;
  darks: number;
  shadows: number;
  isEs: boolean;
}) {
  const width = 240;
  const height = 120;

  // Compute curve points across 48 sample intervals with smooth cosine lobes
  const points: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const xRatio = i / 48;
    const x = xRatio * width;

    const wShadows = smoothCosineLobe(xRatio, 0.08, 0.28);
    const wDarks = smoothCosineLobe(xRatio, 0.32, 0.32);
    const wLights = smoothCosineLobe(xRatio, 0.66, 0.32);
    const wHighlights = smoothCosineLobe(xRatio, 0.90, 0.28);

    const deltaY = (shadows * wShadows + darks * wDarks + lights * wLights + highlights * wHighlights) * 0.55;
    const baseNormY = 1 - xRatio;
    const finalNormY = Math.max(0, Math.min(1, baseNormY - deltaY / 255));
    const y = finalNormY * height;
    points.push([x, y]);
  }

  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="px-3 mb-3">
      <div className="relative w-full rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-hidden flex flex-col items-center p-2 select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          {/* 4-Zone Background Grid */}
          <line x1={width * 0.25} y1={0} x2={width * 0.25} y2={height} stroke="currentColor" className="text-neutral-300 dark:text-neutral-800" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={width * 0.5} y1={0} x2={width * 0.5} y2={height} stroke="currentColor" className="text-neutral-300 dark:text-neutral-700" strokeWidth="1" />
          <line x1={width * 0.75} y1={0} x2={width * 0.75} y2={height} stroke="currentColor" className="text-neutral-300 dark:text-neutral-800" strokeWidth="1" strokeDasharray="2,2" />
          <line x1={0} y1={height * 0.5} x2={width} y2={height * 0.5} stroke="currentColor" className="text-neutral-300 dark:text-neutral-700" strokeWidth="1" />

          {/* Linear Neutral Reference Baseline */}
          <line x1={0} y1={height} x2={width} y2={0} stroke="currentColor" className="text-neutral-400 dark:text-neutral-600" strokeWidth="1" strokeDasharray="3,3" />

          {/* Area Fill */}
          <path d={areaD} fill="rgba(100,100,100,0.08)" />

          {/* Dynamic Spline Curve */}
          <path d={pathD} fill="none" stroke="currentColor" className="text-neutral-800 dark:text-neutral-200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Zone Labels */}
        <div className="w-full flex justify-between text-[8px] text-neutral-500 font-mono pointer-events-none mt-1">
          <span>0%</span>
          <span>{isEs ? 'Sombras' : 'Shadows'}</span>
          <span>{isEs ? 'Medios' : 'Mids'}</span>
          <span>{isEs ? 'Luces' : 'Highlights'}</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
});

// Color Mixer 8-Channel definitions
const HSL_COLOR_OPTIONS = [
  { key: 'reds', labelEs: 'Rojos', labelEn: 'Reds', baseHex: '#ff3b30' },
  { key: 'oranges', labelEs: 'Naranjas', labelEn: 'Oranges', baseHex: '#ff9500' },
  { key: 'yellows', labelEs: 'Amarillos', labelEn: 'Yellows', baseHex: '#ffcc00' },
  { key: 'greens', labelEs: 'Verdes', labelEn: 'Greens', baseHex: '#34c759' },
  { key: 'aquas', labelEs: 'Aquas', labelEn: 'Aquas', baseHex: '#32ade6' },
  { key: 'blues', labelEs: 'Azules', labelEn: 'Blues', baseHex: '#007aff' },
  { key: 'purples', labelEs: 'Púrpuras', labelEn: 'Purples', baseHex: '#af52de' },
  { key: 'magentas', labelEs: 'Magentas', labelEn: 'Magentas', baseHex: '#ff2d55' },
] as const;

const HSL_HUE_GRADIENTS: Record<string, string> = {
  reds: 'linear-gradient(to right, #ff2d55, #ff3b30, #ff9500)',
  oranges: 'linear-gradient(to right, #ff3b30, #ff9500, #ffcc00)',
  yellows: 'linear-gradient(to right, #ff9500, #ffcc00, #34c759)',
  greens: 'linear-gradient(to right, #ffcc00, #34c759, #32ade6)',
  aquas: 'linear-gradient(to right, #34c759, #32ade6, #007aff)',
  blues: 'linear-gradient(to right, #32ade6, #007aff, #af52de)',
  purples: 'linear-gradient(to right, #007aff, #af52de, #ff2d55)',
  magentas: 'linear-gradient(to right, #af52de, #ff2d55, #ff3b30)',
};

export const CameraRawPanel = React.memo(function CameraRawPanel({
  element,
  activeSpreadId,
  disabled = false,
}: CameraRawPanelProps) {
  const pathname = usePathname();
  const isEs = pathname?.startsWith('/es') ?? true;
  const updateElement = useEditorStore((state) => state.updateElement);
  const beforeAfterMode = useEditorStore((state) => state.beforeAfterMode);
  const setBeforeAfterMode = useEditorStore((state) => state.setBeforeAfterMode);
  const setIsBeforeAfterModalOpen = useEditorStore((state) => state.setIsBeforeAfterModalOpen);
  const setPreviewOriginalPhotoId = useEditorStore((state) => state.setPreviewOriginalPhotoId);
  const imageSrc = element.previewUrl || element.originalUrl || element.src || '';

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    light: true,
    color: true,
    curve: true,
    colorMixer: true,
    effects: true,
  });

  const [colorSubMode, setColorSubMode] = useState<'mixer' | 'pointColor'>('mixer');
  const [mixerTab, setMixerTab] = useState<'Saturation' | 'Hue' | 'Luminance' | 'All'>('Saturation');

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const currentAdj = element.photoAdjustments || {};
  const [localAdj, setLocalAdj] = useState<Partial<PhotoAdjustments>>(currentAdj);
  const isAnySliderDraggingRef = useRef(false);

  useEffect(() => {
    isAnySliderDraggingRef.current = false;
    pendingUpdatesRef.current = {};
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setLocalAdj(element.photoAdjustments || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id]);

  useEffect(() => {
    if (!isAnySliderDraggingRef.current) {
      setLocalAdj(element.photoAdjustments || {});
    }
  }, [element.photoAdjustments]);

  const rafRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingUpdatesRef = useRef<Record<string, any>>({});
  const latestAdjRef = useRef<Partial<PhotoAdjustments>>(currentAdj);
  latestAdjRef.current = localAdj;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleUpdate = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (key: string, value: any, isDragging: boolean = false) => {
      isAnySliderDraggingRef.current = isDragging;
      const st = useEditorStore.getState();
      const targetSpreadId = st.activeSpreadId || activeSpreadId;
      const targetElementId = st.selectedElementId || element.id;

      const prev = latestAdjRef.current || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let next: any;
      if (key.startsWith('curve.')) {
        const subKey = key.split('.')[1];
        next = {
          ...prev,
          curve: {
            ...(prev.curve || DEFAULT_TONE_CURVE),
            [subKey]: value,
          },
        };
      } else if (key.startsWith('pointColor.')) {
        const subKey = key.split('.')[1];
        next = {
          ...prev,
          pointColor: {
            ...(prev.pointColor || DEFAULT_POINT_COLOR),
            [subKey]: value,
            enabled: true,
          },
        };
      } else if (key.startsWith('hsl.')) {
        const [, colorKey, channel] = key.split('.');
        const currentHsl = prev.hsl || DEFAULT_HSL_CHANNELS;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentChan = (currentHsl as any)[colorKey] || { h: 0, s: 0, l: 0 };
        next = {
          ...prev,
          hsl: {
            ...currentHsl,
            [colorKey]: {
              ...currentChan,
              [channel]: value,
            },
          },
        };
      } else {
        next = { ...prev, [key]: value };
      }

      latestAdjRef.current = next;
      setLocalAdj(next);
      pendingUpdatesRef.current[key] = value;

      if (!isDragging) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        pendingUpdatesRef.current = {};
        updateElement(targetSpreadId, targetElementId, {
          photoAdjustments: next,
        });
        return;
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          const liveSt = useEditorStore.getState();
          const liveSpreadId = liveSt.activeSpreadId || targetSpreadId;
          const liveElementId = liveSt.selectedElementId || targetElementId;
          pendingUpdatesRef.current = {};
          rafRef.current = null;
          updateElement(liveSpreadId, liveElementId, {
            photoAdjustments: latestAdjRef.current,
          });
        });
      }
    },
    [activeSpreadId, element.id, updateElement]
  );

  // White Balance Eyedropper Handler
  const handlePickWhiteBalance = async () => {
    if (disabled || typeof window === 'undefined') return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).EyeDropper) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const wb = calculateWhiteBalanceFromSample(r, g, b);
          const prev = latestAdjRef.current || {};
          const next = { ...prev, temperature: wb.temperature, tint: wb.tint };
          latestAdjRef.current = next;
          setLocalAdj(next);
          const st = useEditorStore.getState();
          const targetSpreadId = st.activeSpreadId || activeSpreadId;
          const targetElementId = st.selectedElementId || element.id;
          updateElement(targetSpreadId, targetElementId, { photoAdjustments: next });
        }
      } else {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#d0d0d0';
        colorInput.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const hex = target.value.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const wb = calculateWhiteBalanceFromSample(r, g, b);
          const prev = latestAdjRef.current || {};
          const next = { ...prev, temperature: wb.temperature, tint: wb.tint };
          latestAdjRef.current = next;
          setLocalAdj(next);
          const st = useEditorStore.getState();
          const targetSpreadId = st.activeSpreadId || activeSpreadId;
          const targetElementId = st.selectedElementId || element.id;
          updateElement(targetSpreadId, targetElementId, { photoAdjustments: next });
        };
        colorInput.click();
      }
    } catch {
      // User cancelled
    }
  };

  // Atomic Point Color Update (Prevents race conditions & batching drops)
  const updatePointColor = useCallback(
    (updates: Partial<typeof DEFAULT_POINT_COLOR>, resetShifts: boolean = false) => {
      const st = useEditorStore.getState();
      const targetSpreadId = st.activeSpreadId || activeSpreadId;
      const targetElementId = st.selectedElementId || element.id;

      const prev = latestAdjRef.current || {};
      const currentPointColor = prev.pointColor || DEFAULT_POINT_COLOR;

      const base = resetShifts
        ? {
            ...currentPointColor,
            hueShift: 0,
            satShift: 0,
            lumShift: 0,
          }
        : currentPointColor;

      const nextPc = {
        ...base,
        ...updates,
        enabled: true,
      };

      const next = { ...prev, pointColor: nextPc };
      latestAdjRef.current = next;
      setLocalAdj(next);

      updateElement(targetSpreadId, targetElementId, {
        photoAdjustments: next,
      });
    },
    [activeSpreadId, element.id, updateElement]
  );

  // Point Color Eyedropper Handler
  const handlePickPointColor = async () => {
    if (disabled || typeof window === 'undefined') return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).EyeDropper) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const hsl = rgbToHsl(r, g, b);

          updatePointColor(
            {
              sampleHex: result.sRGBHex,
              sampleH: hsl.h,
              sampleS: hsl.s,
              sampleL: hsl.l,
              range: 35,
              enabled: true,
            },
            true
          );
        }
      } else {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = localAdj.pointColor?.sampleHex || '#e08253';
        colorInput.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const hex = target.value.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const hsl = rgbToHsl(r, g, b);

          updatePointColor(
            {
              sampleHex: target.value,
              sampleH: hsl.h,
              sampleS: hsl.s,
              sampleL: hsl.l,
              range: 35,
              enabled: true,
            },
            true
          );
        };
        colorInput.click();
      }
    } catch {
      // User cancelled
    }
  };

  const handleResetSection = (section: 'light' | 'color' | 'curve' | 'colorMixer' | 'pointColor' | 'effects') => {
    if (disabled) return;
    let payload: Partial<PhotoAdjustments> = {};
    if (section === 'light') {
      payload = {
        exposure: 0,
        lightContrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        bypassLight: false,
      };
    } else if (section === 'color') {
      payload = {
        temperature: 0,
        tint: 0,
        vibrance: 0,
        saturation: 0,
        bypassColor: false,
      };
    } else if (section === 'curve') {
      payload = {
        curve: { ...DEFAULT_TONE_CURVE },
        bypassCurve: false,
      };
    } else if (section === 'colorMixer') {
      payload = {
        hsl: { ...DEFAULT_HSL_CHANNELS },
        bypassColorMixer: false,
      };
    } else if (section === 'pointColor') {
      payload = {
        pointColor: { ...DEFAULT_POINT_COLOR },
        bypassPointColor: false,
      };
    } else if (section === 'effects') {
      payload = {
        texture: 0,
        clarity: 0,
        dehaze: 0,
        vignette: 0,
        grain: 0,
        blur: 0,
        bypassEffects: false,
      };
    }

    setLocalAdj((prev) => ({ ...prev, ...payload }));
    updateElement(activeSpreadId, element.id, {
      photoAdjustments: {
        ...(element.photoAdjustments || {}),
        ...payload,
      },
    });
  };

  const renderSlider = (
    label: string,
    key: string,
    min: number,
    max: number,
    defaultValue: number = 0,
    trackGradient?: string
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: number = defaultValue;
    if (key.startsWith('curve.')) {
      const sub = key.split('.')[1] as keyof typeof DEFAULT_TONE_CURVE;
      val = localAdj.curve?.[sub] ?? defaultValue;
    } else if (key.startsWith('pointColor.')) {
      const sub = key.split('.')[1] as keyof typeof DEFAULT_POINT_COLOR;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      val = (localAdj.pointColor as any)?.[sub] ?? defaultValue;
    } else if (key.startsWith('hsl.')) {
      const [, colorKey, channel] = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      val = (localAdj.hsl as any)?.[colorKey]?.[channel] ?? defaultValue;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      val = (localAdj as any)[key] ?? defaultValue;
    }

    return (
      <ContinuousRawSlider
        key={key}
        label={label}
        paramKey={key}
        value={val}
        min={min}
        max={max}
        defaultValue={defaultValue}
        step={key === 'exposure' ? 0.05 : 1}
        precision={key === 'exposure' ? 2 : 0}
        trackGradient={trackGradient}
        disabled={disabled}
        onUpdate={handleUpdate}
      />
    );
  };

  const curveData = localAdj.curve || DEFAULT_TONE_CURVE;
  const pointColorData = localAdj.pointColor || DEFAULT_POINT_COLOR;

  return (
    <div
      className="bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden select-none font-sans text-left mt-2 text-neutral-800 dark:text-neutral-200 shadow-sm"
    >
      {/* Top Profile Strip */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">{isEs ? 'Perfil' : 'Profile'}</span>
          <select
            disabled={disabled}
            className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-[10px] px-2 py-0.5 rounded w-32 focus:outline-none disabled:opacity-50 shadow-sm"
          >
            <option>{isEs ? 'Color Natural' : 'Natural Color'}</option>
            <option>{isEs ? 'Monocromático' : 'Monochrome'}</option>
          </select>
        </div>
        <div className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer" title="Presets de Revelado">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
          </svg>
        </div>
      </div>

      {/* 0. LIVE HISTOGRAM COMPONENT */}
      <Histogram
        imageSrc={imageSrc}
        photoAdjustments={localAdj}
        isEs={isEs}
      />

      {/* 0.B BEFORE & AFTER COMPARISON TOOLBAR */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
            {isEs ? 'Antes / Después:' : 'Before / After:'}
          </span>
          <div className="flex items-center bg-neutral-200 dark:bg-neutral-900 rounded p-0.5 border border-neutral-300 dark:border-neutral-800">
            {/* Mode: Normal / Off */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setBeforeAfterMode('off')}
              className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                beforeAfterMode === 'off'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
              title={isEs ? 'Vista normal' : 'Normal view'}
            >
              {isEs ? 'Normal' : 'Normal'}
            </button>

            {/* Mode: Split Screen */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setBeforeAfterMode('split')}
              className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors flex items-center gap-1 ${
                beforeAfterMode === 'split'
                  ? 'bg-amber-500 text-black font-bold shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`}
              title={isEs ? 'Pantalla dividida con slider interactivo' : 'Split screen with draggable slider'}
            >
              <span>◧</span>
              <span>{isEs ? 'Dividir' : 'Split'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Hold to Preview Original Button */}
          <button
            type="button"
            disabled={disabled}
            onPointerDown={() => setPreviewOriginalPhotoId(element.id)}
            onPointerUp={() => setPreviewOriginalPhotoId(null)}
            onPointerLeave={() => setPreviewOriginalPhotoId(null)}
            className="px-2 py-0.5 rounded bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[9px] text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1 active:bg-amber-500 active:text-black font-medium shadow-sm"
            title={isEs ? 'Mantén presionado para ver la foto original' : 'Hold to view original photo'}
          >
            <span>👁</span>
            <span>{isEs ? 'Original' : 'Original'}</span>
          </button>

          {/* Fullscreen A/B Modal Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsBeforeAfterModalOpen(true)}
            className="w-6 h-6 rounded bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 transition-colors flex items-center justify-center text-[10px] shadow-sm"
            title={isEs ? 'Abrir visor de pantalla completa A/B' : 'Open full screen A/B comparison'}
          >
            ⛶
          </button>
        </div>
      </div>

      {/* 1. LIGHT SECTION */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div
          className="px-3 py-2 flex items-center cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
          onClick={() => toggleSection('light')}
        >
          <span className="text-[10px] mr-2 text-neutral-400 dark:text-neutral-500">{openSections.light ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{isEs ? 'Luz' : 'Light'}</span>
          <div className="ml-auto flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <div
              className={`p-1 ${localAdj.bypassLight ? 'text-neutral-300 dark:text-neutral-600' : 'hover:text-black dark:hover:text-white'}`}
              title={localAdj.bypassLight ? (isEs ? 'Activar Luz' : 'Enable Light') : (isEs ? 'Desactivar Luz' : 'Bypass Light')}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handleUpdate('bypassLight', !localAdj.bypassLight, false);
              }}
            >
              {localAdj.bypassLight ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </div>
            <div
              className="p-1 hover:text-black dark:hover:text-white"
              title={isEs ? 'Restablecer Luz' : 'Reset Light'}
              onClick={(e) => {
                e.stopPropagation();
                handleResetSection('light');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </div>
          </div>
        </div>
        {openSections.light && (
          <div className="pb-2 pt-1 transition-all">
            {renderSlider(isEs ? 'Exposición' : 'Exposure', 'exposure', -5, 5, 0)}
            {renderSlider(isEs ? 'Contraste' : 'Contrast', 'lightContrast', -100, 100, 0)}
            {renderSlider(isEs ? 'Iluminaciones' : 'Highlights', 'highlights', -100, 100, 0)}
            {renderSlider(isEs ? 'Sombras' : 'Shadows', 'shadows', -100, 100, 0)}
            {renderSlider(isEs ? 'Blancos' : 'Whites', 'whites', -100, 100, 0)}
            {renderSlider(isEs ? 'Negros' : 'Blacks', 'blacks', -100, 100, 0)}
          </div>
        )}
      </div>

      {/* 2. COLOR SECTION */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div
          className="px-3 py-2 flex items-center cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
          onClick={() => toggleSection('color')}
        >
          <span className="text-[10px] mr-2 text-neutral-400 dark:text-neutral-500">{openSections.color ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{isEs ? 'Color' : 'Color'}</span>
          <div className="ml-auto flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <div
              className={`p-1 ${localAdj.bypassColor ? 'text-neutral-300 dark:text-neutral-600' : 'hover:text-black dark:hover:text-white'}`}
              title={localAdj.bypassColor ? (isEs ? 'Activar Color' : 'Enable Color') : (isEs ? 'Desactivar Color' : 'Bypass Color')}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handleUpdate('bypassColor', !localAdj.bypassColor, false);
              }}
            >
              {localAdj.bypassColor ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </div>
            <div
              className="p-1 hover:text-black dark:hover:text-white"
              title={isEs ? 'Restablecer Color' : 'Reset Color'}
              onClick={(e) => {
                e.stopPropagation();
                handleResetSection('color');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </div>
          </div>
        </div>
        {openSections.color && (
          <div className="pb-2 pt-1">
            {/* White balance row with Eyedropper */}
            <div className="flex items-center gap-2 px-3 mb-4 mt-1">
              <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex-1">
                {isEs ? 'Balance de Blancos' : 'White balance'}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={handlePickWhiteBalance}
                className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 shadow-sm"
                title={isEs ? 'Gotero Balance de Blancos (Clic en punto gris/blanco)' : 'White Balance Eyedropper (Click neutral pixel)'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
                </svg>
              </button>
            </div>

            {renderSlider(
              isEs ? 'Temperatura' : 'Temperature',
              'temperature',
              -100,
              100,
              0,
              'linear-gradient(to right, #2a52be, #ece8dc, #fcd821)'
            )}
            {renderSlider(
              isEs ? 'Matiz' : 'Tint',
              'tint',
              -100,
              100,
              0,
              'linear-gradient(to right, #41e755, #ece8dc, #e83fd5)'
            )}
            {renderSlider(isEs ? 'Intensidad' : 'Vibrance', 'vibrance', -100, 100, 0)}
            {renderSlider(
              isEs ? 'Saturación' : 'Saturation',
              'saturation',
              -100,
              100,
              0,
              'linear-gradient(to right, #7a7a7a, #e6b222)'
            )}
          </div>
        )}
      </div>

      {/* 3. TONE CURVE SECTION */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div
          className="px-3 py-2 flex items-center cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
          onClick={() => toggleSection('curve')}
        >
          <span className="text-[10px] mr-2 text-neutral-400 dark:text-neutral-500">{openSections.curve ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{isEs ? 'Curva de Tonos' : 'Tone Curve'}</span>
          <div className="ml-auto flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <div
              className={`p-1 ${localAdj.bypassCurve ? 'text-neutral-300 dark:text-neutral-600' : 'hover:text-black dark:hover:text-white'}`}
              title={localAdj.bypassCurve ? (isEs ? 'Activar Curva' : 'Enable Curve') : (isEs ? 'Desactivar Curva' : 'Bypass Curve')}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handleUpdate('bypassCurve', !localAdj.bypassCurve, false);
              }}
            >
              {localAdj.bypassCurve ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </div>
            <div
              className="p-1 hover:text-black dark:hover:text-white"
              title={isEs ? 'Restablecer Curva' : 'Reset Curve'}
              onClick={(e) => {
                e.stopPropagation();
                handleResetSection('curve');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </div>
          </div>
        </div>

        {openSections.curve && (
          <div className="pb-2 pt-1">
            <ToneCurveVisualizer
              highlights={curveData.highlights || 0}
              lights={curveData.lights || 0}
              darks={curveData.darks || 0}
              shadows={curveData.shadows || 0}
              isEs={isEs}
            />
            {renderSlider(isEs ? 'Altas Luces' : 'Highlights', 'curve.highlights', -100, 100, 0)}
            {renderSlider(isEs ? 'Claros' : 'Lights', 'curve.lights', -100, 100, 0)}
            {renderSlider(isEs ? 'Oscuros' : 'Darks', 'curve.darks', -100, 100, 0)}
            {renderSlider(isEs ? 'Sombras' : 'Shadows', 'curve.shadows', -100, 100, 0)}
          </div>
        )}
      </div>

      {/* 4. COLOR MIXER & POINT COLOR (Dual Mode) */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div
          className="px-3 py-2 flex items-center cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
          onClick={() => toggleSection('colorMixer')}
        >
          <span className="text-[10px] mr-2 text-neutral-400 dark:text-neutral-500">{openSections.colorMixer ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{isEs ? 'Mezclador & Color Puntual' : 'Color Mixer & Point Color'}</span>
          <div className="ml-auto flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <div
              className={`p-1 ${(colorSubMode === 'mixer' ? localAdj.bypassColorMixer : localAdj.bypassPointColor) ? 'text-neutral-300 dark:text-neutral-600' : 'hover:text-black dark:hover:text-white'}`}
              title={isEs ? 'Activar/Desactivar' : 'Toggle Bypass'}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  if (colorSubMode === 'mixer') {
                    handleUpdate('bypassColorMixer', !localAdj.bypassColorMixer, false);
                  } else {
                    handleUpdate('bypassPointColor', !localAdj.bypassPointColor, false);
                  }
                }
              }}
            >
              {(colorSubMode === 'mixer' ? localAdj.bypassColorMixer : localAdj.bypassPointColor) ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </div>
            <div
              className="p-1 hover:text-black dark:hover:text-white"
              title={isEs ? 'Restablecer' : 'Reset'}
              onClick={(e) => {
                e.stopPropagation();
                if (colorSubMode === 'mixer') {
                  handleResetSection('colorMixer');
                } else {
                  handleResetSection('pointColor');
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </div>
          </div>
        </div>

        {openSections.colorMixer && (
          <div className="pb-2 pt-1">
            {/* Top Sub-Mode Switcher: Mixer vs Point Color */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-3 px-3">
              <button
                type="button"
                className={`text-[11px] font-semibold mr-4 py-1.5 transition-colors ${
                  colorSubMode === 'mixer' ? 'text-blue-600 dark:text-white border-b-2 border-blue-600 dark:border-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
                onClick={() => setColorSubMode('mixer')}
              >
                {isEs ? 'Mezclador HSL' : 'HSL Mixer'}
              </button>
              <button
                type="button"
                className={`text-[11px] font-semibold py-1.5 transition-colors ${
                  colorSubMode === 'pointColor' ? 'text-blue-600 dark:text-white border-b-2 border-blue-600 dark:border-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
                onClick={() => setColorSubMode('pointColor')}
              >
                {isEs ? 'Color Puntual' : 'Point Color'}
              </button>
            </div>

            {/* SUBMODE: MIXER */}
            {colorSubMode === 'mixer' && (
              <>
                {/* HSL Tabs: Saturation / Hue / Luminance / All */}
                <div className="flex gap-4 px-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                  {(
                    [
                      { id: 'Saturation', labelEs: 'Saturación', labelEn: 'Saturation' },
                      { id: 'Hue', labelEs: 'Tono', labelEn: 'Hue' },
                      { id: 'Luminance', labelEs: 'Luminancia', labelEn: 'Luminance' },
                      { id: 'All', labelEs: 'Todo', labelEn: 'All' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`text-[10px] pb-1 font-semibold transition-colors ${
                        mixerTab === tab.id ? 'text-blue-600 dark:text-white border-b-2 border-blue-600 dark:border-white' : 'text-neutral-500 hover:text-black dark:hover:text-white'
                      }`}
                      onClick={() => setMixerTab(tab.id)}
                    >
                      {isEs ? tab.labelEs : tab.labelEn}
                    </button>
                  ))}
                </div>

                {/* TAB: SATURATION */}
                {mixerTab === 'Saturation' && (
                  <div className="space-y-1">
                    {HSL_COLOR_OPTIONS.map((c) =>
                      renderSlider(
                        isEs ? c.labelEs : c.labelEn,
                        `hsl.${c.key}.s`,
                        -100,
                        100,
                        0,
                        `linear-gradient(to right, #666666, ${c.baseHex})`
                      )
                    )}
                  </div>
                )}

                {/* TAB: HUE */}
                {mixerTab === 'Hue' && (
                  <div className="space-y-1">
                    {HSL_COLOR_OPTIONS.map((c) =>
                      renderSlider(
                        isEs ? c.labelEs : c.labelEn,
                        `hsl.${c.key}.h`,
                        -100,
                        100,
                        0,
                        HSL_HUE_GRADIENTS[c.key]
                      )
                    )}
                  </div>
                )}

                {/* TAB: LUMINANCE */}
                {mixerTab === 'Luminance' && (
                  <div className="space-y-1">
                    {HSL_COLOR_OPTIONS.map((c) =>
                      renderSlider(
                        isEs ? c.labelEs : c.labelEn,
                        `hsl.${c.key}.l`,
                        -100,
                        100,
                        0,
                        `linear-gradient(to right, #1a1a1a, ${c.baseHex}, #ffffff)`
                      )
                    )}
                  </div>
                )}

                {/* TAB: ALL */}
                {mixerTab === 'All' && (
                  <div className="space-y-3 px-3">
                    {HSL_COLOR_OPTIONS.map((c) => (
                      <div key={c.key} className="p-2 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: c.baseHex }} />
                            <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-100">{isEs ? c.labelEs : c.labelEn}</span>
                          </div>
                          <div className="space-y-1">
                            {renderSlider(isEs ? 'Tono' : 'Hue', `hsl.${c.key}.h`, -100, 100, 0, HSL_HUE_GRADIENTS[c.key])}
                            {renderSlider(
                              isEs ? 'Saturación' : 'Saturation',
                              `hsl.${c.key}.s`,
                              -100,
                              100,
                              0,
                              `linear-gradient(to right, #666666, ${c.baseHex})`
                            )}
                            {renderSlider(
                              isEs ? 'Luminancia' : 'Luminance',
                              `hsl.${c.key}.l`,
                              -100,
                              100,
                              0,
                              `linear-gradient(to right, #1a1a1a, ${c.baseHex}, #ffffff)`
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {/* SUBMODE: POINT COLOR (Color Puntual con Gotero) */}
            {colorSubMode === 'pointColor' && (
              <div className="px-3 pb-2 pt-1 space-y-3">
                {/* 8 Quick-Select Photographic Color Chips (Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta) */}
                <div className="flex items-center justify-between gap-1 p-2 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
                  {[
                    { key: 'red', hex: '#ff3b30', h: 0, s: 95, l: 55, label: isEs ? 'Rojos (0°)' : 'Reds (0°)' },
                    { key: 'orange', hex: '#ff9500', h: 30, s: 95, l: 50, label: isEs ? 'Naranjas (30°)' : 'Oranges (30°)' },
                    { key: 'yellow', hex: '#ffcc00', h: 58, s: 95, l: 50, label: isEs ? 'Amarillos (58°)' : 'Yellows (58°)' },
                    { key: 'green', hex: '#34c759', h: 122, s: 75, l: 48, label: isEs ? 'Verdes (122°)' : 'Greens (122°)' },
                    { key: 'aqua', hex: '#32ade6', h: 185, s: 80, l: 52, label: isEs ? 'Aquas (185°)' : 'Aquas (185°)' },
                    { key: 'blue', hex: '#007aff', h: 228, s: 90, l: 52, label: isEs ? 'Azules (228°)' : 'Blues (228°)' },
                    { key: 'purple', hex: '#af52de', h: 280, s: 75, l: 58, label: isEs ? 'Púrpuras (280°)' : 'Purples (280°)' },
                    { key: 'magenta', hex: '#ff2d55', h: 335, s: 90, l: 58, label: isEs ? 'Magentas (335°)' : 'Magentas (335°)' },
                  ].map((swatch) => {
                    const isSelected = pointColorData.sampleHex.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          updatePointColor(
                            {
                              sampleHex: swatch.hex,
                              sampleH: swatch.h,
                              sampleS: swatch.s,
                              sampleL: swatch.l,
                              range: 35,
                              enabled: true,
                            },
                            true
                          );
                        }}
                        className={`w-5 h-5 rounded-full border transition-all hover:scale-125 focus:outline-none ${
                          isSelected
                            ? 'ring-2 ring-blue-500 scale-110 border-white shadow-md'
                            : 'border-black/50 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.label}
                      />
                    );
                  })}
                </div>

                {/* Eyedropper & Sampled Swatch Box */}
                <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={handlePickPointColor}
                      className="w-8 h-8 rounded bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors border border-neutral-300 dark:border-neutral-700 flex items-center justify-center shadow-sm"
                      title={isEs ? 'Muestrear color con el gotero' : 'Sample color with eyedropper'}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
                      </svg>
                    </button>
                    <div>
                      <div className="text-[11px] font-semibold text-neutral-800 dark:text-white">
                        {isEs ? 'Color Muestreado' : 'Sampled Color'}
                      </div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        {pointColorData.sampleHex.toUpperCase()} | H: {pointColorData.sampleH}° S: {pointColorData.sampleS}%
                      </div>
                    </div>
                  </div>

                  <div
                    className="w-7 h-7 rounded border border-neutral-300 dark:border-neutral-700 shadow-inner"
                    style={{ backgroundColor: pointColorData.sampleHex }}
                  />
                </div>

                {/* Point Color Selective Sliders */}
                <div className="space-y-1">
                  {renderSlider(
                    isEs ? 'Desplazamiento de Tono' : 'Hue Shift',
                    'pointColor.hueShift',
                    -100,
                    100,
                    0,
                    'linear-gradient(to right, #ff3b30, #ffcc00, #34c759, #007aff, #af52de, #ff2d55)'
                  )}
                  {renderSlider(
                    isEs ? 'Ajuste de Saturación' : 'Saturation Shift',
                    'pointColor.satShift',
                    -100,
                    100,
                    0,
                    `linear-gradient(to right, #555555, ${pointColorData.sampleHex})`
                  )}
                  {renderSlider(
                    isEs ? 'Ajuste de Luminancia' : 'Luminance Shift',
                    'pointColor.lumShift',
                    -100,
                    100,
                    0,
                    `linear-gradient(to right, #111111, ${pointColorData.sampleHex}, #ffffff)`
                  )}
                  {renderSlider(
                    isEs ? 'Tolerancia de Rango' : 'Tolerance Range',
                    'pointColor.range',
                    10,
                    100,
                    35,
                    'linear-gradient(to right, #9ca3af, #4b5563)'
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. EFFECTS SECTION */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div
          className="px-3 py-2 flex items-center cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors"
          onClick={() => toggleSection('effects')}
        >
          <span className="text-[10px] mr-2 text-neutral-400 dark:text-neutral-500">{openSections.effects ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">{isEs ? 'Efectos' : 'Effects'}</span>
          <div className="ml-auto flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
            <div
              className={`p-1 ${localAdj.bypassEffects ? 'text-neutral-300 dark:text-neutral-600' : 'hover:text-black dark:hover:text-white'}`}
              title={localAdj.bypassEffects ? (isEs ? 'Activar Efectos' : 'Enable Effects') : (isEs ? 'Desactivar Efectos' : 'Bypass Effects')}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) handleUpdate('bypassEffects', !localAdj.bypassEffects, false);
              }}
            >
              {localAdj.bypassEffects ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
              )}
            </div>
            <div
              className="p-1 hover:text-black dark:hover:text-white"
              title={isEs ? 'Restablecer Efectos' : 'Reset Effects'}
              onClick={(e) => {
                e.stopPropagation();
                handleResetSection('effects');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </div>
          </div>
        </div>
        {openSections.effects && (
          <div className="pb-2 pt-1">
            {renderSlider(isEs ? 'Textura' : 'Texture', 'texture', -100, 100, 0)}
            {renderSlider(isEs ? 'Claridad' : 'Clarity', 'clarity', -100, 100, 0)}
            {renderSlider(isEs ? 'Borrar Neblina' : 'Dehaze', 'dehaze', -100, 100, 0)}
            {renderSlider(isEs ? 'Grano' : 'Grain', 'grain', 0, 100, 0)}
            {renderSlider(isEs ? 'Desenfoque' : 'Blur', 'blur', 0, 100, 0)}
          </div>
        )}
      </div>

      {/* FULLSCREEN BEFORE & AFTER COMPARISON MODAL */}
      <BeforeAfterModal element={element} isEs={isEs} />
    </div>
  );
});

export default CameraRawPanel;
