"use client";

import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { generateAutoLayout } from '@/lib/autoLayoutLibrary';
import { resolveEditorialAssignment, analyzePhotoSet } from '@/lib/editorialAssignmentEngine';
import { PhotoMetadata } from '@/types/editor';
import { LayoutTemplate, Wand2, RefreshCw, Lock, AlertTriangle, AlertCircle, Sparkles, CheckCircle2, Sliders, ArrowLeftRight } from 'lucide-react';

export default function AutoLayoutPanel() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const updateSpread = useEditorStore((state) => state.updateSpread);
  const markSpreadCompleted = useEditorStore((state) => state.markSpreadCompleted);
  const setFundyStrategy = useEditorStore((state) => state.setFundyStrategy);
  const setFundyGapMm = useEditorStore((state) => state.setFundyGapMm);
  const toggleFundyFlipHorizontal = useEditorStore((state) => state.toggleFundyFlipHorizontal);
  
  if (!project || !activeSpreadId) return null;
  const spread = project.spreads.find((s) => s.id === activeSpreadId);
  if (!spread) return null;

  const isActive = spread.autoLayout?.isActive || false;
  // Limit to generic images for composition, ignoring locked elements
  const eligibleImages = spread.elements.filter(e => e.type === 'image' && !e.locked);
  const photoCount = eligibleImages.length;

  const currentVariantId = spread.autoLayout?.variantId || 'none';
  const currentSeed = spread.autoLayout?.seed || 0;
  const rawMode = spread.autoLayout?.mode;
  const currentMode = (!rawMode || rawMode === 'geometric') ? 'fundy-masonry-experimental' : rawMode;
  const isCompleted = spread.status === 'completed';

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

  const applyLayout = (forceIncrement: boolean = false, overrideMode?: 'geometric' | 'editorial' | 'fundy-masonry-experimental') => {
     if (photoCount === 0) return;
     
     const nextMode = overrideMode || currentMode;
     const targetFamily = nextMode === 'editorial' ? analyzePhotoSet(photosData) : 'geometric';
     const nextSeed = forceIncrement ? currentSeed + 1 : currentSeed;
     
     if (nextMode === 'fundy-masonry-experimental') {
         import('@/core/layout/fundyMasonryEngine').then(({ generateFundyMasonryLayout }) => {
             const slots = generateFundyMasonryLayout({
                 spreadWidth: project.size.w_mm,
                 spreadHeight: project.size.h_mm,
                 photos: photosData.map(p => ({ id: p.elementId, aspectRatio: p.aspectRatio })),
                 gap: spread.autoLayout?.fundyGapMm || 10,
                 margin: 15,
                 variantSeed: nextSeed,
                 strategy: spread.autoLayout?.fundyStrategy,
                 flipHorizontal: spread.autoLayout?.fundyFlipHorizontal
             });
             
             const newElements = [...spread.elements];
             for (let i = 0; i < newElements.length; i++) {
                const el = newElements[i];
                if (el.type === 'image' && !el.locked) {
                   const slot = slots.find(s => s.photoId === el.id);
                   if (slot) {
                      newElements[i] = {
                         ...el,
                         x_mm: slot.x,
                         y_mm: slot.y,
                         w_mm: slot.width,
                         h_mm: slot.height,
                         rotation_deg: 0,
                         isAutoLayoutManaged: true,
                         stageType: 'layout',
                         assignmentReason: 'Masonry Dynamic Generation'
                      };
                   } else {
                      newElements[i] = { ...el, isAutoLayoutManaged: false, assignmentReason: 'Desconectado', stageType: 'staged' };
                   }
                }
             }

             updateSpread(activeSpreadId, {
                elements: newElements,
                status: 'designed',
                autoLayout: {
                   isActive: true,
                   variantId: `Fundy.Masonry [${photoCount}]`,
                   // Map format back to old ast for persistence
                   slots: slots.map(s => ({ id: `slot_${s.photoId}`, aspectRatio: s.width / s.height, x_mm: s.x, y_mm: s.y, w_mm: s.width, h_mm: s.height, assignedElementId: s.photoId, assignmentReason: 'Masonry Row Packing' })), 
                   seed: nextSeed,
                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                   mode: nextMode as any
                }
             });
         });
         return; // Async resolution handled
     }
     
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
         mode: nextMode as 'geometric' | 'editorial'
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
        status: 'designed',
        autoLayout: {
           isActive: true,
           variantId: layout.variantId,
           slots: resolvedSlots, 
           seed: nextSeed,
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           mode: nextMode as any
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
      <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg mb-6 gap-1">
        <button
          onClick={() => applyLayout(false, 'editorial')}
          className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-all gap-1.5 ${
            currentMode === 'editorial' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
          title="Legacy Semantic Editorial"
        >
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Edit
        </button>
        <button
          onClick={() => applyLayout(false, 'fundy-masonry-experimental')}
          className={`flex-1 flex items-center justify-center py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md transition-all gap-1.5 ${
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (currentMode as any) === 'fundy-masonry-experimental' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          }`}
          title={t('al_mode_fundy_tooltip')}
        >
          {t('al_mode_fundy')}
        </button>
      </div>

      {/* Status Card */}
      <div className={`mb-6 p-4 rounded-lg border flex flex-col gap-3 ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : isActive ? (currentMode === 'editorial' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800') : 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800'}`}>
         <div className="flex items-center gap-2">
            {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" /> : isActive ? <Lock className={`w-4 h-4 ${currentMode === 'editorial' ? 'text-indigo-500' : 'text-blue-500'}`} /> : <LayoutTemplate className="w-4 h-4 text-neutral-500" />}
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
              {isCompleted ? 'Página Completada' : isActive ? t('al_active') : t('al_free')}
            </span>
         </div>
         {isActive && !isCompleted && (
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

           {currentMode === 'fundy-masonry-experimental' ? (
              <div className="flex flex-col gap-3">
                 <button
                   onClick={() => {
                       const strategies = ['PRIORITIZE_HEIGHT', 'PRIORITIZE_WIDTH', 'FORCE_TWO_COLUMNS', 'CHAOTIC_BALANCED'] as const;
                       const current = spread.autoLayout?.fundyStrategy || 'PRIORITIZE_HEIGHT';
                       const next = strategies[(strategies.indexOf(current) + 1) % strategies.length];
                       setFundyStrategy(activeSpreadId, next);
                   }}
                   className="w-full flex flex-col items-center justify-center gap-1 py-3 text-white text-sm font-bold rounded shadow-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all border border-orange-500 hover:scale-[1.02]"
                 >
                   <div className="flex gap-2 items-center">
                      <Wand2 className="w-5 h-5 flex-shrink-0" />
                      <span>{t('al_fundy_strategy')}</span>
                   </div>
                   <span className="text-[10px] font-mono tracking-wider opacity-90 uppercase bg-black/20 px-2 py-0.5 rounded">
                     {t(`strategy_${spread.autoLayout?.fundyStrategy || 'PRIORITIZE_HEIGHT'}`)}
                   </span>
                 </button>
                 
                 <div className="flex flex-col gap-2 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                     <div className="flex justify-between items-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        <div className="flex gap-1.5 items-center">
                            <Sliders className="w-3.5 h-3.5" />
                            {t('al_fundy_gap')}
                        </div>
                        
                        <div className="flex items-center gap-1">
                           <input 
                              type="number" 
                              min={1} 
                              max={20}
                              value={spread.autoLayout?.fundyGapMm || 10}
                              onChange={(e) => {
                                  const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 10));
                                  setFundyGapMm(activeSpreadId, val);
                              }}
                              className="w-12 text-right bg-white dark:bg-neutral-800 border-none rounded text-xs select-all focus:ring-1 focus:ring-orange-500 outline-none p-1"
                           />
                           <span className="text-[10px] opacity-70">mm</span>
                        </div>
                     </div>
                     <input
                         type="range"
                         min={1}
                         max={20}
                         step={1}
                         value={spread.autoLayout?.fundyGapMm || 10}
                         onChange={(e) => setFundyGapMm(activeSpreadId, parseInt(e.target.value))}
                         className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                     />
                 </div>

                 <div className="flex gap-2 w-full">
                     <button 
                        onClick={() => applyLayout(true, 'fundy-masonry-experimental')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded transition-colors"
                     >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                        {t('al_next')}
                     </button>
                     <button
                        onClick={() => toggleFundyFlipHorizontal(activeSpreadId)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded transition-colors"
                     >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-orange-500" />
                        {t('al_fundy_flip')}
                     </button>
                 </div>
              </div>
           ) : (
              <div className="flex flex-col gap-3">
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

           {!isCompleted && isActive && (
              <button 
                onClick={() => markSpreadCompleted(activeSpreadId)}
                className="w-full flex items-center justify-center gap-2 py-3 mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar como Terminado
              </button>
           )}
        </div>
      )}
    </div>
  );
}
