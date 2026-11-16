import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { EditorElement } from '@/types/editor';
import { LUT_LIBRARY } from '@/lib/lut-presets';

interface BeforeAfterModalProps {
  element: EditorElement;
  isEs?: boolean;
}

export const BeforeAfterModal = React.memo(function BeforeAfterModal({
  element,
  isEs = true,
}: BeforeAfterModalProps) {
  const isBeforeAfterModalOpen = useEditorStore((state) => state.isBeforeAfterModalOpen);
  const setIsBeforeAfterModalOpen = useEditorStore((state) => state.setIsBeforeAfterModalOpen);

  const [compareMode, setCompareMode] = useState<'split' | 'sideBySide' | 'toggle'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5); // 0 to 1
  const [toggleShowBefore, setToggleShowBefore] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitRef = useRef<boolean>(false);

  const imageSrc = element.previewUrl || element.originalUrl || element.src || '';

  // Close on Escape key or toggle on Space / Backslash
  useEffect(() => {
    if (!isBeforeAfterModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBeforeAfterModalOpen(false);
      } else if (e.key === '\\' || e.code === 'Space') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setToggleShowBefore(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === '\\' || e.code === 'Space') {
        setToggleShowBefore(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isBeforeAfterModalOpen, setIsBeforeAfterModalOpen]);

  // Handle dragging the split slider line across the screen
  const updateSplitFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width));
    setSplitPos(ratio);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (compareMode !== 'split') return;
    e.preventDefault();
    isDraggingSplitRef.current = true;
    updateSplitFromClientX(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingSplitRef.current) return;
      ev.preventDefault();
      updateSplitFromClientX(ev.clientX);
    };

    const onPointerUp = () => {
      isDraggingSplitRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (!isBeforeAfterModalOpen || !imageSrc) return null;

  // Compute CSS filter approximation for real-time DOM preview
  const adj = element.photoAdjustments || {};
  const exposure = adj.exposure || 0;
  const contrast = adj.lightContrast || 0;
  const brightnessAdj = Math.pow(2, exposure) * 100;
  const contrastAdj = 100 + contrast;
  const satAdj = 100 + (adj.saturation || 0);

  let filterStr = `brightness(${brightnessAdj}%) contrast(${contrastAdj}%) saturate(${satAdj}%)`;
  if (element.photoFilter && element.photoFilter !== 'none') {
    const lut = LUT_LIBRARY.find((l) => l.id === element.photoFilter);
    if (lut?.grayscale) filterStr += ' grayscale(100%)';
    if (lut?.sepia) filterStr += ' sepia(60%)';
    if (lut?.invert) filterStr += ' invert(100%)';
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md flex flex-col select-none text-white animate-in fade-in duration-200">
      {/* Top Control Bar */}
      <div className="h-14 px-5 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
        {/* Left: Title & Quick Shortcuts */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#242424] flex items-center justify-center text-white border border-[#333]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 16H5V5h7v14zm7 0h-5V5h5v14z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide">
              {isEs ? 'Comparación Antes y Después' : 'Before & After Comparison'}
            </h2>
            <p className="text-[10px] text-[#888]">
              {isEs ? 'Espacio o \\ para alternar instantáneamente' : 'Space or \\ to toggle original'}
            </p>
          </div>
        </div>

        {/* Center: Mode Selectors */}
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-lg p-1 border border-[#333]">
          <button
            type="button"
            onClick={() => setCompareMode('split')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              compareMode === 'split' ? 'bg-[#383838] text-white shadow-sm' : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            <span>◧</span>
            <span>{isEs ? 'Dividir' : 'Split'}</span>
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('sideBySide')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              compareMode === 'sideBySide' ? 'bg-[#383838] text-white shadow-sm' : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            <span>◫</span>
            <span>{isEs ? 'Lado a Lado' : 'Side by Side'}</span>
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('toggle')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              compareMode === 'toggle' ? 'bg-[#383838] text-white shadow-sm' : 'text-[#888] hover:text-[#ccc]'
            }`}
          >
            <span>👁</span>
            <span>{isEs ? 'Alternar A/B' : 'Toggle A/B'}</span>
          </button>
        </div>

        {/* Right: Split Presets, Zoom & Close */}
        <div className="flex items-center gap-3">
          {compareMode === 'split' && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#777]">
              {[0.25, 0.5, 0.75].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSplitPos(preset)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    Math.abs(splitPos - preset) < 0.02
                      ? 'border-white text-white bg-white/10'
                      : 'border-[#333] hover:border-[#555] text-[#888]'
                  }`}
                >
                  {preset * 100}%
                </button>
              ))}
            </div>
          )}

          {/* Hold to Preview Button */}
          <button
            type="button"
            onPointerDown={() => setToggleShowBefore(true)}
            onPointerUp={() => setToggleShowBefore(false)}
            onPointerLeave={() => setToggleShowBefore(false)}
            className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
              toggleShowBefore
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-[#222] text-[#bbb] border-[#383838] hover:text-white'
            }`}
            title={isEs ? 'Mantén presionado para ver la foto original' : 'Hold to see original photo'}
          >
            {isEs ? 'Mantener Original' : 'Hold Original'}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsBeforeAfterModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#262626] hover:bg-[#333] flex items-center justify-center text-[#999] hover:text-white transition-colors border border-[#383838]"
            title={isEs ? 'Cerrar (Esc)' : 'Close (Esc)'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
        {/* MODE 1: SPLIT SCREEN WITH DRAGGABLE DIVIDER */}
        {compareMode === 'split' && (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center cursor-ew-resize overflow-hidden rounded-lg shadow-2xl border border-[#222] bg-[#111]"
          >
            {/* Layer 1: ORIGINAL (BEFORE) Full Base Image */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Before (Original)"
                className="max-w-full max-h-full object-contain pointer-events-none select-none"
              />
            </div>

            {/* Layer 2: ADJUSTED (AFTER) Image with Clip Path */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
              style={{
                clipPath: `polygon(${splitPos * 100}% 0%, 100% 0%, 100% 100%, ${splitPos * 100}% 100%)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="After (Adjusted)"
                style={{ filter: toggleShowBefore ? 'none' : filterStr }}
                className="max-w-full max-h-full object-contain pointer-events-none select-none"
              />
            </div>

            {/* Split Divider Vertical Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.9)] pointer-events-none z-20"
              style={{ left: `${splitPos * 100}%` }}
            >
              {/* Draggable Circle Handle */}
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black font-bold shadow-xl border-2 border-[#181818] flex items-center justify-center text-[10px] pointer-events-none">
                ◀▶
              </div>
            </div>

            {/* Badge: ANTES (Left) */}
            <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-xs font-bold tracking-wider text-white pointer-events-none shadow-md">
              {isEs ? 'ANTES (ORIGINAL)' : 'BEFORE (ORIGINAL)'}
            </div>

            {/* Badge: DESPUÉS (Right) */}
            <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-amber-400/40 text-xs font-bold tracking-wider text-amber-400 pointer-events-none shadow-md">
              {isEs ? 'DESPUÉS (AJUSTADO)' : 'AFTER (ADJUSTED)'}
            </div>

            {/* Live Percentage Pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/15 text-[11px] font-mono text-[#ddd] pointer-events-none">
              {Math.round(splitPos * 100)}%
            </div>
          </div>
        )}

        {/* MODE 2: SIDE-BY-SIDE (A | B) */}
        {compareMode === 'sideBySide' && (
          <div className="w-full h-full max-w-7xl max-h-[85vh] grid grid-cols-2 gap-4">
            {/* Left: Original (Antes) */}
            <div className="relative rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden flex flex-col items-center justify-center p-2 shadow-xl">
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-xs font-bold tracking-wider text-white">
                {isEs ? 'ANTES (ORIGINAL)' : 'BEFORE (ORIGINAL)'}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Before"
                className="max-w-full max-h-full object-contain select-none"
              />
            </div>

            {/* Right: Adjusted (Después) */}
            <div className="relative rounded-lg border border-[#2a2a2a] bg-[#111] overflow-hidden flex flex-col items-center justify-center p-2 shadow-xl">
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-amber-400/40 text-xs font-bold tracking-wider text-amber-400">
                {isEs ? 'DESPUÉS (AJUSTADO)' : 'AFTER (ADJUSTED)'}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="After"
                style={{ filter: toggleShowBefore ? 'none' : filterStr }}
                className="max-w-full max-h-full object-contain select-none"
              />
            </div>
          </div>
        )}

        {/* MODE 3: FULLSCREEN TOGGLE (A/B FLIP) */}
        {compareMode === 'toggle' && (
          <div className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center rounded-lg border border-[#222] bg-[#111] overflow-hidden p-2 shadow-2xl">
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded bg-black/80 backdrop-blur-sm border border-white/15 text-sm font-bold tracking-wider">
              {toggleShowBefore ? (
                <span className="text-white">{isEs ? 'ANTES (ORIGINAL)' : 'BEFORE (ORIGINAL)'}</span>
              ) : (
                <span className="text-amber-400">{isEs ? 'DESPUÉS (AJUSTADO)' : 'AFTER (ADJUSTED)'}</span>
              )}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Toggle View"
              style={{ filter: toggleShowBefore ? 'none' : filterStr }}
              className="max-w-full max-h-full object-contain select-none cursor-pointer"
              onClick={() => setToggleShowBefore((prev) => !prev)}
              title={isEs ? 'Haz clic para alternar' : 'Click to toggle'}
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default BeforeAfterModal;
