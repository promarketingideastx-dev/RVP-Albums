import React, { useRef } from 'react';
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
    
    // Fallback click injection
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
      h_mm: 100, // Roughly square default if actual dims lost
      rotation_deg: 0,
      zIndex: 0
    });
  };

  return (
    <div className="h-40 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col shrink-0">
      <div className="h-10 bg-neutral-100 dark:bg-neutral-950 flex items-center px-4 justify-between border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          Showing {assets.length} images
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-700 dark:hover:bg-neutral-600 text-white rounded-full text-xs font-medium transition-colors"
          >
            + ADD PHOTOS
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
      
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 flex gap-3">
        {assets.map(asset => (
          <div
            key={asset.id}
            draggable
            onDragStart={(e) => handleDragStart(e, asset)}
            onClick={() => injectToCanvas(asset)}
            className="h-full aspect-[2/3] md:aspect-square bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden cursor-grab active:cursor-grabbing relative group shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={asset.previewUrl} 
              alt={asset.name}
              className="w-full h-full object-cover pointer-events-none"
            />
            
            <button
              onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              title="Remove Asset"
            >
              ×
            </button>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400 italic">
            Drag and drop images here, or click &apos;+ ADD PHOTOS&apos;
          </div>
        )}
      </div>
    </div>
  );
}
