"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebouncedCallback } from 'use-debounce';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';
import Inspector from '@/components/Inspector';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import AssetTray from '@/components/AssetTray';
import ProjectManager from '@/components/ProjectManager';
import SetupModal from '@/components/project/SetupModal';
import { projectStorage } from '@/utils/projectStorage';
import { EditorProject } from '@/types/editor';

export default function AppPage() {
  const t = useTranslations('Editor');
  const loadProject = useEditorStore((state) => state.loadProject);
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const removeElement = useEditorStore((state) => state.removeElement);
  
  const [viewMode, setViewMode] = useState<'initializing' | 'picker' | 'editor'>('initializing');
  const [showSetup, setShowSetup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [init, setInit] = useState(false);

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
               const { loadProjectFromDB } = await import('@/utils/persistence');
               const hydratedDB = await loadProjectFromDB(lastSessionId);
               if (hydratedDB) recoveringProject = hydratedDB;
               
               // Memory patching for initial boot
               const { get: idbGet } = await import('idb-keyval');

               // Patch assets
               if (recoveringProject.assets) {
                  recoveringProject.assets = await Promise.all(recoveringProject.assets.map(async (asset) => {
                     const newAsset = { ...asset };
                     if (!newAsset.previewUrl && newAsset.previewBlobId) {
                         const blob = await idbGet<Blob>(newAsset.previewBlobId);
                         if (blob) newAsset.previewUrl = URL.createObjectURL(blob);
                     }
                     return newAsset;
                  }));
               }

               // Patch spread elements
               recoveringProject.spreads = await Promise.all(recoveringProject.spreads.map(async (spread) => {
                  const hydratedElements = await Promise.all(spread.elements.map(async (el) => {
                     if (el.type === 'image' && !el.previewUrl && el.previewBlobId) {
                         const newEl = { ...el };
                         const blob = await idbGet<Blob>(el.previewBlobId);
                         if (blob) newEl.previewUrl = URL.createObjectURL(blob);
                         return newEl;
                     }
                     return el;
                  }));
                  return { ...spread, elements: hydratedElements };
               }));
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

        // GUARD: Healing missing elements arrays within active spreads
        projectToLoad.spreads = projectToLoad.spreads.map(s => ({
          ...s,
          elements: s.elements || []
        }));

        // In-memory memory patching for missing blobs!
        const { get: idbGet } = await import('idb-keyval');
        
        if (projectToLoad.assets) {
            projectToLoad.assets = await Promise.all(projectToLoad.assets.map(async (asset) => {
               const newAsset = { ...asset };
               if (!newAsset.previewUrl && newAsset.previewBlobId) {
                   const blob = await idbGet<Blob>(newAsset.previewBlobId);
                   if (blob) newAsset.previewUrl = URL.createObjectURL(blob);
               }
               return newAsset;
            }));
        }

        // Patch spread elements
        projectToLoad.spreads = await Promise.all(projectToLoad.spreads.map(async (spread) => {
            const hydratedElements = await Promise.all(spread.elements.map(async (el) => {
               if (el.type === 'image' && !el.previewUrl && el.previewBlobId) {
                   const newEl = { ...el };
                   const blob = await idbGet<Blob>(el.previewBlobId);
                   if (blob) newEl.previewUrl = URL.createObjectURL(blob);
                   return newEl;
               }
               return el;
            }));
            return { ...spread, elements: hydratedElements };
        }));

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
  const handleCreateProject = (name: string, bookLine: string, labPresetId: string, sizeStr?: string) => {
    // Dynamic Geometry Extraction parsing the selected size string. e.g "Flushmount 10x10" or "Custom 12x12in"
    let w_mm = 508;
    let h_mm = 254;

    const sourceSize = sizeStr || bookLine; // fallback gracefully if 4th arg is missing

    try {
      if (sourceSize.startsWith('Custom ')) {
        const parts = sourceSize.replace('Custom ', '').replace('in', '').split('x');
        if (parts.length === 2) {
          const wInches = parseFloat(parts[0]);
          const hInches = parseFloat(parts[1]);
          // A single page is wInches. The spread is wInches * 2.
          w_mm = Math.round((wInches * 2) * 25.4);
          h_mm = Math.round(hInches * 25.4);
        }
      } else if (sourceSize.includes('x')) {
        // Handlers for "Flushmount 10x10", "Flushmount 5x5", "Flushmount 20x8", etc.
        const match = sourceSize.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
        if (match) {
          const wInches = parseFloat(match[1]);
          const hInches = parseFloat(match[2]);
          w_mm = Math.round((wInches * 2) * 25.4);
          h_mm = Math.round(hInches * 25.4);
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
      labPresetName: labPresetId === 'pic-pro-lab' ? 'Pic Pro Lab' : 'Custom Lab',
      storageMode: 'local',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectVersion: 1,
      size: { w_mm, h_mm },

      bleed_mm: 3,
      safe_zone_mm: 5,
      spreads: [
        {
          id: `spread_${Date.now()}`,
          bg_color: '#ffffff',
          elements: []
        }
      ]
    };

    projectStorage.saveProject(newProject);
    setShowSetup(false);
    handleOpenProject(newId);
  };

  // MOCK AUTOSAVE DEBOUNCE (Hardened with deep string comparison)
  const [saveStatus, setSaveStatus] = useState<string>('');
  const lastSavedStr = useRef<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debouncedSave = useDebouncedCallback((p: any) => {
    const pStr = JSON.stringify(p);
    if (pStr === lastSavedStr.current) return; // Prevent unnecessary DB calls
    lastSavedStr.current = pStr;
    
    // Real DB Save is handled globally by Zustand subscribe in useEditorStore!
    // To be safe we can force an explicit LocalStorage backup just for the active hook:
    projectStorage.saveProject(p);

    setSaveStatus(t('save_success'));
    setTimeout(() => setSaveStatus(''), 2000);
  }, 1000);

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
      
      if (e.key === 'Escape') {
         const store = useEditorStore.getState();
         if (store.selectedStagedElementIds.length > 0 || store.selectedElementId) {
            e.stopPropagation();
            store.clearStagedSelection();
            store.setSelectedElement(null);
         }
         return;
      }
      
      const state = useEditorStore.getState();
      const stgSel = state.selectedStagedElementIds;
      const project = state.project;
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeSpreadId) {
           if (selectedElementId) {
             removeElement(activeSpreadId, selectedElementId);
           } else if (stgSel.length > 0) {
             stgSel.forEach(id => removeElement(activeSpreadId, id));
             state.clearStagedSelection();
           }
        }
        return;
      }

      // Keyboard Navigation for Staging Phase 8.G!
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
    if (viewMode === 'editor' && !project) {
      setViewMode('picker');
    }
  }, [project, viewMode]);

  useEffect(() => {
    if (!mounted || viewMode !== 'editor' || !project) return;
    setSaveStatus(t('saving'));
    debouncedSave(project);
  }, [project, viewMode, mounted, debouncedSave, t]);

  if (!mounted) return <div className="h-screen w-screen bg-white dark:bg-neutral-950" />;
  if (viewMode === 'initializing') return <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-black dark:text-white font-medium">{t('initializing')}</div>;

  if (viewMode === 'picker') {
    return (
      <>
        <ProjectManager 
          onOpenProject={handleOpenProject} 
          onNewProject={() => setShowSetup(true)} 
        />
        {showSetup && (
          <SetupModal 
            onCancel={() => setShowSetup(false)} 
            onCreate={handleCreateProject} 
          />
        )}
      </>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-neutral-900 dark:text-neutral-100">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden w-full">
        <Sidebar />
        <main className="flex-1 relative flex flex-col h-full min-w-0">
          <div className="flex-1 relative overflow-hidden min-h-0 min-w-0">
            <EditorWorkspace />
          </div>
          <AssetTray />
          
          {/* MOCK SAVING INDICATOR UI */}
          {saveStatus && (
            <div className="absolute top-4 right-4 bg-black text-white text-xs px-3 py-1 rounded shadow-lg opacity-50 z-50">
              {saveStatus}
            </div>
          )}
        </main>
        <Inspector />
      </div>
    </div>
  );
}
