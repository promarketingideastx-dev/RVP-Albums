import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEditorStore } from '@/store/useEditorStore';
import { ProjectAsset } from '@/types/editor';
import { processLocalImage } from '@/utils/imageIngestion';
import { extractAssetMetadataFromFile } from '@/utils/metadataEngine';
import { AssetThumbnail } from './common/AssetThumbnail';
import { PhotoAttributesMenuSection } from './common/PhotoAttributesMenuSection';
import { v4 as uuidv4 } from 'uuid';

export default function AssetTray() {
  const t = useTranslations('Editor');
  const pathname = usePathname();
  const isEs = pathname?.startsWith('/es') ?? true;
  const hasProject = useEditorStore((state) => Boolean(state.project));
  const projectAssets = useEditorStore((state) => state.project?.assets);
  const sequenceMode = useEditorStore((state) => state.project?.sequenceMode || 'ORIGINAL_ORDER');
  const projectCategory = useEditorStore((state) => state.project?.projectCategory);
  const addAsset = useEditorStore((state) => state.addAsset);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const updateAsset = useEditorStore((state) => state.updateAsset);
  const setAssetPriority = useEditorStore((state) => state.setAssetPriority);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const rawSelectionAnchorRef = useRef<string | null>(null);

  // Phase 13/14: Auto-Book Native Engine Trigger
  const [showAutoBookMenu, setShowAutoBookMenu] = useState(false);
  const [autoBookTarget, setAutoBookTarget] = useState<number>(6);
  const [rebalanceMode, setRebalanceMode] = useState<'COMPACT' | 'BALANCED' | 'AIRY'>('BALANCED');

  const executeAutoBookBuilder = useEditorStore((state) => state.executeAutoBookBuilder);
  const rebalanceAutoBookLayout = useEditorStore((state) => state.rebalanceAutoBookLayout);
  const hasManagedSpreads = useEditorStore((state) => state.project?.spreads.some(s => s.autoBookManaged) ?? false);

  // Only recompute usage counts when image elements are added/removed/replaced, NOT when x_mm/y_mm/w_mm/h_mm/rotation change
  const imageElementsSignature = useEditorStore((state) => {
    if (!state.project) return '';
    return state.project.spreads
      .map(s => s.elements.filter(e => e.type === 'image').map(e => `${e.id}:${(e as { previewBlobId?: string }).previewBlobId || ''}:${(e as { previewUrl?: string }).previewUrl || ''}`).join(','))
      .join('|');
  });

  const project = useEditorStore((state) => state.project);
  const isRawSession = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';
  const activeBrowserAssetId = useEditorStore((state) => state.activeBrowserAssetId);
  const selectedBrowserAssetIds = useEditorStore((state) => state.selectedBrowserAssetIds);
  const setSelectedBrowserAssetIds = useEditorStore((state) => state.setSelectedBrowserAssetIds);
  const canvasBatchAssetIds = useEditorStore((state) => state.canvasBatchAssetIds);
  const loadAssetToCanvas = useEditorStore((state) => state.loadAssetToCanvas);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);

  const [trayMenu, setTrayMenu] = useState<{ x: number; y: number; assetId: string } | null>(null);
  const trayMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!trayMenu) return;
    const close = (e: MouseEvent) => {
      if (trayMenuRef.current && !trayMenuRef.current.contains(e.target as Node)) setTrayMenu(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setTrayMenu(null); };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [trayMenu]);

  // Active asset currently mounted on canvas
  const currentCanvasAssetId = useMemo(() => {
    if (!project) return null;
    const spread = project.spreads.find((s) => s.id === activeSpreadId) || project.spreads[0];
    const img = spread?.elements.find((e) => e.type === 'image');
    return img?.assetId || null;
  }, [project, activeSpreadId]);


  // Advanced Fundy Logic States
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterFavorite, setFilterFavorite] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<'newest' | 'rating'>('newest');

  const assets = projectAssets || [];

  const visibleAssets = useMemo(() => {
    let filtered = [...assets];

    // In Raw session, selection for export must not change which thumbnails are visible.
    if (isRawSession) {
      const batch = canvasBatchAssetIds.length > 0 ? canvasBatchAssetIds : null;
      if (batch && batch.length > 0) {
        filtered = filtered.filter((a) => batch.includes(a.id));
      }
    } else {
      if (filterFavorite) {
        filtered = filtered.filter((a) => a.isFavorite);
      }

      if (filterRating > 0) {
        filtered = filtered.filter((a) => (a.rating || 0) >= filterRating);
      }

      if (sortMode === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    }
    return filtered;
  }, [assets, filterFavorite, filterRating, sortMode, isRawSession, canvasBatchAssetIds]);



  // Extract all existing image elements across all spreads efficiently updating live drops
  const allImageElements = useMemo(() => {
    const proj = useEditorStore.getState().project;
    if (!proj) return [];
    return proj.spreads.flatMap(s => s.elements.filter(e => e.type === 'image'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageElementsSignature]);

  if (!hasProject) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Safety boundaries
    const filesToProcess = Array.from(files).slice(0, 100);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      if (file.size > 30 * 1024 * 1024) continue; // 30MB limit

      try {
        const { originalUrl, previewUrl, thumbnailUrl, originalBlobId, previewBlobId, thumbnailBlobId, widthPx, heightPx } = await processLocalImage(file);

        const metadata = extractAssetMetadataFromFile(file, (assets.length || 0) + i, { w: widthPx || 0, h: heightPx || 0 });

        addAsset({
          id: uuidv4(),
          name: file.name,
          previewUrl,
          originalUrl,
          thumbnailUrl,
          previewBlobId,
          originalBlobId,
          thumbnailBlobId,
          rating: 0,
          isFavorite: false,
          width: widthPx,
          height: heightPx,
          orientation: metadata.orientation,
          aspectRatio: metadata.aspectRatio,
          metadata
        });
      } catch (err) {
        console.error('Failed to ingest asset:', err);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: ProjectAsset) => {
    let dragIds = [asset.id];
    if (selectedAssetIds.has(asset.id)) {
        dragIds = Array.from(selectedAssetIds);
    }

    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'image',
      assetId: asset.id,
      assetIds: dragIds,
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      previewBlobId: asset.previewBlobId,
      originalBlobId: asset.originalBlobId
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleRawThumbnailClick = (e: React.MouseEvent, asset: ProjectAsset, index: number) => {
    const visibleIds = visibleAssets.map(item => item.id);
    if (e.shiftKey) {
      const anchorIndex = visibleIds.indexOf(rawSelectionAnchorRef.current || activeBrowserAssetId || '');
      const start = Math.min(anchorIndex >= 0 ? anchorIndex : index, index);
      const end = Math.max(anchorIndex >= 0 ? anchorIndex : index, index);
      const rangeIds = visibleIds.slice(start, end + 1);
      setSelectedBrowserAssetIds(e.metaKey || e.ctrlKey
        ? Array.from(new Set([...selectedBrowserAssetIds, ...rangeIds]))
        : rangeIds);
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selectedBrowserAssetIds);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      setSelectedBrowserAssetIds(Array.from(next));
      rawSelectionAnchorRef.current = asset.id;
      return;
    }
    setSelectedBrowserAssetIds([asset.id]);
    rawSelectionAnchorRef.current = asset.id;
    loadAssetToCanvas(asset);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedAssetIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAssetIds(newSet);
  };

  const setRating = (e: React.MouseEvent, id: string, rating: number) => {
    e.stopPropagation();
    updateAsset(id, { rating });
  };

  const toggleFavorite = (e: React.MouseEvent, asset: ProjectAsset) => {
    e.stopPropagation();
    updateAsset(asset.id, { isFavorite: !asset.isFavorite });
  };

  const togglePriority = (e: React.MouseEvent, asset: ProjectAsset) => {
    e.stopPropagation();
    const current = asset.metadata?.manualPriority || 0;
    const next = (current + 1) % 3; // cycles: 0 -> 1 -> 2 -> 0
    setAssetPriority(asset.id, next);
  };

  const clearSelection = () => {
    setSelectedAssetIds(new Set());
    setFilterRating(0);
    setSortMode('newest');
  };

  const cycleSortMode = () => {
    setSortMode(prev => (prev === 'newest' ? 'rating' : 'newest'));
  };

  const handleAutoBuildTrigger = () => {
     if (hasManagedSpreads) {
         rebalanceAutoBookLayout({ targetPhotosPerSpread: autoBookTarget, mode: rebalanceMode });
     } else {
         if (assets.length === 0) return;
         executeAutoBookBuilder(assets, { targetPhotosPerSpread: autoBookTarget });
     }
     setShowAutoBookMenu(false);
     clearSelection();
  };

  return (
    <div className="h-[250px] border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex flex-col shrink-0 w-full relative">
      <style>{`
        .fundy-scroll::-webkit-scrollbar {
          height: 14px;
        }
        .fundy-scroll::-webkit-scrollbar-track {
          background: #e5e5e5;
          border-top: 1px solid #d4d4d8;
        }
        .dark .fundy-scroll::-webkit-scrollbar-track {
          background: #171717;
          border-top: 1px solid #262626;
        }
        .fundy-scroll::-webkit-scrollbar-thumb {
          background-color: #a3a3a3;
          border-radius: 10px;
          border: 3px solid #e5e5e5;
        }
        .dark .fundy-scroll::-webkit-scrollbar-thumb {
          background-color: #525252;
          border: 3px solid #171717;
        }
        .fundy-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #737373;
        }
      `}</style>

      {/* Top Toolbar */}
      <div className="h-14 bg-white dark:bg-neutral-950 flex items-center px-4 justify-between border-b border-neutral-200 dark:border-neutral-800 py-2">
        <div className="flex items-center gap-4">
          {/* In Raw Session: Star selection/filter is locked in Canvas to avoid confusion! */}
          {isRawSession ? (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full px-4 py-1.5 gap-2 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm">
              <span className="text-amber-500">🔒</span>
              <span>
                {isEs
                  ? `Lote activo: ${visibleAssets.length} foto(s) en lienzo`
                  : `Active Batch: ${visibleAssets.length} photo(s) on canvas`}
              </span>
              <span className="text-[10px] text-neutral-400 font-normal border-l border-neutral-300 dark:border-neutral-700 pl-2">
                {isEs ? 'Filtros bloqueados en Lienzo' : 'Filters locked on Canvas'}
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={cycleSortMode}
                className="px-6 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-sm font-medium tracking-wide flex items-center gap-2 transition-colors"
              >
                <span className={sortMode === 'rating' ? 'rotate-90' : ''}>⇅</span> {t('sort')} {sortMode === 'rating' ? t('sort_stars') : ''}
              </button>

              {/* Interactive Star Filter Group */}
              <div className="flex items-center bg-orange-600 rounded-full px-5 py-1 gap-1 border border-orange-500 shadow-sm">
                <span className="text-white text-sm font-bold tracking-wide mr-2 hidden sm:inline">{t('filter_label')}</span>

                {/* Heart Filter */}
                <span
                  onClick={() => setFilterFavorite(!filterFavorite)}
                  className={`cursor-pointer ${filterFavorite ? 'text-red-300 drop-shadow-md scale-110' : 'text-orange-900'} hover:text-red-200 transition-all text-xl leading-none mr-2 font-bold`}
                  title="Filter by Favorites"
                >
                  {filterFavorite ? '♥' : '♡'}
                </span>
                <div className="w-px h-5 bg-orange-700 mx-1"></div>

                {/* Stars Filter */}
                <div className="flex gap-1.5 text-xl leading-none">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                      className={`cursor-pointer ${star <= filterRating ? 'text-white' : 'text-orange-900'} hover:text-orange-200 transition-colors drop-shadow-sm`}
                      title={`Filter ${star} stars and above`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500 ml-4 hidden md:inline">
            {isEs ? `Mostrando ${visibleAssets.length} de ${assets.length} fotos` : `Showing ${visibleAssets.length} of ${assets.length} images`}
          </span>
        </div>

        <div className="flex items-center gap-3 relative">

          {/* Phase 16: Sequencing Overlays */}
          <div className="relative group">
             <select
               className="appearance-none bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-full focus:outline-none cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
               value={sequenceMode}
               onChange={(e) => useEditorStore.getState().setSequenceMode(e.target.value as 'ORIGINAL_ORDER' | 'CHRONOLOGICAL')}
             >
               <option value="ORIGINAL_ORDER">⏳ {t('originalOrder')} </option>
               <option value="CHRONOLOGICAL">📅 {t('chronological')}</option>
               <option value="MANUAL_PRIORITY">⭐ {isEs ? 'Prioridad' : 'Priority'}</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
             {/* Phase 16 Soft Notification Tooltip */}
             <div className="absolute top-[130%] left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {sequenceMode === 'CHRONOLOGICAL' ? t('sortingChronological') : t('sortingOriginal')}
             </div>
          </div>

          {/* Phase 13: Auto-Book Builder Popover (Only for Albums) */}
          {projectCategory !== 'studio_print' && (
            <div className="relative">
               <button
                  onClick={() => setShowAutoBookMenu(!showAutoBookMenu)}
                  className={`px-4 py-1.5 border rounded-full text-xs font-bold tracking-wide transition-colors ${hasManagedSpreads ? 'border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20' : showAutoBookMenu ? 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
               >
                  ✨ {hasManagedSpreads ? t('rebalance_album') : t('auto_book_btn')}
               </button>
               {showAutoBookMenu && (
                 <div className="absolute right-0 bottom-[120%] mb-2 bg-white dark:bg-neutral-800 border border-orange-500 shadow-2xl rounded-xl p-4 w-64 z-[100] scale-in origin-bottom-right">
                   <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-white">{hasManagedSpreads ? t('rebalance_album') : t('auto_book_title')}</h3>
                      <button onClick={() => setShowAutoBookMenu(false)} className="text-neutral-400 hover:text-black dark:hover:text-white text-lg leading-none">✕</button>
                   </div>
                   <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{t('photos_per_spread')}</label>
                      <input
                        type="number"
                        min="1" max="25"
                        value={autoBookTarget}
                        onChange={(e) => setAutoBookTarget(Math.max(1, parseInt(e.target.value) || 6))}
                        className="w-16 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded-md text-sm text-center font-mono font-bold text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                   </div>

                   {hasManagedSpreads && (
                      <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg mb-4">
                        {['COMPACT', 'BALANCED', 'AIRY'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setRebalanceMode(m as 'COMPACT' | 'BALANCED' | 'AIRY')}
                            className={`flex-1 text-[10px] py-1 font-bold rounded-md transition-colors ${rebalanceMode === m ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                          >
                            {t(`reb_${m.toLowerCase()}`)}
                          </button>
                        ))}
                      </div>
                   )}

                   <button
                     onClick={handleAutoBuildTrigger}
                     className={`w-full text-white font-bold tracking-wide text-xs py-2.5 rounded-lg transition-transform active:scale-95 ${hasManagedSpreads ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                   >
                     ➔ {hasManagedSpreads ? t('rebalance_album') : t('auto_book_btn')}
                   </button>
                 </div>
               )}
            </div>
          )}

          {!isRawSession && (
            <>
              <button
                onClick={clearSelection}
                disabled={selectedAssetIds.size === 0}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-full text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {selectedAssetIds.size > 0 ? (isEs ? `Desmarcar (${selectedAssetIds.size})` : `Clear (${selectedAssetIds.size})`) : (isEs ? 'Desmarcar' : 'Clear')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold tracking-wide transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>+</span> {isEs ? 'Añadir Fotos' : 'Add Photos'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      </div>

      {/* Scrollable Asset Strip */}
      <div className={`flex-1 overflow-x-auto overflow-y-hidden pt-2 pb-0 px-3 flex gap-2 fundy-scroll relative ${isRawSession ? 'select-none' : ''}`}>
        {visibleAssets.map((asset, index) => {
          const isSelected = isRawSession ? selectedBrowserAssetIds.includes(asset.id) : selectedAssetIds.has(asset.id);
          const currentRating = asset.rating || 0;
          const isActiveOnCanvas = (isRawSession || projectCategory === 'studio_print') && (currentCanvasAssetId === asset.id || activeBrowserAssetId === asset.id);

          // Match by precise deterministic properties natively ensuring overlapping attributes don't double count
          const usageCount = allImageElements.filter((el) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const imgEl = el as any;
            return (
              (asset.previewBlobId && imgEl.previewBlobId === asset.previewBlobId) ||
              (asset.originalBlobId && imgEl.originalBlobId === asset.originalBlobId) ||
              (asset.previewUrl && imgEl.previewUrl === asset.previewUrl) ||
              (asset.originalUrl && imgEl.originalUrl === asset.originalUrl) ||
              (asset.previewUrl && imgEl.src === asset.previewUrl)
            );
          }).length;

          return (
            <div
              key={asset.id}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTrayMenu({ x: e.clientX, y: e.clientY, assetId: asset.id });
              }}
              onMouseDown={(e) => {
                if (isRawSession && e.shiftKey) e.preventDefault();
              }}
              onClick={(e) => {
                if (isRawSession) {
                  handleRawThumbnailClick(e, asset, index);
                } else if (projectCategory === 'studio_print') {
                  loadAssetToCanvas(asset);
                }
              }}
              className={`h-full bg-white dark:bg-neutral-800 border-2 ${
                isActiveOnCanvas
                  ? 'border-emerald-500 ring-2 ring-emerald-400 shadow-md'
                  : isSelected
                  ? 'border-orange-500 ring-2 ring-orange-400/60'
                  : 'border-neutral-200 dark:border-neutral-700'
              } overflow-hidden ${
                isRawSession ? 'cursor-pointer hover:border-emerald-400' : 'cursor-grab active:cursor-grabbing'
              } relative group shrink-0 flex flex-col shadow-sm hover:shadow-md transition-all`}
              style={{ aspectRatio: (asset.aspectRatio && asset.aspectRatio > 0.1) ? asset.aspectRatio : 1 }}
            >
              {/* Camera Raw export selection indicator; separate from the active canvas photo. */}
              {isRawSession && isSelected && (
                <div className="absolute top-2 right-10 z-20 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow pointer-events-none" title={isEs ? 'Seleccionada para exportar' : 'Selected for export'}>✓</div>
              )}

              {/* Checkbox / Sequential Selection Badge Layer (Only for Album Designer) */}
              {!isRawSession && (
                <div
                  className={`absolute top-2 right-10 z-20 w-6 h-6 rounded-full border-2 border-white cursor-pointer flex items-center justify-center font-bold text-[12px] shadow-md transition-opacity scale-in ${isSelected ? 'bg-orange-500 text-white opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'}`}
                  onClick={(e) => toggleSelection(e, asset.id)}
                >
                  {isSelected && (
                     <span>{Array.from(selectedAssetIds).indexOf(asset.id) + 1}</span>
                  )}
                </div>
              )}

              {/* Usage Count Badge Layer (Only for Album Designer - hidden in Camera Raw Pro) */}
              {!isRawSession && usageCount > 0 && (
                <div className="absolute top-2 left-2 z-20 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-bold shadow-md shadow-black/20 ring-1 ring-white/30 backdrop-blur-sm pointer-events-none transition-transform scale-in">
                  {usageCount}
                </div>
              )}

              {/* Active Develop Indicator Badge in Camera Raw Pro */}
              {isRawSession && isActiveOnCanvas && (
                <div className="absolute top-1.5 left-1.5 z-20 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                  <span>●</span> <span>{isEs ? 'En Lienzo' : 'Active'}</span>
                </div>
              )}

              {/* Delete Hook Layer */}
              <button
                onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                title="Remove Asset"
              >
                ×
              </button>

              {/* Quick Priority Toggle Layer */}
              <button
                onClick={(e) => togglePriority(e, asset)}
                className={`absolute bottom-10 left-2 z-10 rounded-full px-1.5 py-0.5 text-xs transition-opacity flex items-center justify-center shadow-md scale-in
                           ${asset.metadata?.manualPriority ? 'bg-orange-500 text-white opacity-100' : 'bg-black/50 text-white/50 opacity-0 group-hover:opacity-100 hover:bg-black/80'}`}
                title={t('priority')}
              >
                {asset.metadata?.manualPriority === 2 ? '⭐⭐' : '⭐'}
              </button>

               <div
                 className="flex-1 w-full relative overflow-hidden"
                 draggable={!isRawSession}
                 onDragStart={(e) => {
                    if (isRawSession) return;
                    if (selectedAssetIds.size > 1 && selectedAssetIds.has(asset.id)) {
                        const ghost = document.createElement('div');
                        ghost.style.width = '100px';
                        ghost.style.height = '100px';
                        ghost.style.background = '#f97316';
                        ghost.style.color = 'white';
                        ghost.style.display = 'flex';
                        ghost.style.alignItems = 'center';
                        ghost.style.justifyContent = 'center';
                        ghost.style.borderRadius = '8px';
                        ghost.style.fontWeight = 'bold';
                        ghost.innerHTML = `+${selectedAssetIds.size} Fotos`;
                        document.body.appendChild(ghost);
                        e.dataTransfer.setDragImage(ghost, 50, 50);
                        setTimeout(() => ghost.remove(), 0);
                    }
                    handleDragStart(e, asset);
                 }}
                 onDragEnd={() => setSelectedAssetIds(new Set())}
                 onClick={(e) => {
                   if (!isRawSession && projectCategory !== 'studio_print') {
                     toggleSelection(e, asset.id);
                   }
                 }}
              >
                <AssetThumbnail
                  asset={asset}
                  className="w-full h-full"
                  fit="contain"
                />
                {asset.isEdited && (
                  <span
                    className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] font-black px-1 py-0.5 rounded shadow pointer-events-none z-10"
                    title={isEs ? 'Foto con ajustes de revelado' : 'Photo with develop adjustments'}
                  >
                    ±
                  </span>
                )}
              </div>

              <div className="h-9 bg-[#1c1c1c] flex items-center justify-between px-1.5 shrink-0 border-t border-black w-full overflow-hidden">
                 <div className="flex gap-[1px] text-[14px] 2xl:text-[16px] tracking-tighter shrink">
                   {[1, 2, 3, 4, 5].map(star => (
                     <span
                       key={star}
                       onClick={(e) => setRating(e, asset.id, currentRating === star ? 0 : star)}
                       className={`cursor-pointer ${star <= currentRating ? 'text-[#ffb800] drop-shadow-md' : 'text-neutral-600'} hover:text-[#ffca3a] leading-none mb-0.5`}
                     >
                       ★
                     </span>
                   ))}
                 </div>
                 <div
                   onClick={(e) => toggleFavorite(e, asset)}
                   className={`${asset.isFavorite ? 'text-red-500 drop-shadow-md' : 'text-neutral-600'} hover:text-red-400 cursor-pointer text-[16px] 2xl:text-[18px] font-bold leading-none shrink-0 mb-0.5 ml-0.5`}
                 >
                   {asset.isFavorite ? '♥' : '♡'}
                 </div>
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400 italic">
             No images yet. Click &apos;+ ADD PHOTOS&apos; to start designing.
          </div>
        )}
      </div>

      {trayMenu && (() => {
        const multiTargets = selectedAssetIds.size > 1 && selectedAssetIds.has(trayMenu.assetId)
          ? Array.from(selectedAssetIds)
          : [trayMenu.assetId];
        const menuAsset = assets.find((a) => a.id === trayMenu.assetId);
        return (
          <div
            ref={trayMenuRef}
            className="fixed z-[100] w-60 rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md py-1.5 text-xs select-none"
            style={{
              left: Math.min(trayMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 250),
              top: Math.max(10, Math.min(trayMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 330)),
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="px-3.5 py-1 border-b border-neutral-200 dark:border-neutral-800 mb-1 text-[10px] font-mono text-neutral-500 truncate">
              {multiTargets.length > 1 ? `${multiTargets.length} ${isEs ? 'fotos' : 'photos'}` : menuAsset?.name}
            </div>
            <PhotoAttributesMenuSection
              isEs={isEs}
              source={{ assetId: trayMenu.assetId }}
              target={{ assetIds: multiTargets }}
              onDone={() => setTrayMenu(null)}
            />
          </div>
        );
      })()}
    </div>
  );
}
