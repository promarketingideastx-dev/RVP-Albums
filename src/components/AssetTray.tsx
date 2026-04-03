import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { ProjectAsset } from '@/types/editor';
import { processLocalImage } from '@/utils/imageIngestion';
import { v4 as uuidv4 } from 'uuid';

export default function AssetTray() {
  const project = useEditorStore((state) => state.project);
  const addAsset = useEditorStore((state) => state.addAsset);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const addElement = useEditorStore((state) => state.addElement);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  if (!project) return null;

  const assets = project.assets || [];

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
          originalBlobId
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
    addElement(activeSpreadId, {
      id: uuidv4(),
      type: 'image',
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      previewBlobId: asset.previewBlobId,
      originalBlobId: asset.originalBlobId,
      x_mm: 20,
      y_mm: 20,
      w_mm: 100,
      h_mm: 100,
      rotation_deg: 0,
      zIndex: 0
    });
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedAssetIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAssetIds(newSet);
  };

  return (
    <div className="h-64 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 flex flex-col shrink-0">
      
      {/* Top Toolbar */}
      <div className="h-14 bg-white dark:bg-neutral-950 flex items-center px-4 justify-between border-b border-neutral-200 dark:border-neutral-800 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Showing {assets.length} image{assets.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
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
        {assets.map(asset => {
          const isSelected = selectedAssetIds.has(asset.id);
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
            </div>
          );
        })}
        
        {assets.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400 italic">
            Drag and drop images here, or click &apos;+ ADD PHOTOS&apos;
          </div>
        )}
      </div>
    </div>
  );
}
