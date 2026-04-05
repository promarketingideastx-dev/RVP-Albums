"use client";

import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { useState, useRef } from 'react';
import { ProjectAsset } from '@/types/editor';
import AssetLibrary from './library/AssetLibrary';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'photos' | 'decorations'>('photos');
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ingestStagedPhotos = useEditorStore((state) => state.ingestStagedPhotos);
  
  const projectAssets = project?.assets || [];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newAssets: ProjectAsset[] = await Promise.all(files.map(file => {
      return new Promise<ProjectAsset>((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({
            id: uuidv4(),
            name: file.name,
            previewUrl: objectUrl,
            originalUrl: objectUrl,
            width: img.width,
            height: img.height,
            orientation: img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square'
          });
        };
        img.src = objectUrl;
      });
    }));
    
    // Phase 8.A: Nondestructive drop logic buffers assets into spreads sequentially gracefully
    ingestStagedPhotos(newAssets);
    if (e.target) e.target.value = '';
  };

  const handleDragStartPhoto = (e: React.DragEvent, asset: ProjectAsset) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'image',
      src: asset.previewUrl,
      assetId: asset.id, // Phase 7.H structural bounding link
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };



  return (
    <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col h-full">
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button 
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${activeTab === 'photos' ? 'bg-neutral-100 dark:bg-neutral-900 border-b-2 border-blue-500' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
        >
          {t('tab_photos')}
        </button>
        <button 
          onClick={() => setActiveTab('decorations')}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider uppercase transition-colors ${activeTab === 'decorations' ? 'bg-neutral-100 dark:bg-neutral-900 border-b-2 border-blue-500' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
        >
          {t('tab_decorations')}
        </button>
      </div>

      <div className={`p-4 flex flex-col gap-4 flex-1 overflow-y-auto ${activeTab === 'decorations' ? 'p-0' : ''}`}>
        {activeTab === 'photos' ? (
          <div className="flex flex-col h-full">
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handlePhotoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              {t('add_image')}
            </button>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {projectAssets.length === 0 ? (
                <div className="h-40 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-col items-center justify-center text-xs text-neutral-400 text-center p-4">
                  <svg className="w-8 h-8 mb-2 text-neutral-300 dark:text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  Arrastra tus fotos aquí o haz clic en añadir
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {projectAssets.map(asset => (
                    <div 
                      key={asset.id} 
                      className="relative pt-[100%] rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 cursor-grab active:cursor-grabbing group hover:shadow-md hover:border-blue-400 transition-all"
                      draggable
                      onDragStart={(e) => handleDragStartPhoto(e, asset)}
                    >
                      <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.previewUrl} alt={asset.name} className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full -m-4">
            <AssetLibrary />
          </div>
        )}
      </div>
    </aside>
  );
}
