'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { EditorProject } from '@/types/editor';
import {
  ProfessionalExportOptions,
  JPEG_QUALITY_SCALE_MAP,
  getQualityTier,
  sanitizeFileName,
} from '@/utils/exportEngine';

export type ExportType = 'print' | 'web' | 'pdf';
export type WebQuality = 'low' | 'medium' | 'high';

// Legacy compatibility interface
export interface ExportModalOptions {
  type: ExportType;
  rangeType: 'all' | 'custom';
  rangeStart?: number;
  rangeEnd?: number;
  webQuality?: WebQuality;
}

interface FilePickerWindow extends Window {
  showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<{ name?: string; createWritable: () => Promise<unknown> }>;
  showDirectoryPicker?: (options?: Record<string, unknown>) => Promise<{ name?: string; getFileHandle: (name: string, opts?: unknown) => Promise<unknown> }>;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: EditorProject | null;
  activeSpreadId?: string | null;
  selectedElementId?: string | null;
  selectedBrowserAssetIds?: string[];
  activeBrowserAssetId?: string | null;
  isRawSession?: boolean;
  currentSpreadIndex?: number;
  totalPages?: number;
  onExport: (options: ProfessionalExportOptions) => void;
  isExporting?: boolean;
  exportProgress?: number;
}

export default function ExportModal({
  isOpen,
  onClose,
  project,
  selectedElementId,
  selectedBrowserAssetIds = [],
  activeBrowserAssetId,
  isRawSession = false,
  currentSpreadIndex = 0,
  onExport,
  isExporting = false,
  exportProgress = 0,
}: ExportModalProps) {
  const t = useTranslations('Export');

  // Determine initial module tab
  const isStudioProject = project?.projectCategory === 'studio_print';
  const [moduleTab, setModuleTab] = useState<'album' | 'studio' | 'camera_raw'>('album');
  const [rawScope, setRawScope] = useState<'current' | 'selected' | 'all'>('current');
  const [rawSubfolderName, setRawSubfolderName] = useState('');

  useEffect(() => {
    if (isRawSession) {
      setFormat('jpg');
      setRawScope('current');
      setModuleTab('camera_raw');
    } else if (isStudioProject) {
      setModuleTab('studio');
    } else {
      setModuleTab('album');
    }
  }, [isStudioProject, isRawSession, isOpen]);

  // General export configuration states
  const [format, setFormat] = useState<'jpg' | 'pdf'>('jpg');
  const [scope, setScope] = useState<'current' | 'all' | 'custom'>('all');
  const [customRangeString, setCustomRangeString] = useState('');
  const [dpi, setDpi] = useState<number>(300);
  const [jpegQuality, setJpegQuality] = useState<number>(12); // Default level 12 (Maximum)
  const [colorSpace, setColorSpace] = useState<'srgb' | 'adobe_rgb_1998'>('srgb');
  const [fileNameBase, setFileNameBase] = useState('');
  const [sequentialDigits, setSequentialDigits] = useState<2 | 3>(3);
  const pathname = usePathname();
  const isEs = pathname?.startsWith('/es') ?? true;
  const [saveDestination, setSaveDestination] = useState<'browser_download' | 'directory_picker'>('browser_download');
  const [chosenTargetName, setChosenTargetName] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preSelectedFileHandle, setPreSelectedFileHandle] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [preSelectedDirHandle, setPreSelectedDirHandle] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Browser support detection for File System Access API
  const [supportsDirectoryPicker, setSupportsDirectoryPicker] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      setSupportsDirectoryPicker(true);
      setSaveDestination('directory_picker');
    }
  }, []);

  // Initialize and synchronize file name when project changes
  useEffect(() => {
    if (project) {
      const initialName = sanitizeFileName(project.title || 'RVP_Project');
      setFileNameBase(initialName);
      if (project.targetDpi) {
        setDpi(project.targetDpi);
      }
    }
  }, [project, isOpen]);

  // Total spreads count
  const totalSpreads = project?.spreads.length || 1;
  const activeSpreadNum = currentSpreadIndex + 1;

  // Real-time calculation of physical dimensions in pixels & megapixels
  const calculatedDimensions = useMemo(() => {
    const w_mm = project?.size?.w_mm || 508;
    const h_mm = project?.size?.h_mm || 254;
    const w_in = w_mm / 25.4;
    const h_in = h_mm / 25.4;
    const pxW = Math.round(w_in * dpi);
    const pxH = Math.round(h_in * dpi);
    const megapixels = ((pxW * pxH) / 1_000_000).toFixed(1);
    return {
      w_in: Math.round(w_in * 10) / 10,
      h_in: Math.round(h_in * 10) / 10,
      pxW,
      pxH,
      megapixels,
    };
  }, [project?.size, dpi]);

  // Check if active spread has a photo selected for Camera Raw
  const selectedPhotoElement = useMemo(() => {
    if (!project || !selectedElementId) return null;
    for (const spread of project.spreads) {
      const el = spread.elements.find(e => e.id === selectedElementId && (e.type === 'image' || e.type === 'decoration'));
      if (el) return el;
    }
    return null;
  }, [project, selectedElementId]);

  // Live File Name Preview
  const previewFileName = useMemo(() => {
    const safeBase = sanitizeFileName(fileNameBase || 'Export');
    const ext = format === 'pdf' ? 'pdf' : 'jpg';

    if (moduleTab === 'studio') {
      return `${safeBase}_${Math.round(calculatedDimensions.w_in)}x${Math.round(calculatedDimensions.h_in)}.${ext}`;
    }

    if (moduleTab === 'camera_raw') {
      return rawScope === 'current' ? `${safeBase}.jpg` : (isEs ? 'Nombres originales (.jpg)' : 'Original filenames (.jpg)');
    }

    // Album mode
    if (format === 'pdf') {
      return `${safeBase}.pdf`;
    }

    if (scope === 'current') {
      const idxStr = String(activeSpreadNum).padStart(sequentialDigits, '0');
      return `${safeBase}_Spread_${idxStr}.jpg`;
    }

    if (scope === 'custom') {
      return `${safeBase}_Spread_${String(1).padStart(sequentialDigits, '0')}.jpg ... (ZIP / Carpeta)`;
    }

    return `${safeBase}_Spread_001.jpg ... (ZIP / Carpeta)`;
  }, [fileNameBase, format, moduleTab, calculatedDimensions, scope, activeSpreadNum, sequentialDigits, rawScope, isEs]);

  const rawAssetIds = moduleTab !== 'camera_raw' ? [] : rawScope === 'all'
    ? (project?.assets || []).map(a => a.id)
    : rawScope === 'selected'
      ? selectedBrowserAssetIds
      : [project?.spreads.flatMap(s => s.elements).find(e => e.id === selectedElementId)?.assetId || activeBrowserAssetId || ''].filter(Boolean);
  const isRawContext = moduleTab === 'camera_raw';
  const isRawBatch = isRawContext && rawScope !== 'current';
  const rawTargetAsset = project?.assets?.find(a => a.id === rawAssetIds[0]);
  const rawPixelWidth = rawTargetAsset?.metadata?.widthPx || rawTargetAsset?.width || 0;
  const rawPixelHeight = rawTargetAsset?.metadata?.heightPx || rawTargetAsset?.height || 0;
  const isSingleFileExport = !isRawBatch && (moduleTab === 'studio' || isRawContext || format === 'pdf' || scope === 'current');

  const handleChooseTargetDirectly = async () => {
    setErrorMsg('');
    if (typeof window === 'undefined') return;
    const win = window as unknown as FilePickerWindow;
    try {
      if (isSingleFileExport && win.showSaveFilePicker) {
        const handle = await win.showSaveFilePicker({
          suggestedName: previewFileName,
          types: [{
            description: format === 'pdf' ? 'PDF Document' : 'JPEG Image',
            accept: format === 'pdf' ? { 'application/pdf': ['.pdf'] } : { 'image/jpeg': ['.jpg', '.jpeg'] }
          }]
        });
        setPreSelectedFileHandle(handle);
        setPreSelectedDirHandle(null);
        setChosenTargetName(handle.name || previewFileName);
      } else if (win.showDirectoryPicker) {
        const dirHandle = await win.showDirectoryPicker({ id: 'rvp-export', mode: 'readwrite' });
        setPreSelectedDirHandle(dirHandle);
        setPreSelectedFileHandle(null);
        setChosenTargetName(dirHandle.name || (isEs ? 'Carpeta seleccionada' : 'Chosen folder'));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn("Picker cancelled or failed:", err);
    }
  };

  const handleExportSubmit = async () => {
    setErrorMsg('');

    if (moduleTab === 'camera_raw' && !rawAssetIds.length) {
      setErrorMsg(isEs ? 'Selecciona al menos una fotografía.' : 'Select at least one photograph.');
      return;
    }
    if (moduleTab === 'camera_raw' && format === 'pdf') {
      setErrorMsg(isEs ? 'Camera Raw exporta fotografías en JPEG.' : 'Camera Raw exports JPEG photographs.');
      return;
    }
    const safeBase = sanitizeFileName(fileNameBase || project?.title || 'Export');
    if (!safeBase.trim()) {
      setErrorMsg(t('empty_filename_error'));
      return;
    }

    let rangeStart: number | undefined = undefined;
    let rangeEnd: number | undefined = undefined;

    if (moduleTab === 'album' && scope === 'custom') {
      const parts = customRangeString.split('-').map(s => parseInt(s.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        rangeStart = parts[0] - 1; // 0-indexed for engine
        rangeEnd = parts[1] - 1;
        if (rangeStart < 0 || rangeEnd >= totalSpreads || rangeStart > rangeEnd) {
          setErrorMsg(t('invalid_range_error', { max: totalSpreads }));
          return;
        }
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        rangeStart = parts[0] - 1;
        rangeEnd = parts[0] - 1;
        if (rangeStart < 0 || rangeStart >= totalSpreads) {
          setErrorMsg(t('invalid_range_error', { max: totalSpreads }));
          return;
        }
      } else {
        setErrorMsg(t('invalid_format_error'));
        return;
      }
    }

    let targetFileHandle = preSelectedFileHandle;
    let targetDirHandle = preSelectedDirHandle;

    // DIRECT USER GESTURE ACTIVATION:
    // If user selected directory_picker and hasn't chosen a handle yet, trigger the native OS dialog IMMEDIATELY
    // on this click event so browser user gesture is 100% active and fresh!
    if (saveDestination === 'directory_picker' && typeof window !== 'undefined') {
      const win = window as unknown as FilePickerWindow;
      if (isSingleFileExport && !targetFileHandle && win.showSaveFilePicker) {
        try {
          targetFileHandle = await win.showSaveFilePicker({
            suggestedName: previewFileName,
            types: [{
              description: format === 'pdf' ? 'PDF Document' : 'JPEG Image',
              accept: format === 'pdf' ? { 'application/pdf': ['.pdf'] } : { 'image/jpeg': ['.jpg', '.jpeg'] }
            }]
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') return; // User closed modal dialog
          console.warn("showSaveFilePicker failed:", err);
        }
      } else if (!isSingleFileExport && !targetDirHandle && win.showDirectoryPicker) {
        try {
          targetDirHandle = await win.showDirectoryPicker({ id: 'rvp-export', mode: 'readwrite' });
        } catch (err) {
          if ((err as Error).name === 'AbortError') return; // User closed modal dialog
          console.warn("showDirectoryPicker failed:", err);
        }
      }
    }

    if (moduleTab === 'camera_raw' && saveDestination === 'directory_picker' && !targetDirHandle) {
      setErrorMsg(isEs ? 'Selecciona una carpeta de destino.' : 'Choose a destination folder.');
      return;
    }
    const options: ProfessionalExportOptions = {
      moduleContext: moduleTab,
      format,
      rawAssetIds: isRawBatch ? rawAssetIds : undefined,
      rawSubfolderName: moduleTab === 'camera_raw' ? rawSubfolderName : undefined,
      rangeMode: moduleTab === 'studio' ? 'current' : moduleTab === 'camera_raw' ? rawScope : scope,
      rangeStart,
      rangeEnd,
      activeSpreadIndex: currentSpreadIndex,
      selectedElementId: selectedElementId || undefined,
      dpi,
      jpegQualityLevel: jpegQuality,
      colorSpace,
      fileNameBase: safeBase,
      sequentialDigits,
      saveDestination,
      targetFileHandle,
      targetDirHandle
    };

    onExport(options);
  };

  if (!isOpen) return null;

  const currentTier = getQualityTier(jpegQuality);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950/50">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="text-xl">⚡</span>
              {t('dialog_title')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              RVP Professional Imaging Systems · Precision Engine V2
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* MODULE CONTEXT TABS */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 px-6 gap-2 pt-2">
          {!isStudioProject && !isRawSession && (
            <button
              type="button"
              onClick={() => setModuleTab('album')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                moduleTab === 'album'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              <span>📖</span>
              <span>{t('tab_album')}</span>
            </button>
          )}

          {!isRawSession && <button
            type="button"
            onClick={() => setModuleTab('studio')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              moduleTab === 'studio'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <span>🖼️</span>
            <span>{t('tab_studio')}</span>
          </button>}

          <button
            type="button"
            onClick={() => setModuleTab('camera_raw')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              moduleTab === 'camera_raw'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <span>📷</span>
            <span>{t('tab_camera_raw')}</span>
          </button>
        </div>

        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* SECTION 1: FORMAT SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              {t('format_label')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setFormat('jpg'); setDpi(300); }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                  format === 'jpg' && dpi >= 300
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-lg mb-1">🖨️</div>
                <div>
                  <div className="text-xs font-bold">{t('format_jpg_print')}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">300 DPI · Máxima Calidad</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setFormat('jpg'); setDpi(72); }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                  format === 'jpg' && dpi === 72
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-lg mb-1">🌐</div>
                <div>
                  <div className="text-xs font-bold">{t('format_jpg_web')}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">72 DPI · Web & Redes</div>
                </div>
              </button>

              <button
                type="button"
                disabled={moduleTab === 'camera_raw'}
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-lg mb-1">📄</div>
                <div>
                  <div className="text-xs font-bold">{t('format_pdf_proof')}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">PDF Documento</div>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 2: SCOPE / RANGE BY MODULE */}
          {moduleTab === 'album' && (
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                {t('scope_label')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScope('current')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition text-center ${
                    scope === 'current'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('scope_current_spread', { page: activeSpreadNum })}
                </button>

                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition text-center ${
                    scope === 'all'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('scope_all_spreads', { count: totalSpreads })}
                </button>

                <button
                  type="button"
                  onClick={() => setScope('custom')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition text-center ${
                    scope === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {t('scope_custom_range')}
                </button>
              </div>

              {scope === 'custom' && (
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs text-neutral-500 whitespace-nowrap">Rango de pliegos:</span>
                  <input
                    type="text"
                    value={customRangeString}
                    onChange={(e) => setCustomRangeString(e.target.value)}
                    placeholder={t('scope_range_placeholder')}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-neutral-400">Total: {totalSpreads}</span>
                </div>
              )}
            </div>
          )}

          {moduleTab === 'studio' && (
            <div className="p-4 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🖼️</span> {t('scope_current_studio')}
                </span>
                <span className="text-xs font-mono font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 rounded">
                  {Math.round(calculatedDimensions.w_in)}×{Math.round(calculatedDimensions.h_in)} in
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Se exportará la composición individual activa respetando todas las capas de texto, formas, marcas de agua y ajustes visuales a resolución física nativa.
              </p>
            </div>
          )}

          {moduleTab === 'camera_raw' && (
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {(['current', 'selected', 'all'] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => { setRawScope(mode); setPreSelectedFileHandle(null); setPreSelectedDirHandle(null); setChosenTargetName(''); }}
                    className={`p-2 rounded-lg text-xs border ${rawScope === mode ? 'bg-blue-600 text-white border-blue-600' : 'border-neutral-300 dark:border-neutral-700'}`}>
                    {mode === 'current' ? (isEs ? 'Actual (1)' : 'Current (1)') : mode === 'selected'
                      ? (isEs ? `Seleccionadas (${selectedBrowserAssetIds.length})` : `Selected (${selectedBrowserAssetIds.length})`)
                      : (isEs ? `Todas (${project?.assets?.length || 0})` : `All (${project?.assets?.length || 0})`)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500">{isEs ? 'Se conservará el nombre original de cada fotografía. Las exportaciones múltiples se guardarán en una carpeta o ZIP.' : 'Each photo keeps its original filename. Multiple photos export to a folder or ZIP.'}</p>
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                {t('scope_label')}
              </span>
              {selectedPhotoElement ? (
                <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <span className="text-xl">📸</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                      {selectedPhotoElement.layerName || `Foto (${selectedPhotoElement.id.slice(0, 8)})`}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Ajustes de revelado aplicados: Exposición, Balance de Blancos, Tonalidad
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  ⚠️ {t('scope_camera_raw_none')}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: RESOLUTION & DPI */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                {t('resolution_label')}
              </label>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {isRawContext ? (rawScope === 'current' && rawPixelWidth && rawPixelHeight ? `${rawPixelWidth} × ${rawPixelHeight} px` : (isEs ? 'Dimensiones originales por fotografía' : 'Original dimensions per photo')) : `${calculatedDimensions.pxW} × ${calculatedDimensions.pxH} px (${calculatedDimensions.megapixels} MP)`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { dpiVal: 300, label: '300 DPI', sub: 'Impresión' },
                { dpiVal: 150, label: '150 DPI', sub: 'Prueba' },
                { dpiVal: 72, label: '72 DPI', sub: 'Web' },
              ].map(opt => (
                <button
                  key={opt.dpiVal}
                  type="button"
                  onClick={() => setDpi(opt.dpiVal)}
                  className={`py-2 px-3 rounded-lg border text-left transition ${
                    dpi === opt.dpiVal
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-75">{opt.sub}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic mt-1">
              {t('res_dpi_notice')}
            </p>
          </div>

          {/* SECTION 4: JPEG QUALITY SCALE (1-12) */}
          {format === 'jpg' && (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  {t('quality_label')}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    currentTier === 'maximum' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    currentTier === 'high' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                    currentTier === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                    'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}>
                    {t(`quality_tier_${currentTier}`)}
                  </span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono w-6 text-right">
                    {jpegQuality}
                  </span>
                </div>
              </div>

              {/* Slider and quick tier buttons */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono px-1">
                  <span>1 (20%)</span>
                  <span>4 (50%)</span>
                  <span>7 (75%)</span>
                  <span>10 (92%)</span>
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">12 (100%)</span>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
                {jpegQuality === 12 && (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {t('quality_desc_12')}
                  </p>
                )}
                <p className="opacity-80">
                  {t('quality_desc_photoshop_note')} (Encoder factor: {JPEG_QUALITY_SCALE_MAP[jpegQuality]})
                </p>
              </div>
            </div>
          )}

          {/* SECTION 5: FILE NAMING & DESTINATION */}
          <div className="space-y-4">
            {isRawBatch ? (
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">{isEs ? 'Subcarpeta opcional' : 'Optional subfolder'}</label>
                <input type="text" value={rawSubfolderName} onChange={e => setRawSubfolderName(e.target.value)} placeholder={isEs ? 'Dejar vacío para usar la carpeta elegida' : 'Leave empty to use chosen folder'} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs" />
                <p className="text-xs text-neutral-500">{isEs ? 'Los nombres originales se conservarán automáticamente.' : 'Original filenames are preserved automatically.'}</p>
              </div>
            ) : <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                {t('naming_label')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fileNameBase}
                  onChange={(e) => setFileNameBase(e.target.value)}
                  placeholder={t('filename_placeholder')}
                  className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {moduleTab === 'album' && (
                  <select
                    value={sequentialDigits}
                    onChange={(e) => setSequentialDigits(parseInt(e.target.value, 10) as 2 | 3)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value={3}>3 dig (_001)</option>
                    <option value={2}>2 dig (_01)</option>
                  </select>
                )}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 font-mono">
                <span className="opacity-70">{t('preview_filename')}</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                  {previewFileName}
                </span>
              </div>
            </div>}

            {/* Destination Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider block">
                {t('destination_label')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSaveDestination('browser_download')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    saveDestination === 'browser_download'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="text-xs font-bold">{t('dest_browser_download')}</div>
                  <div className="text-[10px] opacity-75 mt-1">{t('dest_browser_download_desc')}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSaveDestination('directory_picker')}
                  disabled={!supportsDirectoryPicker}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    saveDestination === 'directory_picker'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : !supportsDirectoryPicker
                      ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="text-xs font-bold">{t('dest_directory_picker')}</div>
                  <div className="text-[10px] opacity-75 mt-1">
                    {supportsDirectoryPicker ? t('dest_directory_picker_desc') : t('dest_directory_picker_unsupported')}
                  </div>
                </button>
              </div>

              {/* Interactive Folder / File Selector Bar */}
              {saveDestination === 'directory_picker' && supportsDirectoryPicker && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-3 mt-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <span>📁</span>
                      <span>
                        {chosenTargetName 
                          ? (isEs ? `Destino listo: ${chosenTargetName}` : `Target ready: ${chosenTargetName}`)
                          : (isEs ? 'Explorar carpetas o dispositivos' : 'Browse folders or storage devices')}
                      </span>
                    </div>
                    <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                      {chosenTargetName 
                        ? (isEs ? 'El archivo se escribirá directamente en esta ubicación.' : 'Files will be saved directly into this location.')
                        : (isEs ? 'Puedes pulsar "Examinar..." ahora para elegir o crear carpetas en tus discos, o se te solicitará al pulsar Exportar.' : 'Click "Browse..." to choose or create folders on your drive, or browse when clicking Export.')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleChooseTargetDirectly}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
                  >
                    {chosenTargetName ? (isEs ? 'Cambiar...' : 'Change...') : (isEs ? 'Examinar...' : 'Browse...')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: GESTIÓN DE COLOR / COLOR MANAGEMENT V3 */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎨</span>
                <span>{t('color_management_title')}</span>
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                ICC v2.1 + EXIF 2.32 + JFIF 1.01
              </span>
            </div>

            {/* Color Space Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* 1. sRGB IEC61966-2.1 */}
              <button
                type="button"
                onClick={() => setColorSpace('srgb')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  colorSpace === 'srgb'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold">{t('color_option_srgb_title')}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                  <div className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 mb-1.5">
                    {t('color_option_srgb_badge')}
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-85">
                    {t('color_option_srgb_desc')}
                  </p>
                </div>
              </button>

              {/* 2. Adobe RGB (1998) */}
              <button
                type="button"
                onClick={() => setColorSpace('adobe_rgb_1998')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  colorSpace === 'adobe_rgb_1998'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold">{t('color_option_adobe_title')}</span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  </div>
                  <div className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 mb-1.5">
                    {t('color_option_adobe_badge')}
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-85">
                    {t('color_option_adobe_desc')}
                  </p>
                </div>
              </button>

              {/* 3. CMYK (Disabled pending external LittleCMS2 + Press ICC Profile) */}
              <div
                aria-disabled="true"
                className="p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-500 flex flex-col justify-between cursor-not-allowed select-none opacity-75"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold">{t('color_option_cmyk_title')}</span>
                    <span className="text-[10px]">🔒</span>
                  </div>
                  <div className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mb-1.5">
                    {t('color_option_cmyk_badge')}
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    {t('color_option_cmyk_desc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Print & Color Metadata Specification Summary */}
            <div className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800/70 pb-1">
                <span className="text-neutral-500 dark:text-neutral-400">{t('cm_spec_output_profile')}:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {colorSpace === 'srgb' ? 'sRGB IEC61966-2.1' : 'Adobe RGB (1998)'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800/70 pb-1">
                <span className="text-neutral-500 dark:text-neutral-400">{t('cm_spec_resolution')}:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {dpi} × {dpi} PPI
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800/70 pb-1">
                <span className="text-neutral-500 dark:text-neutral-400">{t('cm_spec_physical_dims')}:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {calculatedDimensions.w_in} × {calculatedDimensions.h_in} in ({Math.round(((project?.size?.w_mm || 508) / 10) * 10) / 10} × {Math.round(((project?.size?.h_mm || 254) / 10) * 10) / 10} cm)
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800/70 pb-1">
                <span className="text-neutral-500 dark:text-neutral-400">{t('cm_spec_pixel_dims')}:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {isRawContext ? (isEs ? 'Resolución original de cada fotografía' : 'Each photograph’s original resolution') : `${calculatedDimensions.pxW} × ${calculatedDimensions.pxH} px (${calculatedDimensions.megapixels} MP)`}
                </span>
              </div>

              <div className="flex justify-between items-center sm:col-span-2 border-b border-neutral-100 dark:border-neutral-800/70 pb-1">
                <span className="text-neutral-500 dark:text-neutral-400">{t('cm_spec_format_headers')}:</span>
                <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                  {format === 'pdf'
                    ? `PDF Multipágina + JPEG (${colorSpace === 'srgb' ? 'sRGB' : 'Adobe RGB 1998'})`
                    : `JPEG 8-bit RGB · JFIF (${dpi} DPI) · EXIF 2.32 · ICC_PROFILE`}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center sm:col-span-2 pt-0.5 gap-1">
                <span className="text-neutral-500 dark:text-neutral-400 shrink-0">{t('cm_spec_print_compat')}:</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400 text-right">
                  {colorSpace === 'srgb' ? t('cm_compat_srgb') : t('cm_compat_adobe')}
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* PROGRESS BAR */}
          {isExporting && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                <span>{t('btn_exporting', { progress: exportProgress })}</span>
                <span className="font-mono">{exportProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 flex justify-end gap-3 items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition disabled:opacity-40"
          >
            {t('btn_cancel')}
          </button>

          <button
            type="button"
            onClick={handleExportSubmit}
            disabled={isExporting}
            className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t('btn_exporting', { progress: exportProgress })}</span>
              </>
            ) : (
              <span>{t('btn_export')}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
