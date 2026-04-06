"use client";

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEditorStore } from '@/store/useEditorStore';
import { useStore } from 'zustand';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { exportToPDF, exportToJPG } from '@/utils/exportEngine';
import { exportProjectToFile } from '@/utils/exportImport';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { storage } from '@/storage';
import { v4 as uuidv4 } from 'uuid';
import ExportModal, { ExportModalOptions } from './ExportModal';

export default function Toolbar() {
  const t = useTranslations('Editor');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const bringForward = useEditorStore((state) => state.bringForward);
  const sendBackward = useEditorStore((state) => state.sendBackward);
  const project = useEditorStore((state) => state.project);
  const unloadProject = useEditorStore((state) => state.unloadProject);
  const measurementUnit = useEditorStore((state) => state.measurementUnit);
  const toggleMeasurementUnit = useEditorStore((state) => state.toggleMeasurementUnit);
  const goToNextSpread = useEditorStore((state) => state.goToNextSpread);
  const goToPrevSpread = useEditorStore((state) => state.goToPrevSpread);
  const editorViewMode = useEditorStore((state) => state.editorViewMode);
  const setEditorViewMode = useEditorStore((state) => state.setEditorViewMode);
  
  // Zundo Undo/Redo Temporal State Engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { undo, redo, pastStates, futureStates } = useStore(useEditorStore.temporal as any) as any;
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Dynamic HUD Logic
  const totalPages = project?.spreads.reduce((acc, spread) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagesInSpread = (spread as any).pageCount || 2; 
    return acc + pagesInSpread;
  }, 0) || 0;

  const totalAssets = project?.assets?.length || 0;
  
  // Calculate unique assets used across the entire project
  const usedAssetIds = new Set<string>();
  project?.spreads.forEach(spread => {
    spread.elements.forEach(el => {
      if (el.assetId) usedAssetIds.add(el.assetId);
    });
  });
  
  const uniquePhotosUsed = usedAssetIds.size;
  const uniquePhotosUnused = Math.max(0, totalAssets - uniquePhotosUsed);

  const completedSpreadsCount = project?.spreads.filter(s => s.status === 'completed').length || 0;

  const currentIdx = project ? project.spreads.findIndex(s => s.id === activeSpreadId) : -1;
  const isFirstSpread = currentIdx <= 0;
  const maxSpreads = project?.totalSpreads || Infinity;
  const isLastSpread = currentIdx >= 0 && currentIdx >= maxSpreads - 1;

  // Remove legacy complex Pro Export States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleAdvancedExport = async (options: ExportModalOptions) => {
      if (isExporting || !project) return;
      setIsExportModalOpen(false);
      setIsExporting(true);
      setExportProgress(0);
      setExportStatus('idle');

      // Force render frame to unblock UI
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        if (options.type === 'pdf') {
           await exportToPDF(project, {
               rangeStart: options.rangeStart ? options.rangeStart - 1 : undefined,
               rangeEnd: options.rangeEnd ? options.rangeEnd - 1 : undefined,
               onProgress: (current, total) => setExportProgress(Math.round((current / total) * 100))
           });
        } else {
           await exportToJPG(project, {
               type: options.type as 'print' | 'web',
               webQuality: options.webQuality,
               rangeStart: options.rangeStart ? options.rangeStart - 1 : undefined,
               rangeEnd: options.rangeEnd ? options.rangeEnd - 1 : undefined,
               onProgress: (current, total) => setExportProgress(Math.round((current / total) * 100))
           });
        }
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 2500);
      } catch (err) {
        console.error("Export Failed:", err);
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 4000);
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
  };

  const swapLocale = () => {
    if (project?.id) {
      localStorage.setItem('rvp_last_open_project_id', project.id);
    }
    const nextLocale = pathname.startsWith('/es') ? '/en' : '/es';
    window.location.href = nextLocale;
  };



  const handleRename = async () => {
    if (!project) return;
    const newName = window.prompt("Enter new project name:", project.title);
    if (newName && newName.trim() !== '') {
       // Deep copy needed to ensure state isn't mutated directly
       const updatedProject = { ...project, title: newName.trim(), updatedAt: new Date().toISOString() };
       useEditorStore.setState({ project: updatedProject });
       await storage.saveProject(updatedProject);
    }
  };

  const handleDuplicate = async () => {
    if (!project) return;
    try {
      setIsExporting(true); // Spin loader during heavy IDB cloning
      const clonedProject = JSON.parse(JSON.stringify(project));
      clonedProject.id = uuidv4();
      clonedProject.title = `${project.title} (Copy)`;
      clonedProject.updatedAt = new Date().toISOString();
      await storage.saveProject(clonedProject);
      alert('Project Duplicated successfully! Return to Projects menu to open it.');
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate project.');
    } finally {
      setIsExporting(false);
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      {/* GLOBAL MASS EXPORT OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl p-8 flex flex-col items-center border border-neutral-200 dark:border-neutral-800 w-80">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-medium text-lg text-neutral-900 dark:text-neutral-100">{t('exporting')}</p>
            {exportProgress > 0 && (
              <div className="mt-4 w-full">
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Progress</span>
                  <span className="font-mono">{exportProgress}%</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      {/* TOAST NOTIFICATIONS */}
      {exportStatus === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_success')}</span>
        </div>
      )}
      {exportStatus === 'error' && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-3 rounded shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <span className="font-medium">{t('export_error')}</span>
        </div>
      )}

      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 flex items-center justify-between relative z-40">
        <div className="flex items-center gap-3">
          <button 
             onClick={unloadProject}
             className="w-8 h-8 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full transition"
             title="Back to Projects"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
          </button>
          <div className="flex-1 flex justify-center items-center group">
           <button
              onClick={handleRename}
              className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Rename Project"
           >
              <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                {project?.title || t('title')}
              </span>
              <svg className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
           </button>
           <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-3 ml-2">
              <button 
                onClick={() => undo()}
                disabled={!pastStates || pastStates.length === 0}
                className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                title={"Deshacer (Ctrl+Z)"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button 
                onClick={() => redo()}
                disabled={!futureStates || futureStates.length === 0}
                className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                title={"Rehacer (Ctrl+Y)"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            
            {/* Book Navigation HUD */}
            {project && currentIdx !== -1 && (
              <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-3 ml-2">
                 <button
                    onClick={() => setEditorViewMode(editorViewMode === 'GRID' ? 'SINGLE' : 'GRID')}
                    className={`w-8 h-8 flex items-center justify-center rounded transition ${editorViewMode === 'GRID' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 font-bold' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title={editorViewMode === 'GRID' ? "Single Page View" : "Story View"}
                 >
                    {editorViewMode === 'GRID' ? (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>
                    ) : (
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/></svg>
                    )}
                 </button>

                 <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

                 <button
                   onClick={goToPrevSpread}
                   disabled={isFirstSpread}
                   className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                   title="Previous Spread"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                 </button>
                 
                 <div className="flex flex-col items-center justify-center px-3">
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 font-medium tracking-wider whitespace-nowrap text-center leading-tight">
                       Pág <span className="font-bold text-neutral-800 dark:text-neutral-200">{currentIdx + 1}</span> / {maxSpreads < Infinity ? maxSpreads : project.spreads.length}
                    </div>
                    <div className="text-[9px] uppercase font-bold text-green-600 dark:text-green-500 tracking-wider mb-0.5" title="Spreads Terminados">
                       ✓ {completedSpreadsCount} / {maxSpreads < Infinity ? maxSpreads : project.spreads.length}
                    </div>
                 </div>
                 
                 <button
                   onClick={goToNextSpread}
                   disabled={isLastSpread}
                   className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                   title="Next Spread"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
              </div>
            )}
            
            {/* Global HUD Stats */}
            {project && (
              <div className="flex items-center gap-4 border-l border-neutral-200 dark:border-neutral-800 pl-4 ml-4 text-xs font-mono tracking-tight">
                 <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-3 py-1">
                    <div className="flex flex-col items-center" title="Total Pages">
                       <span className="text-[9px] text-neutral-400 uppercase font-sans tracking-widest leading-none">Pgs</span>
                       <span className="font-bold text-neutral-800 dark:text-neutral-200">{totalPages}</span>
                    </div>
                    <div className="flex flex-col items-center" title="Total Spreads">
                       <span className="text-[9px] text-neutral-400 uppercase font-sans tracking-widest leading-none">Sprd</span>
                       <span className="font-bold text-neutral-800 dark:text-neutral-200">{project.spreads.length}</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-3 py-1">
                    <div className="flex flex-col items-center" title="Total Photos Uploaded">
                       <span className="text-[9px] text-neutral-400 uppercase font-sans tracking-widest leading-none">Load</span>
                       <span className="font-bold text-blue-600 dark:text-blue-400">{totalAssets}</span>
                    </div>
                    <div className="flex flex-col items-center" title="Unique Photos Used (Asset ID)">
                       <span className="text-[9px] text-neutral-400 uppercase font-sans tracking-widest leading-none">Used</span>
                       <span className="font-bold text-green-600 dark:text-green-400">{uniquePhotosUsed}</span>
                    </div>
                    <div className="flex flex-col items-center" title="Unused Photos">
                       <span className="text-[9px] text-neutral-400 uppercase font-sans tracking-widest leading-none">Free</span>
                       <span className="font-bold text-neutral-600 dark:text-neutral-400">{uniquePhotosUnused}</span>
                    </div>
                 </div>
              </div>
            )}
         </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedElementId && activeSpreadId && (
            <>
              <button 
                onClick={() => bringForward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_up')}
              </button>
              <button 
                onClick={() => sendBackward(activeSpreadId, selectedElementId)}
                className="px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                 {t('order_down')}
              </button>
            </>
          )}
        </div>
        {/* Unit Toggle & Export Tools */}
        <div className="flex items-center gap-4">
            {/* Native Ruler Unit Toggle */}
            <button 
              onClick={toggleMeasurementUnit}
              className="px-3 py-1.5 flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm font-bold tracking-wide transition-colors text-neutral-600 dark:text-neutral-300"
              title="Toggle Ruler Units (Inches / Centimeters)"
            >
              <span>📏 {measurementUnit === 'in' ? t('inches') : t('centimeters')}</span>
            </button>

            {/* Print Export Button */}
            <div className="relative" ref={menuRef}>
            <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="px-4 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded hover:bg-black dark:hover:bg-neutral-200 transition flex items-center gap-1.5"
            >
              Export
              <svg className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
             {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 animate-in fade-in slide-in-from-top-2 z-50">
                 <button onClick={() => { setIsMenuOpen(false); setIsExportModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition font-bold">
                   ⚡ Advanced Export...
                 </button>
                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1"></div>
                 
                 <div className="px-3 pt-2 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Project Actions</div>
                 
                 <button 
                   onClick={() => { if (project) exportProjectToFile(project); setIsMenuOpen(false); }} 
                   className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-medium"
                 >
                   Export Session (.rvp)
                 </button>
                 <button 
                   onClick={handleDuplicate} 
                   className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition rounded-b-md"
                 >
                   Duplicate Project
                 </button>
              </div>
            )}
          </div>

          <button 
             onClick={swapLocale}
             className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            {t('language')}
          </button>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-sm w-24 py-1 border border-neutral-200 dark:border-neutral-800 rounded text-center hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
          >
            {theme === 'dark' ? t('theme_light') : t('theme_dark')}
          </button>
          
          <button 
             onClick={async () => { await signOut(auth); }}
             className="text-sm px-3 py-1 font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition"
          >
             Cerrar Sesión
          </button>
        </div>
      </header>
      
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleAdvancedExport}
        totalPages={totalPages}
      />
    </>
  );
}
