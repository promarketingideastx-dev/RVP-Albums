import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { EditorElement, PhotoAdjustments } from '@/types/editor';
import { useEditorStore } from '@/store/useEditorStore';

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
  paramKey: keyof PhotoAdjustments;
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
  precision?: number;
  trackGradient?: string;
  disabled?: boolean;
  onUpdate: (key: keyof PhotoAdjustments, value: number, isDragging: boolean) => void;
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
    isDraggingRef.current = true;
    pauseHistory();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if synthetic event
    }
    const next = computeValueFromClientX(e.clientX);
    setLocalVal(next);
    setTextVal(formatVal(next));
    onUpdateRef.current(paramKey, next, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled) return;
    e.preventDefault();
    const next = computeValueFromClientX(e.clientX);
    setLocalVal(next);
    setTextVal(formatVal(next));
    onUpdateRef.current(paramKey, next, true);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    const finalVal = computeValueFromClientX(e.clientX);
    setLocalVal(finalVal);
    setTextVal(formatVal(finalVal));
    resumeHistory();
    onUpdateRef.current(paramKey, finalVal, false);
  };

  const pct = Math.max(0, Math.min(100, ((localVal - min) / (max - min)) * 100));

  return (
    <div className={`mb-3 px-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center mb-1">
        <span
          className="text-[11px] font-medium text-[#d1d1d1] cursor-pointer hover:text-white transition-colors"
          onDoubleClick={() => {
            setLocalVal(defaultValue);
            setTextVal(formatVal(defaultValue));
            onUpdateRef.current(paramKey, defaultValue, false);
          }}
          title="Doble clic para restablecer"
        >
          {label}
        </span>
        <input
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={textVal}
          onFocus={() => {
            isEditingTextRef.current = true;
            pauseHistory();
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setTextVal(raw);
            const trimmed = raw.trim();
            if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return;
            const parsed = parseFloat(trimmed);
            if (Number.isFinite(parsed)) {
              const clamped = Math.max(min, Math.min(max, parsed));
              setLocalVal(clamped);
              onUpdateRef.current(paramKey, clamped, true);
            }
          }}
          onBlur={() => {
            isEditingTextRef.current = false;
            resumeHistory();
            const parsed = parseFloat(textVal);
            if (Number.isFinite(parsed)) {
              const clamped = Math.max(min, Math.min(max, Number(parsed.toFixed(precision))));
              setLocalVal(clamped);
              setTextVal(formatVal(clamped));
              onUpdateRef.current(paramKey, clamped, false);
            } else {
              setTextVal(formatVal(localVal));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step);
              const next = Math.max(min, Math.min(max, Number((localVal + delta).toFixed(precision))));
              setLocalVal(next);
              setTextVal(formatVal(next));
              onUpdateRef.current(paramKey, next, false);
            }
          }}
          className="w-14 bg-[#333333] border border-[#222] text-[#d1d1d1] text-right px-1.5 py-0.5 text-[10px] font-mono rounded focus:outline-none focus:border-blue-500"
        />
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localVal}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => {
          if (isDraggingRef.current) {
            isDraggingRef.current = false;
            resumeHistory();
          }
        }}
        onDoubleClick={() => {
          setLocalVal(defaultValue);
          setTextVal(formatVal(defaultValue));
          onUpdateRef.current(paramKey, defaultValue, false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.max(min, Math.min(max, Number((localVal + step).toFixed(precision))));
            setLocalVal(next);
            setTextVal(formatVal(next));
            onUpdateRef.current(paramKey, next, false);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(min, Math.min(max, Number((localVal - step).toFixed(precision))));
            setLocalVal(next);
            setTextVal(formatVal(next));
            onUpdateRef.current(paramKey, next, false);
          }
        }}
        className="relative h-5 flex items-center group cursor-ew-resize touch-none select-none outline-none"
      >
        {/* Track */}
        <div
          className="w-full h-[3px] bg-[#4a4a4a] group-hover:bg-[#5a5a5a] rounded pointer-events-none"
          style={{ background: trackGradient || undefined }}
        />
        {/* Center zero tick if min < 0 < max */}
        {min < 0 && max > 0 && (
          <div
            className="absolute w-[1px] h-2 bg-[#777] pointer-events-none"
            style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
          />
        )}
        {/* Thumb */}
        <div
          className="absolute w-2.5 h-3.5 bg-[#d4d4d4] group-hover:bg-white border border-[#222] shadow-sm transform -translate-x-1/2 pointer-events-none transition-transform group-active:scale-110"
          style={{
            left: `${pct}%`,
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)',
          }}
        />
      </div>
    </div>
  );
});

const CameraRawPanel = React.memo(function CameraRawPanel({
  element,
  activeSpreadId,
  disabled = false,
}: CameraRawPanelProps) {
  const pathname = usePathname();
  const isEs = pathname?.startsWith('/es') ?? true;
  const updateElement = useEditorStore((state) => state.updateElement);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    light: true,
    color: true,
    effects: true,
  });

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
  const pendingUpdatesRef = useRef<Partial<PhotoAdjustments>>({});
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
    (key: keyof PhotoAdjustments, value: number | boolean, isDragging: boolean = false) => {
      isAnySliderDraggingRef.current = isDragging;
      const st = useEditorStore.getState();
      const targetSpreadId = st.activeSpreadId || activeSpreadId;
      const targetElementId = st.selectedElementId || element.id;

      setLocalAdj((prev) => {
        const next = { ...prev, [key]: value };
        latestAdjRef.current = next;
        return next;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendingUpdatesRef.current[key] = value as any;

      if (!isDragging) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const queued = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};
        updateElement(targetSpreadId, targetElementId, {
          photoAdjustments: {
            ...latestAdjRef.current,
            ...queued,
          },
        });
        return;
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          const liveSt = useEditorStore.getState();
          const liveSpreadId = liveSt.activeSpreadId || targetSpreadId;
          const liveElementId = liveSt.selectedElementId || targetElementId;
          const queued = { ...pendingUpdatesRef.current };
          pendingUpdatesRef.current = {};
          rafRef.current = null;
          updateElement(liveSpreadId, liveElementId, {
            photoAdjustments: {
              ...latestAdjRef.current,
              ...queued,
            },
          });
        });
      }
    },
    [activeSpreadId, element.id, updateElement]
  );

  const handleResetSection = (section: 'light' | 'color' | 'effects') => {
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
    key: keyof PhotoAdjustments,
    min: number,
    max: number,
    defaultValue: number = 0,
    trackGradient?: string
  ) => {
    const val = (localAdj[key] as number) ?? defaultValue;
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

  return (
    <div
      className="bg-[#2d2d2d] border border-[#1e1e1e] rounded-md overflow-hidden select-none font-sans text-left mt-4"
      style={{ color: '#d1d1d1' }}
    >
      {/* Top Profile Strip */}
      <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-[#e1e1e1]">{isEs ? 'Perfil' : 'Profile'}</span>
          <select
            disabled={disabled}
            className="bg-[#383838] border border-[#222] text-[#d1d1d1] text-[10px] px-2 py-0.5 rounded w-32 focus:outline-none disabled:opacity-50"
          >
            <option>{isEs ? 'Color' : 'Color'}</option>
            <option>{isEs ? 'Monocromático' : 'Monochrome'}</option>
          </select>
        </div>
        <div className="text-[#a1a1a1] cursor-pointer hover:text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
          </svg>
        </div>
      </div>

      {/* LIGHT SECTION */}
      <div className="border-b border-[#222]">
        <div
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('light')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">{openSections.light ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold">{isEs ? 'Luz' : 'Light'}</span>
          <div className="ml-auto flex items-center gap-2 text-[#777]">
            <div
              className={`p-1 ${localAdj.bypassLight ? 'text-[#444]' : 'hover:text-white'}`}
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
              className="p-1 hover:text-white"
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

      {/* COLOR SECTION */}
      <div className="border-b border-[#222]">
        <div
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('color')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">{openSections.color ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold">{isEs ? 'Color' : 'Color'}</span>
          <div className="ml-auto flex items-center gap-2 text-[#777]">
            <div
              className={`p-1 ${localAdj.bypassColor ? 'text-[#444]' : 'hover:text-white'}`}
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
              className="p-1 hover:text-white"
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
            <div className="flex items-center gap-2 px-3 mb-4 mt-1">
              <span className="text-[11px] font-medium text-[#d1d1d1] flex-1">
                {isEs ? 'Balance de Blancos' : 'White balance'}
              </span>
              <select
                disabled={disabled}
                className="bg-[#383838] border border-[#222] text-[#d1d1d1] text-[10px] px-2 py-0.5 rounded w-28 focus:outline-none disabled:opacity-50"
              >
                <option>{isEs ? 'Como se tomó' : 'As Shot'}</option>
                <option>{isEs ? 'Automático' : 'Auto'}</option>
                <option>{isEs ? 'Personalizado' : 'Custom'}</option>
              </select>
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

      {/* EFFECTS SECTION */}
      <div className="border-b border-[#222]">
        <div
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('effects')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">{openSections.effects ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold">{isEs ? 'Efectos' : 'Effects'}</span>
          <div className="ml-auto flex items-center gap-2 text-[#777]">
            <div
              className={`p-1 ${localAdj.bypassEffects ? 'text-[#444]' : 'hover:text-white'}`}
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
              className="p-1 hover:text-white"
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
            {renderSlider(isEs ? 'Viñeta' : 'Vignette', 'vignette', -100, 100, 0)}
            {renderSlider(isEs ? 'Granulado' : 'Grain', 'grain', 0, 100, 0)}
          </div>
        )}
      </div>
    </div>
  );
});

export default CameraRawPanel;
