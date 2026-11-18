"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import Inspector from '@/components/Inspector';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import AssetTray from '@/components/AssetTray';
import PhotoBrowser from '@/components/browser/PhotoBrowser';
import ProjectManager from '@/components/ProjectManager';
import SetupModal from '@/components/project/SetupModal';
import { projectStorage } from '@/utils/projectStorage';
import { EditorProject } from '@/types/editor';

export default function AppPage() {
  const t = useTranslations('Editor');
  const locale = useLocale();
  const isEs = locale === 'es';
  const loadProject = useEditorStore((state) => state.loadProject);
  const project = useEditorStore((state) => state.project);
  const hasProject = useEditorStore((state) => Boolean(state.project));
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const removeElement = useEditorStore((state) => state.removeElement);
  const workspaceView = useEditorStore((state) => state.workspaceView);
  const loadAssetToCanvas = useEditorStore((state) => state.loadAssetToCanvas);
  const activeBrowserAssetId = useEditorStore((state) => state.activeBrowserAssetId);
  const selectedBrowserAssetIds = useEditorStore((state) => state.selectedBrowserAssetIds);
  const canvasBatchAssetIds = useEditorStore((state) => state.canvasBatchAssetIds);

  const [viewMode, setViewMode] = useState<'initializing' | 'picker' | 'editor'>('initializing');
  const [showSetup, setShowSetup] = useState(false);
  const [defaultFolderForNew, setDefaultFolderForNew] = useState<string | undefined>(undefined);
  const [defaultCategoryForNew, setDefaultCategoryForNew] = useState<'album' | 'studio_print' | 'raw' | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [init, setInit] = useState(false);
  const [canvasHud, setCanvasHud] = useState<{ stars: number; text: string } | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerHud = (data: { stars: number; text: string }) => {
    setCanvasHud(data);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setCanvasHud(null);
    }, 1400);
  };

  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = `/${locale}/login`;
    }
  }, [user, loading, locale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // INITIAL BOOT SEQUENCE
  useEffect(() => {
    if (!mounted || init) return;

    const bootSequence = async () => {
      try {
        const list = projectStorage.getAllProjects();
        const lastSessionId = localStorage.getItem('rvp_last_open_project_id');

        if (lastSessionId) {
          let recoveringProject = projectStorage.loadProject(lastSessionId);

          if (recoveringProject) {
            // Attempt full hydration if blobs exist
            try {
               const { loadProjectFromDB, hydrateProjectBlobs } = await import('@/utils/persistence');
               const hydratedDB = await loadProjectFromDB(lastSessionId);
               recoveringProject = await hydrateProjectBlobs(hydratedDB || recoveringProject);
            } catch (e) {
               console.warn("Hydration boot upgrade bypassed.", e);
            }

            localStorage.removeItem('rvp_last_open_project_id');
            loadProject(recoveringProject);
            setViewMode('editor');
            setInit(true);
            return;
          }
        }

        if (list.length > 0) {
          setViewMode('picker');
        } else {
          setViewMode('picker');
          setShowSetup(true);
        }
      } catch (e) {
        console.error(e);
        setViewMode('picker');
      }
      setInit(true);
    };

    bootSequence();
  }, [mounted, init, loadProject]);

  // LOAD PROJECT HANDLER
  const handleOpenProject = async (id: string) => {
    setViewMode('initializing');
    try {
      let projectToLoad = projectStorage.loadProject(id);

      // Attempt full hydration if blobs exist
      try {
         const { loadProjectFromDB } = await import('@/utils/persistence');
         const hydratedDB = await loadProjectFromDB(id);
         if (hydratedDB) projectToLoad = hydratedDB;
      } catch (e) {
         console.warn("Hydration upgrade bypassed.", e);
      }

      if (projectToLoad) {
        // GUARD: Healing missing attributes
        if (!projectToLoad.size || !projectToLoad.size.w_mm || typeof projectToLoad.size.w_mm === 'undefined') {
          projectToLoad.size = { w_mm: 508, h_mm: 254 };
        } else if (projectToLoad.size.w_mm === 514 && projectToLoad.size.h_mm === 260) {
          // Explicitly heal only the hardcoded 514x260 legacy bug back to exactly 20x10 inches (508x254mm)
          projectToLoad.size = { w_mm: 508, h_mm: 254 };
        }

        if (typeof projectToLoad.bleed_mm === 'undefined') projectToLoad.bleed_mm = 3;
        if (typeof projectToLoad.safe_zone_mm === 'undefined') projectToLoad.safe_zone_mm = 5;
        if (!projectToLoad.title) projectToLoad.title = 'Untitled Album';

        // GUARD: Heal legacy rounded integer millimeter bugs (e.g. 610mm -> 609.6mm for 24in)
        if (projectToLoad.size) {
          const inW = projectToLoad.size.w_mm / 25.4;
          const inH = projectToLoad.size.h_mm / 25.4;
          const nearestHalfInW = Math.round(inW * 2) / 2;
          const nearestHalfInH = Math.round(inH * 2) / 2;
          if (Math.abs(inW - nearestHalfInW) < 0.05) {
            projectToLoad.size.w_mm = Number((nearestHalfInW * 25.4).toFixed(4));
          }
          if (Math.abs(inH - nearestHalfInH) < 0.05) {
            projectToLoad.size.h_mm = Number((nearestHalfInH * 25.4).toFixed(4));
          }
        }

        // GUARD: Heal studio_print projects to strictly 1 spread and single canvas bounds
        if (projectToLoad.projectCategory === 'studio_print') {
          if (projectToLoad.spreads.length > 1) {
            projectToLoad.spreads = [projectToLoad.spreads[0]];
            projectToLoad.totalSpreads = 1;
          }
          projectToLoad.bleed_mm = 0;
          projectToLoad.safe_zone_mm = 2;
          projectStorage.saveProject(projectToLoad);
        }

        // GUARD: Healing missing elements arrays within active spreads
        projectToLoad.spreads = projectToLoad.spreads.map(s => ({
          ...s,
          elements: s.elements || []
        }));

        // Fully hydrate Blobs for both Asset Tray and Spread Elements
        const { hydrateProjectBlobs } = await import('@/utils/persistence');
        projectToLoad = await hydrateProjectBlobs(projectToLoad);

        loadProject(projectToLoad);
        setViewMode('editor');
      } else {
        setViewMode('picker');
      }
    } catch (e) {
      console.error('Failed to load project:', e);
      setViewMode('picker');
    }
  };

  // CREATE PROJECT HANDLER
  const handleCreateProject = (
    name: string,
    bookLine: string,
    labPresetId: string,
    sizeStr?: string,
    projectCategory: 'album' | 'studio_print' = 'album',
    dpi: number = 300,
    orientation: 'portrait' | 'landscape' = 'portrait',
    folder?: string,
    workflowMode?: 'studio' | 'raw'
  ) => {
    // Dynamic Geometry Extraction parsing the selected size string. e.g "Flushmount 10x10", "8x10in", or "Custom 12x12in"
    let w_mm = 508;
    let h_mm = 254;

    const sourceSize = sizeStr || bookLine; // fallback gracefully if 4th arg is missing

    try {
      if (sourceSize.startsWith('Custom ')) {
        const parts = sourceSize.replace('Custom ', '').replace('in', '').split('x');
        if (parts.length === 2) {
          const wInches = parseFloat(parts[0]);
          const hInches = parseFloat(parts[1]);
          if (projectCategory === 'studio_print') {
            w_mm = Number((wInches * 25.4).toFixed(4));
            h_mm = Number((hInches * 25.4).toFixed(4));
          } else {
            // A single page is wInches. The spread is wInches * 2.
            w_mm = Number(((wInches * 2) * 25.4).toFixed(4));
            h_mm = Number((hInches * 25.4).toFixed(4));
          }
        }
      } else if (sourceSize.includes('x')) {
        // Handlers for "Flushmount 10x10", "8x10in", "16x20in", "24x30in", etc.
        const match = sourceSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
        if (match) {
          const wInches = parseFloat(match[1]);
          const hInches = parseFloat(match[2]);
          if (projectCategory === 'studio_print') {
            w_mm = Number((wInches * 25.4).toFixed(4));
            h_mm = Number((hInches * 25.4).toFixed(4));
          } else {
            w_mm = Number(((wInches * 2) * 25.4).toFixed(4));
            h_mm = Number((hInches * 25.4).toFixed(4));
          }
        }
      }
    } catch(err) {
      console.warn("Failed to parse geometric constraints, falling back to 20x10 default.", err);
    }

    const newId = `proj_${Date.now()}`;
    const newProject: EditorProject = {
      id: newId,
      title: name,
      type: bookLine,
      labPresetId: labPresetId,
      labPresetName: labPresetId === 'pic-pro-lab' ? 'Pic Pro Lab' : labPresetId === 'studio-lab' ? 'Photo Studio Print' : 'Custom Lab',
      storageMode: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectVersion: 1,
      projectCategory,
      targetDpi: dpi,
      orientation,
      folder: folder || undefined,
      totalSpreads: projectCategory === 'studio_print' ? 1 : undefined,
      size: { w_mm, h_mm },
      bleed_mm: projectCategory === 'studio_print' ? 0 : 3,
      safe_zone_mm: projectCategory === 'studio_print' ? 2 : 5,
      spreads: [
        {
          id: `spread_${Date.now()}`,
          bg_color: '#ffffff',
          pageCount: projectCategory === 'studio_print' ? 1 : 2,
          elements: []
        }
      ]
    };

    projectStorage.saveProject(newProject);
    setShowSetup(false);
    if (workflowMode === 'raw' || bookLine === 'type_raw_session') {
      useEditorStore.getState().setWorkspaceView('browser');
    }
    handleOpenProject(newId);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Phase 8.G Fix: Key Repeat Storm Guard
      if (e.repeat) return;

      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // If user is currently in Photo Browser (Biblioteca), yield key events to PhotoBrowser component
      const currentWorkspace = useEditorStore.getState().workspaceView;
      if (currentWorkspace === 'browser') {
        return;
      }

      const state = useEditorStore.getState();
      const stgSel = state.selectedStagedElementIds;
      const project = state.project;
      const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';
      const isSinglePhotoMode = isRawSession || project?.projectCategory === 'studio_print';

      // 1. STAR RATING & FAVORITE LOCK IN CANVAS MODE (Rating is strictly done in Library / PhotoBrowser)
      const isDigit = e.key >= '0' && e.key <= '5';
      const isNumpad = e.code.startsWith('Numpad') && e.code.length === 7 && e.code[6] >= '0' && e.code[6] <= '5';
      if (((isDigit || isNumpad) || e.key.toLowerCase() === 'f') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        triggerHud({
          stars: -1,
          text: isEs ? '🔒 Calificación bloqueada en Lienzo (Gestionar en Biblioteca [G])' : '🔒 Rating locked on Canvas (Manage in Library [G])',
        });
        return;
      }

      // CROP MODE SHORTCUTS (Enter = Apply, Escape = Cancel, R = Reset)
      if (state.isCropMode) {
        if (e.key === 'Enter') {
          e.preventDefault();
          state.applyCropMode();
          triggerHud({
            stars: -1,
            text: isEs ? '✓ Recorte y Rotación Aplicados' : '✓ Crop & Straighten Applied',
          });
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          state.cancelCropMode();
          triggerHud({
            stars: -1,
            text: isEs ? '✕ Recorte Cancelado' : '✕ Crop Cancelled',
          });
          return;
        }
        if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          state.resetCropDraft();
          triggerHud({
            stars: -1,
            text: isEs ? '↺ Recorte Restablecido' : '↺ Crop Reset',
          });
          return;
        }
      }

      // CROP TOOL TOGGLE (C)
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (state.isCropMode) {
          state.applyCropMode();
          triggerHud({
            stars: -1,
            text: isEs ? '✓ Recorte Aplicado' : '✓ Crop Applied',
          });
        } else {
          state.startCropMode();
          triggerHud({
            stars: -1,
            text: isEs ? '✂️ Recorte y Rotación [C]' : '✂️ Crop & Straighten [C]',
          });
        }
        return;
      }

      // 2. SWITCH TO GRID / BIBLIOTECA (G) (Cleans canvas in raw session)
      if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (isRawSession) {
          state.clearCanvasSession();
        } else {
          state.setWorkspaceView('browser');
        }
        return;
      }

      // 3. BEFORE / AFTER SPLIT VIEW TOGGLE (\ or Y)
      if ((e.key === '\\' || e.key.toLowerCase() === 'y') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const nextMode = state.beforeAfterMode === 'split' ? 'off' : 'split';
        state.setBeforeAfterMode(nextMode);
        triggerHud({
          stars: -1,
          text: nextMode === 'split' ? (isEs ? 'Antes / Después: Activado' : 'Before / After: ON') : (isEs ? 'Antes / Después: Desactivado' : 'Before / After: OFF'),
        });
        return;
      }

      // 4. CAMERA RAW PRO / STUDIO PRINT ARROW NAVIGATION (Next/Previous Photo strictly within active canvas batch)
      if (isSinglePhotoMode && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const allAssets = project?.assets || [];
        if (allAssets.length === 0) return;

        // Strictly constrain navigation to the batch sent from the library!
        const batchIds = state.canvasBatchAssetIds && state.canvasBatchAssetIds.length > 0
          ? state.canvasBatchAssetIds
          : state.selectedBrowserAssetIds && state.selectedBrowserAssetIds.length > 0
          ? state.selectedBrowserAssetIds
          : [];

        const eligibleAssets = batchIds.length > 0
          ? allAssets.filter((a) => batchIds.includes(a.id))
          : allAssets;

        if (eligibleAssets.length === 0) return;

        const activeSpread = project?.spreads.find(s => s.id === (activeSpreadId || project?.spreads[0]?.id));
        const currentImg = activeSpread?.elements.find(el => el.type === 'image');
        const currentAssetId = currentImg?.assetId || state.activeBrowserAssetId || eligibleAssets[0].id;
        const currentIdx = eligibleAssets.findIndex(a => a.id === currentAssetId);

        let nextIdx = currentIdx !== -1 ? currentIdx : 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          nextIdx = Math.min(eligibleAssets.length - 1, nextIdx + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          nextIdx = Math.max(0, nextIdx - 1);
        }

        if (nextIdx !== currentIdx && eligibleAssets[nextIdx]) {
          const nextAsset = eligibleAssets[nextIdx];
          state.setActiveBrowserAssetId(nextAsset.id);
          state.loadAssetToCanvas(nextAsset);
          triggerHud({
            stars: nextAsset.rating || 0,
            text: `${isEs ? 'Foto' : 'Photo'} ${nextIdx + 1}/${eligibleAssets.length}: ${nextAsset.name}`,
          });
        }
        return;
      }

      // ENTER TO APPLY CROP
      if (e.key === 'Enter' && state.isCropMode) {
        e.preventDefault();
        state.applyCropMode();
        triggerHud({
          stars: -1,
          text: isEs ? '✓ Recorte Aplicado' : '✓ Crop Applied',
        });
        return;
      }

      if (e.key === 'Escape') {
         const store = useEditorStore.getState();
         if (store.isCropMode) {
            e.stopPropagation();
            store.cancelCropMode();
            triggerHud({
              stars: -1,
              text: isEs ? '✕ Recorte Cancelado' : '✕ Crop Cancelled',
            });
            return;
         }
         if (store.selectedStagedElementIds.length > 0 || store.selectedElementId) {
            e.stopPropagation();
            store.clearStagedSelection();
            store.setSelectedElement(null);
         }
         return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeSpreadId) {
           const activeSpread = project?.spreads.find(s => s.id === activeSpreadId);
           if (selectedElementId) {
             const selEl = activeSpread?.elements.find(el => el.id === selectedElementId);
             if (!selEl?.locked) {
               removeElement(activeSpreadId, selectedElementId);
             }
           } else if (stgSel.length > 0) {
             stgSel.forEach(id => {
               const el = activeSpread?.elements.find(item => item.id === id);
               if (!el?.locked) removeElement(activeSpreadId, id);
             });
             state.clearStagedSelection();
           }
        }
        return;
      }

      // Keyboard Navigation for Staging Phase 8.G! (Album mode only)
      if (activeSpreadId && project && (e.key.startsWith('Arrow'))) {
         const spreadIndex = project.spreads.findIndex(s => s.id === activeSpreadId);
         if (spreadIndex !== -1) {
            const spread = project.spreads[spreadIndex];
            const stagingImages = spread.elements.filter(el => el.type === 'image' && el.stageType === 'staged');

            if (stagingImages.length > 0) {
               // Navigation
               if (!e.metaKey && !e.ctrlKey) {
                  // Standard Selection Nav
                  if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                     e.preventDefault();

                     // Compute valid effective columns natively (Phase 8.G Fix Vertical)
                     const projectW = project.size.w_mm;
                     const targetCols = Math.max(1, Math.floor((projectW - 40) / 50));

                     if (stgSel.length === 0) {
                        state.setStagedSelection([stagingImages[0].id]);
                     } else {
                        const lastSel = stgSel[stgSel.length - 1];
                        const currentIndex = stagingImages.findIndex(el => el.id === lastSel);
                        if (currentIndex !== -1) {
                           let nextIdx = currentIndex;
                           if (e.key === 'ArrowRight') nextIdx += 1;
                           if (e.key === 'ArrowLeft') nextIdx -= 1;
                           if (e.key === 'ArrowDown') nextIdx += targetCols;
                           if (e.key === 'ArrowUp') nextIdx -= targetCols;

                           if (nextIdx < 0) nextIdx = 0;
                           if (nextIdx >= stagingImages.length) nextIdx = stagingImages.length - 1;

                           if (e.shiftKey) {
                              // Proper range anchoring Phase 8.G Fix: Bidirectional Array Segment!
                              const firstSelIdx = stagingImages.findIndex(el => el.id === stgSel[0]);
                              const start = Math.min(firstSelIdx, nextIdx);
                              const end = Math.max(firstSelIdx, nextIdx);
                              const newSelection = [];
                              for(let i = start; i <= end; i++) {
                                 newSelection.push(stagingImages[i].id);
                              }
                              state.setStagedSelection(newSelection);
                           } else {
                              state.setStagedSelection([stagingImages[nextIdx].id]);
                           }
                        }
                     }
                  }
               } else {
                  // Moving groups via Cmd/Ctrl + Arrow
                  if (stgSel.length > 0) {
                     e.preventDefault();
                     const firstSel = stgSel[0];
                     if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                        // Move within spread
                        const currentIndex = stagingImages.findIndex(el => el.id === firstSel);
                        if (e.key === 'ArrowRight') {
                           const targetIdx = currentIndex + stgSel.length + 1;
                           if (targetIdx >= stagingImages.length) {
                              state.reorderStagedPhotos(activeSpreadId, firstSel, "end");
                           } else {
                              state.reorderStagedPhotos(activeSpreadId, firstSel, stagingImages[targetIdx] ? stagingImages[targetIdx].id : "end");
                           }
                        } else {
                           const targetIdx = currentIndex - 1;
                           if (targetIdx >= 0) {
                              state.reorderStagedPhotos(activeSpreadId, firstSel, stagingImages[targetIdx].id);
                           }
                        }
                     } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { // Cross spread!
                        const targetSpreadIdx = e.key === 'ArrowDown' ? spreadIndex + 1 : spreadIndex - 1;
                        if (targetSpreadIdx >= 0 && targetSpreadIdx < project.spreads.length) {
                             const tgtSpread = project.spreads[targetSpreadIdx];
                             state.moveStagedPhotoAcrossSpreads(activeSpreadId, tgtSpread.id, firstSel);
                             // Change active spread so camera follows natively
                             state.setActiveSpread(tgtSpread.id);
                        }
                     }
                  }
               }
            }
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSpreadId, selectedElementId, removeElement]);

  // WATCH FOR PROJECT UNLOAD
  useEffect(() => {
    if (viewMode === 'editor' && !hasProject) {
      setViewMode('picker');
    }
  }, [hasProject, viewMode]);

  // Auto-mount active/first photo when entering Canvas in Camera Raw Pro / Studio single-photo mode
  useEffect(() => {
    if (workspaceView !== 'canvas' || !project) return;
    const isRaw = project.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';
    if (!isRaw) return;

    // In Raw session: if canvas was cleared/finalized, DO NOT auto-mount! Canvas stays completely clean.
    if (isRaw && (!canvasBatchAssetIds || canvasBatchAssetIds.length === 0)) return;

    const assets = project.assets || [];
    if (assets.length === 0) return;

    const activeSpread = project.spreads.find((s) => s.id === activeSpreadId) || project.spreads[0];
    if (!activeSpread) return;

    // Respect active canvas batch sent from the browser
    const batch = canvasBatchAssetIds.length > 0
      ? assets.filter((a) => canvasBatchAssetIds.includes(a.id))
      : selectedBrowserAssetIds.length > 0
      ? assets.filter((a) => selectedBrowserAssetIds.includes(a.id))
      : assets;

    const candidatePool = batch.length > 0 ? batch : assets;
    const currentImg = activeSpread.elements.find((e) => e.type === 'image');
    const targetAssetId = activeBrowserAssetId || candidatePool[0]?.id || assets[0].id;
    const targetAsset = candidatePool.find((a) => a.id === targetAssetId) || candidatePool[0] || assets[0];

    // If canvas is empty or photo on canvas is different from selected/target photo, mount with matching aspect ratio
    if (!currentImg || currentImg.assetId !== targetAsset.id) {
      loadAssetToCanvas(targetAsset);
    }
  }, [workspaceView, project?.id, activeSpreadId, activeBrowserAssetId, selectedBrowserAssetIds, canvasBatchAssetIds, loadAssetToCanvas, project]);

  if (!mounted || loading) return <div className="h-screen w-screen bg-white dark:bg-neutral-950" />;
  if (!user) return null; // Block render loop unconditionally while redirect bounds process
  if (viewMode === 'initializing') return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-black dark:text-white font-medium">{t('initializing')}</div>;

  if (viewMode === 'picker') {
    return (
      <>
        <ProjectManager
          onOpenProject={handleOpenProject}
          onNewProject={(folder, category) => {
            setDefaultFolderForNew(folder);
            setDefaultCategoryForNew(category);
            setShowSetup(true);
          }}
        />
        {showSetup && (
          <SetupModal
            initialFolder={defaultFolderForNew}
            initialCategory={defaultCategoryForNew}
            onCancel={() => {
              setDefaultFolderForNew(undefined);
              setDefaultCategoryForNew(undefined);
              setShowSetup(false);
            }}
            onCreate={handleCreateProject}
          />
        )}
      </>
    );
  }

  const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <Toolbar />
      {workspaceView === 'browser' ? (
        <PhotoBrowser isEs={locale === 'es'} />
      ) : (
        <div className="flex-1 flex overflow-hidden w-full">
          {!isRawSession && <Sidebar />}
          <main className="flex-1 relative flex flex-col h-full min-w-0">
            <div className="flex-1 relative overflow-hidden min-h-0 min-w-0">
              <EditorWorkspace />
            </div>
            <AssetTray />
          </main>
          <Inspector />
        </div>
      )}

      {/* ===================== CANVAS SHORTCUTS HUD NOTIFICATION ===================== */}
      {canvasHud && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-neutral-950/95 backdrop-blur-md text-white border border-neutral-700/80 rounded-full px-5 py-2 text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          {canvasHud.stars > 0 ? (
            <>
              <span className="text-amber-400 text-base leading-none tracking-wider">
                {'★'.repeat(canvasHud.stars)}{'☆'.repeat(5 - canvasHud.stars)}
              </span>
              <span className="text-neutral-200">{canvasHud.text}</span>
            </>
          ) : canvasHud.stars === 0 ? (
            <>
              <span className="text-neutral-400 font-bold">✕</span>
              <span className="text-neutral-300">{canvasHud.text}</span>
            </>
          ) : (
            <span className="text-neutral-200">{canvasHud.text}</span>
          )}
        </div>
      )}
    </div>
  );
}
