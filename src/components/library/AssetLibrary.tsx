"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { assetLibrary, RegistryAsset } from '@/lib/asset-library';
import { storage } from '@/storage';
import { CustomCategory, UserDecoration } from '@/types/editor';

export default function AssetLibrary() {
  const t = useTranslations('Editor');
  
  // Navigation State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Custom Library State
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [userDecorations, setUserDecorations] = useState<UserDecoration[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load User Data
  const loadUserData = async () => {
    try {
      const cats = await storage.getDecorationCategories();
      const decs = await storage.getDecorations();
      setCustomCategories(cats);
      setUserDecorations(decs);
    } catch (e) {
      console.error("Failed to load user decorations", e);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [activeCategory]);

  // Derived Default
  const defaultCategories = Object.keys(assetLibrary).map(key => ({
    id: key,
    labelKey: assetLibrary[key].labelKey
  }));

  // Handlers
  const handleDragStartDefault = (e: React.DragEvent, asset: RegistryAsset, category: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'decoration',
      src: asset.src,
      libraryCategory: category,
      sourceType: 'default',
      sourceId: asset.id
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartUser = (e: React.DragEvent, dec: UserDecoration) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'decoration',
      src: dec.preview,
      libraryCategory: dec.categoryId,
      sourceType: 'user-decoration',
      sourceId: dec.id
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await storage.createDecorationCategory(newCatName.trim());
    setNewCatName("");
    setIsCreatingCategory(false);
    await loadUserData();
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('lib_delete') + "?")) return;
    await storage.deleteDecorationCategory(id);
    await loadUserData();
  };

  const handleDeleteDecoration = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await storage.deleteDecoration(id);
    await loadUserData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !activeCategory) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        await storage.uploadDecoration(file, activeCategory);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    await loadUserData();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Views
  if (activeCategory) {
    const isDefault = !!assetLibrary[activeCategory];
    
    if (isDefault) {
      const assets = assetLibrary[activeCategory].items || [];
      return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 p-4">
          <button onClick={() => setActiveCategory(null)} className="mb-4 text-xs text-blue-500 font-semibold cursor-pointer text-left hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>&larr;</span> {t('lib_back')}
          </button>
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-200 mb-4">
            {t(`lib_${activeCategory}`)}
          </h3>
          {assets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
              <p>{t('lib_empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto pr-1 pb-4 pt-1 px-1">
              {assets.map((asset) => {
                const isDarkCat = ['overlays', 'cinematic', 'textures', 'frames'].includes(activeCategory);
                const bgClass = isDarkCat ? 'bg-[#1e1e1e] border-neutral-800' : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800';
                
                return (
                  <div key={asset.id} className="relative w-full pt-[100%] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-grab active:cursor-grabbing transition-transform duration-200 hover:scale-[1.03] shadow-sm hover:shadow-md hover:border-blue-400 group block">
                    <div className={`absolute inset-0 ${bgClass} flex items-center justify-center`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.src} alt={asset.name} className="w-full h-full object-cover pointer-events-none" />
                      
                      {/* Asset Identification Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold px-2 py-1 text-center backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                         {asset.name || asset.id.split('-').slice(0, 2).join('-').toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      // CUSTOM CATEGORY VIEW
      const customCat = customCategories.find(c => c.id === activeCategory);
      const decs = userDecorations.filter(d => d.categoryId === activeCategory);
      return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-950 p-4">
          <button onClick={() => setActiveCategory(null)} className="mb-4 text-xs text-blue-500 font-semibold cursor-pointer text-left hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>&larr;</span> {t('lib_back')}
          </button>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-800 dark:text-neutral-200">
               {customCat?.name || "..."}
             </h3>
          </div>
          
          <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileUpload} />
          
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-1 pb-4 pt-1 px-1">
            {/* UPLOAD TILE */}
            <div className="relative w-full pt-[100%] rounded-xl border border-dashed border-blue-300 dark:border-blue-800 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform block" onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 flex flex-col items-center justify-center text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20">
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                <span className="text-xs font-semibold">{t('lib_upload_images')}</span>
              </div>
            </div>

            {decs.map((dec) => (
              <div key={dec.id} className="relative w-full pt-[100%] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden cursor-grab active:cursor-grabbing transition-transform duration-200 hover:scale-[1.03] shadow-sm hover:shadow-md hover:border-blue-400 group block" draggable onDragStart={(e) => handleDragStartUser(e, dec)}>
                <div className="absolute inset-0 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dec.preview} alt="user decoration" className="w-full h-full object-cover pointer-events-none" />
                  <button onClick={(e) => handleDeleteDecoration(e, dec.id)} className="absolute top-2 right-2 bg-white dark:bg-neutral-800 rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-all z-10">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                  {/* Asset Identification Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] font-bold px-2 py-1 text-center backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                     {dec.id.slice(0, 6).toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {decs.length === 0 && (
             <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-400 text-xs mt-8 px-4">
               <p>{t('lib_category_empty')}</p>
             </div>
          )}
        </div>
      );
    }
  }

  // ROOT CATEGORIES LIST VIEW
  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 p-4 overflow-y-auto">
       <p className="text-xs text-neutral-500 mb-4 text-center border-b border-neutral-100 dark:border-neutral-900 pb-4">{t('lib_upload_prompt')}</p>
       
       {/* DEFAULT CATEGORIES */}
       <div className="flex flex-col gap-2 mb-8">
         {defaultCategories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className="py-3 px-4 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-left transition-colors font-medium text-neutral-700 dark:text-neutral-300 shadow-sm">
              {t(cat.labelKey)}
              <span className="text-neutral-400 font-bold">&rarr;</span>
            </button>
         ))}
       </div>

       {/* USER CATEGORIES */}
       <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-900 pb-2">
         <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{t('lib_custom_categories')}</h3>
       </div>

       <div className="flex flex-col gap-2">
         {customCategories.map((cat) => (
            <div key={cat.id} className="flex relative group">
              <button onClick={() => setActiveCategory(cat.id)} className="flex-1 py-3 px-4 flex items-center justify-between bg-white dark:bg-neutral-950 hover:bg-blue-50 dark:hover:bg-neutral-900 border border-blue-100 dark:border-neutral-800 rounded-lg text-sm text-left transition-colors font-medium text-blue-700 dark:text-blue-400 shadow-sm">
                {cat.name}
                <span className="text-blue-300 dark:text-neutral-500 font-bold">&rarr;</span>
              </button>
              <button title={t('lib_delete')} onClick={(e) => handleDeleteCategory(e, cat.id)} className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-red-50 dark:from-red-900/20 to-transparent hover:text-red-600 dark:hover:text-red-400 rounded-r-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
         ))}
         
         {isCreatingCategory ? (
           <div className="flex gap-2 items-center mt-2">
             <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateCategory()} placeholder={t('lib_new_category_placeholder')} className="flex-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-2 outline-none focus:border-blue-500" />
             <button onClick={handleCreateCategory} className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-semibold hover:bg-blue-600 transition-colors">✔</button>
             <button onClick={() => setIsCreatingCategory(false)} className="text-neutral-400 hover:text-neutral-600 px-2">×</button>
           </div>
         ) : (
           <button onClick={() => setIsCreatingCategory(true)} className="mt-2 py-3 px-4 flex items-center justify-center border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-blue-500 transition-colors">
              + {t('lib_new_category')}
           </button>
         )}
       </div>
    </div>
  );
}
