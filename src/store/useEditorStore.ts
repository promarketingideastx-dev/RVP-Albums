import { create } from 'zustand';
import { temporal } from 'zundo';
import { EditorProject, EditorElement, ProjectAsset, GlobalImageStyles, SpreadBackgroundConfig } from '@/types/editor';
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

  workspaceZoom: number | null; // null = dynamic auto-fit. number = user override scale.
  setWorkspaceZoom: (zoom: number | null) => void;

  workspacePan: { x: number; y: number };
  setWorkspacePan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;

  editorViewMode: 'GRID' | 'SINGLE';
  setEditorViewMode: (mode: 'GRID' | 'SINGLE') => void;

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

  updateElement: (spreadId: string, elementId: string, changes: Partial<EditorElement>) => void;
  addElement: (spreadId: string, element: EditorElement) => void;
  removeElement: (spreadId: string, elementId: string) => void;
  duplicateElement: (spreadId: string, elementId: string) => void;
  createGroup: (spreadId: string) => void;
  updateSpread: (spreadId: string, changes: Partial<import('@/types/editor').Spread>) => void;

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

  addGuide: (spreadId: string, guide: import('@/types/editor').SpreadGuide) => void;
  updateGuide: (spreadId: string, guideId: string, changes: Partial<import('@/types/editor').SpreadGuide>) => void;
  removeGuide: (spreadId: string, guideId: string) => void;
  clearGuides: (spreadId: string) => void;
  setSequenceMode: (mode: 'ORIGINAL_ORDER' | 'CHRONOLOGICAL' | 'MANUAL_PRIORITY') => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
  project: null,
  activeSpreadId: null,
  draggingStagedElementId: null,
  stagingDropPreviewIndex: null,
  selectedElementId: null,
  selectedStagedElementIds: [],
  measurementUnit: 'in',
  previewOriginalPhotoId: null,
  workspaceZoom: null,
  workspacePan: { x: 0, y: 0 },
  editorViewMode: 'GRID',

  toggleMeasurementUnit: () => set((state) => ({ measurementUnit: state.measurementUnit === 'in' ? 'cm' : 'in' })),
  setPreviewOriginalPhotoId: (id) => set({ previewOriginalPhotoId: id }),
  setWorkspaceZoom: (zoom) => set({ workspaceZoom: zoom }),
  setWorkspacePan: (pan) => set((state) => ({ workspacePan: typeof pan === 'function' ? pan(state.workspacePan) : pan })),
  setEditorViewMode: (mode) => set({ editorViewMode: mode }),

  loadProject: (project) => set({ project, activeSpreadId: project.spreads[0]?.id || null, editorViewMode: 'GRID' }),
  unloadProject: () => set({ project: null, activeSpreadId: null, selectedElementId: null, previewOriginalPhotoId: null }),
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

    return { project: { ...state.project, spreads: newSpreads } };
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

  addGuide: (spreadId, guide) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: [...(s.guides || []), guide] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  updateGuide: (spreadId, guideId, changes) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      const newGuides = (s.guides || []).map(g => g.id === guideId ? { ...g, ...changes } : g);
      return { ...s, guides: newGuides };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  removeGuide: (spreadId, guideId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: (s.guides || []).filter(g => g.id !== guideId) };
    });
    return { project: { ...state.project, spreads: newSpreads } };
  }),

  clearGuides: (spreadId) => set((state) => {
    if (!state.project) return state;
    const newSpreads = state.project.spreads.map((s) => {
      if (s.id !== spreadId) return s;
      return { ...s, guides: [] };
    });
    return { project: { ...state.project, spreads: newSpreads } };
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

  duplicateElement: (spreadId, elementId) => set((state) => {
    if (!state.project) return state;
    const spread = state.project.spreads.find(s => s.id === spreadId);
    if (!spread) return state;
    const element = spread.elements.find(e => e.id === elementId);
    if (!element) return state;

    const newElement = { 
      ...element, 
      id: crypto.randomUUID(),
      x_mm: element.x_mm + 10,
      y_mm: element.y_mm + 10,
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
       newSpreads.push({ id: `spread_${Date.now()}`, bg_color: '#FFFFFF', elements: [], guides: [], status: 'empty' });
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
                   guides: [],
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
                     guides: [],
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
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
useEditorStore.subscribe((state) => {
  if (state.project && state.project.id && state.project.storageMode === 'local') {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
          projectStorage.saveProject(state.project!);
      }, 500); // Debounce to allow grouped mutators to settle natively
  }
});
