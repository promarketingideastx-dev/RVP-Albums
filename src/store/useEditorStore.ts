import { create } from 'zustand';
import { temporal } from 'zundo';
import { EditorProject, EditorElement, ProjectAsset, GlobalImageStyles, SpreadBackgroundConfig } from '@/types/editor';
import { storage } from '@/storage';
import { TYPOGRAPHY_PRESETS } from '@/lib/typography-presets';

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

  loadProject: (project: EditorProject) => void;
  unloadProject: () => void;
  setActiveSpread: (spreadId: string) => void;
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
  reorderStagedPhotos: (spreadId: string, sourceElementId: string, targetElementId: string) => void; // Phase 8.B: Native Grid Hook
  moveStagedPhotoAcrossSpreads: (sourceSpreadId: string, targetSpreadId: string, elementId: string) => void; // Phase 8.C: Cross Spread Hook
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<ProjectAsset>) => void;

  bringForward: (spreadId: string, elementId: string) => void;
  sendBackward: (spreadId: string, elementId: string) => void;
  reorderElementsList: (spreadId: string, oldIndex: number, newIndex: number) => void;
  bringToFront: (spreadId: string, elementId: string) => void;
  sendToBack: (spreadId: string, elementId: string) => void;
  applyTypographyPreset: (presetId: string) => void;

  updateGlobalImageStyles: (styles: Partial<GlobalImageStyles>) => void;
  updateSpreadBackground: (spreadId: string, config: Partial<SpreadBackgroundConfig>) => void;
  resetGlobalImageStyles: () => void;
  resetSpreadBackground: (spreadId: string) => void;
  resetAllGlobalStyles: () => void;

  addGuide: (spreadId: string, guide: import('@/types/editor').SpreadGuide) => void;
  updateGuide: (spreadId: string, guideId: string, changes: Partial<import('@/types/editor').SpreadGuide>) => void;
  removeGuide: (spreadId: string, guideId: string) => void;
  clearGuides: (spreadId: string) => void;
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

  toggleMeasurementUnit: () => set((state) => ({ measurementUnit: state.measurementUnit === 'in' ? 'cm' : 'in' })),
  setPreviewOriginalPhotoId: (id) => set({ previewOriginalPhotoId: id }),
  setWorkspaceZoom: (zoom) => set({ workspaceZoom: zoom }),
  setWorkspacePan: (pan) => set((state) => ({ workspacePan: typeof pan === 'function' ? pan(state.workspacePan) : pan })),

  loadProject: (project) => set({ project, activeSpreadId: project.spreads[0]?.id || null }),
  unloadProject: () => set({ project: null, activeSpreadId: null, selectedElementId: null, previewOriginalPhotoId: null }),
  setActiveSpread: (id) => set({ activeSpreadId: id }),
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
      return { ...s, ...changes };
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
            elements: newElements.map(e => e.isAutoLayoutManaged ? { ...e, isAutoLayoutManaged: false, stageType: 'free' as const } : e)
         };
      }

      return { ...spread, elements: newElements };
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
    return {
      project: {
        ...state.project,
        globalImageStyles: { ...(state.project.globalImageStyles || {}), ...styles }
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

  resetGlobalImageStyles: () => set((state) => {
    if (!state.project) return state;
    return {
      project: { ...state.project, globalImageStyles: undefined }
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
      
      return { ...s, elements: reindexedElements };
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
       newSpreads.push({ id: `spread_${Date.now()}`, bg_color: '#FFFFFF', elements: [], guides: [] });
    }

    let currentSpreadIndex = newSpreads.findIndex(s => s.id === state.activeSpreadId);
    if (currentSpreadIndex === -1) currentSpreadIndex = 0;

    let targetSpread = { ...newSpreads[currentSpreadIndex] };
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

    newAssets.forEach((asset, idx) => {
       if (currentPhotosInSpread >= dynamicCapacity) {
          targetSpread.elements = [...elementsAcc];
          newSpreads[currentSpreadIndex] = targetSpread;
          
          currentSpreadIndex++;
          if (currentSpreadIndex >= newSpreads.length) {
              newSpreads.push({
                 id: `spread_${Date.now()}_${idx}`,
                 bg_color: '#FFFFFF',
                 elements: [],
                 guides: []
              });
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
    newSpreads[currentSpreadIndex] = targetSpread;

    return { 
       project: { ...state.project, assets: mergedAssets, spreads: newSpreads },
       activeSpreadId: newSpreads[currentSpreadIndex].id
    };
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
