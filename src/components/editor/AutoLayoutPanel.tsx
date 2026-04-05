"use client";

import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { generateAutoLayout } from '@/lib/autoLayoutLibrary';
import { resolveEditorialAssignment, analyzePhotoSet } from '@/lib/editorialAssignmentEngine';
import { PhotoMetadata } from '@/types/editor';
import { LayoutTemplate, Wand2, RefreshCw, Lock, AlertTriangle, AlertCircle, Sparkles, Grid } from 'lucide-react';

export default function AutoLayoutPanel() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const updateSpread = useEditorStore((state) => state.updateSpread);
  
  if (!project || !activeSpreadId) return null;
  const spread = project.spreads.find((s) => s.id === activeSpreadId);
  if (!spread) return null;

  const isActive = spread.autoLayout?.isActive || false;
  // Limit to generic images for composition, ignoring locked elements
  const eligibleImages = spread.elements.filter(e => e.type === 'image' && !e.locked);
  const photoCount = eligibleImages.length;

  const currentVariantId = spread.autoLayout?.variantId || 'none';
  const currentSeed = spread.autoLayout?.seed || 0;
  const currentMode = spread.autoLayout?.mode || 'geometric';

  // Extract metrics natively providing isolated inputs separating engines flawlessly
  const photosData: PhotoMetadata[] = eligibleImages.map((el, index) => {
      const ratio = el.w_mm / (el.h_mm || 1);
      const orient = ratio > 1.2 ? 'landscape' : ratio < 0.8 ? 'portrait' : 'square';
      
      // Phase 7.I.3: Calculate structural baseline Visual Weight heuristic cleanly
      const areaMultiplier = (el.w_mm * el.h_mm) / 100000;
      const orderBonus = Math.max(0, 5 - index); // Narrative bias naturally weighting earlier inputs  
      const visualWeight = areaMultiplier + (orderBonus * 0.2);

      return { 
         elementId: el.id, 
         width: el.w_mm, 
         height: el.h_mm, 
         aspectRatio: ratio, 
         orientation: orient,
         originalIndex: index,
         visualWeight,
         editorialRole: el.editorialRole || 'auto'
      };
  });

  // Phase 7.I.2: Analyze optimal compositional layout boundary dynamically evaluating sets
  const optimalFamily = currentMode === 'editorial' ? analyzePhotoSet(photosData) : 'geometric';

  // Layer 1: Geometric Structure Preview resolving math explicitly filtered by intelligent bounds
  const previewLayout = generateAutoLayout({
      photoCount,
      width: project.size.w_mm,
      height: project.size.h_mm,
      gap: 10,
      margin: 15,
      seed: currentSeed,
      preferredFamily: optimalFamily
  });
  
  const totalAvailableVariants = previewLayout.totalAvailableVariants;
  const maxSupportedPhotos = previewLayout.maxSupportedPhotos;
  const excessPhotos = photoCount > maxSupportedPhotos ? photoCount - maxSupportedPhotos : 0;
  const placedPhotos = photoCount > maxSupportedPhotos ? maxSupportedPhotos : photoCount;

  // Phase 8.A: Global Project Telemetry Counters HUD
  const totalAssets = project.assets?.length || 0;
  const globalUsedAssetsCount = new Set(
     project.spreads.flatMap(s => s.elements).filter(e => e.type === 'image' && e.assetId).map(e => e.assetId)
  ).size;
  const totalSpreads = project.spreads.length;

  const applyLayout = (forceIncrement: boolean = false, overrideMode?: 'geometric' | 'editorial') => {
     if (photoCount === 0) return;
     
     const nextMode = overrideMode || currentMode;
     const targetFamily = nextMode === 'editorial' ? analyzePhotoSet(photosData) : 'geometric';
     const nextSeed = forceIncrement ? currentSeed + 1 : currentSeed;
     
     // Pipeline 1: Pure Structure mapping respecting constraints
     const layout = generateAutoLayout({
         photoCount,
         width: project.size.w_mm,
         height: project.size.h_mm,
         gap: 10,
         margin: 15,
         seed: nextSeed,
         preferredFamily: targetFamily
     });

     // Pipeline 2: Editorial Semantic Assignments Orchestrator tracing priorities natively
     const resolvedSlots = resolveEditorialAssignment({
         slots: layout.slots,
         photos: photosData,
         mode: nextMode
     });

     const newElements = [...spread.elements];

     for (let i = 0; i < newElements.length; i++) {
        const el = newElements[i];
        if (el.type === 'image' && !el.locked) {
           const slot = resolvedSlots.find(s => s.assignedElementId === el.id);
           if (slot) {
              newElements[i] = {
                 ...el,
                 x_mm: slot.x_mm,
                 y_mm: slot.y_mm,
                 w_mm: slot.w_mm,
                 h_mm: slot.h_mm,
                 rotation_deg: 0,
                 isAutoLayoutManaged: true, // Seal it geometrically
                 stageType: 'layout',
                 assignmentReason: slot.assignmentReason
              };
           } else {
              // Gracefully release extra/unassigned images 
              newElements[i] = { ...el, isAutoLayoutManaged: false, assignmentReason: 'Desconectado del motor (Sobrepaso)', stageType: 'staged' };
           }
        }
     }

     updateSpread(activeSpreadId, {
        elements: newElements,
        autoLayout: {
           isActive: true,
           variantId: layout.variantId,
           slots: resolvedSlots, 
           seed: nextSeed,
           mode: nextMode
        }
     });
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 mb-6 uppercase">{t('tab_layout')}</h2>

      {/* Phase 8.A: Global Spreads Counter HUD */}
      <div className="flex bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg mb-6 px-3 py-2.5 items-center justify-between shadow-sm">
         <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Flujo Editorial</span>
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{globalUsedAssetsCount} / {totalAssets} fotos</span>
         </div>
         <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Volumen</span>
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{totalSpreads} páginas creadas</span>
         </div>
      </div>
      
      {/* Engine Mode Toggle */}
      <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg mb-6">
        <button
          onClick={() => applyLayout(false, 'geometric')}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all gap-1.5 ${
            currentMode === 'geometric' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          {t('al_mode_geometric')}
        </button>
        <button
          onClick={() => applyLayout(false, 'editorial')}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all gap-1.5 ${
            currentMode === 'editorial' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          {t('al_mode_editorial')}
        </button>
      </div>

      {/* Status Card */}
      <div className={`mb-6 p-4 rounded-lg border flex flex-col gap-3 ${isActive ? (currentMode === 'editorial' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800') : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800'}`}>
         <div className="flex items-center gap-2">
            {isActive ? <Lock className={`w-4 h-4 ${currentMode === 'editorial' ? 'text-indigo-500' : 'text-blue-500'}`} /> : <LayoutTemplate className="w-4 h-4 text-neutral-500" />}
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
              {isActive ? t('al_active') : t('al_free')}
            </span>
         </div>
         {isActive && (
            <div className={`text-xs px-2 py-1 rounded inline-block w-max font-mono flex-col gap-1 items-start justify-center ${currentMode === 'editorial' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40' : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40'}`}>
               <div>Variant: {currentVariantId}</div>
               {currentMode === 'editorial' && <div className="opacity-75 uppercase text-[10px] tracking-wider mt-1 border-t border-indigo-200 dark:border-indigo-800 pt-1">Family: {optimalFamily}</div>}
            </div>
         )}
      </div>

      {photoCount === 0 ? (
        <div className="text-center p-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-400 text-xs">
           <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
           {t('al_empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
           {!isActive && (
             <div className="flex bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-700 dark:text-amber-400 mb-2 gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('al_warning')}</span>
             </div>
           )}

           {excessPhotos > 0 && (
             <div className="flex bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 rounded text-xs text-red-700 dark:text-red-400 mb-2 gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('al_excess_photos', { placed: placedPhotos.toString(), remaining: excessPhotos.toString() })}</span>
             </div>
           )}

           <button 
             onClick={() => applyLayout(false)}
             className={`w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-bold rounded transition-all ${!isActive ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg border border-indigo-500 hover:scale-[1.02]' : currentMode === 'editorial' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
           >
             <Wand2 className="w-5 h-5" />
             {!isActive ? 'Crear Diseño Automático' : t('al_apply')}
           </button>

           <button 
             onClick={() => applyLayout(true)}
             disabled={!isActive || totalAvailableVariants <= 1}
             className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <RefreshCw className="w-4 h-4" />
             {totalAvailableVariants <= 1 ? t('al_one_variant') : t('al_next')}
           </button>
        </div>
      )}
    </div>
  );
}
