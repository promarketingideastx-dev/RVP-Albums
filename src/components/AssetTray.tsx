import React, { useRef, useState, useMemo } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { ProjectAsset } from '@/types/editor';
import { processLocalImage } from '@/utils/imageIngestion';
import { v4 as uuidv4 } from 'uuid';

export default function AssetTray() {
  const project = useEditorStore((state) => state.project);
  const addAsset = useEditorStore((state) => state.addAsset);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const updateAsset = useEditorStore((state) => state.updateAsset);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const addElement = useEditorStore((state) => state.addElement);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
  // Advanced Fundy Logic States
  const [filterRating, setFilterRating] = useState<number>(0);
  const [sortMode, setSortMode] = useState<'newest' | 'rating'>('newest');

  const assets = project?.assets || [];

  const visibleAssets = useMemo(() => {
    let filtered = [...assets];
    if (filterRating > 0) {
      filtered = filtered.filter(a => (a.rating || 0) === filterRating);
    }
    
    if (sortMode === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return filtered;
  }, [assets, filterRating, sortMode]);

  if (!project) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Safety boundaries
    const filesToProcess = Array.from(files).slice(0, 100);
    
    for (const file of filesToProcess) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      if (file.size > 30 * 1024 * 1024) continue; // 30MB limit
      
      try {
        const { originalUrl, previewUrl, originalBlobId, previewBlobId } = await processLocalImage(file);
        addAsset({
          id: uuidv4(),
          name: file.name,
          previewUrl,
          originalUrl,
          previewBlobId,
          originalBlobId,
          rating: 0,
          isFavorite: false
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
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'image',
      assetId: asset.id,
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      previewBlobId: asset.previewBlobId,
      originalBlobId: asset.originalBlobId
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const injectToCanvas = (asset: ProjectAsset) => {
    if (!activeSpreadId) return;

    const img = new window.Image();
    img.onload = () => {
      const aspect = img.width / img.height;
      let w = 80;
      let h = 80 / aspect;
      
      if (h > 120) {
         h = 120;
         w = 120 * aspect;
      }

      addElement(activeSpreadId, {
        id: uuidv4(),
        type: 'image',
        previewUrl: asset.previewUrl,
        originalUrl: asset.originalUrl,
        previewBlobId: asset.previewBlobId,
        originalBlobId: asset.originalBlobId,
        x_mm: 20,
        y_mm: 20,
        w_mm: w,
        h_mm: h,
        rotation_deg: 0,
        zIndex: 0
      });
    };
    img.src = asset.previewUrl || '';
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

  const clearSelection = () => {
    setSelectedAssetIds(new Set());
    setFilterRating(0);
    setSortMode('newest');
  };

  const cycleSortMode = () => {
    setSortMode(prev => (prev === 'newest' ? 'rating' : 'newest'));
  };

  return (
    <div className="h-64 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex flex-col shrink-0">
      
      {/* Top Toolbar */}
      <div className="h-14 bg-white dark:bg-neutral-950 flex items-center px-4 justify-between border-b border-neutral-200 dark:border-neutral-800 py-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={cycleSortMode}
            className="px-6 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-sm font-medium tracking-wide flex items-center gap-2 transition-colors"
          >
            <span className={sortMode === 'rating' ? 'rotate-90' : ''}>⇅</span> SORT {sortMode === 'rating' ? '(STARS)' : ''}
          </button>
          
          {/* Interactive Star Filter Group */}
          <div className="flex items-center bg-orange-600 rounded-full px-5 py-1 gap-1 border border-orange-500 shadow-sm">
            <span className="text-white text-sm font-bold tracking-wide mr-2 hidden sm:inline">FILTER:</span>
            <div className="flex gap-1.5 text-lg leading-none">
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star}
                  onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                  className={`cursor-pointer ${star === filterRating ? 'text-white' : 'text-orange-900'} hover:text-orange-200 transition-colors drop-shadow-sm`}
                  title={`Filter exactly ${star} stars (Click to toggle)`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500 ml-4 hidden md:inline">
            Showing {visibleAssets.length} of {assets.length} images
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-1.5 text-blue-500 border border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full text-xs font-semibold tracking-wide transition-colors">
            DESIGN FOR ME
          </button>
          <button className="px-4 py-1.5 text-blue-500 border border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full text-xs font-semibold tracking-wide transition-colors">
            DESIGN WIZARD
          </button>
          <button 
            onClick={clearSelection}
            className="px-4 py-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded-full text-xs font-semibold tracking-wide transition-colors"
          >
            CLEAR
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-1.5 bg-neutral-800 text-white hover:bg-neutral-700 rounded-full text-xs font-semibold tracking-wide transition-colors flex items-center gap-2"
          >
            <span>+</span> ADD PHOTOS
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
      
      {/* Scrollable Asset Strip */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 flex gap-3 h-full">
        {visibleAssets.map(asset => {
          const isSelected = selectedAssetIds.has(asset.id);
          const currentRating = asset.rating || 0;
          return (
            <div
              key={asset.id}
              className={`h-full aspect-[2/3] md:aspect-[3/4] bg-white dark:bg-neutral-800 border-2 ${isSelected ? 'border-orange-500' : 'border-neutral-200 dark:border-neutral-700'} overflow-hidden cursor-grab active:cursor-grabbing relative group shrink-0 flex flex-col shadow-sm hover:shadow-md transition-shadow`}
            >
              {/* Checkbox Hook Layer */}
              <div 
                className="absolute top-2 left-2 z-10 w-5 h-5 rounded border border-white bg-black/30 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => toggleSelection(e, asset.id)}
              >
                {isSelected && <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>}
              </div>

              {/* Delete Hook Layer */}
              <button
                onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                title="Remove Asset"
              >
                ×
              </button>

              {/* Draggable Image Layer */}
              <div 
                 className="flex-1 w-full relative overflow-hidden"
                 draggable
                 onDragStart={(e) => handleDragStart(e, asset)}
                 onClick={() => injectToCanvas(asset)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={asset.previewUrl} 
                  alt={asset.name}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
              
              {/* Metadata Control Strip */}
              <div className="h-8 bg-white dark:bg-neutral-800 flex items-center justify-between px-2 shrink-0 border-t border-neutral-100 dark:border-neutral-700">
                 <div className="flex gap-0.5 text-xs tracking-tighter">
                   {[1, 2, 3, 4, 5].map(star => (
                     <span 
                       key={star}
                       onClick={(e) => setRating(e, asset.id, currentRating === star ? 0 : star)}
                       className={`cursor-pointer ${star <= currentRating ? 'text-orange-500' : 'text-neutral-300 dark:text-neutral-600'} hover:text-orange-400`}
                     >
                       ★
                     </span>
                   ))}
                 </div>
                 <div 
                   onClick={(e) => toggleFavorite(e, asset)}
                   className={`${asset.isFavorite ? 'text-red-500' : 'text-neutral-300 dark:text-neutral-600'} hover:text-red-500 cursor-pointer text-sm font-bold`}
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
    </div>
  );
}
