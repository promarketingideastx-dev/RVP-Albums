"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import TypographyPresetSelector from './editor/TypographyPresetSelector';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  PaintBucket,
  TypeOutline,
  TextSelect,
  Layers,
  SlidersHorizontal,
  Globe,
  RotateCcw,
  LayoutTemplate,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Crosshair,
} from 'lucide-react';
import LayersPanel from './editor/LayersPanel';
import GlobalStylesPanel from './editor/GlobalStylesPanel';
import AutoLayoutPanel from './editor/AutoLayoutPanel';
import CameraRawPanel from './editor/CameraRawPanel';
import { useEditorStore } from '@/store/useEditorStore';
import { LUT_LIBRARY } from '@/lib/lut-presets';
import { EditorElement } from '@/types/editor';
import {
  Point2D,
  getWorldPivotPoint,
  computeRotationAroundPivot,
  computeScaleAroundPivot,
  normalizeAngle360,
} from '@/utils/transformGeometry';

const pauseHistory = () => {
  try {
    useEditorStore.temporal.getState().pause();
  } catch {
    // ignore if temporal middleware is not ready
  }
};

const resumeHistory = () => {
  try {
    useEditorStore.temporal.getState().resume();
  } catch {
    // ignore if temporal middleware is not ready
  }
};

interface TabsHeaderProps {
  activeTab: 'properties' | 'layout' | 'layers' | 'global';
  setActiveTab: (tab: 'properties' | 'layout' | 'layers' | 'global') => void;
  isStudio: boolean;
  propertiesLabel: string;
  layersLabel: string;
}

const TabsHeader = React.memo(function TabsHeader({
  activeTab,
  setActiveTab,
  isStudio,
  propertiesLabel,
  layersLabel,
}: TabsHeaderProps) {
  return (
    <div className="flex border-b border-neutral-200 dark:border-neutral-800 shrink-0">
      <button
        type="button"
        onClick={() => setActiveTab('properties')}
        className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'properties' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
      >
        <SlidersHorizontal className="w-4 h-4" /> {propertiesLabel}
      </button>
      {!isStudio && (
        <>
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'layout' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <LayoutTemplate className="w-4 h-4" /> Layout
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'global' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <Globe className="w-4 h-4" /> Global
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setActiveTab('layers')}
        className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'layers' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
      >
        <Layers className="w-4 h-4" /> {layersLabel}
      </button>
    </div>
  );
});

interface RealTimePropertyControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  sliderStep?: number;
  precision?: number;
  unit?: string;
  minClamp?: number;
  maxClamp?: number;
  showSlider?: boolean;
  disabled?: boolean;
  accentColor?: 'blue' | 'amber' | 'teal';
  resetTitle?: string;
  onDragStart?: () => void;
  onChange: (val: number) => void;
  onCommit?: (val: number) => void;
  onReset?: () => void;
}

const RealTimePropertyControl = React.memo(
  function RealTimePropertyControl({
    label,
    value,
    min = 0,
    max = 100,
    step = 0.1,
    sliderStep,
    precision = 2,
    unit = '',
    minClamp,
    maxClamp,
    showSlider = true,
    disabled = false,
    accentColor = 'blue',
    resetTitle = 'Reset',
    onDragStart,
    onChange,
    onCommit,
    onReset,
  }: RealTimePropertyControlProps) {
    const formatNum = useCallback(
      (num: number) => {
        if (!Number.isFinite(num)) return '0';
        return precision === 0 ? Math.round(num).toString() : Number(num.toFixed(precision)).toString();
      },
      [precision]
    );

    const [textVal, setTextVal] = useState<string>(() => formatNum(value));
    const [sliderVal, setSliderVal] = useState<number>(() => (Number.isFinite(value) ? value : 0));
    const isEditingTextRef = useRef(false);
    const isDraggingSliderRef = useRef(false);
    const trackRef = useRef<HTMLDivElement>(null);

    // Store latest callbacks in refs so pointer capture is never interrupted by parent re-renders
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onCommitRef = useRef(onCommit);
    onCommitRef.current = onCommit;
    const onResetRef = useRef(onReset);
    onResetRef.current = onReset;
    const onDragStartRef = useRef(onDragStart);
    onDragStartRef.current = onDragStart;

    useEffect(() => {
      if (!isEditingTextRef.current && !isDraggingSliderRef.current) {
        setTextVal(formatNum(value));
      }
      if (!isDraggingSliderRef.current && Number.isFinite(value)) {
        setSliderVal(value);
      }
    }, [value, formatNum]);

    const clampValue = useCallback(
      (raw: number) => {
        let next = raw;
        if (minClamp !== undefined) next = Math.max(minClamp, next);
        if (maxClamp !== undefined) next = Math.min(maxClamp, next);
        return next;
      },
      [minClamp, maxClamp]
    );

    const effectiveSliderStep = sliderStep ?? step;

    const computeSliderValueFromClientX = useCallback(
      (clientX: number) => {
        const track = trackRef.current;
        if (!track) return sliderVal;
        const rect = track.getBoundingClientRect();
        if (rect.width <= 0) return sliderVal;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const raw = min + ratio * (max - min);
        const stepped = effectiveSliderStep > 0 ? Math.round(raw / effectiveSliderStep) * effectiveSliderStep : raw;
        const clampedToTrack = Math.max(min, Math.min(max, Number(stepped.toFixed(precision))));
        return clampValue(clampedToTrack);
      },
      [min, max, effectiveSliderStep, precision, sliderVal, clampValue]
    );

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isDraggingSliderRef.current = true;
      pauseHistory();
      onDragStartRef.current?.();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if synthetic event
      }
      const next = computeSliderValueFromClientX(e.clientX);
      setSliderVal(next);
      setTextVal(formatNum(next));
      onChangeRef.current(next);
    };

    const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingSliderRef.current || disabled) return;
      e.preventDefault();
      const next = computeSliderValueFromClientX(e.clientX);
      setSliderVal(next);
      setTextVal(formatNum(next));
      onChangeRef.current(next);
    };

    const endTrackDrag = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingSliderRef.current) return;
      isDraggingSliderRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      const finalVal = computeSliderValueFromClientX(e.clientX);
      setSliderVal(finalVal);
      setTextVal(formatNum(finalVal));
      resumeHistory();
      onChangeRef.current(finalVal);
      onCommitRef.current?.(finalVal);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const raw = e.target.value;
      setTextVal(raw);
      const trimmed = raw.trim();
      if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
        return;
      }
      const parsed = parseFloat(trimmed);
      if (Number.isFinite(parsed)) {
        const clamped = clampValue(parsed);
        setSliderVal(clamped);
        onChangeRef.current(clamped);
      }
    };

    const commitText = () => {
      isEditingTextRef.current = false;
      resumeHistory();
      const parsed = parseFloat(textVal);
      if (Number.isFinite(parsed)) {
        const clamped = clampValue(parsed);
        setTextVal(formatNum(clamped));
        setSliderVal(clamped);
        onChangeRef.current(clamped);
        onCommitRef.current?.(clamped);
      } else {
        setTextVal(formatNum(value));
        setSliderVal(value);
      }
    };

    const pct = max > min ? Math.max(0, Math.min(100, ((sliderVal - min) / (max - min)) * 100)) : 0;
    const fillColorClass =
      accentColor === 'amber'
        ? 'bg-amber-500'
        : accentColor === 'teal'
          ? 'bg-teal-500'
          : 'bg-blue-500';
    const thumbBorderClass =
      accentColor === 'amber'
        ? 'border-amber-500'
        : accentColor === 'teal'
          ? 'border-teal-500'
          : 'border-blue-500';
    const textAccentClass =
      accentColor === 'amber'
        ? 'text-amber-600 dark:text-amber-400 focus:ring-amber-500'
        : accentColor === 'teal'
          ? 'text-teal-600 dark:text-teal-400 focus:ring-teal-500'
          : 'text-blue-600 dark:text-blue-400 focus:ring-blue-500';

    return (
      <div className={`flex flex-col gap-1.5 mb-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center px-0.5">
          <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            {label}
            {onReset && (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  onResetRef.current?.();
                }}
                className="text-neutral-400 hover:text-blue-500 transition-colors bg-neutral-100 dark:bg-neutral-800 rounded p-0.5"
                title={resetTitle}
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={textVal}
              onFocus={() => {
                isEditingTextRef.current = true;
                pauseHistory();
                onDragStartRef.current?.();
              }}
              onChange={handleTextChange}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step);
                  const base = Number.isFinite(parseFloat(textVal)) ? parseFloat(textVal) : value;
                  const next = clampValue(Number((base + delta).toFixed(precision)));
                  setTextVal(formatNum(next));
                  setSliderVal(next);
                  onChangeRef.current(next);
                  onCommitRef.current?.(next);
                }
              }}
              className={`w-16 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-right font-semibold focus:outline-none focus:ring-1 ${textAccentClass}`}
            />
            {unit && <span className="text-[9px] font-mono text-neutral-400">{unit}</span>}
          </div>
        </div>
        {showSlider && (
          <div
            ref={trackRef}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={sliderVal}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={endTrackDrag}
            onPointerCancel={endTrackDrag}
            onLostPointerCapture={() => {
              if (isDraggingSliderRef.current) {
                isDraggingSliderRef.current = false;
                resumeHistory();
              }
            }}
            onDoubleClick={() => {
              if (!disabled && onResetRef.current) {
                onResetRef.current();
              }
            }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                const delta = e.shiftKey ? step * 10 : step;
                const next = clampValue(Number((sliderVal + delta).toFixed(precision)));
                setSliderVal(next);
                setTextVal(formatNum(next));
                onChangeRef.current(next);
                onCommitRef.current?.(next);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                const delta = e.shiftKey ? step * 10 : step;
                const next = clampValue(Number((sliderVal - delta).toFixed(precision)));
                setSliderVal(next);
                setTextVal(formatNum(next));
                onChangeRef.current(next);
                onCommitRef.current?.(next);
              }
            }}
            className="relative h-5 flex items-center group cursor-ew-resize touch-none select-none outline-none"
          >
            {/* Background Track */}
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden pointer-events-none">
              <div
                className={`h-full ${fillColorClass} rounded-full`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {/* Thumb */}
            <div
              className={`absolute w-3.5 h-3.5 rounded-full bg-white dark:bg-neutral-100 border-2 ${thumbBorderClass} shadow-md transform -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-110 group-active:scale-125`}
              style={{ left: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }
);

const ANCHOR_PRESETS: Array<{ u: number; v: number; key: string }> = [
  { u: 0, v: 0, key: 'anchor_top_left' },
  { u: 0.5, v: 0, key: 'anchor_top_center' },
  { u: 1, v: 0, key: 'anchor_top_right' },
  { u: 0, v: 0.5, key: 'anchor_middle_left' },
  { u: 0.5, v: 0.5, key: 'anchor_center' },
  { u: 1, v: 0.5, key: 'anchor_middle_right' },
  { u: 0, v: 1, key: 'anchor_bottom_left' },
  { u: 0.5, v: 1, key: 'anchor_bottom_center' },
  { u: 1, v: 1, key: 'anchor_bottom_right' },
];

interface LocalShadowPanelProps {
  element: EditorElement;
  activeSpreadId: string;
  disabled?: boolean;
  onScheduleUpdate: (spreadId: string, elementId: string, attrs: Partial<EditorElement>, immediate?: boolean) => void;
  t: (key: string) => string;
}

const LocalShadowPanel = React.memo(function LocalShadowPanel({
  element,
  activeSpreadId,
  disabled = false,
  onScheduleUpdate,
  t,
}: LocalShadowPanelProps) {
  const isShadowEnabled = Boolean(element.shadowColor && element.shadowColor !== 'transparent');
  return (
    <div className={`mt-4 mb-6 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          disabled={disabled}
          checked={isShadowEnabled}
          onChange={(e) =>
            onScheduleUpdate(
              activeSpreadId,
              element.id,
              {
                shadowColor: e.target.checked ? '#000000' : 'transparent',
                shadowBlur: e.target.checked ? (element.shadowBlur ?? 15) : undefined,
                shadowOpacity: e.target.checked ? (element.shadowOpacity ?? 0.5) : undefined,
                shadowOffsetX: e.target.checked ? (element.shadowOffsetX ?? 0) : undefined,
                shadowOffsetY: e.target.checked ? (element.shadowOffsetY ?? 10) : undefined,
              },
              true
            )
          }
          className="accent-teal-500"
        />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
          {t('enable_shadow')}
        </span>
      </label>
      {isShadowEnabled && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t('shadow_color')}</label>
            <input
              type="color"
              disabled={disabled}
              value={element.shadowColor || '#000000'}
              onPointerDown={pauseHistory}
              onPointerUp={resumeHistory}
              onChange={(e) => onScheduleUpdate(activeSpreadId, element.id, { shadowColor: e.target.value })}
              className="w-full h-8 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer block overflow-hidden"
            />
          </div>

          <RealTimePropertyControl
            label={t('shadow_opacity')}
            value={Math.round((element.shadowOpacity ?? 0.5) * 100)}
            min={0}
            max={100}
            step={1}
            precision={0}
            unit="%"
            minClamp={0}
            maxClamp={100}
            accentColor="teal"
            disabled={disabled}
            resetTitle={t('reset_value')}
            onChange={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOpacity: val / 100 })}
            onCommit={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOpacity: val / 100 }, true)}
            onReset={() => onScheduleUpdate(activeSpreadId, element.id, { shadowOpacity: 0.5 }, true)}
          />

          <RealTimePropertyControl
            label={t('shadow_blur')}
            value={element.shadowBlur ?? 15}
            min={0}
            max={100}
            step={0.5}
            precision={1}
            minClamp={0}
            accentColor="teal"
            disabled={disabled}
            resetTitle={t('reset_value')}
            onChange={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowBlur: val })}
            onCommit={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowBlur: val }, true)}
            onReset={() => onScheduleUpdate(activeSpreadId, element.id, { shadowBlur: 15 }, true)}
          />

          <RealTimePropertyControl
            label={t('shadow_offset_x')}
            value={element.shadowOffsetX ?? 0}
            min={-100}
            max={100}
            step={0.5}
            precision={1}
            accentColor="teal"
            disabled={disabled}
            resetTitle={t('reset_value')}
            onChange={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetX: val })}
            onCommit={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetX: val }, true)}
            onReset={() => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetX: 0 }, true)}
          />

          <RealTimePropertyControl
            label={t('shadow_offset_y')}
            value={element.shadowOffsetY ?? 10}
            min={-100}
            max={100}
            step={0.5}
            precision={1}
            accentColor="teal"
            disabled={disabled}
            resetTitle={t('reset_value')}
            onChange={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetY: val })}
            onCommit={(val) => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetY: val }, true)}
            onReset={() => onScheduleUpdate(activeSpreadId, element.id, { shadowOffsetY: 10 }, true)}
          />
        </div>
      )}
    </div>
  );
});

export default function Inspector() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const updateElement = useEditorStore((state) => state.updateElement);
  const resetElementAdjustments = useEditorStore((state) => state.resetElementAdjustments);
  const duplicateElement = useEditorStore((state) => state.duplicateElement);
  const setPreviewOriginalPhotoId = useEditorStore((state) => state.setPreviewOriginalPhotoId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const removeElement = useEditorStore((state) => state.removeElement);
  const selectedStagedElementIds = useEditorStore((state) => state.selectedStagedElementIds);
  const swapStagedElements = useEditorStore((state) => state.swapStagedElements);
  const clearStagedSelection = useEditorStore((state) => state.clearStagedSelection);

  const activeSpread = project?.spreads.find((s) => s.id === activeSpreadId);
  const element = activeSpread?.elements.find((e) => e.id === selectedElementId);

  const [activeTab, setActiveTab] = useState<'properties' | 'layout' | 'layers' | 'global'>('properties');

  // Coalesce high-frequency pointer/slider updates into one Zustand store update per animation frame (60 FPS)
  const rafIdRef = useRef<number | null>(null);
  const pendingPatchRef = useRef<{
    spreadId: string;
    elementId: string;
    attrs: Partial<EditorElement>;
  } | null>(null);

  // Stationary world pivot caches captured at gesture start so continuous rotations/scales have zero drift
  const fixedCenterPivotRef = useRef<Point2D | null>(null);
  const fixedAnchorPivotRef = useRef<Point2D | null>(null);

  const flushPendingUpdate = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (pendingPatchRef.current) {
      const { spreadId, elementId, attrs } = pendingPatchRef.current;
      pendingPatchRef.current = null;
      updateElement(spreadId, elementId, attrs);
    }
  }, [updateElement]);

  const scheduleElementUpdate = useCallback(
    (spreadId: string, elementId: string, attrs: Partial<EditorElement>, immediate = false) => {
      if (
        pendingPatchRef.current &&
        (pendingPatchRef.current.spreadId !== spreadId || pendingPatchRef.current.elementId !== elementId)
      ) {
        flushPendingUpdate();
      }

      pendingPatchRef.current = {
        spreadId,
        elementId,
        attrs: pendingPatchRef.current ? { ...pendingPatchRef.current.attrs, ...attrs } : { ...attrs },
      };

      if (immediate) {
        flushPendingUpdate();
        return;
      }

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (pendingPatchRef.current) {
            const { spreadId: sId, elementId: eId, attrs: merged } = pendingPatchRef.current;
            pendingPatchRef.current = null;
            updateElement(sId, eId, merged);
          }
        });
      }
    },
    [updateElement, flushPendingUpdate]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Reset cached gesture pivots when switching elements
  useEffect(() => {
    fixedCenterPivotRef.current = null;
    fixedAnchorPivotRef.current = null;
  }, [selectedElementId]);

  const isStudio = project?.projectCategory === 'studio_print';

  // Handle intelligent auto-switching of tabs when selecting elements
  useEffect(() => {
    if (!isStudio) {
      if (!selectedElementId && activeTab === 'properties') {
        setActiveTab('global');
      } else if (selectedElementId && activeTab === 'global') {
        setActiveTab('properties');
      }
    } else {
      if (activeTab === 'layout' || activeTab === 'global') {
        setActiveTab('properties');
      }
    }
  }, [selectedElementId, isStudio, activeTab]);

  const propertiesLabel = t('properties') || 'Prop.';
  const layersLabel = t('layers') || 'Capas';

  if (!activeSpreadId) {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col h-full items-center justify-center text-sm text-neutral-400">
        Waiting for spread...
      </aside>
    );
  }

  if (activeTab === 'global' && !isStudio) {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudio={Boolean(isStudio)}
          propertiesLabel={propertiesLabel}
          layersLabel={layersLabel}
        />
        <GlobalStylesPanel />
      </aside>
    );
  }

  if (activeTab === 'layout' && !isStudio) {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudio={Boolean(isStudio)}
          propertiesLabel={propertiesLabel}
          layersLabel={layersLabel}
        />
        <AutoLayoutPanel />
      </aside>
    );
  }

  if (activeTab === 'layers') {
    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudio={Boolean(isStudio)}
          propertiesLabel={propertiesLabel}
          layersLabel={layersLabel}
        />
        <LayersPanel />
      </aside>
    );
  }

  if (!element) {
    if (selectedStagedElementIds?.length === 2) {
      return (
        <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
          <TabsHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isStudio={Boolean(isStudio)}
            propertiesLabel={propertiesLabel}
            layersLabel={layersLabel}
          />
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-sm text-neutral-400 text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-2 shadow-inner border border-blue-100 dark:border-blue-800/50">
              <RotateCcw className="w-8 h-8 text-blue-500" />
            </div>
            <p className="font-medium text-neutral-800 dark:text-neutral-200 tracking-wide uppercase text-xs">
              2 Seleccionados
            </p>
            <button
              type="button"
              onClick={swapStagedElements}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide py-2.5 rounded-lg shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
              title="Intercambiar el tamaño, ancho, y rotación de las dos fotos"
            >
              Intercambiar Posición
            </button>
            <button
              type="button"
              onClick={clearStagedSelection}
              className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-bold py-2 rounded-lg transition-colors text-xs"
            >
              Desmarcar Todos
            </button>
          </div>
        </aside>
      );
    }

    return (
      <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
        <TabsHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudio={Boolean(isStudio)}
          propertiesLabel={propertiesLabel}
          layersLabel={layersLabel}
        />
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-sm text-neutral-400 text-center gap-2">
          {t('no_selection')}
        </div>
      </aside>
    );
  }

  const canvasW = project?.size.w_mm || 400;
  const canvasH = project?.size.h_mm || 300;
  const isLocked = Boolean(element.locked);
  const isVisible = element.visible !== false;

  // Active pivot for Operation B (Anchor Point Rotation). Defaults to Top-Left (0, 0) so it is geometrically distinct from Center (0.5, 0.5) unless configured.
  const activePivotX = element.pivotX ?? 0;
  const activePivotY = element.pivotY ?? 0;
  const currentRotation360 = normalizeAngle360(element.rotation_deg || 0);

  // Always read the live selected element from Zustand store to prevent any stale closure across moves or layer duplications
  const getLiveTarget = () => {
    const st = useEditorStore.getState();
    const sId = st.activeSpreadId || activeSpreadId;
    const sp = st.project?.spreads.find((s) => s.id === sId);
    const eId = st.selectedElementId || element.id;
    const liveEl = sp?.elements.find((e) => e.id === eId) || element;
    return { spreadId: sId, el: liveEl, proj: st.project || project };
  };

  // Operation A: Rotate around Geometric Center (0.5, 0.5), keeping center position stationary
  const handleCenterRotationChange = (newAngleDeg: number, immediate = false) => {
    const { spreadId, el } = getLiveTarget();
    if (!spreadId || !el || el.locked) return;
    const pivot = fixedCenterPivotRef.current ?? getWorldPivotPoint(el, 0.5, 0.5);
    const nextPose = computeRotationAroundPivot(el, newAngleDeg, 0.5, 0.5, pivot);
    scheduleElementUpdate(spreadId, el.id, nextPose, immediate);
  };

  // Operation B: Rotate around Configurable Anchor Point (el.pivotX ?? 0, el.pivotY ?? 0)
  const handleAnchorRotationChange = (newAngleDeg: number, immediate = false) => {
    const { spreadId, el } = getLiveTarget();
    if (!spreadId || !el || el.locked) return;
    const pX = el.pivotX ?? 0;
    const pY = el.pivotY ?? 0;
    const pivot = fixedAnchorPivotRef.current ?? getWorldPivotPoint(el, pX, pY);
    const nextPose = computeRotationAroundPivot(el, newAngleDeg, pX, pY, pivot);
    scheduleElementUpdate(spreadId, el.id, nextPose, immediate);
  };

  // Proportional Scale around Geometric Center (0.5, 0.5)
  const handleScaleChange = (newScale: number, immediate = false) => {
    const { spreadId, el } = getLiveTarget();
    if (!spreadId || !el || el.locked) return;
    const pivot = fixedCenterPivotRef.current ?? getWorldPivotPoint(el, 0.5, 0.5);
    const nextPose = computeScaleAroundPivot(el, newScale, 0.5, 0.5, pivot);
    scheduleElementUpdate(spreadId, el.id, nextPose, immediate);
  };

  // Center-stable Width (w_mm) and Height (h_mm) adjustments
  const handleWidthChange = (val: number, immediate = false) => {
    const { spreadId, el } = getLiveTarget();
    if (!spreadId || !el || el.locked) return;
    const nextW = Math.max(5, val);
    const centerPt = fixedCenterPivotRef.current ?? getWorldPivotPoint(el, 0.5, 0.5);
    const nextPose = computeRotationAroundPivot(
      { ...el, w_mm: nextW },
      el.rotation_deg || 0,
      0.5,
      0.5,
      centerPt
    );
    scheduleElementUpdate(
      spreadId,
      el.id,
      {
        x_mm: nextPose.x_mm,
        y_mm: nextPose.y_mm,
        w_mm: Number(nextW.toFixed(2)),
      },
      immediate
    );
  };

  const handleHeightChange = (val: number, immediate = false) => {
    const { spreadId, el } = getLiveTarget();
    if (!spreadId || !el || el.locked) return;
    const nextH = Math.max(5, val);
    const centerPt = fixedCenterPivotRef.current ?? getWorldPivotPoint(el, 0.5, 0.5);
    const nextPose = computeRotationAroundPivot(
      { ...el, h_mm: nextH },
      el.rotation_deg || 0,
      0.5,
      0.5,
      centerPt
    );
    scheduleElementUpdate(
      spreadId,
      el.id,
      {
        x_mm: nextPose.x_mm,
        y_mm: nextPose.y_mm,
        h_mm: Number(nextH.toFixed(2)),
      },
      immediate
    );
  };

  // --- TAREA 2: Canvas Framing Handlers ---
  const handleFramingFit = () => {
    const { spreadId, el, proj } = getLiveTarget();
    if (!proj || !el || !spreadId || el.locked) return;
    const asset = proj.assets?.find((a) => a.id === el.assetId);
    const aspect =
      asset?.width && asset?.height
        ? asset.width / asset.height
        : asset?.aspectRatio || el.w_mm / el.h_mm || 1;
    const canvasRatio = canvasW / canvasH;

    let newW: number;
    let newH: number;
    let newX: number;
    let newY: number;

    if (aspect > canvasRatio) {
      newW = canvasW;
      newH = Number((canvasW / aspect).toFixed(2));
      newX = 0;
      newY = Number(((canvasH - newH) / 2).toFixed(2));
    } else {
      newH = canvasH;
      newW = Number((canvasH * aspect).toFixed(2));
      newX = Number(((canvasW - newW) / 2).toFixed(2));
      newY = 0;
    }

    scheduleElementUpdate(
      spreadId,
      el.id,
      {
        x_mm: newX,
        y_mm: newY,
        w_mm: newW,
        h_mm: newH,
        rotation_deg: 0,
        scale: 1,
      },
      true
    );
  };

  const handleFramingFill = () => {
    const { spreadId, el, proj } = getLiveTarget();
    if (!proj || !el || !spreadId || el.locked) return;
    const asset = proj.assets?.find((a) => a.id === el.assetId);
    const aspect =
      asset?.width && asset?.height
        ? asset.width / asset.height
        : asset?.aspectRatio || el.w_mm / el.h_mm || 1;
    const canvasRatio = canvasW / canvasH;

    let newW: number;
    let newH: number;
    let newX: number;
    let newY: number;

    if (aspect > canvasRatio) {
      newH = canvasH;
      newW = Number((canvasH * aspect).toFixed(2));
      newX = Number(((canvasW - newW) / 2).toFixed(2));
      newY = 0;
    } else {
      newW = canvasW;
      newH = Number((canvasW / aspect).toFixed(2));
      newX = 0;
      newY = Number(((canvasH - newH) / 2).toFixed(2));
    }

    scheduleElementUpdate(
      spreadId,
      el.id,
      {
        x_mm: newX,
        y_mm: newY,
        w_mm: newW,
        h_mm: newH,
        rotation_deg: 0,
        scale: 1,
      },
      true
    );
  };

  const handleFramingActualSize = () => {
    const { spreadId, el, proj } = getLiveTarget();
    if (!proj || !el || !spreadId || el.locked) return;
    const dpi = proj.targetDpi || 300;
    const asset = proj.assets?.find((a) => a.id === el.assetId);
    const nativeW = asset?.width || asset?.metadata?.widthPx;
    const nativeH = asset?.height || asset?.metadata?.heightPx;

    if (nativeW && nativeH) {
      const newW = Number(((nativeW / dpi) * 25.4).toFixed(2));
      const newH = Number(((nativeH / dpi) * 25.4).toFixed(2));
      const newX = Number(((canvasW - newW) / 2).toFixed(2));
      const newY = Number(((canvasH - newH) / 2).toFixed(2));

      scheduleElementUpdate(
        spreadId,
        el.id,
        {
          x_mm: newX,
          y_mm: newY,
          w_mm: newW,
          h_mm: newH,
          scale: 1,
        },
        true
      );
    } else {
      const newX = Number(((canvasW - el.w_mm) / 2).toFixed(2));
      const newY = Number(((canvasH - el.h_mm) / 2).toFixed(2));
      scheduleElementUpdate(spreadId, el.id, { x_mm: newX, y_mm: newY }, true);
    }
  };

  const handleFramingCenter = () => {
    const { spreadId, el, proj } = getLiveTarget();
    if (!proj || !el || !spreadId || el.locked) return;
    const currentCenter = getWorldPivotPoint(el, 0.5, 0.5);
    const targetCenterX = canvasW / 2;
    const targetCenterY = canvasH / 2;
    const dx = targetCenterX - currentCenter.x;
    const dy = targetCenterY - currentCenter.y;
    scheduleElementUpdate(
      spreadId,
      el.id,
      {
        x_mm: Number((el.x_mm + dx).toFixed(2)),
        y_mm: Number((el.y_mm + dy).toFixed(2)),
      },
      true
    );
  };

  const activeFillOrTint = element.fillColor || element.color || '#000000';
  const hasTintOverlay = Boolean(element.color && element.color !== 'transparent');

  const activeAnchorPreset = ANCHOR_PRESETS.find(
    (p) => Math.abs(p.u - activePivotX) < 0.02 && Math.abs(p.v - activePivotY) < 0.02
  );

  return (
    <aside className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full overflow-hidden">
      <TabsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStudio={Boolean(isStudio)}
        propertiesLabel={propertiesLabel}
        layersLabel={layersLabel}
      />

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Header + Layer Quick Actions */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
            {t('properties')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { visible: el.visible === false ? true : false }, true);
              }}
              className={`p-1.5 rounded transition-colors ${isVisible ? 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800' : 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'}`}
              title={isVisible ? t('hide_layer') : t('show_layer')}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { locked: !el.locked }, true);
              }}
              className={`p-1.5 rounded transition-colors ${isLocked ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              title={isLocked ? t('unlock_layer') : t('lock_layer')}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) duplicateElement(spreadId, el.id);
              }}
              className="p-1.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title={t('duplicate_layer')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Locked / Hidden Status Banners */}
        {isLocked && (
          <div className="mb-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 p-2.5 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-[11px] text-red-700 dark:text-red-300 font-medium leading-tight">
                {t('layer_locked_banner')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { locked: false }, true);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase bg-red-500 hover:bg-red-600 text-white rounded shrink-0 transition-colors"
            >
              {t('unlock_layer')}
            </button>
          </div>
        )}

        {!isVisible && (
          <div className="mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <EyeOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-tight">
                {t('layer_hidden_banner')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { visible: true }, true);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase bg-amber-500 hover:bg-amber-600 text-white rounded shrink-0 transition-colors"
            >
              {t('show_layer')}
            </button>
          </div>
        )}

        {/* FASE 5: Global Reset Adjustments Button for Selected Layer */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => {
            flushPendingUpdate();
            fixedCenterPivotRef.current = null;
            fixedAnchorPivotRef.current = null;
            const { spreadId, el } = getLiveTarget();
            if (spreadId && el && !el.locked) {
              resetElementAdjustments(spreadId, el.id);
            }
          }}
          title={t('reset_adjustments_desc')}
          className="w-full mb-4 py-2 px-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-neutral-900 dark:hover:bg-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 active:scale-[0.98] text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
          <span>{t('reset_adjustments')}</span>
        </button>

        {element.isAutoLayoutManaged && activeSpread?.autoLayout?.isActive ? (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-tight">{t('al_managed')}</span>
          </div>
        ) : (
          <>
            <RealTimePropertyControl
              label={t('x_pos')}
              value={element.x_mm ?? 0}
              min={Math.round(-canvasW * 0.5)}
              max={Math.round(canvasW * 1.25)}
              step={0.1}
              sliderStep={0.5}
              precision={2}
              unit="mm"
              disabled={isLocked}
              resetTitle={t('reset_value')}
              onChange={(val) => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { x_mm: val });
              }}
              onCommit={(val) => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { x_mm: val }, true);
              }}
              onReset={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) {
                  scheduleElementUpdate(
                    spreadId,
                    el.id,
                    { x_mm: Number(((canvasW - el.w_mm) / 2).toFixed(2)) },
                    true
                  );
                }
              }}
            />
            <RealTimePropertyControl
              label={t('y_pos')}
              value={element.y_mm ?? 0}
              min={Math.round(-canvasH * 0.5)}
              max={Math.round(canvasH * 1.25)}
              step={0.1}
              sliderStep={0.5}
              precision={2}
              unit="mm"
              disabled={isLocked}
              resetTitle={t('reset_value')}
              onChange={(val) => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { y_mm: val });
              }}
              onCommit={(val) => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { y_mm: val }, true);
              }}
              onReset={() => {
                const { spreadId, el } = getLiveTarget();
                if (spreadId && el) {
                  scheduleElementUpdate(
                    spreadId,
                    el.id,
                    { y_mm: Number(((canvasH - el.h_mm) / 2).toFixed(2)) },
                    true
                  );
                }
              }}
            />
            <RealTimePropertyControl
              label={t('width')}
              value={element.w_mm ?? 50}
              min={5}
              max={Math.round(canvasW * 1.5)}
              step={0.1}
              sliderStep={0.5}
              precision={2}
              unit="mm"
              minClamp={5}
              disabled={isLocked}
              resetTitle={t('reset_value')}
              onDragStart={() => {
                const { el } = getLiveTarget();
                if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
              }}
              onChange={(val) => handleWidthChange(val, false)}
              onCommit={(val) => {
                handleWidthChange(val, true);
                fixedCenterPivotRef.current = null;
              }}
              onReset={() => {
                const { el, proj } = getLiveTarget();
                if (!el) return;
                fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
                const asset = proj?.assets?.find((a) => a.id === el.assetId);
                const aspect =
                  asset?.width && asset?.height ? asset.width / asset.height : asset?.aspectRatio;
                const targetW = aspect ? Number((el.h_mm * aspect).toFixed(2)) : Math.min(canvasW, el.w_mm);
                handleWidthChange(targetW, true);
                fixedCenterPivotRef.current = null;
              }}
            />
            <RealTimePropertyControl
              label={t('height')}
              value={element.h_mm ?? 50}
              min={5}
              max={Math.round(canvasH * 1.5)}
              step={0.1}
              sliderStep={0.5}
              precision={2}
              unit="mm"
              minClamp={5}
              disabled={isLocked}
              resetTitle={t('reset_value')}
              onDragStart={() => {
                const { el } = getLiveTarget();
                if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
              }}
              onChange={(val) => handleHeightChange(val, false)}
              onCommit={(val) => {
                handleHeightChange(val, true);
                fixedCenterPivotRef.current = null;
              }}
              onReset={() => {
                const { el, proj } = getLiveTarget();
                if (!el) return;
                fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
                const asset = proj?.assets?.find((a) => a.id === el.assetId);
                const aspect =
                  asset?.width && asset?.height ? asset.width / asset.height : asset?.aspectRatio;
                const targetH = aspect ? Number((el.w_mm / aspect).toFixed(2)) : Math.min(canvasH, el.h_mm);
                handleHeightChange(targetH, true);
                fixedCenterPivotRef.current = null;
              }}
            />

            {/* FASE 2A: Image / Layer Rotation around Geometric Center (0.5, 0.5) */}
            <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800">
              <RealTimePropertyControl
                label={t('rotation_center')}
                value={currentRotation360}
                min={0}
                max={360}
                step={0.5}
                sliderStep={1}
                precision={1}
                unit="°"
                disabled={isLocked}
                resetTitle={t('reset_value')}
                onDragStart={() => {
                  const { el } = getLiveTarget();
                  if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
                }}
                onChange={(val) => handleCenterRotationChange(val, false)}
                onCommit={(val) => {
                  handleCenterRotationChange(val, true);
                  fixedCenterPivotRef.current = null;
                }}
                onReset={() => {
                  const { el } = getLiveTarget();
                  if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
                  handleCenterRotationChange(0, true);
                  fixedCenterPivotRef.current = null;
                }}
              />
            </div>

            {/* FASE 2B: Rotation around Configurable Anchor Pivot Point */}
            <div className="p-2.5 mb-3 rounded-lg border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" /> {t('anchor_pivot_point')}
                </span>
                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">
                  {activeAnchorPreset ? t(activeAnchorPreset.key) : `${t('anchor_custom')} (${Math.round(activePivotX * 100)}%, ${Math.round(activePivotY * 100)}%)`}
                </span>
              </div>

              {/* 9-Point Anchor Matrix Selector + Current Angle Display */}
              <div className="flex items-center gap-3 mb-2">
                <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-inner shrink-0">
                  {ANCHOR_PRESETS.map((preset) => {
                    const isActive =
                      Math.abs(preset.u - activePivotX) < 0.02 && Math.abs(preset.v - activePivotY) < 0.02;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          const { spreadId, el } = getLiveTarget();
                          if (spreadId && el) {
                            fixedAnchorPivotRef.current = null;
                            scheduleElementUpdate(
                              spreadId,
                              el.id,
                              { pivotX: preset.u, pivotY: preset.v },
                              true
                            );
                          }
                        }}
                        title={t(preset.key)}
                        className={`w-4 h-4 rounded-sm flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-amber-500 text-white shadow-sm scale-110'
                            : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-neutral-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-current'}`} />
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <RealTimePropertyControl
                    label={t('rotation_anchor')}
                    value={currentRotation360}
                    min={0}
                    max={360}
                    step={0.5}
                    sliderStep={1}
                    precision={1}
                    unit="°"
                    accentColor="amber"
                    disabled={isLocked}
                    resetTitle={t('reset_value')}
                    onDragStart={() => {
                      const { el } = getLiveTarget();
                      if (el) {
                        fixedAnchorPivotRef.current = getWorldPivotPoint(
                          el,
                          el.pivotX ?? 0,
                          el.pivotY ?? 0
                        );
                      }
                    }}
                    onChange={(val) => handleAnchorRotationChange(val, false)}
                    onCommit={(val) => {
                      handleAnchorRotationChange(val, true);
                      fixedAnchorPivotRef.current = null;
                    }}
                    onReset={() => {
                      const { el } = getLiveTarget();
                      if (el) {
                        fixedAnchorPivotRef.current = getWorldPivotPoint(
                          el,
                          el.pivotX ?? 0,
                          el.pivotY ?? 0
                        );
                      }
                      handleAnchorRotationChange(0, true);
                      fixedAnchorPivotRef.current = null;
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <RealTimePropertyControl
          label={t('global_opacity')}
          value={element.opacity !== undefined ? Math.round(element.opacity * 100) : 100}
          min={0}
          max={100}
          step={1}
          sliderStep={1}
          precision={0}
          unit="%"
          minClamp={0}
          maxClamp={100}
          disabled={isLocked}
          resetTitle={t('reset_value')}
          onChange={(val) => {
            const { spreadId, el } = getLiveTarget();
            if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { opacity: val / 100 });
          }}
          onCommit={(val) => {
            const { spreadId, el } = getLiveTarget();
            if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { opacity: val / 100 }, true);
          }}
          onReset={() => {
            const { spreadId, el } = getLiveTarget();
            if (spreadId && el) scheduleElementUpdate(spreadId, el.id, { opacity: 1 }, true);
          }}
        />

        <RealTimePropertyControl
          label={t('proportional_scale')}
          value={element.scale !== undefined ? element.scale : 1}
          min={0.1}
          max={5}
          step={0.05}
          sliderStep={0.02}
          precision={2}
          unit="×"
          minClamp={0.05}
          disabled={isLocked}
          resetTitle={t('reset_value')}
          onDragStart={() => {
            const { el } = getLiveTarget();
            if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
          }}
          onChange={(val) => handleScaleChange(val, false)}
          onCommit={(val) => {
            handleScaleChange(val, true);
            fixedCenterPivotRef.current = null;
          }}
          onReset={() => {
            const { el } = getLiveTarget();
            if (el) fixedCenterPivotRef.current = getWorldPivotPoint(el, 0.5, 0.5);
            handleScaleChange(1, true);
            fixedCenterPivotRef.current = null;
          }}
        />

        {/* Global Style Isolation */}
        <div className="pt-3 pb-2 border-t border-neutral-200 dark:border-neutral-800">
          <label className={`flex items-center gap-2 cursor-pointer ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              disabled={isLocked}
              checked={element.isolateFromGlobalStyles || false}
              onChange={(e) =>
                scheduleElementUpdate(activeSpreadId, element.id, { isolateFromGlobalStyles: e.target.checked }, true)
              }
              className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase">
              {t('isolate_global_styles')}
            </span>
          </label>
        </div>

        {(element.type === 'decoration' || element.type === 'image' || element.type === 'shape') && (
          <div className={`pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-3 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Color / Fill / Tint Control */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-500 uppercase">
                  {element.type === 'shape' ? t('fill_color') : t('color')}
                </label>
                {element.type === 'image' && hasTintOverlay && (
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { color: undefined }, true)}
                    className="text-[10px] font-semibold text-neutral-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    title={t('remove_color_overlay')}
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> {t('remove_color_overlay')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={isLocked}
                  className="w-full h-8 cursor-pointer rounded border border-neutral-200 dark:border-neutral-700"
                  value={activeFillOrTint.startsWith('#') ? activeFillOrTint : '#000000'}
                  onPointerDown={pauseHistory}
                  onPointerUp={resumeHistory}
                  onChange={(e) => {
                    const nextColor = e.target.value;
                    if (element.type === 'shape') {
                      scheduleElementUpdate(activeSpreadId, element.id, {
                        fillColor: nextColor,
                        color: nextColor,
                      });
                    } else {
                      scheduleElementUpdate(activeSpreadId, element.id, {
                        color: nextColor,
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Blend Mode */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-500 uppercase">{t('blend_mode')}</label>
              <select
                disabled={isLocked}
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={element.blendMode || 'source-over'}
                onChange={(e) =>
                  scheduleElementUpdate(activeSpreadId, element.id, { blendMode: e.target.value }, true)
                }
              >
                <option value="source-over">Normal</option>
                <option value="multiply">Multiplicar (Multiply)</option>
                <option value="screen">Trama (Screen)</option>
                <option value="overlay">Superponer (Overlay)</option>
                <option value="darken">Oscurecer (Darken)</option>
                <option value="lighten">Aclarar (Lighten)</option>
                <option value="color-dodge">Sobreexponer Color</option>
                <option value="color-burn">Subexponer Color</option>
                <option value="hard-light">Luz Fuerte</option>
                <option value="soft-light">Luz Suave</option>
                <option value="difference">Diferencia</option>
                <option value="exclusion">Exclusión</option>
                <option value="color">Color</option>
                <option value="luminosity">Luminosidad</option>
              </select>
            </div>

            {/* Shadow Controls Segment */}
            <LocalShadowPanel
              element={element}
              activeSpreadId={activeSpreadId}
              disabled={isLocked}
              onScheduleUpdate={scheduleElementUpdate}
              t={t}
            />
          </div>
        )}

        {element.type === 'image' && (
          <div className="pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-800">
            {/* TAREA 2: Canvas Framing Controls */}
            <div className={`mb-4 bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <span>📐</span> {t('framing_title') || 'Encuadre de Lienzo'}
                </h3>
                {project && (
                  <span className="text-[9px] font-mono text-neutral-400">{project.targetDpi || 300} DPI</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleFramingFit}
                  className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  title="Ajustar la imagen completa dentro del lienzo manteniendo proporciones"
                >
                  <span>🔲</span> {t('framing_fit') || 'Encajar'}
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleFramingFill}
                  className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  title="Cubrir el 100% del lienzo manteniendo proporciones"
                >
                  <span>🖼️</span> {t('framing_fill') || 'Rellenar'}
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleFramingActualSize}
                  className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  title="Dimensionar según la resolución nativa al DPI del proyecto"
                >
                  <span>🎯</span> {t('framing_actual') || '100% DPI'}
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleFramingCenter}
                  className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  title="Centrar en el lienzo sin alterar dimensiones"
                >
                  <span>➕</span> {t('framing_center') || 'Centrar'}
                </button>
              </div>
            </div>

            {/* Album Editorial Role: only in Album mode */}
            {!isStudio && (
              <div className={`mb-4 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-200 dark:border-orange-800/50 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-200">
                    Rol Editorial
                  </h3>
                </div>
                <select
                  disabled={isLocked}
                  className="w-full bg-white dark:bg-neutral-950 border border-orange-200 dark:border-orange-800 rounded px-2 py-1.5 text-sm focus:outline-none transition-shadow mb-1 text-orange-900 dark:text-orange-100 font-medium"
                  value={element.editorialRole || 'auto'}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { editorialRole: e.target.value as any }, true)}
                >
                  <option value="auto">Automático del Sistema</option>
                  <option value="hero">★ Forzar Principal (Hero)</option>
                  <option value="supporting">■ Secundaria (Supporting)</option>
                  <option value="filler">▼ Relleno (Filler)</option>
                </select>
                {element.assignmentReason && activeSpread?.autoLayout?.isActive && (
                  <p className="text-[10px] text-orange-800/80 dark:text-orange-200/80 leading-tight mt-1.5 border-t border-orange-200/50 dark:border-orange-800/50 pt-1.5">
                    <strong className="block mb-0.5 opacity-75">Respuesta del Motor:</strong>
                    {element.assignmentReason}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200">
                {t('filters_luts')}
              </h3>
              {element.photoFilter && element.photoFilter !== 'none' && (
                <button
                  type="button"
                  onMouseDown={() => setPreviewOriginalPhotoId(element.id)}
                  onMouseUp={() => setPreviewOriginalPhotoId(null)}
                  onMouseLeave={() => setPreviewOriginalPhotoId(null)}
                  onTouchStart={() => setPreviewOriginalPhotoId(element.id)}
                  onTouchEnd={() => setPreviewOriginalPhotoId(null)}
                  className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors"
                  title={t('hold_to_preview_original')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <select
              disabled={isLocked}
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow mb-4 disabled:opacity-50"
              value={element.photoFilter || 'none'}
              onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { photoFilter: e.target.value }, true)}
            >
              <option value="none">{t('filter_none')}</option>
              {Array.from(new Set(LUT_LIBRARY.map((l) => l.category))).map((category) => (
                <optgroup key={category} label={category}>
                  {LUT_LIBRARY.filter((l) => l.category === category).map((lut) => (
                    <option key={lut.id} value={lut.id}>
                      {lut.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Legacy Básicos">
                <option value="sepia">Sepia (Legacy)</option>
                <option value="grayscale">B/N (Legacy)</option>
                <option value="invert">Invertir</option>
                <option value="blur">Desenfoque</option>
                <option value="noise">Ruido</option>
                <option value="brighten">Brillo</option>
                <option value="contrast">Contraste</option>
                <option value="posterize">Posterizar</option>
              </optgroup>
            </select>

            {element.photoFilter && element.photoFilter !== 'none' && (
              <RealTimePropertyControl
                label={element.photoFilter?.startsWith('lut_') ? t('filter_intensity_lut') : t('filter_intensity_level')}
                value={
                  element.filterIntensity !== undefined
                    ? element.filterIntensity
                    : element.photoFilter === 'posterize'
                      ? 4
                      : 1
                }
                min={0}
                max={
                  element.photoFilter?.startsWith('lut_')
                    ? 1
                    : element.photoFilter === 'posterize'
                      ? 10
                      : element.photoFilter === 'blur'
                        ? 20
                        : element.photoFilter === 'contrast'
                          ? 100
                          : 1
                }
                step={element.photoFilter?.startsWith('lut_') ? 0.01 : element.photoFilter === 'posterize' ? 1 : 0.05}
                precision={2}
                minClamp={0}
                disabled={isLocked}
                resetTitle={t('reset_value')}
                onChange={(val) => scheduleElementUpdate(activeSpreadId, element.id, { filterIntensity: val })}
                onCommit={(val) => scheduleElementUpdate(activeSpreadId, element.id, { filterIntensity: val }, true)}
                onReset={() =>
                  scheduleElementUpdate(
                    activeSpreadId,
                    element.id,
                    { filterIntensity: element.photoFilter === 'posterize' ? 4 : 1 },
                    true
                  )
                }
              />
            )}

            <div className="flex items-center justify-between mb-2 mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200">
                Camera Raw Pro
              </h3>
            </div>

            <CameraRawPanel element={element} activeSpreadId={activeSpreadId} disabled={isLocked} />
          </div>
        )}

        {element.type === 'text' && (
          <div className={`mb-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Typography Presets Block */}
            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-3">
              <TypographyPresetSelector />
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-4">
              {/* Raw Text Box */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TextSelect className="w-3.5 h-3.5 text-neutral-500" />
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Text Source</label>
                </div>
                <textarea
                  disabled={isLocked}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow min-h-[60px]"
                  value={element.text || ''}
                  onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { text: e.target.value })}
                  placeholder="Escribe tu texto..."
                />
              </div>

              {/* Font Typography Bar */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Type className="w-3.5 h-3.5 text-neutral-500" />
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Typography</label>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <select
                    disabled={isLocked}
                    className="w-full h-8 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded px-2 text-sm focus:outline-none"
                    value={element.fontFamily || 'Inter'}
                    onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { fontFamily: e.target.value }, true)}
                  >
                    <optgroup label="Scripts & Calligraphy">
                      <option value="Great Vibes">Great Vibes</option>
                      <option value="Alex Brush">Alex Brush</option>
                      <option value="Allura">Allura</option>
                      <option value="Parisienne">Parisienne (Adorn)</option>
                      <option value="Qwigley">Qwigley (Burgues)</option>
                      <option value="Grand Hotel">Grand Hotel (Lavanderia)</option>
                      <option value="Cedarville Cursive">Cedarville (Snell)</option>
                      <option value="Herr Von Muellerhoff">Herr Von Muellerhoff (Zapfino)</option>
                      <option value="Tangerine">Tangerine (Shelley)</option>
                      <option value="Sacramento">Sacramento (Affair)</option>
                      <option value="Pinyon Script">Pinyon Script</option>
                      <option value="Caveat">Caveat (Playlist)</option>
                      <option value="Satisfy">Satisfy (Beloved)</option>
                      <option value="Dancing Script">Dancing Script</option>
                      <option value="Pacifico">Pacifico</option>
                      <option value="Cookie">Cookie</option>
                      <option value="Rochester">Rochester</option>
                      <option value="Montez">Montez</option>
                      <option value="Norican">Norican</option>
                      <option value="Mrs Saint Delafield">Mrs Saint Delafield</option>
                      <option value="La Belle Aurore">La Belle Aurore</option>
                    </optgroup>
                    <optgroup label="Serif & Editorial">
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Libre Baskerville">Libre Baskerville</option>
                      <option value="Bodoni Moda">Bodoni Moda</option>
                      <option value="EB Garamond">EB Garamond</option>
                      <option value="Libre Caslon Text">Libre Caslon Text</option>
                      <option value="Cormorant Garamond">Cormorant Garamond</option>
                      <option value="Lora">Lora (Sabon)</option>
                      <option value="Crimson Text">Crimson Text (Minion)</option>
                      <option value="Cinzel">Cinzel (Trajan)</option>
                      <option value="Neuton">Neuton (Mrs Eaves)</option>
                      <option value="Prata">Prata (Chronicle)</option>
                      <option value="Gloock">Gloock (Canela)</option>
                      <option value="Abril Fatface">Abril Fatface (Butler)</option>
                      <option value="Vidaloka">Vidaloka (Noe)</option>
                      <option value="Frank Ruhl Libre">Frank Ruhl Libre</option>
                      <option value="Yeseva One">Yeseva One</option>
                      <option value="Zilla Slab">Zilla Slab (Editorial)</option>
                      <option value="Cinzel Decorative">Cinzel Decorative</option>
                      <option value="Marcellus">Marcellus</option>
                      <option value="Forum">Forum</option>
                      <option value="Spectral">Spectral</option>
                      <option value="Fraunces">Fraunces (Orpheus)</option>
                      <option value="Cardo">Cardo</option>
                      <option value="Alegreya">Alegreya</option>
                      <option value="Vollkorn">Vollkorn</option>
                      <option value="Arapey">Arapey</option>
                      <option value="Old Standard TT">Old Standard TT</option>
                      <option value="Sorts Mill Goudy">Sorts Mill Goudy</option>
                    </optgroup>
                    <optgroup label="Sans Serif & Modern">
                      <option value="Inter">Inter (Helvetica)</option>
                      <option value="Jost">Jost (Futura)</option>
                      <option value="Nunito Sans">Nunito Sans (Avenir)</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Raleway">Raleway</option>
                      <option value="DM Sans">DM Sans (Proxima)</option>
                      <option value="Prompt">Prompt (Gotham)</option>
                      <option value="Lato">Lato</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Josefin Sans">Josefin Sans</option>
                      <option value="Work Sans">Work Sans</option>
                      <option value="Nunito">Nunito</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Oswald">Oswald</option>
                      <option value="Arial">Arial</option>
                    </optgroup>
                  </select>
                  <div className="flex items-center bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded h-8 px-1">
                    <input
                      type="number"
                      disabled={isLocked}
                      value={element.fontSize || 32}
                      onChange={(e) =>
                        scheduleElementUpdate(activeSpreadId, element.id, { fontSize: parseFloat(e.target.value) || 32 })
                      }
                      className="w-10 text-center bg-transparent border-none text-sm outline-none"
                      min={8}
                      max={500}
                    />
                  </div>
                </div>
              </div>

              {/* Formatting Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-md">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textAlign: 'left' }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${!element.textAlign || element.textAlign === 'left' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textAlign: 'center' }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textAlign === 'center' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textAlign: 'right' }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textAlign === 'right' ? 'bg-white dark:bg-neutral-700 shadow-sm' : 'text-neutral-500'}`}
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-md text-xs font-medium">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textTransform: 'uppercase' }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textTransform === 'uppercase' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                  >
                    AA
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textTransform: 'lowercase' }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${element.textTransform === 'lowercase' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                  >
                    aa
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => scheduleElementUpdate(activeSpreadId, element.id, { textTransform: undefined }, true)}
                    className={`flex-1 flex justify-center py-1 rounded transition-colors ${!element.textTransform ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500'}`}
                  >
                    Aa
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                <RealTimePropertyControl
                  label="Espaciado Letras"
                  value={element.letterSpacing ?? 0}
                  min={-10}
                  max={100}
                  step={1}
                  precision={0}
                  unit="px"
                  disabled={isLocked}
                  resetTitle={t('reset_value')}
                  onChange={(val) => scheduleElementUpdate(activeSpreadId, element.id, { letterSpacing: val })}
                  onCommit={(val) => scheduleElementUpdate(activeSpreadId, element.id, { letterSpacing: val }, true)}
                  onReset={() => scheduleElementUpdate(activeSpreadId, element.id, { letterSpacing: 0 }, true)}
                />
                <RealTimePropertyControl
                  label="Interlineado"
                  value={element.lineHeight ?? 1}
                  min={0.5}
                  max={3}
                  step={0.05}
                  precision={2}
                  disabled={isLocked}
                  resetTitle={t('reset_value')}
                  onChange={(val) => scheduleElementUpdate(activeSpreadId, element.id, { lineHeight: val })}
                  onCommit={(val) => scheduleElementUpdate(activeSpreadId, element.id, { lineHeight: val }, true)}
                  onReset={() => scheduleElementUpdate(activeSpreadId, element.id, { lineHeight: 1 }, true)}
                />
              </div>

              {/* Fills & Strokes */}
              <div className="grid grid-cols-[1fr_1fr] gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <PaintBucket className="w-3.5 h-3.5 text-neutral-500" />
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fill</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={isLocked}
                      className="w-8 h-8 rounded-full border border-neutral-200 shadow-sm cursor-pointer p-0 overflow-hidden"
                      value={element.textColor || '#000000'}
                      onPointerDown={pauseHistory}
                      onPointerUp={resumeHistory}
                      onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { textColor: e.target.value })}
                    />
                    <span className="text-xs text-neutral-600 font-mono uppercase bg-white border px-1.5 py-1 rounded">
                      {element.textColor || '#000000'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <TypeOutline className="w-3.5 h-3.5 text-neutral-500" />
                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Stroke</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={isLocked}
                      className="w-6 h-6 rounded border border-neutral-200 shadow-sm cursor-pointer p-0 overflow-hidden"
                      value={element.strokeColor || '#000000'}
                      onPointerDown={pauseHistory}
                      onPointerUp={resumeHistory}
                      onChange={(e) => scheduleElementUpdate(activeSpreadId, element.id, { strokeColor: e.target.value })}
                    />
                    <input
                      type="number"
                      disabled={isLocked}
                      min="0"
                      max="100"
                      value={element.strokeWidth || 0}
                      onChange={(e) =>
                        scheduleElementUpdate(activeSpreadId, element.id, {
                          strokeWidth: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-10 h-6 border rounded text-xs text-center outline-none bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Shadow Controls Segment */}
              <LocalShadowPanel
                element={element}
                activeSpreadId={activeSpreadId}
                disabled={isLocked}
                onScheduleUpdate={scheduleElementUpdate}
                t={t}
              />
            </div>
          </div>
        )}

        <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-between gap-2">
          <button
            type="button"
            onClick={() => sendBackward(activeSpreadId, element.id)}
            className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold uppercase rounded text-neutral-600 dark:text-neutral-400 transition-colors"
            title={t('send_backward')}
          >
            {t('layer_down')}
          </button>
          <button
            type="button"
            onClick={() => bringForward(activeSpreadId, element.id)}
            className="flex-1 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold uppercase rounded text-neutral-600 dark:text-neutral-400 transition-colors"
            title={t('bring_forward')}
          >
            {t('layer_up')}
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => removeElement(activeSpreadId, element.id)}
            className="flex-1 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-xs font-semibold uppercase rounded text-red-600 dark:text-red-400 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
            title={t('delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
