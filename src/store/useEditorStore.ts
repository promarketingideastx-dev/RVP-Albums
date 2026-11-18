import { create } from 'zustand';
import { temporal } from 'zundo';
import { EditorProject, EditorElement, ProjectAsset, GlobalImageStyles, SpreadBackgroundConfig, CropData, AttributeCopyMode, CopiedPhotoAttributes } from '@/types/editor';
import { storage } from '@/storage';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';
import { generateFundyMasonryLayout } from '@/core/layout/fundyMasonryEngine';
import { normalizeAssetSequence, groupAssetsForSpread } from '@/utils/metadataEngine';
import { projectStorage } from '@/utils/projectStorage';

interface EditorState {
  project: EditorProject | null;
  activeSpreadId: string | null;
  selectedElementId: string | null;
  draggingStagedElementId: string | null;
  stagingDropPreviewIndex: number | null; // Phase 8.E: Transient drop zone visual index
  selectedStagedElementIds: string[]; // Phase 8.F: Native decoupled batch tracking


  measurementUnit: 'in' | 'cm';
  toggleMeasurementUnit: () => void;

  previewOriginalPhotoId: string | null;
  setPreviewOriginalPhotoId: (elementId: string | null) => void;

  showPivotGuides: boolean;
  toggleShowPivotGuides: () => void;
  setShowPivotGuides: (show: boolean) => void;

  beforeAfterMode: 'off' | 'split' | 'sideBySide';
  beforeAfterSplitPosition: number; // 0.0 to 1.0 (default 0.5)
  isBeforeAfterModalOpen: boolean;
  setBeforeAfterMode: (mode: 'off' | 'split' | 'sideBySide') => void;
  setBeforeAfterSplitPosition: (pos: number) => void;
  setIsBeforeAfterModalOpen: (open: boolean) => void;

  workspaceZoom: number | null; // null = dynamic auto-fit. number = user override scale.
  setWorkspaceZoom: (zoom: number | null) => void;

  workspacePan: { x: number; y: number };
  setWorkspacePan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;

  editorViewMode: 'GRID' | 'SINGLE';
  setEditorViewMode: (mode: 'GRID' | 'SINGLE') => void;

  // Phase DAM: Camera Raw Pro V4 Multi-Environment Workspace Navigation
  workspaceView: 'canvas' | 'browser' | 'camera_raw';
  setWorkspaceView: (view: 'canvas' | 'browser' | 'camera_raw') => void;

  activeBrowserAssetId: string | null;
  setActiveBrowserAssetId: (id: string | null) => void;
  selectedBrowserAssetIds: string[];
  setSelectedBrowserAssetIds: (ids: string[]) => void;
  canvasBatchAssetIds: string[];
  setCanvasBatchAssetIds: (ids: string[]) => void;
  toggleBrowserAssetSelection: (id: string) => void;
  selectAllBrowserAssets: (ids?: string[]) => void;
  clearBrowserAssetSelection: () => void;

  // Crop & Straighten Tool State
  isCropMode: boolean;
  activeCropElementId: string | null;
  cropDraft: CropData | null;
  rotationDraft: number;
  flipHDraft: boolean;
  flipVDraft: boolean;
  cropGridGuide: 'thirds' | 'grid' | 'none';

  startCropMode: (elementId?: string) => void;
  setCropDraft: (crop: CropData) => void;
  setRotationDraft: (deg: number) => void;
  setFlipHDraft: (flip: boolean) => void;
  setFlipVDraft: (flip: boolean) => void;
  setCropGridGuide: (guide: 'thirds' | 'grid' | 'none') => void;
  resetCropDraft: () => void;
  applyCropMode: () => void;
  cancelCropMode: () => void;

  // Surgical Non-Destructive Attribute Copy/Paste Clipboard
  copiedPhotoAttributes: CopiedPhotoAttributes | null;
  copyPhotoAttributes: (source: { assetId?: string; elementId?: string }, mode: AttributeCopyMode) => void;
  pastePhotoAttributes: (target: { assetIds?: string[]; elementId?: string }, modeOverride?: AttributeCopyMode) => void;

  updateAssetDevelopSettings: (assetId: string, settings: Partial<import('@/types/editor').PhotoAdjustments>, filter?: string, filterIntensity?: number) => void;
  batchSetAssetRating: (assetIds: string[], rating: number) => void;
  batchSetAssetFolder: (assetIds: string[], folderPath?: string) => void;
  batchAddAssetToCollection: (assetIds: string[], collectionName: string) => void;
  batchRemoveAssetFromCollection: (assetIds: string[], collectionName: string) => void;
  addProjectAssetFolder: (folderName: string) => void;
  addProjectAssetCollection: (collectionName: string) => void;
  batchDeleteAssets: (assetIds: string[]) => void;
  loadAssetToCanvas: (asset: ProjectAsset) => void;
  clearCanvasSession: () => void;

  loadProject: (project: EditorProject) => void;
  unloadProject: () => void;
  setActiveSpread: (spreadId: string) => void;
  markSpreadCompleted: (spreadId: string) => void;
  goToNextSpread: () => void;
  goToPrevSpread: () => void;
  setDraggingStagedElementId: (elementId: string | null) => void;
  setStagingDropPreviewIndex: (index: number | null) => void; // Phase 8.E: Explicit transient vector
  setSelectedElement: (elementId: string | null) => void;
  toggleStagedElementSelection: (elementId: string) => void;
  clearStagedSelection: () => void;
  setStagedSelection: (elementIds: string[]) => void;
  swapStagedElements: () => void; // Phase 16: Free mode active element exchange

  updateElement: (spreadId: string, elementId: string, changes: Partial<EditorElement>) => void;
  resetElementAdjustments: (spreadId: string, elementId: string) => void;
  addElement: (spreadId: string, element: EditorElement) => void;
  removeElement: (spreadId: string, elementId: string) => void;
  duplicateElement: (spreadId: string, elementId: string) => void;
  createGroup: (spreadId: string) => void;
  updateSpread: (spreadId: string, changes: Partial<import('@/types/editor').Spread>) => void;
  setProjectSize: (size: import('@/types/editor').Size) => void;

  addAsset: (asset: ProjectAsset) => void;
  addAssets: (assets: ProjectAsset[]) => void;
  ingestStagedPhotos: (assets: ProjectAsset[]) => void; // Phase 8.A: Staged Flow Drop
  ingestAndDropToSpread: (spreadId: string, assets: ProjectAsset[]) => void; // Phase 12: Direct Spread Drop
  executeAutoBookBuilder: (assets: ProjectAsset[], config: { targetPhotosPerSpread: number }) => void; // Phase 13: Auto-Book Builder V1
  rebalanceAutoBookLayout: (options: { targetPhotosPerSpread: number, mode: 'COMPACT' | 'BALANCED' | 'AIRY' }) => void; // Phase 14: Auto-Book Rebalancer
  reorderStagedPhotos: (spreadId: string, sourceElementId: string, targetElementId: string) => void; // Phase 8.B: Native Grid Hook
  swapFundyMasonryElements: (spreadId: string, sourceId: string, targetId: string) => void; // Phase 10: Live Swap Math
  recalculateFundyMasonryLayout: (spreadId: string) => void; // Phase 11: Master Recalculation Native Hook
  setFundyStrategy: (spreadId: string, strategy: 'PRIORITIZE_HEIGHT' | 'PRIORITIZE_WIDTH' | 'FORCE_TWO_COLUMNS' | 'CHAOTIC_BALANCED') => void;
  setFundyGapMm: (spreadId: string, gapMm: number) => void;
  toggleFundyFlipHorizontal: (spreadId: string) => void;
  moveStagedPhotoAcrossSpreads: (sourceSpreadId: string, targetSpreadId: string, elementId: string) => void; // Phase 8.C: Cross Spread Hook
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<ProjectAsset>) => void;
  setAssetPriority: (assetId: string, priority: number) => void;

  bringForward: (spreadId: string, elementId: string) => void;
  sendBackward: (spreadId: string, elementId: string) => void;
  reorderElementsList: (spreadId: string, oldIndex: number, newIndex: number) => void;
  bringToFront: (spreadId: string, elementId: string) => void;
  sendToBack: (spreadId: string, elementId: string) => void;
  applyTypographyPreset: (presetId: string) => void;

  updateGlobalImageStyles: (styles: Partial<GlobalImageStyles>) => void;
  updateSpreadBackground: (spreadId: string, config: Partial<SpreadBackgroundConfig>) => void;
  updateProjectGlobalBackground: (config: Partial<SpreadBackgroundConfig>) => void;
  resetGlobalImageStyles: () => void;
  resetSpreadBackground: (spreadId: string) => void;
  resetAllGlobalStyles: () => void;

  addGuide: (guide: import('@/types/editor').SpreadGuide) => void;
  updateGuide: (guideId: string, changes: Partial<import('@/types/editor').SpreadGuide>) => void;
  removeGuide: (guideId: string) => void;
  clearGuides: () => void;
  setSequenceMode: (mode: 'ORIGINAL_ORDER' | 'CHRONOLOGICAL' | 'MANUAL_PRIORITY') => void;
  flushSave: () => Promise<void>;
}

// Global Auto-Save Interceptor Debounce Handle
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

let rawPhotoSelectionRequest = 0;

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
  project: null,
  activeSpreadId: null,
  draggingStagedElementId: null,
  stagingDropPreviewIndex: null,
  selectedElementId: null,
  selectedStagedElementIds: [],
  measurementUnit: 'in',
  previewOriginalPhotoId: null,
  showPivotGuides: false,
  beforeAfterMode: 'off',
  beforeAfterSplitPosition: 0.5,
  isBeforeAfterModalOpen: false,
  workspaceZoom: null,
  workspacePan: { x: 0, y: 0 },
  editorViewMode: 'GRID',
  workspaceView: 'canvas',
  activeBrowserAssetId: null,
  selectedBrowserAssetIds: [],
  canvasBatchAssetIds: [],

  toggleMeasurementUnit: () => set((state) => ({ measurementUnit: state.measurementUnit === 'in' ? 'cm' : 'in' })),
  setPreviewOriginalPhotoId: (id) => set({ previewOriginalPhotoId: id }),
  toggleShowPivotGuides: () => set((state) => ({ showPivotGuides: !state.showPivotGuides })),
  setShowPivotGuides: (show) => set({ showPivotGuides: show }),
  setBeforeAfterMode: (mode) => set({ beforeAfterMode: mode }),
  setBeforeAfterSplitPosition: (pos) => set({ beforeAfterSplitPosition: Math.max(0.01, Math.min(0.99, pos)) }),
  setIsBeforeAfterModalOpen: (open) => set({ isBeforeAfterModalOpen: open }),
  setWorkspaceZoom: (zoom) => set({ workspaceZoom: zoom }),
  setWorkspacePan: (pan) => set((state) => ({ workspacePan: typeof pan === 'function' ? pan(state.workspacePan) : pan })),
  setEditorViewMode: (mode) => set((state) => {
    if (state.project?.projectCategory === 'studio_print') {
      return { editorViewMode: 'SINGLE' };
    }
    return { editorViewMode: mode };
  }),

  setWorkspaceView: (view) => set({ workspaceView: view }),
  setActiveBrowserAssetId: (id) => set({ activeBrowserAssetId: id }),
  setSelectedBrowserAssetIds: (ids) => set({ selectedBrowserAssetIds: ids }),
  setCanvasBatchAssetIds: (ids) => set({ canvasBatchAssetIds: ids }),
  toggleBrowserAssetSelection: (id) => set((state) => {
    const current = state.selectedBrowserAssetIds;
    if (current.includes(id)) {
      return { selectedBrowserAssetIds: current.filter((x) => x !== id) };
    } else {
      return { selectedBrowserAssetIds: [...current, id], activeBrowserAssetId: id };
    }
  }),
  selectAllBrowserAssets: (ids) => set((state) => ({
    selectedBrowserAssetIds: ids || (state.project?.assets ? state.project.assets.map((a) => a.id) : []),
  })),
  clearBrowserAssetSelection: () => set({ selectedBrowserAssetIds: [] }),

  isCropMode: false,
  activeCropElementId: null,
  cropDraft: null,
  rotationDraft: 0,
  flipHDraft: false,
  flipVDraft: false,
  cropGridGuide: 'thirds',

  startCropMode: (elementId) => set((state) => {
    if (!state.project) return state;
    const activeSpread = state.project.spreads.find((s) => s.id === state.activeSpreadId) || state.project.spreads[0];
    if (!activeSpread) return state;

    let targetEl = elementId ? activeSpread.elements.find((e) => e.id === elementId) : null;
    if (!targetEl && state.selectedElementId) {
      targetEl = activeSpread.elements.find((e) => e.id === state.selectedElementId);
    }
    if (!targetEl) {
      targetEl = activeSpread.elements.find((e) => e.type === 'image');
    }
    if (!targetEl || targetEl.type !== 'image') return state;

    const isRawSession = state.project.type === 'type_raw_session' || (state.project as { workflowMode?: string })?.workflowMode === 'raw';

    const asset = state.project.assets?.find((a) => a.id === targetEl?.assetId);
    const naturalAspect = targetEl.naturalAspect || asset?.aspectRatio || (asset?.width && asset?.height ? asset.width / asset.height : 1.5);

    let projectSize = state.project.size;
    let spreads = state.project.spreads;

    if (isRawSession) {
      // In Camera Raw Pro, restore canvas & element to full natural photo dimensions so the user crops on undistorted photo
      const baseDim = 300;
      let fullW = baseDim;
      let fullH = baseDim;
      if (naturalAspect >= 1) {
        fullW = baseDim;
        fullH = Math.round((baseDim / naturalAspect) * 10) / 10;
      } else {
        fullH = baseDim;
        fullW = Math.round((baseDim * naturalAspect) * 10) / 10;
      }
      projectSize = { w_mm: fullW, h_mm: fullH };

      spreads = state.project.spreads.map((s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id === targetEl?.id) {
            return {
              ...el,
              naturalAspect,
              w_mm: fullW,
              h_mm: fullH,
              x_mm: 0,
              y_mm: 0,
            };
          }
          return el;
        }),
      }));
    }

    const initialCrop: CropData = targetEl.cropData
      ? { ...targetEl.cropData }
      : { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, aspectPreset: 'original' };

    return {
      project: {
        ...state.project,
        size: projectSize,
        spreads,
      },
      isCropMode: true,
      activeCropElementId: targetEl.id,
      selectedElementId: targetEl.id,
      cropDraft: initialCrop,
      rotationDraft: targetEl.rotation_deg || 0,
      flipHDraft: !!targetEl.flipHorizontal,
      flipVDraft: !!targetEl.flipVertical,
    };
  }),

  setCropDraft: (crop) => set({ cropDraft: crop }),
  setRotationDraft: (deg) => set({ rotationDraft: deg }),
  setFlipHDraft: (flip) => set({ flipHDraft: flip }),
  setFlipVDraft: (flip) => set({ flipVDraft: flip }),
  setCropGridGuide: (guide) => set({ cropGridGuide: guide }),

  resetCropDraft: () => set({
    cropDraft: { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, aspectPreset: 'original' },
    rotationDraft: 0,
    flipHDraft: false,
    flipVDraft: false,
  }),

  applyCropMode: () => {
    const state = get();
    if (!state.project || !state.activeCropElementId || !state.cropDraft) {
      set({ isCropMode: false, activeCropElementId: null, cropDraft: null });
      return;
    }

    const elementId = state.activeCropElementId;
    const cropData = { ...state.cropDraft };
    const rotation_deg = state.rotationDraft;
    const flipHorizontal = state.flipHDraft;
    const flipVertical = state.flipVDraft;

    const isRawSession = state.project.type === 'type_raw_session' || (state.project as { workflowMode?: string })?.workflowMode === 'raw';

    let targetAssetId: string | undefined;

    let currentEl: EditorElement | undefined;
    for (const spread of state.project.spreads) {
      currentEl = spread.elements.find((el) => el.id === elementId);
      if (currentEl) break;
    }

    if (currentEl) {
      targetAssetId = currentEl.assetId;
    }

    const asset = state.project.assets?.find((a) => a.id === targetAssetId);
    const naturalAspect = currentEl?.naturalAspect || asset?.aspectRatio || (asset?.width && asset?.height ? asset.width / asset.height : 1.5);

    let targetW: number | undefined;
    let targetH: number | undefined;
    let projectSize = state.project.size;

    if (isRawSession && currentEl) {
      // Crop aspect is strictly computed from natural photo aspect and crop percentages (never compounding!)
      const cropW_pct = Math.max(1, cropData.widthPercent || 100);
      const cropH_pct = Math.max(1, cropData.heightPercent || 100);
      const cropAspect = naturalAspect * (cropW_pct / cropH_pct);

      const baseDim = 300;
      if (cropAspect >= 1) {
        targetW = baseDim;
        targetH = Math.round((baseDim / cropAspect) * 10) / 10;
      } else {
        targetH = baseDim;
        targetW = Math.round((baseDim * cropAspect) * 10) / 10;
      }
      projectSize = { w_mm: targetW, h_mm: targetH };
    }

    const spreads = state.project.spreads.map((spread) => ({
      ...spread,
      elements: spread.elements.map((el) => {
        if (el.id === elementId) {
          return {
            ...el,
            naturalAspect,
            cropData,
            rotation_deg,
            flipHorizontal,
            flipVertical,
            ...(isRawSession && targetW !== undefined && targetH !== undefined
              ? { w_mm: targetW, h_mm: targetH, x_mm: 0, y_mm: 0 }
              : {}),
          };
        }
        return el;
      }),
    }));

    let assets = state.project.assets || [];
    if (targetAssetId) {
      assets = assets.map((a) =>
        a.id === targetAssetId
          ? {
              ...a,
              cropData,
              rotation_deg,
              flipHorizontal,
              flipVertical,
              isEdited: true,
            }
          : a
      );
    }

    set({
      project: {
        ...state.project,
        size: projectSize,
        assets,
        spreads,
      },
      isCropMode: false,
      activeCropElementId: null,
      cropDraft: null,
    });

    get().flushSave();
  },

  cancelCropMode: () => {
    const state = get();
    if (!state.project) {
      set({ isCropMode: false, activeCropElementId: null, cropDraft: null, rotationDraft: 0, flipHDraft: false, flipVDraft: false });
      return;
    }

    const isRawSession = state.project.type === 'type_raw_session' || (state.project as { workflowMode?: string })?.workflowMode === 'raw';

    let projectSize = state.project.size;
    let spreads = state.project.spreads;

    if (isRawSession && state.activeCropElementId) {
      let targetEl: EditorElement | undefined;
      for (const spread of state.project.spreads) {
        targetEl = spread.elements.find((el) => el.id === state.activeCropElementId);
        if (targetEl) break;
      }

      if (targetEl) {
        const asset = state.project.assets?.find((a) => a.id === targetEl?.assetId);
        const naturalAspect = targetEl.naturalAspect || asset?.aspectRatio || (asset?.width && asset?.height ? asset.width / asset.height : 1.5);
        let aspect = naturalAspect;
        if (targetEl.cropData && targetEl.cropData.widthPercent && targetEl.cropData.heightPercent) {
          aspect = naturalAspect * (targetEl.cropData.widthPercent / targetEl.cropData.heightPercent);
        }

        const baseDim = 300;
        let targetW: number;
        let targetH: number;
        if (aspect >= 1) {
          targetW = baseDim;
          targetH = Math.round((baseDim / aspect) * 10) / 10;
        } else {
          targetH = baseDim;
          targetW = Math.round((baseDim * aspect) * 10) / 10;
        }
        projectSize = { w_mm: targetW, h_mm: targetH };

        spreads = state.project.spreads.map((spread) => ({
          ...spread,
          elements: spread.elements.map((el) => {
            if (el.id === state.activeCropElementId) {
              return {
                ...el,
                w_mm: targetW,
                h_mm: targetH,
                x_mm: 0,
                y_mm: 0,
              };
            }
            return el;
          }),
        }));
      }
    }

    set({
      project: {
        ...state.project,
        size: projectSize,
        spreads,
      },
      isCropMode: false,
      activeCropElementId: null,
      cropDraft: null,
      rotationDraft: 0,
      flipHDraft: false,
      flipVDraft: false,
    });
  },

  copiedPhotoAttributes: null,

  copyPhotoAttributes: (source, mode) => {
    const state = get();
    if (!state.project) return;

    let sourceEl: EditorElement | undefined;
    if (source.elementId) {
      for (const spread of state.project.spreads) {
        sourceEl = spread.elements.find((e) => e.id === source.elementId);
        if (sourceEl) break;
      }
    } else if (source.assetId) {
      const activeSpread = state.project.spreads.find((s) => s.id === state.activeSpreadId) || state.project.spreads[0];
      sourceEl = activeSpread?.elements.find((e) => e.type === 'image' && e.assetId === source.assetId);
    }

    const assetId = source.assetId || sourceEl?.assetId;
    const sourceAsset = state.project.assets?.find((a) => a.id === assetId);

    if (!sourceEl && !sourceAsset) return;

    const rawAdjustments = sourceEl?.photoAdjustments || sourceAsset?.developSettings;
    const photoFilter = sourceEl?.photoFilter !== undefined ? sourceEl.photoFilter : sourceAsset?.photoFilter;
    const filterIntensity = sourceEl?.filterIntensity !== undefined ? sourceEl.filterIntensity : sourceAsset?.filterIntensity;
    const rawCrop = sourceEl?.cropData || sourceAsset?.cropData;
    const rotation_deg = sourceEl?.rotation_deg !== undefined ? sourceEl.rotation_deg : (sourceAsset?.rotation_deg || 0);
    const flipHorizontal = sourceEl?.flipHorizontal !== undefined ? Boolean(sourceEl.flipHorizontal) : Boolean(sourceAsset?.flipHorizontal);
    const flipVertical = sourceEl?.flipVertical !== undefined ? Boolean(sourceEl.flipVertical) : Boolean(sourceAsset?.flipVertical);

    set({
      copiedPhotoAttributes: {
        mode,
        sourceAssetId: assetId,
        sourceName: sourceAsset?.name || sourceEl?.layerName || 'Imagen',
        developSettings: rawAdjustments ? JSON.parse(JSON.stringify(rawAdjustments)) : {},
        photoFilter,
        filterIntensity,
        cropData: rawCrop ? { ...rawCrop } : { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100, aspectPreset: 'free' },
        rotation_deg,
        flipHorizontal,
        flipVertical,
      },
    });
  },

  pastePhotoAttributes: (target, modeOverride) => {
    const state = get();
    const copied = state.copiedPhotoAttributes;
    if (!state.project || !copied) return;

    const effectiveMode = modeOverride || copied.mode;
    const shouldPasteAdjustments = effectiveMode === 'all' || effectiveMode === 'adjustments';
    const shouldPasteCrop = effectiveMode === 'all' || effectiveMode === 'crop';

    const targetAssetIdSet = new Set<string>(target.assetIds || []);
    if (target.elementId) {
      for (const spread of state.project.spreads) {
        const el = spread.elements.find((e) => e.id === target.elementId);
        if (el?.assetId) {
          targetAssetIdSet.add(el.assetId);
          break;
        }
      }
    }

    const isRawSession = state.project.type === 'type_raw_session' || (state.project as { workflowMode?: string })?.workflowMode === 'raw';
    const isStudio = state.project.projectCategory === 'studio_print';

    // 1. Update matching assets in project.assets non-destructively
    const updatedAssets = (state.project.assets || []).map((asset) => {
      if (!targetAssetIdSet.has(asset.id)) return asset;

      return {
        ...asset,
        developSettings: shouldPasteAdjustments
          ? (copied.developSettings ? JSON.parse(JSON.stringify(copied.developSettings)) : {})
          : asset.developSettings,
        photoFilter: shouldPasteAdjustments ? copied.photoFilter : asset.photoFilter,
        filterIntensity: shouldPasteAdjustments ? copied.filterIntensity : asset.filterIntensity,
        cropData: shouldPasteCrop
          ? (copied.cropData ? { ...copied.cropData } : undefined)
          : asset.cropData,
        rotation_deg: shouldPasteCrop ? (copied.rotation_deg ?? 0) : asset.rotation_deg,
        flipHorizontal: shouldPasteCrop ? Boolean(copied.flipHorizontal) : asset.flipHorizontal,
        flipVertical: shouldPasteCrop ? Boolean(copied.flipVertical) : asset.flipVertical,
        isEdited: true,
      };
    });

    // 2. Update matching elements on spreads (and adapt canvas size ONLY if in Camera Raw Pro)
    let newProjectSize = state.project.size;

    const updatedSpreads = state.project.spreads.map((spread) => ({
      ...spread,
      elements: spread.elements.map((el) => {
        if (el.type !== 'image') return el;
        const isTargetEl = el.id === target.elementId || (el.assetId && targetAssetIdSet.has(el.assetId));
        if (!isTargetEl) return el;

        let nextEl: EditorElement = {
          ...el,
          photoAdjustments: shouldPasteAdjustments
            ? (copied.developSettings ? JSON.parse(JSON.stringify(copied.developSettings)) : {})
            : el.photoAdjustments,
          photoFilter: shouldPasteAdjustments ? copied.photoFilter : el.photoFilter,
          filterIntensity: shouldPasteAdjustments ? copied.filterIntensity : el.filterIntensity,
        };

        if (shouldPasteCrop) {
          const nextCrop = copied.cropData ? { ...copied.cropData } : undefined;
          const nextRot = copied.rotation_deg ?? 0;
          const nextFlipH = Boolean(copied.flipHorizontal);
          const nextFlipV = Boolean(copied.flipVertical);

          const matchedAsset = updatedAssets.find((a) => a.id === el.assetId);
          const naturalAspect = el.naturalAspect || matchedAsset?.aspectRatio || (matchedAsset?.width && matchedAsset?.height ? matchedAsset.width / matchedAsset.height : 1.5);
          const cropW_pct = Math.max(1, nextCrop?.widthPercent || 100);
          const cropH_pct = Math.max(1, nextCrop?.heightPercent || 100);
          let cropAspect = naturalAspect * (cropW_pct / cropH_pct);
          const absRot = Math.abs(Math.round(nextRot)) % 360;
          if (absRot === 90 || absRot === 270) {
            cropAspect = 1 / cropAspect;
          }

          nextEl = {
            ...nextEl,
            naturalAspect,
            cropData: nextCrop,
            rotation_deg: nextRot,
            flipHorizontal: nextFlipH,
            flipVertical: nextFlipV,
          };

          if (isRawSession) {
            const baseDim = 300;
            let targetW = baseDim;
            let targetH = baseDim;
            if (cropAspect >= 1) {
              targetW = baseDim;
              targetH = Math.round((baseDim / cropAspect) * 10) / 10;
            } else {
              targetH = baseDim;
              targetW = Math.round((baseDim * cropAspect) * 10) / 10;
            }
            newProjectSize = { w_mm: targetW, h_mm: targetH };
            nextEl = { ...nextEl, w_mm: targetW, h_mm: targetH, x_mm: 0, y_mm: 0 };
          } else if (isStudio) {
            // In Studio Print: project.size NEVER changes! Fit element proportionally inside studio canvas.
            const canvasW = state.project!.size.w_mm;
            const canvasH = state.project!.size.h_mm;
            const canvasRatio = canvasW / canvasH;
            let elW = canvasW;
            let elH = canvasH;
            let posX = 0;
            let posY = 0;

            if (Math.abs(cropAspect - canvasRatio) < 0.01) {
              elW = canvasW; elH = canvasH; posX = 0; posY = 0;
            } else if (cropAspect > canvasRatio) {
              elW = canvasW;
              elH = Math.round((canvasW / cropAspect) * 10) / 10;
              posX = 0;
              posY = Math.round(((canvasH - elH) / 2) * 10) / 10;
            } else {
              elH = canvasH;
              elW = Math.round((canvasH * cropAspect) * 10) / 10;
              posX = Math.round(((canvasW - elW) / 2) * 10) / 10;
              posY = 0;
            }
            nextEl = { ...nextEl, w_mm: elW, h_mm: elH, x_mm: posX, y_mm: posY };
          }
        }

        return nextEl;
      }),
    }));

    set({
      project: {
        ...state.project,
        size: newProjectSize,
        assets: updatedAssets,
        spreads: updatedSpreads,
      },
    });

    get().flushSave();
  },

  updateAssetDevelopSettings: (assetId, settings, filter, filterIntensity) => set((state) => {
    if (!state.project?.assets) return state;
    const assets = state.project.assets.map((a) => {
      if (a.id === assetId) {
        const mergedSettings = { ...(a.developSettings || {}), ...settings };
        return {
          ...a,
          developSettings: mergedSettings,
          photoFilter: filter !== undefined ? filter : a.photoFilter,
          filterIntensity: filterIntensity !== undefined ? filterIntensity : a.filterIntensity,
          isEdited: true,
        };
      }
      return a;
    });

    const spreads = state.project.spreads.map((spread) => ({
      ...spread,
      elements: spread.elements.map((el) => {
        if (el.type === 'image' && el.assetId === assetId) {
          const matched = assets.find((a) => a.id === assetId);
          if (matched) {
            return {
              ...el,
              photoAdjustments: matched.developSettings,
              photoFilter: matched.photoFilter,
              filterIntensity: matched.filterIntensity,
            };
          }
        }
        return el;
      }),
    }));

    return { project: { ...state.project, assets, spreads } };
  }),

  batchSetAssetRating: (assetIds, rating) => set((state) => {
    if (!state.project?.assets) return state;
    const idSet = new Set(assetIds);
    const assets = state.project.assets.map((a) => (idSet.has(a.id) ? { ...a, rating } : a));
    return { project: { ...state.project, assets } };
  }),

  batchSetAssetFolder: (assetIds, folderPath) => set((state) => {
    if (!state.project?.assets) return state;
    const idSet = new Set(assetIds);
    const assets = state.project.assets.map((a) => (idSet.has(a.id) ? { ...a, folderPath } : a));
    return { project: { ...state.project, assets } };
  }),

  batchAddAssetToCollection: (assetIds, collectionName) => set((state) => {
    if (!state.project?.assets) return state;
    const idSet = new Set(assetIds);
    const assets = state.project.assets.map((a) => {
      if (idSet.has(a.id)) {
        const collections = Array.from(new Set([...(a.collections || []), collectionName]));
        return { ...a, collections };
      }
      return a;
    });
    return { project: { ...state.project, assets } };
  }),

  batchRemoveAssetFromCollection: (assetIds, collectionName) => set((state) => {
    if (!state.project?.assets) return state;
    const idSet = new Set(assetIds);
    const assets = state.project.assets.map((a) => {
      if (idSet.has(a.id)) {
        const collections = (a.collections || []).filter((c) => c !== collectionName);
        return { ...a, collections };
      }
      return a;
    });
    return { project: { ...state.project, assets } };
  }),

  addProjectAssetFolder: (folderName) => set((state) => {
    if (!state.project) return state;
    const current = state.project.assetFolders || [];
    if (current.includes(folderName)) return state;
    return { project: { ...state.project, assetFolders: [...current, folderName] } };
  }),

  addProjectAssetCollection: (collectionName) => set((state) => {
    if (!state.project) return state;
    const current = state.project.assetCollections || [];
    if (current.includes(collectionName)) return state;
    return { project: { ...state.project, assetCollections: [...current, collectionName] } };
  }),

  batchDeleteAssets: (assetIds) => set((state) => {
    if (!state.project?.assets) return state;
    const idSet = new Set(assetIds);
    const assets = state.project.assets.filter((a) => !idSet.has(a.id));
    return {
      project: { ...state.project, assets },
      selectedBrowserAssetIds: state.selectedBrowserAssetIds.filter((id) => !idSet.has(id)),
      activeBrowserAssetId: state.activeBrowserAssetId && idSet.has(state.activeBrowserAssetId) ? null : state.activeBrowserAssetId,
    };
  }),

  loadAssetToCanvas: async (asset) => {
    // Camera Raw Pro: prepare the full-resolution image before changing
    // the canvas, preventing the white background from appearing.
    const requestId = ++rawPhotoSelectionRequest;
    const initialProject = get().project;
    const isRawSelection = initialProject?.type === 'type_raw_session'
      || (initialProject as { workflowMode?: string } | null)?.workflowMode === 'raw';

    const nextImageUrl = asset.originalUrl || asset.previewUrl;

    if (isRawSelection && nextImageUrl && typeof window !== 'undefined') {
      try {
        const { preloadRawImage } = await import('@/utils/rawImageCache');
        await preloadRawImage(nextImageUrl);
      } catch (error) {
        console.warn('Camera Raw image preload failed:', error);
      }

      // Ignore outdated selections and changes to another project.
      if (requestId !== rawPhotoSelectionRequest) return;
      if (get().project?.id !== initialProject?.id) return;
    }

    const state = get();
    if (!state.project) return;
    const activeSpreadId = state.activeSpreadId || state.project.spreads[0]?.id;
    if (!activeSpreadId) return;

    const spreadIndex = state.project.spreads.findIndex((s) => s.id === activeSpreadId);
    if (spreadIndex === -1) return;
    const spread = state.project.spreads[spreadIndex];

    const isRaw = state.project.type === 'type_raw_session' || (state.project as { workflowMode?: string })?.workflowMode === 'raw';
    const isStudio = state.project.projectCategory === 'studio_print';

    // 1. Calculate aspect ratio including crops and rotation
    let aspect = asset.aspectRatio || (asset.width && asset.height ? asset.width / asset.height : 1.5);
    if (asset.cropData && asset.cropData.widthPercent && asset.cropData.heightPercent) {
      aspect = aspect * (asset.cropData.widthPercent / asset.cropData.heightPercent);
    }
    const absRot = Math.abs(Math.round(asset.rotation_deg || 0)) % 360;
    if (absRot === 90 || absRot === 270) {
      aspect = 1 / aspect;
    }

    let targetW: number;
    let targetH: number;
    let posX = 0;
    let posY = 0;
    let newProjectSize = state.project.size;

    if (isRaw) {
      // In Camera Raw Pro ONLY: canvas dynamically adapts to photo dimensions
      const baseDim = 300;
      if (aspect >= 1) {
        targetW = baseDim;
        targetH = Math.round((baseDim / aspect) * 10) / 10;
      } else {
        targetH = baseDim;
        targetW = Math.round((baseDim * aspect) * 10) / 10;
      }
      newProjectSize = { w_mm: targetW, h_mm: targetH };
      posX = 0;
      posY = 0;
    } else {
      // In Studio Print & Albums: Canvas/Project size is strictly IMMUTABLE!
      // The canvas size must NEVER change to match the image!
      const canvasW = state.project.size.w_mm;
      const canvasH = state.project.size.h_mm;
      const canvasRatio = canvasW / canvasH;

      if (Math.abs(aspect - canvasRatio) < 0.01) {
        targetW = canvasW;
        targetH = canvasH;
        posX = 0;
        posY = 0;
      } else if (aspect > canvasRatio) {
        targetW = canvasW;
        targetH = Math.round((canvasW / aspect) * 10) / 10;
        posX = 0;
        posY = Math.round(((canvasH - targetH) / 2) * 10) / 10;
      } else {
        targetH = canvasH;
        targetW = Math.round((canvasH * aspect) * 10) / 10;
        posX = Math.round(((canvasW - targetW) / 2) * 10) / 10;
        posY = 0;
      }
    }

    // 2. Save previous image adjustments back to asset in project.assets
    const currentImg = spread.elements.find((e) => e.type === 'image');
    let updatedAssets = state.project.assets || [];
    if (currentImg && currentImg.assetId) {
      updatedAssets = updatedAssets.map((a) =>
        a.id === currentImg.assetId
          ? {
              ...a,
              developSettings: currentImg.photoAdjustments || a.developSettings,
              photoFilter: currentImg.photoFilter || a.photoFilter,
              filterIntensity: currentImg.filterIntensity !== undefined ? currentImg.filterIntensity : a.filterIntensity,
              cropData: currentImg.cropData || a.cropData,
              rotation_deg: currentImg.rotation_deg !== undefined ? currentImg.rotation_deg : a.rotation_deg,
              flipHorizontal: currentImg.flipHorizontal !== undefined ? currentImg.flipHorizontal : a.flipHorizontal,
              flipVertical: currentImg.flipVertical !== undefined ? currentImg.flipVertical : a.flipVertical,
              isEdited: true,
            }
          : a
      );
    }

    // 3. Prepare replacement image element matching canvas proportional bounds
    const naturalAspect = asset.aspectRatio || (asset.width && asset.height ? asset.width / asset.height : 1.5);
    const imgElement: EditorElement = {
      id: currentImg ? currentImg.id : `el_${Date.now()}`,
      type: 'image',
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      previewBlobId: asset.previewBlobId,
      originalBlobId: asset.originalBlobId,
      assetId: asset.id,
      naturalAspect,
      photoAdjustments: asset.developSettings,
      photoFilter: asset.photoFilter,
      filterIntensity: asset.filterIntensity,
      cropData: asset.cropData,
      rotation_deg: asset.rotation_deg || 0,
      flipHorizontal: asset.flipHorizontal,
      flipVertical: asset.flipVertical,
      x_mm: posX,
      y_mm: posY,
      w_mm: targetW,
      h_mm: targetH,
      zIndex: 1,
    };

    // Filter out any other image elements to avoid stacking (in single image modes)
    const cleanElements = spread.elements.filter((e) => e.type !== 'image');
    const newSpread = {
      ...spread,
      elements: isStudio || isRaw ? [...cleanElements, imgElement] : [...spread.elements, imgElement],
    };

    const newSpreads = [...state.project.spreads];
    newSpreads[spreadIndex] = newSpread;

    set({
      project: {
        ...state.project,
        size: newProjectSize,
        assets: updatedAssets,
        spreads: newSpreads,
      },
      selectedElementId: imgElement.id,
      activeBrowserAssetId: asset.id,
      isCropMode: false,
      activeCropElementId: null,
      cropDraft: null,
    });

    get().flushSave();
  },

  clearCanvasSession: () => {
    const state = get();
    if (!state.project) return;

    // 1. Save any adjustments from currently mounted image back to asset
    const activeSpread = state.project.spreads.find((s) => s.id === state.activeSpreadId) || state.project.spreads[0];
    const currentImg = activeSpread?.elements.find((e) => e.type === 'image');
    let updatedAssets = state.project.assets || [];
    if (currentImg && currentImg.assetId) {
      updatedAssets = updatedAssets.map((a) =>
        a.id === currentImg.assetId
          ? {
              ...a,
              developSettings: currentImg.photoAdjustments || a.developSettings,
              photoFilter: currentImg.photoFilter || a.photoFilter,
              filterIntensity: currentImg.filterIntensity !== undefined ? currentImg.filterIntensity : a.filterIntensity,
              cropData: currentImg.cropData || a.cropData,
              rotation_deg: currentImg.rotation_deg !== undefined ? currentImg.rotation_deg : a.rotation_deg,
              flipHorizontal: currentImg.flipHorizontal !== undefined ? currentImg.flipHorizontal : a.flipHorizontal,
              flipVertical: currentImg.flipVertical !== undefined ? currentImg.flipVertical : a.flipVertical,
              isEdited: true,
            }
          : a
      );
    }

    // 2. Completely clean elements from spreads
    const cleanSpreads = state.project.spreads.map((s) => ({
      ...s,
      elements: [],
    }));

    set({
      project: {
        ...state.project,
        assets: updatedAssets,
        spreads: cleanSpreads,
      },
      canvasBatchAssetIds: [],
      selectedElementId: null,
      activeBrowserAssetId: null,
      selectedBrowserAssetIds: [],
      workspaceView: 'browser',
      isCropMode: false,
      activeCropElementId: null,
      cropDraft: null,
    });

    get().flushSave();
  },

  loadProject: (project) => {
    const isStudio = project.projectCategory === 'studio_print';
    const healedSpreads = isStudio && project.spreads.length > 1 ? [project.spreads[0]] : project.spreads;
    const activeSpreadId = healedSpreads[0]?.id || null;

    let healedSize = project.size;
    if (isStudio && project.size) {
      // Heal Studio Print project if corrupted by previous 200x300 dynamic raw canvas bug
      const isCorrupted200x300 = Math.abs(project.size.w_mm - 200) < 5 && Math.abs(project.size.h_mm - 300) < 5;
      const titleMatch = project.title?.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
      if (titleMatch && isCorrupted200x300) {
        const wIn = parseFloat(titleMatch[1]);
        const hIn = parseFloat(titleMatch[2]);
        if (wIn > 0 && hIn > 0) {
          const isLandscape = project.orientation === 'landscape';
          const w = isLandscape ? Math.max(wIn, hIn) : Math.min(wIn, hIn);
          const h = isLandscape ? Math.min(wIn, hIn) : Math.max(wIn, hIn);
          healedSize = {
            w_mm: Number((w * 25.4).toFixed(4)),
            h_mm: Number((h * 25.4).toFixed(4)),
          };
        }
      }
    }

    set({
      project: {
        ...project,
        size: healedSize,
        spreads: healedSpreads,
        totalSpreads: isStudio ? 1 : (project.totalSpreads || healedSpreads.length)
      },
      activeSpreadId,
      editorViewMode: isStudio ? 'SINGLE' : 'GRID'
    });
  },
  unloadProject: () => {
    const currentProject = get().project;
    if (currentProject && currentProject.id && currentProject.storageMode === 'local') {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
      }
      projectStorage.saveProject(currentProject);
    }
    set({ project: null, activeSpreadId: null, selectedElementId: null, previewOriginalPhotoId: null, beforeAfterMode: 'off', beforeAfterSplitPosition: 0.5, isBeforeAfterModalOpen: false, workspaceView: 'canvas', activeBrowserAssetId: null, selectedBrowserAssetIds: [], isCropMode: false, activeCropElementId: null, cropDraft: null });
  },
  flushSave: async () => {
    const currentProject = get().project;
    if (currentProject && currentProject.id && currentProject.storageMode === 'local') {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
      }
      await projectStorage.saveProjectAsync(currentProject);
    }
  },
  setActiveSpread: (id) => set({ activeSpreadId: id }),
  setSequenceMode: (mode) => set((state) => {
    if (!state.project) return state;
    return { project: { ...state.project, sequenceMode: mode } };
  }),

  markSpreadCompleted: (spreadId) => set((state) => {
     if (!state.project) return state;
     const spreads = state.project.spreads.map(s => s.id === spreadId ? { ...s, status: 'completed' as const } : s);
     return { project: { ...state.project, spreads } };
  }),

  goToNextSpread: () => set((state) => {
     if (!state.project || !state.activeSpreadId) return state;
     if (state.project.projectCategory === 'studio_print') return state; // Never create extra spreads in Studio Print mode
     const spreads = state.project.spreads;
     const idx = spreads.findIndex(s => s.id === state.activeSpreadId);
     if (idx === -1) return state;

     if (idx < spreads.length - 1) {
        return { activeSpreadId: spreads[idx + 1].id };
     } else {
        const totalCap = state.project.totalSpreads || Infinity;
        if (spreads.length < totalCap) {
           import('uuid').then(({ v4: uuidv4 }) => {
              const newSpread = {
                 id: uuidv4(),
                 elements: [],
                 bg_color: '#FFFFFF',
                 status: 'empty' as const
              };
              useEditorStore.setState(prev => {
                 if (!prev.project) return prev;

                 const inheritedBgConfig = prev.project.spreads.length > 0 ? prev.project.spreads[0].bg_config : { type: 'none' as const };
                 const inheritedBgColor = prev.project.spreads.length > 0 ? prev.project.spreads[0].bg_color : '#FFFFFF';

                 const finalSpread = { ...newSpread, bg_color: inheritedBgColor, bg_config: inheritedBgConfig };

                 return {
                    project: { ...prev.project, spreads: [...prev.project.spreads, finalSpread] },
                    activeSpreadId: finalSpread.id
                 };
              });
           });
        }
        return state;
     }
  }),

  goToPrevSpread: () => set((state) => {
     if (!state.project || !state.activeSpreadId) return state;
     if (state.project.projectCategory === 'studio_print') return state; // Never navigate in Studio Print mode
     const spreads = state.project.spreads;
     const idx = spreads.findIndex(s => s.id === state.activeSpreadId);
     if (idx > 0) {
        return { activeSpreadId: spreads[idx - 1].id };
     }
     return state;
  }),

  setDraggingStagedElementId: (id) => set({ draggingStagedElementId: id }),
  setStagingDropPreviewIndex: (idx) => set({ stagingDropPreviewIndex: idx }),
  setSelectedElement: (id) => set({ selectedElementId: id, selectedStagedElementIds: [] }), // Clear batch on single select

  toggleStagedElementSelection: (id) => set((state) => {
     const isSelected = state.selectedStagedElementIds.includes(id);
     return {
        selectedStagedElementIds: isSelected
           ? state.selectedStagedElementIds.filter(e => e !== id)
           : [...state.selectedStagedElementIds, id],
        selectedElementId: null // Clear normal selection visually
     };
  }),
  clearStagedSelection: () => set({ selectedStagedElementIds: [] }),
  setStagedSelection: (ids) => set({ selectedStagedElementIds: ids, selectedElementId: null }),

  swapStagedElements: () => set((state) => {
     if (!state.project || !state.activeSpreadId || state.selectedStagedElementIds.length !== 2) return state;
     const newSpreads = [...state.project.spreads];
     const sIdx = newSpreads.findIndex(s => s.id === state.activeSpreadId);
     if (sIdx === -1) return state;

     const targetSpread = { ...newSpreads[sIdx] };
     const elements = [...targetSpread.elements];

     const id1 = state.selectedStagedElementIds[0];
     const id2 = state.selectedStagedElementIds[1];

     const idx1 = elements.findIndex(e => e.id === id1);
     const idx2 = elements.findIndex(e => e.id === id2);

     if (idx1 === -1 || idx2 === -1) return state;

     const el1 = { ...elements[idx1] };
     const el2 = { ...elements[idx2] };

     // Store el2 properties to map onto el1
     const tempX = el2.x_mm;
     const tempY = el2.y_mm;
     const tempW = el2.w_mm;
     const tempH = el2.h_mm;
     const tempRot = el2.rotation_deg;

     el2.x_mm = el1.x_mm;
     el2.y_mm = el1.y_mm;
     el2.w_mm = el1.w_mm;
     el2.h_mm = el1.h_mm;
     el2.rotation_deg = el1.rotation_deg;

     el1.x_mm = tempX;
     el1.y_mm = tempY;
     el1.w_mm = tempW;
     el1.h_mm = tempH;
     el1.rotation_deg = tempRot;

     elements[idx1] = el1;
     elements[idx2] = el2;

     targetSpread.elements = elements;
     newSpreads[sIdx] = targetSpread;

     // Force UI trigger update by flushing new project state. Keep selection.
     return { project: { ...state.project, spreads: newSpreads } };
  }),

  updateSpread: (spreadId, changes) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, ...changes, autoBookManaged: false };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  updateElement: (spreadId, elementId, changes) => set((state) => {
    if (!state.project) return state;

    // Auto-save hook or wrapper can be added elsewhere. State is purely mutated here.
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;

      let structuralDetachTriggered = false;

      const newElements = spread.elements.map((el) => {
        if (el.id !== elementId) return el;

        // Phase 7.H: Strict Detachment Interceptor detecting Grid escapes
        if (el.isAutoLayoutManaged && spread.autoLayout?.isActive) {
           const isGeometricEscape =
              (changes.x_mm !== undefined && Math.abs(changes.x_mm - el.x_mm) > 0.01) ||
              (changes.y_mm !== undefined && Math.abs(changes.y_mm - el.y_mm) > 0.01) ||
              (changes.w_mm !== undefined && Math.abs(changes.w_mm - el.w_mm) > 0.01) ||
              (changes.h_mm !== undefined && Math.abs(changes.h_mm - el.h_mm) > 0.01) ||
              (changes.rotation_deg !== undefined && changes.rotation_deg !== el.rotation_deg);

           if (isGeometricEscape) {
              structuralDetachTriggered = true;
           }
        }

        return { ...el, ...changes };
      });

      // Execute Layout break explicitly stripping binding natively preserving free form
      if (structuralDetachTriggered && spread.autoLayout) {
         return {
            ...spread,
            autoLayout: { ...spread.autoLayout, isActive: false },
            elements: newElements.map(e => e.isAutoLayoutManaged ? { ...e, isAutoLayoutManaged: false, stageType: 'free' as const } : e),
            autoBookManaged: false
         };
      }

      return { ...spread, elements: newElements, autoBookManaged: false };
    });

    // Synchronize photo adjustments, crop and transforms back to the asset non-destructively
    let updatedAssets = state.project.assets;
    if (
      changes.photoAdjustments ||
      changes.photoFilter !== undefined ||
      changes.filterIntensity !== undefined ||
      changes.cropData !== undefined ||
      changes.rotation_deg !== undefined ||
      changes.flipHorizontal !== undefined ||
      changes.flipVertical !== undefined
    ) {
      const targetSpread = state.project.spreads.find((s) => s.id === spreadId);
      const targetEl = targetSpread?.elements.find((e) => e.id === elementId);
      if (targetEl?.assetId && updatedAssets) {
        const targetAssetId = targetEl.assetId;
        updatedAssets = updatedAssets.map((asset) => {
          if (asset.id === targetAssetId) {
            return {
              ...asset,
              developSettings: changes.photoAdjustments
                ? { ...(asset.developSettings || {}), ...changes.photoAdjustments }
                : asset.developSettings,
              photoFilter: changes.photoFilter !== undefined ? changes.photoFilter : asset.photoFilter,
              filterIntensity:
                changes.filterIntensity !== undefined ? changes.filterIntensity : asset.filterIntensity,
              cropData: changes.cropData !== undefined ? changes.cropData : asset.cropData,
              rotation_deg: changes.rotation_deg !== undefined ? changes.rotation_deg : asset.rotation_deg,
              flipHorizontal: changes.flipHorizontal !== undefined ? changes.flipHorizontal : asset.flipHorizontal,
              flipVertical: changes.flipVertical !== undefined ? changes.flipVertical : asset.flipVertical,
              isEdited: true,
            };
          }
          return asset;
        });
      }
    }

    return { project: { ...state.project, spreads: newSpreads, assets: updatedAssets } };
  }),

  setProjectSize: (size) => set((state) => {
    if (!state.project) return state;
    return { project: { ...state.project, size } };
  }),

  applyTypographyPreset: (presetId) => set((state) => {
    if (!state.project) return state;

    const preset = TYPOGRAPHY_PRESETS.find(p => p.id === presetId);
    if (!preset) return state;

    const newSpreads = state.project.spreads.map((spread) => {
      const newElements = spread.elements.map((el) => {
        if (el.type !== 'text') return el;
        if (el.lockedFonts === false) return el; // Manual override protection

        const role = el.textRole || 'body'; // Default fallback
        const fontStr = preset.fonts[role] || preset.fonts.body;
        const fontStyle = preset.styles?.[role] || { letterSpacing: 0, lineHeight: 1.2, textTransform: 'none' };

        // Map native color
        const assignedColor = role === 'h1'
          ? preset.styles?.h1?.color || '#000'
          : role === 'h2'
            ? preset.styles?.h2?.color || '#000'
            : preset.styles?.body?.color || '#000';

        return {
          ...el,
          fontFamily: fontStr,
          textRole: role,
          textColor: assignedColor,
          letterSpacing: fontStyle.letterSpacing || 0,
          lineHeight: fontStyle.lineHeight || 1.2,
          textTransform: fontStyle.textTransform || 'none'
        };
      });
      return { ...spread, elements: newElements };
    });

    return {
      project: {
        ...state.project,
        typographyPresetId: presetId,
        spreads: newSpreads
      }
    };
  }),

  updateGlobalImageStyles: (styles) => set((state) => {
    if (!state.project) return state;

    const newSpreads = state.project.spreads.map((spread) => {
      const newElements = spread.elements.map((el) => {
        if (el.type !== 'image' || el.isolateFromGlobalStyles) return el;

        const newEl = { ...el };

        if (styles.borderRadius !== undefined || styles.borderRadiusEnabled !== undefined) {
           delete newEl.borderRadius;
        }
        if (styles.strokeWidth !== undefined || styles.strokeColor !== undefined || styles.strokeEnabled !== undefined) {
           delete newEl.strokeWidth;
           delete newEl.strokeColor;
        }
        if (styles.shadowBlur !== undefined || styles.shadowColor !== undefined || styles.shadowOffsetX !== undefined || styles.shadowOffsetY !== undefined || styles.shadowOpacity !== undefined || styles.shadowEnabled !== undefined) {
           delete newEl.shadowColor;
           delete newEl.shadowBlur;
           delete newEl.shadowOffsetX;
           delete newEl.shadowOffsetY;
           delete newEl.shadowOpacity;
        }

        return newEl;
      });
      return { ...spread, elements: newElements };
    });

    return {
      project: {
        ...state.project,
        globalImageStyles: { ...(state.project.globalImageStyles || {}), ...styles },
        spreads: newSpreads
      }
    };
  }),

  updateSpreadBackground: (spreadId, config) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, bg_config: { ...(s.bg_config || { type: 'none' }), ...config } };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  updateProjectGlobalBackground: (config) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      return { ...s, bg_config: { ...(s.bg_config || { type: 'none' }), ...config } };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  resetGlobalImageStyles: () => set((state) => {
    if (!state.project) return state;

    const newSpreads = state.project.spreads.map((spread) => {
      const newElements = spread.elements.map((el) => {
        if (el.type !== 'image' || el.isolateFromGlobalStyles) return el;

        const newEl = { ...el };
        delete newEl.borderRadius;
        delete newEl.strokeWidth;
        delete newEl.strokeColor;
        delete newEl.shadowColor;
        delete newEl.shadowBlur;
        delete newEl.shadowOffsetX;
        delete newEl.shadowOffsetY;
        delete newEl.shadowOpacity;
        return newEl;
      });
      return { ...spread, elements: newElements };
    });

    return {
      project: {
        ...state.project,
        globalImageStyles: undefined,
        spreads: newSpreads
      }
    };
  }),

  resetSpreadBackground: (spreadId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, bg_config: undefined };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  resetAllGlobalStyles: () => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map(s => ({ ...s, bg_config: undefined }));
    return {
      project: {
        ...state.project,
        globalImageStyles: undefined,
        spreads: newSpreads
      }
    };
  }),

  addGuide: (guide) => set((state) => {
    if (!state.project) return state;
    return { project: { ...state.project, globalGuides: [...(state.project.globalGuides || []), guide] } };
  }),

  updateGuide: (guideId, changes) => set((state) => {
    if (!state.project) return state;
    const newGuides = (state.project.globalGuides || []).map(g => g.id === guideId ? { ...g, ...changes } : g);
    return { project: { ...state.project, globalGuides: newGuides } };
  }),

  removeGuide: (guideId) => set((state) => {
    if (!state.project) return state;
    return { project: { ...state.project, globalGuides: (state.project.globalGuides || []).filter(g => g.id !== guideId) } };
  }),

  clearGuides: () => set((state) => {
    if (!state.project) return state;
    return { project: { ...state.project, globalGuides: [] } };
  }),

  addElement: (spreadId, element) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;

      const highestZIndex = spread.elements.length > 0
        ? Math.max(...spread.elements.map(e => e.zIndex))
        : -1;

      element.zIndex = highestZIndex + 1;
      if (!element.stageType) element.stageType = 'free'; // Phase 8.D FIX: Explicit fallback to free mode
      return { ...spread, elements: [...spread.elements, element] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;

    // Garbage collection for blobs
    const spread = state.project.spreads.find(s => s.id === spreadId);
    const element = spread?.elements.find(e => e.id === elementId);
    // Offload garbage collection rules exclusively to the StorageDriver bounds
    if (element) {
      storage.cleanupElement(element).catch(console.error);
    }

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;

      // Filter out element AND strictly filter out all children if element is a generic folder
      const isGroup = element?.type === 'group';
      const filteredElements = s.elements.filter(e => {
        if (e.id === elementId) return false;
        if (isGroup && e.groupId === elementId) return false;
        return true;
      });
      const sortedElements = [...filteredElements].sort((a, b) => a.zIndex - b.zIndex);
      const reindexedElements = sortedElements.map((el, index) => ({ ...el, zIndex: index }));

      return { ...s, elements: reindexedElements, autoBookManaged: false };
    });

    // Reset selection if deleting the selected item
    const newSelectedId = state.selectedElementId === elementId ? null : state.selectedElementId;
    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newSelectedId };
  }),

  resetElementAdjustments: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const canvasW = state.project.size.w_mm || 400;
    const canvasH = state.project.size.h_mm || 300;
    const assets = state.project.assets || [];

    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const isSingleElement = spread.elements.filter((e) => e.type !== 'group').length <= 1;

      const newElements = spread.elements.map((el) => {
        if (el.id !== elementId) return el;

        let nextX = el.x_mm;
        let nextY = el.y_mm;
        let nextW = el.w_mm;
        let nextH = el.h_mm;

        if (!el.isAutoLayoutManaged) {
          const matchedAsset = el.assetId ? assets.find((a) => a.id === el.assetId) : undefined;
          const nativeAspect =
            matchedAsset?.width && matchedAsset?.height
              ? matchedAsset.width / matchedAsset.height
              : matchedAsset?.aspectRatio;

          if (nativeAspect && nativeAspect > 0) {
            if (isSingleElement || el.zIndex === 0) {
              // Primary/background photo: fit proportionally inside canvas and center
              const canvasRatio = canvasW / canvasH;
              if (nativeAspect > canvasRatio) {
                nextW = canvasW;
                nextH = Number((canvasW / nativeAspect).toFixed(2));
                nextX = 0;
                nextY = Number(((canvasH - nextH) / 2).toFixed(2));
              } else {
                nextH = canvasH;
                nextW = Number((canvasH * nativeAspect).toFixed(2));
                nextX = Number(((canvasW - nextW) / 2).toFixed(2));
                nextY = 0;
              }
            } else {
              // Secondary/overlay image or logo: restore true native aspect ratio and center on canvas
              nextW = Math.min(canvasW * 0.8, Math.max(40, el.w_mm));
              nextH = Number((nextW / nativeAspect).toFixed(2));
              if (nextH > canvasH * 0.8) {
                nextH = Number((canvasH * 0.8).toFixed(2));
                nextW = Number((nextH * nativeAspect).toFixed(2));
              }
              nextX = Number(((canvasW - nextW) / 2).toFixed(2));
              nextY = Number(((canvasH - nextH) / 2).toFixed(2));
            }
          } else {
            nextX = Number(((canvasW - nextW) / 2).toFixed(2));
            nextY = Number(((canvasH - nextH) / 2).toFixed(2));
          }
        }

        return {
          ...el,
          x_mm: nextX,
          y_mm: nextY,
          w_mm: nextW,
          h_mm: nextH,
          rotation_deg: 0,
          scale: 1,
          pivotX: 0,
          pivotY: 0,
          photoFilter: 'none',
          filterIntensity: 1,
          photoAdjustments: undefined,
          blendMode: 'source-over',
          opacity: 1,
          color: el.type === 'shape' ? el.color : undefined,
          shadowColor: 'transparent',
          shadowBlur: undefined,
          shadowOpacity: undefined,
          shadowOffsetX: undefined,
          shadowOffsetY: undefined,
        };
      });
      return { ...spread, elements: newElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  duplicateElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const spread = state.project.spreads.find(s => s.id === spreadId);
    if (!spread) return state;
    const element = spread.elements.find(e => e.id === elementId);
    if (!element) return state;

    const newElement: EditorElement = {
      ...element,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      x_mm: Number((element.x_mm + 10).toFixed(2)),
      y_mm: Number((element.y_mm + 10).toFixed(2)),
      locked: false,
      isAutoLayoutManaged: false,
      stageType: 'free',
      photoAdjustments: element.photoAdjustments ? JSON.parse(JSON.stringify(element.photoAdjustments)) : undefined,
      layerName: element.layerName ? `${element.layerName} (Copy)` : undefined,
    };

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;

      const highestZIndex = s.elements.length > 0 ? Math.max(...s.elements.map(e => e.zIndex)) : -1;
      newElement.zIndex = highestZIndex + 1;

      return { ...s, elements: [...s.elements, newElement] };
    });

    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: newElement.id };
  }),

  createGroup: (spreadId) => set((state) => {
    if (!state.project) return state;
    const spread = state.project.spreads.find(s => s.id === spreadId);
    if (!spread) return state;

    const highestZIndex = spread.elements.length > 0 ? Math.max(...spread.elements.map(e => e.zIndex)) : -1;
    const groupElement: EditorElement = {
      id: crypto.randomUUID(),
      type: 'group',
      x_mm: 0,
      y_mm: 0,
      w_mm: state.project?.size?.w_mm || 500, // Safe bounding fallback
      h_mm: state.project?.size?.h_mm || 500,
      rotation_deg: 0,
      zIndex: highestZIndex + 1,
      layerName: `Group ${spread.elements.filter(e => e.type === 'group').length + 1}`,
      visible: true,
      locked: false,
      isCollapsed: false,
    };

    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, elements: [...s.elements, groupElement] };
    });

    return { project: { ...state.project, spreads: newSpreads }, selectedElementId: groupElement.id };
  }),

  addAsset: (asset) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return { project: { ...state.project, assets: [...assets, asset] } };
  }),

  addAssets: (newAssets) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return { project: { ...state.project, assets: [...assets, ...newAssets] } };
  }),

  ingestStagedPhotos: (newAssets) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    const mergedAssets = [...assets, ...newAssets];

    const newSpreads = [...state.project.spreads];
    if (newSpreads.length === 0) {
       newSpreads.push({ id: `spread_${Date.now()}`, bg_color: '#FFFFFF', elements: [], status: 'empty' });
    }

    let currentSpreadIndex = newSpreads.findIndex(s => s.id === state.activeSpreadId);
    if (currentSpreadIndex === -1) currentSpreadIndex = 0;

    // Phase Final A Fix: GUARD FOR COMPLETED SPREADS
    let targetSpread = { ...newSpreads[currentSpreadIndex] };
    if (targetSpread.status === 'completed') {
       let foundIndex = newSpreads.findIndex(s => s.status === 'empty');
       if (foundIndex === -1) {
           foundIndex = newSpreads.findIndex(s => s.status === 'staging');
       }

       if (foundIndex !== -1) {
           currentSpreadIndex = foundIndex;
           targetSpread = { ...newSpreads[currentSpreadIndex] };
       } else {
           const totalCap = state.project.totalSpreads || Infinity;
           if (newSpreads.length < totalCap) {
               newSpreads.push({
                   id: crypto.randomUUID(),
                   bg_color: '#FFFFFF',
                   elements: [],
                   status: 'empty'
                 });
               currentSpreadIndex = newSpreads.length - 1;
               targetSpread = { ...newSpreads[currentSpreadIndex] };
           } else {
               // Silently drop if capacity reached and all are completed/designed
               return state;
           }
       }
    }

    const elementsAcc = [...targetSpread.elements];

    const projectW = state.project.size.w_mm;
    const projectH = state.project.size.h_mm;

    const thumbnailW = 40;
    const thumbMaxH = 60; // Max vertical space to reserve per thumbnail cell
    const margin = 20;
    const gap = 10;

    const cols = Math.max(1, Math.floor((projectW - (margin * 2)) / (thumbnailW + gap)));
    const rows = Math.max(1, Math.floor((projectH - (margin * 2)) / (thumbMaxH + gap)));
    const dynamicCapacity = cols * rows;

    let currentPhotosInSpread = elementsAcc.filter(e => e.type === 'image').length;

    let hitLimit = false;
    newAssets.forEach((asset, idx) => {
       if (hitLimit) return;

       if (currentPhotosInSpread >= dynamicCapacity) {
          targetSpread.elements = [...elementsAcc];
          targetSpread.status = 'staging';
          newSpreads[currentSpreadIndex] = targetSpread;

          currentSpreadIndex++;
          if (currentSpreadIndex >= newSpreads.length) {
              const totalCap = state.project?.totalSpreads || Infinity;
              if (newSpreads.length < totalCap) {
                  newSpreads.push({
                     id: crypto.randomUUID(),
                     bg_color: '#FFFFFF',
                     elements: [],
                     status: 'empty'
                 });
              } else {
                  hitLimit = true;
                  return;
              }
          }
          targetSpread = { ...newSpreads[currentSpreadIndex] };
          elementsAcc.length = 0;
          elementsAcc.push(...targetSpread.elements);
          currentPhotosInSpread = elementsAcc.filter(e => e.type === 'image').length;
       }

       const aspect = (asset.width || 1) / (asset.height || 1);
       const h = thumbnailW / aspect;
       const col = currentPhotosInSpread % cols;
       const row = Math.floor(currentPhotosInSpread / cols);

       elementsAcc.push({
          id: `el_${Date.now()}_${idx}`,
          type: 'image',
          previewUrl: asset.previewUrl,
          originalUrl: asset.originalUrl,
          assetId: asset.id,
          x_mm: margin + (col * (thumbnailW + gap)),
          y_mm: margin + (row * (thumbMaxH + gap)),
          w_mm: thumbnailW,
          h_mm: h,
          rotation_deg: 0,
          zIndex: elementsAcc.length,
          isAutoLayoutManaged: false,
          stageType: 'staged'
       });
       currentPhotosInSpread++;
    });

    targetSpread.elements = [...elementsAcc];
    targetSpread.status = 'staging';
    newSpreads[currentSpreadIndex] = targetSpread;

    return {
       project: { ...state.project, assets: mergedAssets, spreads: newSpreads },
       activeSpreadId: newSpreads[currentSpreadIndex].id
    };
  }),

  ingestAndDropToSpread: (spreadId, assets) => {
    useEditorStore.setState((state) => {
        if (!state.project) return state;
        const newSpreads = [...state.project.spreads];
        const sIdx = newSpreads.findIndex(s => s.id === spreadId);
        if (sIdx === -1) return state;

        const targetSpread = { ...newSpreads[sIdx] };

        const currentAssetIds = new Set(state.project.assets?.map(a => a.id) || []);
        const newAssets = assets.filter(a => !currentAssetIds.has(a.id));
        const mergedAssets = [...(state.project.assets || []), ...newAssets];

        const elementsAcc = [...targetSpread.elements];

        // Bootstrapping automatic structure naturally
        const autoLayout = targetSpread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] };

        targetSpread.autoBookManaged = false;
        targetSpread.autoLayout = {
            ...autoLayout,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mode: 'fundy-masonry-experimental' as any
        };

        // Instantiate raw AST Elements directly assigned for Masonry routing
        assets.forEach((asset, idx) => {
           elementsAcc.push({
              id: `el_${Date.now()}_${idx}_dyn`,
              type: 'image',
              stageType: 'layout', // Essential for the algorithm to pick it up!
              previewUrl: asset.previewUrl,
              originalUrl: asset.originalUrl,
              previewBlobId: asset.previewBlobId,
              originalBlobId: asset.originalBlobId,
              assetId: asset.id,
              x_mm: 0, // Abstracted (Computed remotely by Engine)
              y_mm: 0,
              w_mm: 50,
              h_mm: 50,
              rotation_deg: 0,
              zIndex: elementsAcc.length,
              isAutoLayoutManaged: true
           });
        });

        targetSpread.elements = elementsAcc;
        newSpreads[sIdx] = targetSpread;

        // Phase 21: Auto-spawn next empty placeholder identically to Fundy Drop Zone mechanics
        if (sIdx === state.project.spreads.length - 1) {
            import('uuid').then(({ v4: uuidv4 }) => {
                const emptySpread = {
                   id: uuidv4(),
                   elements: [],
                   bg_color: '#FFFFFF',
                   status: 'empty' as const
                };
                useEditorStore.setState(prev => {
                   if (!prev.project) return prev;
                   const inheritedBgConfig = prev.project.spreads.length > 0 ? prev.project.spreads[0].bg_config : { type: 'none' as const };
                   const inheritedBgColor = prev.project.spreads.length > 0 ? prev.project.spreads[0].bg_color : '#FFFFFF';

                   const finalEmptySpread = {
                       ...emptySpread,
                       bg_color: inheritedBgColor,
                       bg_config: inheritedBgConfig
                   };

                   return { project: { ...prev.project, spreads: [...prev.project.spreads, finalEmptySpread] } };
                });
            });
        }

        return {
           project: { ...state.project, assets: mergedAssets, spreads: newSpreads },
           activeSpreadId: targetSpread.id
        };
    });

    // Re-pack synchronously mapped geometries flawlessly decoupled
    setTimeout(() => useEditorStore.getState().recalculateFundyMasonryLayout(spreadId), 0);
  },

  executeAutoBookBuilder: (assets, config) => {
    useEditorStore.setState((state) => {
        if (!state.project) return state;
        const newSpreads = [...state.project.spreads];

        // Intercept payloads preventing Asset UUID collisions globally
        const currentAssetIds = new Set(state.project.assets?.map(a => a.id) || []);
        const newAssets = assets.filter(a => !currentAssetIds.has(a.id));
        const mergedAssets = [...(state.project.assets || []), ...newAssets];

        // Sequence Chunking Protocol natively distributing limits cleanly
        const targetCapacity = config.targetPhotosPerSpread || 6;
        const normalizedSequence = normalizeAssetSequence(assets, state.project?.sequenceMode || 'ORIGINAL_ORDER');
        const chunks = groupAssetsForSpread(normalizedSequence, targetCapacity);

        const createdSpreadIds: string[] = [];

        // Find starting cursor mapping backwards avoiding destructive overwrite
        let writePointer = newSpreads.findIndex(s => s.status === 'empty');
        if (writePointer === -1) writePointer = newSpreads.length;

        chunks.forEach((chunk, chunkIdx) => {
             // Create spread container securely preserving arrays
             if (writePointer >= newSpreads.length) {
                 const newId = `spread_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                 newSpreads.push({
                    id: newId,
                    elements: [],
                    status: 'empty',
                    bg_color: '#ffffff'
                 });
             }

              const targetSpread = { ...newSpreads[writePointer], autoBookManaged: true };
             const elementsAcc = [...targetSpread.elements];

             const autoLayout = targetSpread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] };
             const newSeed = (autoLayout.seed !== undefined ? autoLayout.seed : chunkIdx);
             targetSpread.autoLayout = {
                 ...autoLayout,
                 seed: newSeed,
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 mode: 'fundy-masonry-experimental' as any
             };

             // Evaluate Fundy geometry instantly and natively avoiding timeouts
             const slots = generateFundyMasonryLayout({
                 spreadWidth: state.project!.size.w_mm,
                 spreadHeight: state.project!.size.h_mm,
                 photos: chunk.map((asset, idx) => ({
                     id: `el_${Date.now()}_dyn_${chunkIdx}_${idx}`,
                     aspectRatio: (asset.width || 1) / (asset.height || 1)
                 })),
                 gap: autoLayout.fundyGapMm ?? 10,
                 margin: 15,
                 strategy: autoLayout.fundyStrategy ?? 'PRIORITIZE_HEIGHT',
                 flipHorizontal: autoLayout.fundyFlipHorizontal ?? false,
                 variantSeed: newSeed
             });

             chunk.forEach((asset, idx) => {
                 const elId = `el_${Date.now()}_dyn_${chunkIdx}_${idx}`;
                 const slot = slots.find(s => s.photoId === elId);
                 elementsAcc.push({
                    id: elId,
                    type: 'image',
                    previewUrl: asset.previewUrl,
                    originalUrl: asset.originalUrl,
                    previewBlobId: asset.previewBlobId,
                    originalBlobId: asset.originalBlobId,
                    assetId: asset.id,
                    x_mm: slot ? slot.x : 0,
                    y_mm: slot ? slot.y : 0,
                    w_mm: slot ? slot.width : 50,
                    h_mm: slot ? slot.height : 50,
                    rotation_deg: 0,
                    zIndex: elementsAcc.length,
                    isAutoLayoutManaged: true,
                    stageType: 'layout'
                 });
             });

             targetSpread.elements = elementsAcc;
             targetSpread.autoLayout.slots = slots.map(s => ({
                  id: `slot_${s.photoId}`,
                  aspectRatio: s.originalAspectRatio,
                  x_mm: s.x,
                  y_mm: s.y,
                  w_mm: s.width,
                  h_mm: s.height,
                  assignedElementId: s.photoId,
                  assignmentReason: 'AutoBook Sync Gen'
             }));
             targetSpread.status = 'designed'; // Lock to prevent empty detection overrides

             newSpreads[writePointer] = targetSpread;
             createdSpreadIds.push(targetSpread.id);

             writePointer++;
        });

        return {
           project: { ...state.project, assets: mergedAssets, spreads: newSpreads },
           activeSpreadId: createdSpreadIds.length > 0 ? createdSpreadIds[0] : state.activeSpreadId
        };
    });
  },

  rebalanceAutoBookLayout: (options: { targetPhotosPerSpread: number, mode: 'COMPACT' | 'BALANCED' | 'AIRY' }) => set((state) => {
      if (!state.project) return state;
      const newSpreads = [...state.project.spreads];

      const pooledAssets: ProjectAsset[] = [];
      const pooledAssetsIds = new Set<string>();

      const managedSpreadIndices: number[] = [];

      for (let i = 0; i < newSpreads.length; i++) {
         const spread = newSpreads[i];
         if (spread.autoBookManaged && spread.status !== 'empty') {
            managedSpreadIndices.push(i);
            const layoutAssets = spread.elements
                 .filter(e => e.type === 'image' && e.stageType === 'layout' && e.assetId)
                 .map(e => state.project!.assets?.find(a => a.id === e.assetId))
                 .filter((a): a is ProjectAsset => a !== undefined && !pooledAssetsIds.has(a.id));

            layoutAssets.forEach(a => {
                pooledAssets.push(a);
                pooledAssetsIds.add(a.id);
            });

            // Vacate structurally preserving physical boundary for layout reuse
            newSpreads[i] = {
               ...spread,
               elements: [],
               status: 'empty',
               autoBookManaged: false
            };
         }
      }

      if (pooledAssets.length === 0) return state;

      let targetCapacity = options.targetPhotosPerSpread || 6;
      if (options.mode === 'COMPACT') targetCapacity = Math.min(25, targetCapacity + 2);
      else if (options.mode === 'AIRY') targetCapacity = Math.max(1, targetCapacity - 2);

      const normalizedSequence = normalizeAssetSequence(pooledAssets, state.project?.sequenceMode || 'ORIGINAL_ORDER');
      const chunks = groupAssetsForSpread(normalizedSequence, targetCapacity);

      let readPointer = 0;

      chunks.forEach((chunk, chunkIdx) => {
           let writeIdx = -1;
           if (readPointer < managedSpreadIndices.length) {
               writeIdx = managedSpreadIndices[readPointer++];
           } else {
               const newId = `spread_${Date.now()}_dyn_${Math.random().toString(36).substr(2,5)}`;
               writeIdx = newSpreads.length;
               newSpreads.push({
                   id: newId,
                   elements: [],
                   status: 'empty',
                   bg_color: '#ffffff'
               });
           }

           const targetSpread = { ...newSpreads[writeIdx], autoBookManaged: true };
           const elementsAcc = [...targetSpread.elements];

           const autoLayout = targetSpread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] };
           const newSeed = (autoLayout.seed !== undefined ? autoLayout.seed : chunkIdx) + 1;
           targetSpread.autoLayout = {
               ...autoLayout,
               seed: newSeed,
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               mode: 'fundy-masonry-experimental' as any
           };

           const slots = generateFundyMasonryLayout({
               spreadWidth: state.project!.size.w_mm,
               spreadHeight: state.project!.size.h_mm,
               photos: chunk.map((asset, idx) => ({
                   id: `el_${Date.now()}_reb_${chunkIdx}_${idx}`,
                   aspectRatio: (asset.width || 1) / (asset.height || 1)
               })),
               gap: autoLayout.fundyGapMm ?? 10,
               margin: 15,
               strategy: autoLayout.fundyStrategy ?? 'PRIORITIZE_HEIGHT', // Now defaults to PRIORITIZE_VARIANCE inside engine
               flipHorizontal: autoLayout.fundyFlipHorizontal ?? false,
               variantSeed: newSeed
           });

           chunk.forEach((asset, idx) => {
               const elId = `el_${Date.now()}_reb_${chunkIdx}_${idx}`;
               const slot = slots.find(s => s.photoId === elId);
               elementsAcc.push({
                  id: elId,
                  type: 'image',
                  previewUrl: asset.previewUrl,
                  originalUrl: asset.originalUrl,
                  previewBlobId: asset.previewBlobId,
                  originalBlobId: asset.originalBlobId,
                  assetId: asset.id,
                  x_mm: slot ? slot.x : 0,
                  y_mm: slot ? slot.y : 0,
                  w_mm: slot ? slot.width : 50,
                  h_mm: slot ? slot.height : 50,
                  rotation_deg: 0,
                  zIndex: elementsAcc.length,
                  isAutoLayoutManaged: true,
                  stageType: 'layout'
               });
           });

           targetSpread.elements = elementsAcc;
           targetSpread.autoLayout.slots = slots.map(s => ({
                id: `slot_${s.photoId}`,
                aspectRatio: s.originalAspectRatio,
                x_mm: s.x,
                y_mm: s.y,
                w_mm: s.width,
                h_mm: s.height,
                assignedElementId: s.photoId,
                assignmentReason: 'Rebalance Sync Gen'
           }));
           targetSpread.status = 'designed';

           newSpreads[writeIdx] = targetSpread;
      });

      // Eradicate excess trailing empty spreads resolving compaction ghosts dynamically
      while (newSpreads.length > 1 && newSpreads[newSpreads.length - 1].status === 'empty' && newSpreads[newSpreads.length - 1].elements.length === 0) {
          newSpreads.pop();
      }

      return { project: { ...state.project, spreads: newSpreads } };
  }),

  reorderStagedPhotos: (spreadId, sourceId, targetId) => set((state) => {
     if (!state.project) return state;
     const newSpreads = [...state.project.spreads];
     const sIdx = newSpreads.findIndex(s => s.id === spreadId);
     if (sIdx === -1) return state;

     const targetSpread = { ...newSpreads[sIdx] };
     const elements = [...targetSpread.elements];

     const stagingImages = elements.filter(e => e.type === 'image' && e.stageType === 'staged');
     const otherElements = elements.filter(e => !(e.type === 'image' && e.stageType === 'staged'));

     // Determine elements to move mathematically tracking explicit batch subsets
     const stgSel = state.selectedStagedElementIds;
     const idsToMove = (stgSel.length > 0 && stgSel.includes(sourceId)) ? stgSel : [sourceId];

     const extractElements = [];
     for (const id of idsToMove) {
        const idx = stagingImages.findIndex(e => e.id === id);
        if (idx !== -1) {
           extractElements.push(stagingImages.splice(idx, 1)[0]);
        }
     }

     if (extractElements.length > 0) {
        if (targetId === 'end') {
           stagingImages.push(...extractElements);
        } else {
           const tgtIdx = stagingImages.findIndex(e => e.id === targetId);
           if (tgtIdx !== -1) {
              stagingImages.splice(tgtIdx, 0, ...extractElements);
           } else {
              stagingImages.push(...extractElements); // Fallback Append
           }
        }
     }

     const projectW = state.project.size.w_mm;
     const thumbnailW = 40;
     const thumbMaxH = 60;
     const margin = 20;
     const gap = 10;
     const cols = Math.max(1, Math.floor((projectW - (margin * 2)) / (thumbnailW + gap)));

     stagingImages.forEach((el, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        el.x_mm = margin + (col * (thumbnailW + gap));
        el.y_mm = margin + (row * (thumbMaxH + gap));
        el.zIndex = idx;
     });

     targetSpread.elements = [...otherElements, ...stagingImages];
     newSpreads[sIdx] = targetSpread;

     return { project: { ...state.project, spreads: newSpreads }};
  }),

  swapFundyMasonryElements: (spreadId, sourceId, targetId) => set((state) => {
     if (!state.project) return state;
     const newSpreads = [...state.project.spreads];
     const sIdx = newSpreads.findIndex(s => s.id === spreadId);
     if (sIdx === -1) return state;

     const targetSpread = { ...newSpreads[sIdx], autoBookManaged: false };
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     if (!targetSpread.autoLayout || (targetSpread.autoLayout.mode as any) !== 'fundy-masonry-experimental') return state;

     const elements = [...targetSpread.elements];

     // We only re-pack elements part of layout
     const layoutImages = elements.filter(e => e.type === 'image' && e.stageType === 'layout').sort((a, b) => {
         const slotA = targetSpread.autoLayout?.slots.find(s => s.assignedElementId === a.id);
         const slotB = targetSpread.autoLayout?.slots.find(s => s.assignedElementId === b.id);
         if (!slotA || !slotB) return (a.y_mm - b.y_mm) || (a.x_mm - b.x_mm);
         const ordA = targetSpread.autoLayout?.slots.indexOf(slotA) ?? 0;
         const ordB = targetSpread.autoLayout?.slots.indexOf(slotB) ?? 0;
         return ordA - ordB;
     });

     const sElementIdx = layoutImages.findIndex(e => e.id === sourceId);
     const tElementIdx = layoutImages.findIndex(e => e.id === targetId);

     if (sElementIdx === -1 || tElementIdx === -1 || sElementIdx === tElementIdx) return state;

     // Perform array swap internally
     const temp = layoutImages[sElementIdx];
     layoutImages[sElementIdx] = layoutImages[tElementIdx];
     layoutImages[tElementIdx] = temp;

     // Update array manually since we extracted calculation
     const targetSpreadUpdated = { ...targetSpread, elements };
     newSpreads[sIdx] = targetSpreadUpdated;

     // We schedule the layout recalculation right after state maps
     setTimeout(() => useEditorStore.getState().recalculateFundyMasonryLayout(spreadId), 0);
     return { project: { ...state.project, spreads: newSpreads } };
  }),

  recalculateFundyMasonryLayout: (spreadId) => set((state) => {
      if (!state.project) return state;
      const tIndex = state.project.spreads.findIndex(s => s.id === spreadId);
      if (tIndex === -1) return state;

      const spread = state.project.spreads[tIndex];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!spread.autoLayout || (spread.autoLayout.mode as any) !== 'fundy-masonry-experimental') return state;

      const elements = [...spread.elements];

      const layoutImages = elements.filter(e => e.type === 'image' && e.stageType === 'layout').sort((a, b) => {
          const slotA = spread.autoLayout!.slots.find(s => s.assignedElementId === a.id);
          const slotB = spread.autoLayout!.slots.find(s => s.assignedElementId === b.id);
          if (!slotA || !slotB) return (a.y_mm - b.y_mm) || (a.x_mm - b.x_mm);
          const ordA = spread.autoLayout!.slots.indexOf(slotA);
          const ordB = spread.autoLayout!.slots.indexOf(slotB);
          return ordA - ordB;
      });

      const findAR = (assetId: string) => {
          const ast = state.project!.assets?.find(a => a.id === assetId);
          return ast ? (ast.width || 1) / (ast.height || 1) : 1;
      };

      const gap = spread.autoLayout.fundyGapMm ?? 10;
      const strategy = spread.autoLayout.fundyStrategy ?? 'PRIORITIZE_HEIGHT';
      const flipHorizontal = spread.autoLayout.fundyFlipHorizontal ?? false;
      const variantSeed = spread.autoLayout.seed ?? 0;

      const slots = generateFundyMasonryLayout({
          spreadWidth: state.project!.size.w_mm,
          spreadHeight: state.project!.size.h_mm,
          photos: layoutImages.map(p => ({ id: p.id, aspectRatio: findAR(p.assetId!) })),
          gap,
          margin: 15,
          strategy,
          flipHorizontal,
          variantSeed
      });

      for (let i = 0; i < elements.length; i++) {
         const el = elements[i];
         if (el.type === 'image' && el.stageType === 'layout') {
            const slot = slots.find(s => s.photoId === el.id);
            if (slot) {
               elements[i] = {
                  ...el,
                  x_mm: slot.x,
                  y_mm: slot.y,
                  w_mm: slot.width,
                  h_mm: slot.height
               };
            }
         }
      }

      const updatedSpreads = [...state.project.spreads];
      updatedSpreads[tIndex] = {
          ...spread,
          elements,
          autoLayout: {
              ...spread.autoLayout,
              slots: slots.map(s => ({
                  id: `slot_${s.photoId}`,
                  aspectRatio: s.originalAspectRatio,
                  x_mm: s.x,
                  y_mm: s.y,
                  w_mm: s.width,
                  h_mm: s.height,
                  assignedElementId: s.photoId,
                  assignmentReason: 'Engine Recalculate'
              }))
          }
      };

      return { project: { ...state.project, spreads: updatedSpreads } };
  }),

  setFundyStrategy: (spreadId, strategy) => {
      useEditorStore.setState(state => {
          if (!state.project) return state;
          const tIndex = state.project.spreads.findIndex(s => s.id === spreadId);
          if (tIndex === -1) return state;
          const updatedSpreads = [...state.project.spreads];
          const spread = updatedSpreads[tIndex];
          updatedSpreads[tIndex] = {
              ...spread,
              autoLayout: {
                  ...(spread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] }),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  mode: 'fundy-masonry-experimental' as any,
                  fundyStrategy: strategy
              }
          };
          return { project: { ...state.project, spreads: updatedSpreads } };
      });
      useEditorStore.getState().recalculateFundyMasonryLayout(spreadId);
  },

  setFundyGapMm: (spreadId, gapMm) => {
      useEditorStore.setState(state => {
          if (!state.project) return state;
          const tIndex = state.project.spreads.findIndex(s => s.id === spreadId);
          if (tIndex === -1) return state;
          const updatedSpreads = [...state.project.spreads];
          const spread = updatedSpreads[tIndex];
          updatedSpreads[tIndex] = {
              ...spread,
              autoLayout: {
                  ...(spread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] }),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  mode: 'fundy-masonry-experimental' as any,
                  fundyGapMm: gapMm
              }
          };
          return { project: { ...state.project, spreads: updatedSpreads } };
      });
      useEditorStore.getState().recalculateFundyMasonryLayout(spreadId);
  },

  toggleFundyFlipHorizontal: (spreadId) => {
      useEditorStore.setState(state => {
          if (!state.project) return state;
          const tIndex = state.project.spreads.findIndex(s => s.id === spreadId);
          if (tIndex === -1) return state;
          const updatedSpreads = [...state.project.spreads];
          const spread = updatedSpreads[tIndex];
          const prevFlip = spread.autoLayout?.fundyFlipHorizontal ?? false;
          updatedSpreads[tIndex] = {
              ...spread,
              autoLayout: {
                  ...(spread.autoLayout || { isActive: true, variantId: 'fundy-0', slots: [] }),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  mode: 'fundy-masonry-experimental' as any,
                  fundyFlipHorizontal: !prevFlip
              }
          };
          return { project: { ...state.project, spreads: updatedSpreads } };
      });
      useEditorStore.getState().recalculateFundyMasonryLayout(spreadId);
  },

  moveStagedPhotoAcrossSpreads: (sourceSpreadId, targetSpreadId, elementId) => set((state) => {
     if (!state.project) return state;
     const newSpreads = [...state.project.spreads];
     const sIdx = newSpreads.findIndex(s => s.id === sourceSpreadId);
     const tIdx = newSpreads.findIndex(s => s.id === targetSpreadId);
     if (sIdx === -1 || tIdx === -1) return state;

     const sourceSpread = { ...newSpreads[sIdx] };
     const targetSpread = { ...newSpreads[tIdx] };

     const sourceElements = [...sourceSpread.elements];
     let targetElements = [...targetSpread.elements];

     const elIndex = sourceElements.findIndex(e => e.id === elementId);
     if (elIndex === -1) return state;

     // Extract element safely
     const [movedElement] = sourceElements.splice(elIndex, 1);

     // Calculate sequence bounds (Pushing to end of staging matrix in target spread natively)
     const stagedInTarget = targetElements.filter(e => e.type === 'image' && e.stageType === 'staged');
     const otherInTarget = targetElements.filter(e => !(e.type === 'image' && e.stageType === 'staged'));

     stagedInTarget.push(movedElement);
     targetElements = [...otherInTarget, ...stagedInTarget];

     const projectW = state.project.size.w_mm;
     const thumbnailW = 40;
     const thumbMaxH = 60;
     const margin = 20;
     const gap = 10;
     const cols = Math.max(1, Math.floor((projectW - (margin * 2)) / (thumbnailW + gap)));

     // Recalculate Source Grid bounds
     const stagedInSource = sourceElements.filter(e => e.type === 'image' && e.stageType === 'staged');
     const otherInSource = sourceElements.filter(e => !(e.type === 'image' && e.stageType === 'staged'));
     stagedInSource.forEach((el, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        el.x_mm = margin + (col * (thumbnailW + gap));
        el.y_mm = margin + (row * (thumbMaxH + gap));
        el.zIndex = idx;
     });
     sourceSpread.elements = [...otherInSource, ...stagedInSource];

     // Recalculate Target Grid bounds
     stagedInTarget.forEach((el, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        el.x_mm = margin + (col * (thumbnailW + gap));
        el.y_mm = margin + (row * (thumbMaxH + gap));
        el.zIndex = idx;
     });
     targetSpread.elements = [...otherInTarget, ...stagedInTarget];

     newSpreads[sIdx] = sourceSpread;
     newSpreads[tIdx] = targetSpread;

     return { project: { ...state.project, spreads: newSpreads }, activeSpreadId: targetSpreadId };
  }),

  removeAsset: (assetId) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    const asset = assets.find(a => a.id === assetId);

    // Fire explicit garbage collection strictly routed across the IDBDriver
    if (asset) {
      storage.removeAsset(asset).catch(console.error);
    }

    return { project: { ...state.project, assets: assets.filter(a => a.id !== assetId) } };
  }),

  updateAsset: (assetId, updates) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return {
      project: {
        ...state.project,
        assets: assets.map(a => a.id === assetId ? { ...a, ...updates } : a)
      }
    };
  }),

  setAssetPriority: (assetId, priority) => set((state) => {
    if (!state.project) return state;
    const assets = state.project.assets || [];
    return {
      project: {
        ...state.project,
        assets: assets.map(a => a.id === assetId ? { ...a, metadata: { ...(a.metadata || { sourceOrderIndex: 0 }), manualPriority: priority } } : a)
      }
    };
  }),

  bringForward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1 || idx === elements.length - 1) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.splice(idx + 1, 0, target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendBackward: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx <= 0) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.splice(idx - 1, 0, target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  reorderElementsList: (spreadId, oldIndex, newIndex) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);

      const target = elements.splice(oldIndex, 1)[0];
      elements.splice(newIndex, 0, target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  bringToFront: (spreadId: string, elementId: string) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx === -1 || idx === elements.length - 1) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.push(target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  sendToBack: (spreadId: string, elementId: string) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((spread) => {
      if (spread.id !== spreadId) return spread;
      const elements = [...spread.elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = elements.findIndex(e => e.id === elementId);
      if (idx <= 0) return spread;

      const target = elements.splice(idx, 1)[0];
      elements.unshift(target);

      const immutableElements = elements.map((el, index) => ({ ...el, zIndex: index }));
      return { ...spread, elements: immutableElements };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),
    }),
    {
       partialize: (state) => ({ project: state.project })
    }
  )
);

// Global Auto-Save Interceptor
useEditorStore.subscribe((state, prevState) => {
  if (
    state.project &&
    state.project !== prevState.project &&
    state.project.id &&
    state.project.storageMode === 'local'
  ) {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      const latestProject = useEditorStore.getState().project;
      if (latestProject) {
        projectStorage.saveProject(latestProject);
      }
    }, 800); // Debounce to allow continuous slider drags & grouped mutators to settle natively
  }
});
