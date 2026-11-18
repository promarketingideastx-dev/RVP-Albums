"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Check,
  X,
  RotateCcw as ResetIcon,
  Plus,
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';

interface CustomPreset {
  id: string;
  name: string;
  ratio: number;
  ratioStr: string;
}

export const CropToolbar: React.FC = () => {
  const pathname = usePathname();
  const isEs = pathname ? pathname.includes('/es') : true;

  const isCropMode = useEditorStore((state) => state.isCropMode);
  const activeCropElementId = useEditorStore((state) => state.activeCropElementId);
  const project = useEditorStore((state) => state.project);
  const cropDraft = useEditorStore((state) => state.cropDraft);
  const rotationDraft = useEditorStore((state) => state.rotationDraft);
  const flipHDraft = useEditorStore((state) => state.flipHDraft);
  const flipVDraft = useEditorStore((state) => state.flipVDraft);
  const cropGridGuide = useEditorStore((state) => state.cropGridGuide);

  const startCropMode = useEditorStore((state) => state.startCropMode);
  const setCropDraft = useEditorStore((state) => state.setCropDraft);
  const setRotationDraft = useEditorStore((state) => state.setRotationDraft);
  const setFlipHDraft = useEditorStore((state) => state.setFlipHDraft);
  const setFlipVDraft = useEditorStore((state) => state.setFlipVDraft);
  const setCropGridGuide = useEditorStore((state) => state.setCropGridGuide);
  const resetCropDraft = useEditorStore((state) => state.resetCropDraft);
  const applyCropMode = useEditorStore((state) => state.applyCropMode);
  const cancelCropMode = useEditorStore((state) => state.cancelCropMode);

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showAddPresetPrompt, setShowAddPresetPrompt] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Global keyboard shortcuts while in crop mode: Enter -> Apply, Escape -> Cancel
  useEffect(() => {
    if (!isCropMode) return;
    const handleCropKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        applyCropMode();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelCropMode();
      }
    };
    window.addEventListener('keydown', handleCropKeys, { capture: true });
    return () => window.removeEventListener('keydown', handleCropKeys, { capture: true });
  }, [isCropMode, applyCropMode, cancelCropMode]);

  // Load custom presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rvp_crop_custom_presets');
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  const saveCustomPresetsToStorage = (presets: CustomPreset[]) => {
    setCustomPresets(presets);
    try {
      localStorage.setItem('rvp_crop_custom_presets', JSON.stringify(presets));
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleCropMode = () => {
    if (isCropMode) {
      applyCropMode();
    } else {
      startCropMode();
    }
  };

  const handleSelectPreset = (presetKey: string) => {
    if (!cropDraft) return;

    const currentEl = project?.spreads
      .flatMap((s) => s.elements)
      .find((el) => el.id === activeCropElementId);
    const elementW = currentEl?.w_mm || 300;
    const elementH = currentEl?.h_mm || 200;

    if (presetKey === 'original') {
      setCropDraft({
        ...cropDraft,
        aspectPreset: 'original',
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
      });
      return;
    }

    if (presetKey === 'free') {
      setCropDraft({
        ...cropDraft,
        aspectPreset: 'free',
      });
      return;
    }

    let targetRatio: number | null = null;
    if (presetKey === '1:1') targetRatio = 1.0;
    else if (presetKey === '2:3' || presetKey === '3:2') {
      targetRatio = elementW >= elementH ? 3 / 2 : 2 / 3;
    } else if (presetKey === '4:5' || presetKey === '5:4') {
      targetRatio = elementW >= elementH ? 5 / 4 : 4 / 5;
    } else if (presetKey === '16:9') targetRatio = 16 / 9;
    else if (presetKey === '9:16') targetRatio = 9 / 16;
    else if (presetKey.includes(':')) {
      const parts = presetKey.split(':').map(Number);
      if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
        targetRatio = parts[0] / parts[1];
      }
    }

    if (targetRatio !== null) {
      // physical aspect: cropW_mm / cropH_mm = targetRatio
      // (newW% * elementW) / (newH% * elementH) = targetRatio
      // => newW% / newH% = targetRatio * (elementH / elementW)
      const percentRatio = targetRatio * (elementH / elementW);

      let newW = 100;
      let newH = newW / percentRatio;

      if (newH > 100) {
        newH = 100;
        newW = newH * percentRatio;
      }

      const newX = Math.max(0, (100 - newW) / 2);
      const newY = Math.max(0, (100 - newH) / 2);

      setCropDraft({
        ...cropDraft,
        aspectPreset: presetKey,
        xPercent: Number(newX.toFixed(2)),
        yPercent: Number(newY.toFixed(2)),
        widthPercent: Number(newW.toFixed(2)),
        heightPercent: Number(newH.toFixed(2)),
      });
    } else {
      setCropDraft({
        ...cropDraft,
        aspectPreset: presetKey,
      });
    }
  };

  const handleAddCurrentAsPreset = () => {
    if (!cropDraft) return;
    const ratio = cropDraft.widthPercent / cropDraft.heightPercent;
    const defaultName = `${cropDraft.widthPercent.toFixed(0)}:${cropDraft.heightPercent.toFixed(0)}`;
    const name = newPresetName.trim() || defaultName;

    const newPreset: CustomPreset = {
      id: `preset_${Date.now()}`,
      name,
      ratio,
      ratioStr: `${cropDraft.widthPercent.toFixed(1)}:${cropDraft.heightPercent.toFixed(1)}`,
    };

    const next = [...customPresets, newPreset];
    saveCustomPresetsToStorage(next);
    setShowAddPresetPrompt(false);
    setNewPresetName('');
    handleSelectPreset(newPreset.ratioStr);
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = customPresets.filter((p) => p.id !== id);
    saveCustomPresetsToStorage(next);
  };

  const handleRotateCropGuide = (direction: 'cw' | 'ccw') => {
    void direction;
    if (!cropDraft) return;

    // Locate current target element dimensions
    const currentEl = project?.spreads
      .flatMap((s) => s.elements)
      .find((el) => el.id === activeCropElementId);
    const elementW = currentEl?.w_mm || 300;
    const elementH = currentEl?.h_mm || 200;

    // Current crop dimensions in mm
    const currentCropW_mm = (cropDraft.widthPercent / 100) * elementW;
    const currentCropH_mm = (cropDraft.heightPercent / 100) * elementH;

    // Swap dimensions (90° rotation of the crop frame)
    const targetCropW_mm = currentCropH_mm;
    const targetCropH_mm = currentCropW_mm;

    // Scale down proportionally if it exceeds element boundaries
    const scale = Math.min(1, Math.min(elementW / targetCropW_mm, elementH / targetCropH_mm));
    const fittedW_mm = targetCropW_mm * scale;
    const fittedH_mm = targetCropH_mm * scale;

    const newW_pct = Math.min(100, Math.max(5, (fittedW_mm / elementW) * 100));
    const newH_pct = Math.min(100, Math.max(5, (fittedH_mm / elementH) * 100));

    // Center the rotated crop guide in the photo
    const newX_pct = Math.max(0, (100 - newW_pct) / 2);
    const newY_pct = Math.max(0, (100 - newH_pct) / 2);

    // Swap aspect ratio preset if applicable
    let nextPreset = cropDraft.aspectPreset;
    if (nextPreset === '2:3') nextPreset = '3:2';
    else if (nextPreset === '3:2') nextPreset = '2:3';
    else if (nextPreset === '4:5') nextPreset = '5:4';
    else if (nextPreset === '5:4') nextPreset = '4:5';
    else if (nextPreset === '16:9') nextPreset = '9:16';
    else if (nextPreset === '9:16') nextPreset = '16:9';
    else if (nextPreset && nextPreset.includes(':')) {
      const parts = nextPreset.split(':');
      if (parts.length === 2) {
        nextPreset = `${parts[1]}:${parts[0]}`;
      }
    }

    setCropDraft({
      ...cropDraft,
      aspectPreset: nextPreset,
      xPercent: Number(newX_pct.toFixed(2)),
      yPercent: Number(newY_pct.toFixed(2)),
      widthPercent: Number(newW_pct.toFixed(2)),
      heightPercent: Number(newH_pct.toFixed(2)),
    });
  };

  const standardPresets = [
    { key: 'free', label: isEs ? 'Libre' : 'Free' },
    { key: 'original', label: isEs ? 'Original' : 'As Shot' },
    { key: '1:1', label: '1:1' },
    { key: '2:3', label: '2:3 / 3:2' },
    { key: '4:5', label: '4:5 / 5:4' },
    { key: '16:9', label: '16:9' },
  ];

  return (
    <div className="absolute left-9 top-9 z-40 flex items-start gap-3 pointer-events-auto select-none">
      {/* 1. Main Anchored Tool Rail (Sleek Studio Dock, Clears 24px Ruler cleanly) */}
      <div className="flex flex-col items-center gap-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-300/80 dark:border-neutral-800 rounded-2xl p-1.5 shadow-xl shadow-black/5 dark:shadow-2xl">
        <button
          type="button"
          onClick={handleToggleCropMode}
          title={isEs ? 'Recorte y Rotación [C]' : 'Crop & Straighten [C]'}
          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
            isCropMode
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Crop className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Expanded Flyout Panel when Crop Mode is active (Full Day / Night Theme Awareness) */}
      {isCropMode && cropDraft && (
        <div className="w-80 bg-white/95 dark:bg-neutral-900/95 text-neutral-800 dark:text-neutral-100 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-4 text-xs animate-in fade-in slide-in-from-left-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm tracking-wide text-neutral-900 dark:text-neutral-100">
                {isEs ? 'Recorte y Rotación' : 'Crop & Straighten'}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelCropMode}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
              title={isEs ? 'Cerrar [Esc]' : 'Close [Esc]'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section: Aspect Ratio Presets */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <span>{isEs ? 'Proporción' : 'Aspect Ratio'}</span>
              <button
                type="button"
                onClick={() => setShowAddPresetPrompt(!showAddPresetPrompt)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 flex items-center gap-1 normal-case text-xs transition font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>{isEs ? 'Guardar actual' : 'Save current'}</span>
              </button>
            </div>

            {/* Prompt for saving custom preset */}
            {showAddPresetPrompt && (
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/80 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <input
                  type="text"
                  placeholder={isEs ? 'Nombre (ej. 8x10)' : 'Name (e.g. 8x10)'}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCurrentAsPreset}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded text-xs font-medium transition shadow-sm"
                >
                  {isEs ? 'Guardar' : 'Save'}
                </button>
              </div>
            )}

            {/* Standard Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {standardPresets.map((p) => {
                const isActive = (cropDraft.aspectPreset || 'free') === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSelectPreset(p.key)}
                    className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Presets List */}
            {customPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-800/60">
                {customPresets.map((cp) => {
                  const isActive = cropDraft.aspectPreset === cp.ratioStr;
                  return (
                    <div
                      key={cp.id}
                      onClick={() => handleSelectPreset(cp.ratioStr)}
                      className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] cursor-pointer transition ${
                        isActive
                          ? 'bg-blue-600 text-white font-medium shadow-sm'
                          : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      <span>{cp.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomPreset(cp.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Straighten Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <span>{isEs ? 'Enderezar (Ángulo)' : 'Straighten (Angle)'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold">
                  {rotationDraft >= 0 ? `+${rotationDraft.toFixed(1)}°` : `${rotationDraft.toFixed(1)}°`}
                </span>
                {rotationDraft !== 0 && (
                  <button
                    type="button"
                    onClick={() => setRotationDraft(0)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                    title={isEs ? 'Restablecer a 0°' : 'Reset to 0°'}
                  >
                    0°
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              step={0.1}
              value={rotationDraft}
              onChange={(e) => setRotationDraft(parseFloat(e.target.value))}
              className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          {/* Section: Quick Rotation & Flip Controls */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {isEs ? 'Giro y Volteo' : 'Rotate & Flip'}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleRotateCropGuide('ccw')}
                className="flex items-center justify-center gap-1 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg transition"
                title={isEs ? 'Girar guía 90° antihorario' : 'Rotate crop guide 90° CCW'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px]">-90°</span>
              </button>

              <button
                type="button"
                onClick={() => handleRotateCropGuide('cw')}
                className="flex items-center justify-center gap-1 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg transition"
                title={isEs ? 'Girar guía 90° horario' : 'Rotate crop guide 90° CW'}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">+90°</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipHDraft(!flipHDraft)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
                  flipHDraft
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                }`}
                title={isEs ? 'Voltear horizontal' : 'Flip horizontal'}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="text-[11px]">Flip H</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipVDraft(!flipVDraft)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg transition ${
                  flipVDraft
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                }`}
                title={isEs ? 'Voltear vertical' : 'Flip vertical'}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span className="text-[11px]">Flip V</span>
              </button>
            </div>
          </div>

          {/* Section: Composition Guide Overlay */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {isEs ? 'Guía de Composición' : 'Composition Guide'}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setCropGridGuide('thirds')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  cropGridGuide === 'thirds'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {isEs ? 'Tercios' : 'Thirds'}
              </button>

              <button
                type="button"
                onClick={() => setCropGridGuide('grid')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  cropGridGuide === 'grid'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {isEs ? 'Cuadrícula' : 'Grid'}
              </button>

              <button
                type="button"
                onClick={() => setCropGridGuide('none')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  cropGridGuide === 'none'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {isEs ? 'Ninguna' : 'None'}
              </button>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 gap-2">
            <button
              type="button"
              onClick={resetCropDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg transition"
              title={isEs ? 'Restablecer valores [R]' : 'Reset values [R]'}
            >
              <ResetIcon className="w-3.5 h-3.5" />
              <span>{isEs ? 'Restablecer' : 'Reset'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelCropMode}
                className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-lg transition font-medium"
                title={isEs ? 'Cancelar recorte [Esc]' : 'Cancel crop [Esc]'}
              >
                {isEs ? 'Cancelar [Esc]' : 'Cancel [Esc]'}
              </button>

              <button
                type="button"
                onClick={applyCropMode}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md shadow-blue-500/20 transition"
                title={isEs ? 'Aplicar recorte [Enter]' : 'Apply crop [Enter]'}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEs ? 'Aplicar [Enter]' : 'Apply [Enter]'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
