import React, { useEffect, useRef } from 'react';
import { ProjectAsset } from '@/types/editor';
import { PhotoAttributesMenuSection } from '../common/PhotoAttributesMenuSection';

interface AssetContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  selectedAssets: ProjectAsset[];
  isEs?: boolean;
  onClose: () => void;
  onSendToCanvas?: () => void;
  onOpenInCameraRaw: () => void;
  onOpenInPhotoStudio: () => void;
  onSendToAlbum: () => void;
  onSetRating: (rating: number) => void;
  onToggleFavorite: () => void;
  onDeleteFromCatalog: () => void;
}

export const AssetContextMenu: React.FC<AssetContextMenuProps> = ({
  isOpen,
  x,
  y,
  selectedAssets,
  isEs = true,
  onClose,
  onSendToCanvas,
  onOpenInCameraRaw,
  onOpenInPhotoStudio,
  onSendToAlbum,
  onSetRating,
  onToggleFavorite,
  onDeleteFromCatalog,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || selectedAssets.length === 0) return null;

  const count = selectedAssets.length;
  const isMulti = count > 1;

  // Ensure menu doesn't overflow screen bounds
  const menuW = 240;
  const menuH = 600;
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

  const adjustedX = x + menuW > screenW ? Math.max(10, screenW - menuW - 10) : x;
  const adjustedY = y + menuH > screenH ? Math.max(10, screenH - menuH - 10) : y;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-60 max-h-[calc(100vh-20px)] overflow-y-auto rounded-lg shadow-2xl border border-neutral-200 dark:border-[#333] bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-md py-1.5 text-xs text-neutral-800 dark:text-[#ddd] select-none animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info */}
      <div className="px-3 py-1 border-b border-neutral-200 dark:border-[#2a2a2a] mb-1 text-[10px] text-neutral-500 dark:text-[#888] font-mono flex items-center justify-between">
        <span>{isMulti ? `${count} ${isEs ? 'fotos seleccionadas' : 'photos selected'}` : selectedAssets[0]?.name}</span>
        {selectedAssets[0]?.rating ? (
          <span className="text-amber-500 font-bold">★ {selectedAssets[0].rating}</span>
        ) : null}
      </div>

      {/* Main Workflow Integrations */}
      <div className="px-1 py-0.5 space-y-0.5">
        <button
          type="button"
          onClick={() => {
            if (onSendToCanvas) onSendToCanvas();
            else onOpenInCameraRaw();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2.5 text-left bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-600 hover:text-white transition-colors font-semibold text-neutral-900 dark:text-white"
        >
          <span className="text-amber-500">🖼️</span>
          <span>{isEs ? 'Enviar a Lienzo' : 'Send to Canvas'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenInCameraRaw();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2.5 text-left hover:bg-blue-600 hover:text-white transition-colors font-medium text-neutral-900 dark:text-white"
        >
          <span className="text-amber-500">🎞</span>
          <span>{isEs ? 'Abrir en Camera Raw Pro...' : 'Open in Camera Raw Pro...'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenInPhotoStudio();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2.5 text-left hover:bg-blue-600 hover:text-white transition-colors text-neutral-800 dark:text-neutral-200"
        >
          <span className="text-blue-500">🎨</span>
          <span>{isEs ? 'Abrir en Photo Studio' : 'Open in Photo Studio'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSendToAlbum();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2.5 text-left hover:bg-blue-600 hover:text-white transition-colors text-neutral-800 dark:text-neutral-200"
        >
          <span className="text-emerald-500">📖</span>
          <span>{isEs ? 'Enviar a Album Designer' : 'Send to Album Designer'}</span>
        </button>
      </div>

      <div className="my-1 border-t border-neutral-200 dark:border-[#2a2a2a]" />

      {/* Rating Stars Submenu */}
      <div className="px-3 py-1">
        <div className="text-[10px] text-neutral-500 dark:text-[#888] font-semibold uppercase tracking-wider mb-1">
          {isEs ? 'Clasificar con estrellas' : 'Set Rating'}
        </div>
        <div className="flex items-center justify-between bg-neutral-100 dark:bg-[#141414] rounded p-1 border border-neutral-200 dark:border-[#2a2a2a]">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                onSetRating(star);
                onClose();
              }}
              className="px-1.5 py-0.5 text-amber-500 hover:text-amber-400 hover:scale-125 transition-all text-sm font-bold"
              title={`${star} ${isEs ? 'Estrellas' : 'Stars'}`}
            >
              ★
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onSetRating(0);
              onClose();
            }}
            className="px-1 py-0.5 text-neutral-400 dark:text-[#666] hover:text-neutral-900 dark:hover:text-white text-[10px] font-mono border-l border-neutral-200 dark:border-[#333] ml-1 pl-1.5"
            title={isEs ? 'Quitar clasificación' : 'Remove rating'}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Favorite Toggle */}
      <div className="px-1 py-0.5">
        <button
          type="button"
          onClick={() => {
            onToggleFavorite();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-left hover:bg-neutral-100 dark:hover:bg-[#2a2a2a] text-neutral-800 dark:text-neutral-200 transition-colors"
        >
          <span className="text-red-500">♥</span>
          <span>{isEs ? 'Alternar Favorito' : 'Toggle Favorite'}</span>
        </button>
      </div>

      <div className="my-1 border-t border-neutral-200 dark:border-[#2a2a2a]" />

      {/* Copy / Paste develop properties (copy from 1 photo, paste onto all selected) */}
      <div className="px-1">
        <PhotoAttributesMenuSection
          isEs={isEs}
          source={!isMulti ? { assetId: selectedAssets[0].id } : undefined}
          target={{ assetIds: selectedAssets.map((a) => a.id) }}
          onDone={onClose}
        />
      </div>

      <div className="my-1 border-t border-neutral-200 dark:border-[#2a2a2a]" />

      {/* Delete / Remove from Catalog */}
      <div className="px-1 py-0.5">
        <button
          type="button"
          onClick={() => {
            onDeleteFromCatalog();
            onClose();
          }}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          <span>🗑</span>
          <span>{isEs ? 'Eliminar del catálogo' : 'Remove from catalog'}</span>
        </button>
      </div>
    </div>
  );
};

export default AssetContextMenu;
