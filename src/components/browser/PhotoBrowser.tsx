"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { ProjectAsset } from '@/types/editor';
import { processLocalImage, getStorageQuotaEstimate } from '@/utils/imageIngestion';
import { extractAssetMetadataFromFile } from '@/utils/metadataEngine';
import { v4 as uuidv4 } from 'uuid';
import { AssetContextMenu } from './AssetContextMenu';
import { Histogram } from '../editor/Histogram';
import { buildCssFilterForAdjustments } from '@/utils/rawImagePipeline';
import { AssetThumbnail } from '../common/AssetThumbnail';

interface PhotoBrowserProps {
  isEs?: boolean;
}

type SortField = 'name' | 'rating' | 'date' | 'isEdited';
type SortDirection = 'asc' | 'desc';
type CollectionFilter = 'all' | 'favorites' | 'edited' | 'unedited';

export default function PhotoBrowser({ isEs = true }: PhotoBrowserProps) {
  // Store subscriptions
  const project = useEditorStore((state) => state.project);
  const addAsset = useEditorStore((state) => state.addAsset);
  const batchDeleteAssets = useEditorStore((state) => state.batchDeleteAssets);
  const batchSetAssetRating = useEditorStore((state) => state.batchSetAssetRating);
  const batchSetAssetFolder = useEditorStore((state) => state.batchSetAssetFolder);
  const addProjectAssetFolder = useEditorStore((state) => state.addProjectAssetFolder);
  const setWorkspaceView = useEditorStore((state) => state.setWorkspaceView);
  const activeBrowserAssetId = useEditorStore((state) => state.activeBrowserAssetId);
  const setActiveBrowserAssetId = useEditorStore((state) => state.setActiveBrowserAssetId);
  const selectedBrowserAssetIds = useEditorStore((state) => state.selectedBrowserAssetIds);
  const setSelectedBrowserAssetIds = useEditorStore((state) => state.setSelectedBrowserAssetIds);
  const toggleBrowserAssetSelection = useEditorStore((state) => state.toggleBrowserAssetSelection);
  const clearBrowserAssetSelection = useEditorStore((state) => state.clearBrowserAssetSelection);
  const addElement = useEditorStore((state) => state.addElement);
  const setSelectedElement = useEditorStore((state) => state.setSelectedElement);
  const flushSave = useEditorStore((state) => state.flushSave);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const loadAssetToCanvas = useEditorStore((state) => state.loadAssetToCanvas);
  const setCanvasBatchAssetIds = useEditorStore((state) => state.setCanvasBatchAssetIds);
  const isRaw = project?.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

  // Local browser view state
  const [selectedFolder, setSelectedFolder] = useState<string>('__ALL__');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [orientationFilter, setOrientationFilter] = useState<'horizontal' | 'vertical' | 'square' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [thumbnailSize, setThumbnailSize] = useState<number>(180); // px

  // UI state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [showQuickLook, setShowQuickLook] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [ratingHud, setRatingHud] = useState<{ stars: number; count: number } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetAssetId?: string;
  }>({ isOpen: false, x: 0, y: 0 });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastClickedIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerRatingHud = (stars: number, count: number) => {
    setRatingHud({ stars, count });
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      setRatingHud(null);
    }, 1400);
  };

  const assets = useMemo(() => project?.assets || [], [project?.assets]);
  const folders = useMemo(() => project?.assetFolders || [], [project?.assetFolders]);

  // Set default active asset if none
  useEffect(() => {
    if (!activeBrowserAssetId && assets.length > 0) {
      setActiveBrowserAssetId(assets[0].id);
      setSelectedBrowserAssetIds([assets[0].id]);
    }
  }, [activeBrowserAssetId, assets, setActiveBrowserAssetId, setSelectedBrowserAssetIds]);

  // Active asset object
  const activeAsset = useMemo(() => {
    if (!activeBrowserAssetId) return assets[0] || null;
    return assets.find((a) => a.id === activeBrowserAssetId) || assets[0] || null;
  }, [activeBrowserAssetId, assets]);

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Folder filter
    if (selectedFolder !== '__ALL__') {
      result = result.filter((a) => (a.folderPath || '') === selectedFolder);
    }

    // Collection filter
    if (collectionFilter === 'favorites') {
      result = result.filter((a) => a.isFavorite || (a.rating && a.rating >= 4));
    } else if (collectionFilter === 'edited') {
      result = result.filter((a) => a.isEdited === true);
    } else if (collectionFilter === 'unedited') {
      result = result.filter((a) => !a.isEdited);
    }

    // Rating filter
    if (ratingFilter !== null) {
      if (ratingFilter === 0) {
        result = result.filter((a) => !a.rating || a.rating === 0);
      } else {
        result = result.filter((a) => a.rating === ratingFilter);
      }
    }

    // Orientation filter
    if (orientationFilter) {
      result = result.filter((a) => {
        if (!a.orientation) {
          const w = a.width || 1;
          const h = a.height || 1;
          if (w > h) return orientationFilter === 'horizontal';
          if (h > w) return orientationFilter === 'vertical';
          return orientationFilter === 'square';
        }
        return a.orientation === orientationFilter;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'rating') {
        cmp = (a.rating || 0) - (b.rating || 0);
      } else if (sortField === 'isEdited') {
        cmp = (a.isEdited ? 1 : 0) - (b.isEdited ? 1 : 0);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    assets,
    selectedFolder,
    collectionFilter,
    ratingFilter,
    orientationFilter,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  // Selected asset objects
  const selectedAssets = useMemo(() => {
    const selSet = new Set(selectedBrowserAssetIds);
    return assets.filter((a) => selSet.has(a.id));
  }, [assets, selectedBrowserAssetIds]);

  // Live filter counters
  const filterCounts = useMemo(() => {
    const counts = {
      unrated: 0,
      r1: 0,
      r2: 0,
      r3: 0,
      r4: 0,
      r5: 0,
      horizontal: 0,
      vertical: 0,
      square: 0,
      edited: 0,
      unedited: 0,
      favorites: 0,
    };

    // Base set respecting only selected folder
    const baseAssets =
      selectedFolder === '__ALL__' ? assets : assets.filter((a) => (a.folderPath || '') === selectedFolder);

    baseAssets.forEach((a) => {
      const r = a.rating || 0;
      if (r === 0) counts.unrated++;
      else if (r === 1) counts.r1++;
      else if (r === 2) counts.r2++;
      else if (r === 3) counts.r3++;
      else if (r === 4) counts.r4++;
      else if (r === 5) counts.r5++;

      const w = a.width || 1;
      const h = a.height || 1;
      if (w > h) counts.horizontal++;
      else if (h > w) counts.vertical++;
      else counts.square++;

      if (a.isEdited) counts.edited++;
      else counts.unedited++;

      if (a.isFavorite || r >= 4) counts.favorites++;
    });

    return counts;
  }, [assets, selectedFolder]);

  // Click & Selection handlers
  const handleAssetClick = (e: React.MouseEvent, assetId: string, index: number) => {
    setActiveBrowserAssetId(assetId);

    if (e.shiftKey && lastClickedIdRef.current) {
      // Range selection
      const anchorIdx = filteredAssets.findIndex((a) => a.id === lastClickedIdRef.current);
      if (anchorIdx !== -1) {
        const start = Math.min(anchorIdx, index);
        const end = Math.max(anchorIdx, index);
        const rangeIds = filteredAssets.slice(start, end + 1).map((a) => a.id);
        setSelectedBrowserAssetIds(Array.from(new Set([...selectedBrowserAssetIds, ...rangeIds])));
        return;
      }
    }

    if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      toggleBrowserAssetSelection(assetId);
    } else {
      // Single selection
      setSelectedBrowserAssetIds([assetId]);
    }

    lastClickedIdRef.current = assetId;
  };

  const handleAssetContextMenu = (e: React.MouseEvent, assetId: string) => {
    e.preventDefault();
    if (!selectedBrowserAssetIds.includes(assetId)) {
      setSelectedBrowserAssetIds([assetId]);
      setActiveBrowserAssetId(assetId);
    }
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetAssetId: assetId,
    });
  };

  // Batch Image Processing
  const processBatchFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(
      (f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) ||
        f.name.toLowerCase().endsWith('.jpg') ||
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.png') ||
        f.name.toLowerCase().endsWith('.webp')
    );

    if (validFiles.length === 0) {
      alert(
        isEs
          ? 'Formato no soportado. Actualmente el navegador procesa JPG, JPEG, PNG y WebP con miniaturas de alto rendimiento.'
          : 'Unsupported format. The browser currently supports high-performance JPG, JPEG, PNG, and WebP.'
      );
      return;
    }

    // Check storage quota
    const quota = await getStorageQuotaEstimate();
    if (quota.isNearFull && quota.availableBytes !== undefined) {
      setQuotaWarning(
        isEs
          ? `Advertencia de almacenamiento: Espacio disponible bajo (~${Math.round(quota.availableBytes / (1024 * 1024))}MB restantes en el navegador).`
          : `Storage Warning: Low storage available (~${Math.round(quota.availableBytes / (1024 * 1024))}MB remaining in browser).`
      );
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: validFiles.length });

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setImportProgress({ current: i + 1, total: validFiles.length });

      try {
        const {
          originalUrl,
          previewUrl,
          thumbnailUrl,
          originalBlobId,
          previewBlobId,
          thumbnailBlobId,
          widthPx,
          heightPx,
        } = await processLocalImage(file);

        const metadata = extractAssetMetadataFromFile(file, assets.length + i, {
          w: widthPx || 0,
          h: heightPx || 0,
        });

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
          folderPath: selectedFolder === '__ALL__' ? undefined : selectedFolder,
          width: widthPx,
          height: heightPx,
          orientation: metadata.orientation,
          aspectRatio: metadata.aspectRatio,
          metadata,
        });
      } catch (err) {
        console.error('Failed to import asset:', file.name, err);
      }
    }

    setIsImporting(false);
    setImportProgress(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBatchFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBatchFiles(e.dataTransfer.files);
    }
  };

  // Folder creation
  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    addProjectAssetFolder(trimmed);
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  // Dedicated Handler: Send Batch to Canvas (respecting group identity & discarding mixed groups)
  const handleSendBatchToCanvas = (targetAssetId?: string) => {
    if (!project) return;
    const target = assets.find((a) => a.id === (targetAssetId || activeBrowserAssetId || selectedBrowserAssetIds[0])) || activeAsset || assets[0];
    if (!target) return;

    // Define target's group by folder and active filter
    const targetFolder = target.folderPath || '';

    // If user has a multiple selection, inspect the selected items
    // Otherwise, inspect the currently filtered list in the browser
    const candidateAssets = selectedBrowserAssetIds.length > 1
      ? assets.filter((a) => selectedBrowserAssetIds.includes(a.id))
      : filteredAssets;

    // STRICT RULE: "si hay imagenes mixtas no se envian solo las mismas del su grupo respectivo"
    // Filter to ONLY assets matching the target's folder/group
    let homogeneousAssets = candidateAssets.filter((a) => (a.folderPath || '') === targetFolder);

    // If user was filtering by star rating, also maintain that exact rating
    if (ratingFilter !== null) {
      homogeneousAssets = homogeneousAssets.filter((a) => (a.rating || 0) === ratingFilter);
    }

    if (homogeneousAssets.length === 0) {
      homogeneousAssets = [target];
    }

    const batchIds = homogeneousAssets.map((a) => a.id);
    setCanvasBatchAssetIds(batchIds);
    setSelectedBrowserAssetIds(batchIds);
    setActiveBrowserAssetId(target.id);
    loadAssetToCanvas(target);
    setWorkspaceView('canvas');

    if (candidateAssets.length > homogeneousAssets.length) {
      triggerRatingHud(target.rating || 0, homogeneousAssets.length);
    }
  };

  // Actions
  const handleSendToAlbum = (asset: ProjectAsset) => {
    if (!project) return;
    const isStudio = project.projectCategory === 'studio_print';
    const isRaw = project.type === 'type_raw_session' || (project as { workflowMode?: string })?.workflowMode === 'raw';

    if (isStudio || isRaw) {
      handleSendBatchToCanvas(asset.id);
      return;
    }

    const activeSpread = project.spreads.find((s) => s.id === activeSpreadId) || project.spreads[0];
    if (!activeSpread) {
      alert(isEs ? 'No hay un pliego activo seleccionado.' : 'No active spread selected.');
      return;
    }

    const aspect = asset.aspectRatio || (asset.width && asset.height ? asset.width / asset.height : 1.5);
    const w = 120;
    const h = 120 / aspect;
    const newElId = `el_${Date.now()}`;
    addElement(activeSpread.id, {
      id: newElId,
      type: 'image',
      previewUrl: asset.previewUrl,
      originalUrl: asset.originalUrl,
      previewBlobId: asset.previewBlobId,
      originalBlobId: asset.originalBlobId,
      assetId: asset.id,
      photoAdjustments: asset.developSettings,
      photoFilter: asset.photoFilter,
      filterIntensity: asset.filterIntensity,
      x_mm: 20,
      y_mm: 20,
      w_mm: w,
      h_mm: h,
      rotation_deg: 0,
      zIndex: activeSpread.elements.length,
    });
    setSelectedElement(newElId);

    flushSave();
    setWorkspaceView('canvas');
  };

  // Professional DAM Keyboard Shortcuts: 1-5 for stars, 0 to clear, Arrow keys for grid nav, Space for quick look, Enter to open, F for favorite
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea or select
      const target = e.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }

      // 1. STAR RATING SHORTCUTS (0 to 5) - Supports Top row and Numpad
      const isDigit = e.key >= '0' && e.key <= '5';
      const isNumpad = e.code.startsWith('Numpad') && e.code.length === 7 && e.code[6] >= '0' && e.code[6] <= '5';
      if ((isDigit || isNumpad) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const rating = isDigit ? parseInt(e.key, 10) : parseInt(e.code[6], 10);
        const targetIds = selectedBrowserAssetIds.length > 0
          ? selectedBrowserAssetIds
          : activeBrowserAssetId ? [activeBrowserAssetId] : [];

        if (targetIds.length > 0) {
          batchSetAssetRating(targetIds, rating);
          flushSave();
          triggerRatingHud(rating, targetIds.length);
        }
        return;
      }

      // 2. FAVORITE TOGGLE (F)
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const targetIds = selectedBrowserAssetIds.length > 0
          ? selectedBrowserAssetIds
          : activeBrowserAssetId ? [activeBrowserAssetId] : [];
        if (targetIds.length > 0) {
          const currentRating = activeAsset?.rating || 0;
          const nextRating = currentRating === 5 ? 0 : 5;
          batchSetAssetRating(targetIds, nextRating);
          flushSave();
          triggerRatingHud(nextRating, targetIds.length);
        }
        return;
      }

      // 3. ARROW KEY NAVIGATION
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (filteredAssets.length === 0) return;

        const currentActiveId = activeBrowserAssetId || (selectedBrowserAssetIds.length > 0 ? selectedBrowserAssetIds[0] : null);
        const currentIdx = filteredAssets.findIndex((a) => a.id === currentActiveId);

        let nextIdx = 0;
        if (currentIdx !== -1) {
          const gridW = gridContainerRef.current ? gridContainerRef.current.clientWidth - 32 : 800;
          const itemW = thumbnailSize + 12;
          const cols = Math.max(1, Math.floor(gridW / itemW));

          if (e.key === 'ArrowRight') nextIdx = Math.min(filteredAssets.length - 1, currentIdx + 1);
          else if (e.key === 'ArrowLeft') nextIdx = Math.max(0, currentIdx - 1);
          else if (e.key === 'ArrowDown') nextIdx = Math.min(filteredAssets.length - 1, currentIdx + cols);
          else if (e.key === 'ArrowUp') nextIdx = Math.max(0, currentIdx - cols);
        }

        const nextAsset = filteredAssets[nextIdx];
        if (!nextAsset) return;

        setActiveBrowserAssetId(nextAsset.id);

        if (e.shiftKey && lastClickedIdRef.current) {
          // Range selection
          const anchorIdx = filteredAssets.findIndex((a) => a.id === lastClickedIdRef.current);
          const start = Math.min(anchorIdx !== -1 ? anchorIdx : currentIdx, nextIdx);
          const end = Math.max(anchorIdx !== -1 ? anchorIdx : currentIdx, nextIdx);
          const rangeIds = filteredAssets.slice(start, end + 1).map((a) => a.id);
          setSelectedBrowserAssetIds(rangeIds);
        } else {
          setSelectedBrowserAssetIds([nextAsset.id]);
          lastClickedIdRef.current = nextAsset.id;
        }

        // Auto-scroll card into view
        const cardEl = document.getElementById(`asset-card-${nextAsset.id}`);
        cardEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      // 4. SPACEBAR: QUICK LOOK / LOUPE VIEW
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (activeAsset) {
          setShowQuickLook((prev) => !prev);
        }
        return;
      }

      // 5. ENTER / E / D: OPEN IN CAMERA RAW PRO / CANVAS
      if ((e.key === 'Enter' || e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'd') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (activeAsset) {
          setShowQuickLook(false);
          handleSendToAlbum(activeAsset);
        }
        return;
      }

      // 6. SELECT ALL (Cmd+A / Ctrl+A)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = filteredAssets.map((a) => a.id);
        setSelectedBrowserAssetIds(allIds);
        return;
      }

      // 7. ESCAPE
      if (e.key === 'Escape') {
        if (showQuickLook) {
          setShowQuickLook(false);
          return;
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showDeleteModal) {
          setShowDeleteModal(false);
          return;
        }
        if (showNewFolderModal) {
          setShowNewFolderModal(false);
          return;
        }
        if (contextMenu.isOpen) {
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
          return;
        }
        clearBrowserAssetSelection();
        return;
      }

      // 8. DELETE / BACKSPACE
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const targetIds = selectedBrowserAssetIds.length > 0
          ? selectedBrowserAssetIds
          : activeBrowserAssetId ? [activeBrowserAssetId] : [];
        if (targetIds.length > 0) {
          setShowDeleteModal(true);
        }
        return;
      }

      // 9. HELP (?) or (H)
      if (e.key === '?' || (e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedBrowserAssetIds,
    activeBrowserAssetId,
    activeAsset,
    filteredAssets,
    thumbnailSize,
    showQuickLook,
    showShortcutsModal,
    showDeleteModal,
    showNewFolderModal,
    contextMenu.isOpen,
    batchSetAssetRating,
    setSelectedBrowserAssetIds,
    setActiveBrowserAssetId,
    clearBrowserAssetSelection,
    flushSave,
    handleSendToAlbum,
  ]);

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full w-full bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 select-none overflow-hidden relative"
    >
      {/* Top Professional Bridge Toolbar */}
      <header className="h-12 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 flex items-center justify-between gap-4 z-20 shrink-0">
        {/* Left: Breadcrumbs & View Modes */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span>📁</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[140px]">
              {project?.title || 'Proyecto'}
            </span>
            <span>/</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {selectedFolder === '__ALL__' ? (isEs ? 'Todas las fotos' : 'All Photos') : selectedFolder}
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Quick Counter */}
          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
            <span className="text-neutral-900 dark:text-neutral-200 font-bold">{filteredAssets.length}</span> {isEs ? 'fotos' : 'photos'}
            {selectedBrowserAssetIds.length > 0 && (
              <span className="text-blue-600 dark:text-blue-400 ml-1.5 font-semibold">
                ({selectedBrowserAssetIds.length} {isEs ? 'seleccionadas' : 'selected'})
              </span>
            )}
          </span>
        </div>

        {/* Center: Search & Thumbnail Zoom */}
        <div className="flex items-center gap-4 flex-1 justify-center max-w-xl">
          {/* Search Box */}
          <div className="relative w-full max-w-xs">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEs ? 'Buscar por nombre...' : 'Search by filename...'}
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md pl-8 pr-3 py-1 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Thumbnail Zoom Slider */}
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
            <span className="text-[11px]" title={isEs ? 'Miniaturas pequeñas' : 'Small thumbnails'}>
              ▫
            </span>
            <input
              type="range"
              min={110}
              max={320}
              step={10}
              value={thumbnailSize}
              onChange={(e) => setThumbnailSize(Number(e.target.value))}
              className="w-24 accent-amber-500 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
              title={`${isEs ? 'Tamaño de miniatura' : 'Thumbnail size'}: ${thumbnailSize}px`}
            />
            <span className="text-[14px]" title={isEs ? 'Miniaturas grandes' : 'Large thumbnails'}>
              ◻
            </span>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
            <span>{isEs ? 'Orden:' : 'Sort:'}</span>
            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                setSortField(f);
                setSortDirection(d);
              }}
              className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-amber-500"
            >
              <option value="name-asc">{isEs ? 'Nombre (A-Z)' : 'Name (A-Z)'}</option>
              <option value="name-desc">{isEs ? 'Nombre (Z-A)' : 'Name (Z-A)'}</option>
              <option value="rating-desc">{isEs ? 'Calificación (5★ → 1★)' : 'Rating (5★ → 1★)'}</option>
              <option value="rating-asc">{isEs ? 'Calificación (1★ → 5★)' : 'Rating (1★ → 5★)'}</option>
              <option value="isEdited-desc">{isEs ? 'Editadas primero' : 'Edited first'}</option>
            </select>
          </div>
        </div>

        {/* Right: Batch Import & View Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <span>📥</span>
            <span>{isImporting ? (isEs ? 'Importando...' : 'Importing...') : isEs ? 'Importar Fotos' : 'Import Photos'}</span>
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-700 transition shadow-sm"
            title={isEs ? 'Ver atajos de teclado (Presiona ?)' : 'View keyboard shortcuts (Press ?)'}
          >
            <span>⌨️</span>
            <span>{isEs ? 'Atajos (?)' : 'Shortcuts (?)'}</span>
          </button>

          {isRaw ? (
            <button
              onClick={() => {
                if (!activeAsset) return;
                handleSendBatchToCanvas(activeAsset.id);
              }}
              disabled={filteredAssets.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-bold transition shadow-sm"
              title={isEs ? 'Enviar fotos seleccionadas al Lienzo' : 'Send selected photos to Canvas'}
            >
              <span>🖼️</span>
              <span>{isEs ? 'Enviar a Lienzo' : 'Send to Canvas'}</span>
            </button>
          ) : (
            <button
              onClick={() => setWorkspaceView('canvas')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-700 transition shadow-sm"
              title={isEs ? 'Volver al diseño de álbum o lienzo' : 'Return to Album or Canvas design'}
            >
              <span>🎨</span>
              <span>{isEs ? 'Ir a Lienzo' : 'To Canvas'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Storage Quota Warning banner if active */}
      {quotaWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <span>⚠️ {quotaWarning}</span>
          <button onClick={() => setQuotaWarning(null)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-100 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Import Progress Indicator */}
      {isImporting && importProgress && (
        <div className="bg-blue-50 dark:bg-blue-950/90 border-b border-blue-200 dark:border-blue-800 px-4 py-1.5 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-3">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>
            {isEs ? 'Generando miniaturas optimizadas y procesando metadatos...' : 'Generating optimized thumbnails & metadata...'} (
            {importProgress.current} / {importProgress.total})
          </span>
          <div className="flex-1 max-w-xs bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-150"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Bridge Tri-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===================== LEFT PANEL (Folders & Filters) ===================== */}
        <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          {/* Section: Folders Navigation */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                {isEs ? 'Carpetas' : 'Folders'}
              </span>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
                title={isEs ? 'Crear nueva carpeta' : 'Create new folder'}
              >
                +
              </button>
            </div>

            <div className="space-y-0.5 text-xs">
              {/* All Photos */}
              <button
                onClick={() => setSelectedFolder('__ALL__')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                  selectedFolder === '__ALL__'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>📂</span>
                  <span className="truncate">{isEs ? 'Todas las fotografías' : 'All Photographs'}</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">{assets.length}</span>
              </button>

              {/* Custom Folders */}
              {folders.map((folder) => {
                const count = assets.filter((a) => a.folderPath === folder).length;
                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                      selectedFolder === folder
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>📁</span>
                      <span className="truncate">{folder}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Collections / Smart Views */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 block mb-2">
              {isEs ? 'Colecciones' : 'Collections'}
            </span>
            <div className="space-y-0.5 text-xs">
              <button
                onClick={() => setCollectionFilter('all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                  collectionFilter === 'all'
                    ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <span>{isEs ? 'Todas' : 'All'}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{assets.length}</span>
              </button>

              <button
                onClick={() => setCollectionFilter('favorites')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                  collectionFilter === 'favorites'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <span>⭐ {isEs ? 'Favoritas (4★+)' : 'Favorites (4★+)'}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{filterCounts.favorites}</span>
              </button>

              <button
                onClick={() => setCollectionFilter('edited')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                  collectionFilter === 'edited'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <span>⚡ {isEs ? 'Editadas en Camera Raw' : 'Edited with Camera Raw'}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{filterCounts.edited}</span>
              </button>

              <button
                onClick={() => setCollectionFilter('unedited')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition ${
                  collectionFilter === 'unedited'
                    ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <span>📷 {isEs ? 'Sin editar' : 'Unedited'}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{filterCounts.unedited}</span>
              </button>
            </div>
          </div>

          {/* Section: Live Filter by Stars (Adobe Bridge Filter Panel) */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                {isEs ? 'Filtro por Estrellas' : 'Filter by Rating'}
              </span>
              {ratingFilter !== null && (
                <button
                  onClick={() => setRatingFilter(null)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                >
                  {isEs ? 'Limpiar' : 'Clear'}
                </button>
              )}
            </div>

            <div className="space-y-1 text-xs">
              {[
                { r: 5, label: '★★★★★', count: filterCounts.r5 },
                { r: 4, label: '★★★★', count: filterCounts.r4 },
                { r: 3, label: '★★★', count: filterCounts.r3 },
                { r: 2, label: '★★', count: filterCounts.r2 },
                { r: 1, label: '★', count: filterCounts.r1 },
                { r: 0, label: isEs ? 'Sin calificar' : 'No Rating', count: filterCounts.unrated },
              ].map(({ r, label, count }) => (
                <button
                  key={r}
                  onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded transition ${
                    ratingFilter === r
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span className={r > 0 ? 'text-amber-500 tracking-wider font-bold' : 'text-neutral-500 dark:text-neutral-400'}>{label}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Orientation Filter */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                {isEs ? 'Orientación' : 'Orientation'}
              </span>
              {orientationFilter !== null && (
                <button
                  onClick={() => setOrientationFilter(null)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                >
                  {isEs ? 'Limpiar' : 'Clear'}
                </button>
              )}
            </div>

            <div className="space-y-1 text-xs">
              {[
                { o: 'horizontal' as const, label: isEs ? 'Horizontal (Paisaje)' : 'Landscape', count: filterCounts.horizontal },
                { o: 'vertical' as const, label: isEs ? 'Vertical (Retrato)' : 'Portrait', count: filterCounts.vertical },
                { o: 'square' as const, label: isEs ? 'Cuadrada' : 'Square', count: filterCounts.square },
              ].map(({ o, label, count }) => (
                <button
                  key={o}
                  onClick={() => setOrientationFilter(orientationFilter === o ? null : o)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded transition ${
                    orientationFilter === o
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ===================== CENTER PANEL (Thumbnails Grid) ===================== */}
        <main
          onClick={(e) => {
            // Click outside cards clears selection
            if (e.target === e.currentTarget) {
              clearBrowserAssetSelection();
            }
          }}
          className="flex-1 bg-neutral-100/70 dark:bg-neutral-900 p-4 overflow-y-auto custom-scrollbar relative"
        >
          {/* Drag & Drop Visual Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-amber-500/20 border-2 border-dashed border-amber-500 rounded-lg flex flex-col items-center justify-center pointer-events-none z-30">
              <span className="text-4xl mb-2">📥</span>
              <p className="text-base font-bold text-amber-700 dark:text-amber-300">
                {isEs ? 'Suelta las fotografías aquí para importarlas por lotes' : 'Drop photos here for batch import'}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                {isEs ? 'Admite JPG, JPEG, PNG y WebP con miniaturas ultraligeras' : 'Supports JPG, JPEG, PNG, and WebP'}
              </p>
            </div>
          )}

          {/* Empty State */}
          {filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-3xl mb-3 text-neutral-400">
                📷
              </div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                {assets.length === 0
                  ? isEs
                    ? 'No hay fotografías en este proyecto'
                    : 'No photographs in this project'
                  : isEs
                  ? 'Ninguna fotografía coincide con los filtros'
                  : 'No photographs match your filters'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
                {assets.length === 0
                  ? isEs
                    ? 'Arrastra y suelta imágenes directamente aquí o usa el botón de importar.'
                    : 'Drag and drop images directly here or click import.'
                  : isEs
                  ? 'Intenta restablecer los filtros de estrellas, orientación o carpetas.'
                  : 'Try clearing rating, orientation, or folder filters.'}
              </p>
              {assets.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow transition"
                >
                  {isEs ? 'Seleccionar Fotos' : 'Select Photos'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setRatingFilter(null);
                    setOrientationFilter(null);
                    setCollectionFilter('all');
                    setSelectedFolder('__ALL__');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded text-xs font-medium border border-neutral-300 dark:border-neutral-700 transition shadow-sm"
                >
                  {isEs ? 'Restablecer todos los filtros' : 'Reset all filters'}
                </button>
              )}
            </div>
          ) : (
            /* Adobe Bridge Style Thumbnail Grid */
            <div
              ref={gridContainerRef}
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
              }}
            >
              {filteredAssets.map((asset, index) => {
                const isSelected = selectedBrowserAssetIds.includes(asset.id);
                const isActive = activeBrowserAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    id={`asset-card-${asset.id}`}
                    onClick={(e) => handleAssetClick(e, asset.id, index)}
                    onDoubleClick={() => handleSendToAlbum(asset)}
                    onContextMenu={(e) => handleAssetContextMenu(e, asset.id)}
                    className={`group relative rounded-md border p-1.5 flex flex-col transition cursor-pointer select-none bg-white dark:bg-neutral-950 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10'
                        : isActive
                        ? 'border-neutral-400 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/80'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
                    }`}
                  >
                    {/* Thumbnail Container */}
                    <div
                      className="relative w-full rounded overflow-hidden bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center"
                      style={{ height: `${thumbnailSize * 0.75}px` }}
                    >
                      {/* Thumbnail with accurate develop settings, filters, crop & rotation */}
                      <AssetThumbnail
                        asset={asset}
                        className="w-full h-full"
                        imgClassName="group-hover:scale-[1.02]"
                        fit="contain"
                      />

                      {/* Edit Badge (Camera Raw Indicator) */}
                      {asset.isEdited && (
                        <div
                          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-bold tracking-tight shadow flex items-center gap-1"
                          title={isEs ? 'Ajustado con Camera Raw Pro' : 'Edited with Camera Raw Pro'}
                        >
                          <span>⚡</span>
                          <span>RAW</span>
                        </div>
                      )}

                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-[10px] font-bold shadow">
                          ✓
                        </div>
                      )}
                    </div>

                    {/* Metadata & Interactive Rating */}
                    <div className="mt-1.5 px-1 flex flex-col gap-0.5">
                      {/* Filename */}
                      <span
                        className="text-[11px] font-mono text-neutral-800 dark:text-neutral-300 truncate"
                        title={asset.name}
                      >
                        {asset.name}
                      </span>

                      {/* Star Rating Row */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = (asset.rating || 0) >= star;
                            return (
                              <button
                                key={star}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newRating = (asset.rating || 0) === star ? 0 : star;
                                  batchSetAssetRating([asset.id], newRating);
                                }}
                                className={`text-[12px] leading-none transition hover:scale-125 ${
                                  isFilled ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-700 hover:text-neutral-400'
                                }`}
                                title={`${star} ${isEs ? 'estrellas' : 'stars'}`}
                              >
                                ★
                              </button>
                            );
                          })}
                        </div>

                        {/* Dimensions / Megapixels hint */}
                        {asset.width && asset.height && (
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-mono">
                            {((asset.width * asset.height) / 1_000_000).toFixed(1)}MP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ===================== RIGHT PANEL (Preview & Metadata Inspector) ===================== */}
        <aside className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          {activeAsset ? (
            <div className="flex flex-col h-full">
              {/* Large Image Preview Header */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex flex-col items-center">
                <div className="w-full h-52 bg-white dark:bg-neutral-900 rounded-md overflow-hidden flex items-center justify-center relative border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <AssetThumbnail
                    asset={activeAsset}
                    className="w-full h-full"
                    fit="contain"
                    priority
                  />
                  {activeAsset.isEdited && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-blue-600/90 text-white rounded text-[10px] font-bold shadow">
                      ⚡ Camera Raw Pro
                    </span>
                  )}
                </div>

                {/* Rating Bar for Active Photo */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-1">{isEs ? 'Calificación:' : 'Rating:'}</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        const newRating = (activeAsset.rating || 0) === star ? 0 : star;
                        batchSetAssetRating([activeAsset.id], newRating);
                      }}
                      className={`text-base leading-none transition hover:scale-125 ${
                        (activeAsset.rating || 0) >= star ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-700 hover:text-neutral-500'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {activeAsset.rating && activeAsset.rating > 0 ? (
                    <button
                      onClick={() => batchSetAssetRating([activeAsset.id], 0)}
                      className="text-[10px] text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1"
                      title={isEs ? 'Eliminar clasificación' : 'Remove rating'}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Real-time RGB Histogram */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 block mb-2">
                  {isEs ? 'Histograma' : 'Histogram'}
                </span>
                <div className="w-full bg-neutral-100 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-inner">
                  <Histogram
                    imageSrc={activeAsset.previewUrl || activeAsset.originalUrl || ''}
                    photoAdjustments={activeAsset.developSettings}
                  />
                </div>
              </div>

              {/* File Metadata & Technical Properties */}
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex-1 space-y-2 text-xs">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                  {isEs ? 'Información del Archivo' : 'File Information'}
                </span>

                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-900">
                  <span className="text-neutral-500">{isEs ? 'Nombre' : 'Filename'}</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200 text-right truncate max-w-[170px]" title={activeAsset.name}>
                    {activeAsset.name}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-900">
                  <span className="text-neutral-500">{isEs ? 'Dimensiones' : 'Dimensions'}</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">
                    {activeAsset.width && activeAsset.height
                      ? `${activeAsset.width} × ${activeAsset.height} px`
                      : '—'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-900">
                  <span className="text-neutral-500">{isEs ? 'Orientación' : 'Orientation'}</span>
                  <span className="text-neutral-800 dark:text-neutral-200 capitalize">
                    {activeAsset.orientation ||
                      (activeAsset.width && activeAsset.height && activeAsset.width > activeAsset.height
                        ? 'Horizontal'
                        : 'Vertical')}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-900">
                  <span className="text-neutral-500">{isEs ? 'Carpeta' : 'Folder'}</span>
                  <select
                    value={activeAsset.folderPath || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      batchSetAssetFolder([activeAsset.id], val || undefined);
                    }}
                    className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded px-1.5 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">{isEs ? '(Sin carpeta)' : '(No folder)'}</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between py-1 border-b border-neutral-200/60 dark:border-neutral-900">
                  <span className="text-neutral-500">{isEs ? 'Estado Revelado' : 'Develop State'}</span>
                  <span className={activeAsset.isEdited ? 'text-amber-500 font-semibold' : 'text-neutral-500 dark:text-neutral-400'}>
                    {activeAsset.isEdited
                      ? isEs
                        ? 'Ajustes no destructivos'
                        : 'Non-destructive edits'
                      : isEs
                      ? 'Original'
                      : 'Original'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 space-y-2">
                <button
                  onClick={() => handleSendToAlbum(activeAsset)}
                  className="w-full py-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white dark:text-neutral-100 rounded text-xs font-semibold border border-neutral-800 dark:border-neutral-700 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>📖</span>
                  <span>{isEs ? 'Colocar en Álbum / Lienzo' : 'Place on Album / Canvas'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-500 p-4 text-center">
              {isEs ? 'Selecciona una fotografía para ver sus metadatos' : 'Select a photo to view metadata'}
            </div>
          )}
        </aside>
      </div>

      {/* ===================== CONTEXT MENU ===================== */}
      <AssetContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        selectedAssets={selectedAssets}
        isEs={isEs}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        onSendToCanvas={() => {
          handleSendBatchToCanvas(contextMenu.targetAssetId);
        }}
        onOpenInCameraRaw={() => {
          handleSendBatchToCanvas(contextMenu.targetAssetId);
        }}
        onOpenInPhotoStudio={() => {
          handleSendBatchToCanvas(contextMenu.targetAssetId);
        }}
        onSendToAlbum={() => {
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
          if (activeAsset) handleSendToAlbum(activeAsset);
        }}
        onSetRating={(rating) => {
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
          batchSetAssetRating(selectedBrowserAssetIds, rating);
        }}
        onToggleFavorite={() => {
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
          const current = activeAsset?.isFavorite || false;
          batchSetAssetRating(selectedBrowserAssetIds, current ? 0 : 5);
        }}
        onDeleteFromCatalog={() => {
          setContextMenu((prev) => ({ ...prev, isOpen: false }));
          setShowDeleteModal(true);
        }}
      />

      {/* ===================== NEW FOLDER MODAL ===================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">
              📁 {isEs ? 'Nueva Carpeta' : 'New Folder'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              {isEs
                ? 'Ingresa un nombre para catalogar tus fotografías organizadamente:'
                : 'Enter a name to catalog your photographs:'}
            </p>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolderModal(false);
              }}
              placeholder={isEs ? 'Ej: Ceremonia, Recepción, Vals...' : 'e.g. Ceremony, Reception...'}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded px-3 py-2 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition"
              >
                {isEs ? 'Crear Carpeta' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">
              ⚠️ {isEs ? 'Eliminar del catálogo' : 'Remove from catalog'}
            </h3>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-2">
              {isEs
                ? `¿Estás seguro de que deseas eliminar ${selectedBrowserAssetIds.length} fotografía(s) del catálogo del proyecto?`
                : `Are you sure you want to remove ${selectedBrowserAssetIds.length} photograph(s) from the project catalog?`}
            </p>
            <p className="text-[11px] text-neutral-500 mb-5">
              {isEs
                ? 'Nota: Los archivos originales en tu disco no se verán afectados. Las fotos se desvincularán del proyecto y se liberará espacio de almacenamiento en el navegador.'
                : 'Note: Original files on disk will not be affected. Photos will be unlinked from the project and browser storage space will be reclaimed.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  batchDeleteAssets(selectedBrowserAssetIds);
                  setShowDeleteModal(false);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition"
              >
                {isEs ? 'Eliminar del Catálogo' : 'Remove from Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== QUICK LOOK / LOUPE VIEW MODAL ===================== */}
      {showQuickLook && activeAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in zoom-in-95 duration-150"
          onClick={() => setShowQuickLook(false)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between text-neutral-300 px-3 py-2 border-b border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-white">{activeAsset.name}</span>
              {activeAsset.width && activeAsset.height && (
                <span className="text-xs text-neutral-400 font-mono">
                  {activeAsset.width} × {activeAsset.height} px ({((activeAsset.width * activeAsset.height) / 1_000_000).toFixed(1)}MP)
                </span>
              )}
              {activeAsset.isEdited && (
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                  ⚡ Camera Raw Pro
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="hidden sm:inline">
                {isEs ? 'Usa ← → para navegar • 1-5 para calificar • Espacio o Esc para cerrar' : 'Use ← → to navigate • 1-5 to rate • Space or Esc to close'}
              </span>
              <button
                onClick={() => setShowQuickLook(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Central Image View */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeAsset.previewUrl || activeAsset.originalUrl}
              alt={activeAsset.name}
              className="max-w-full max-h-full object-contain drop-shadow-2xl select-none"
              style={{
                filter: buildCssFilterForAdjustments(
                  activeAsset.developSettings,
                  activeAsset.photoFilter,
                  activeAsset.filterIntensity
                ),
              }}
            />
          </div>

          {/* Footer Controls */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-800 text-xs bg-neutral-950/80 rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Rating Stars */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">{isEs ? 'Calificación:' : 'Rating:'}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      const newRating = (activeAsset.rating || 0) === star ? 0 : star;
                      batchSetAssetRating([activeAsset.id], newRating);
                      flushSave();
                      triggerRatingHud(newRating, 1);
                    }}
                    className={`text-lg leading-none transition hover:scale-125 ${
                      (activeAsset.rating || 0) >= star ? 'text-amber-400' : 'text-neutral-700 hover:text-neutral-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {activeAsset.rating && activeAsset.rating > 0 ? (
                <button
                  onClick={() => {
                    batchSetAssetRating([activeAsset.id], 0);
                    flushSave();
                    triggerRatingHud(0, 1);
                  }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-300 ml-1"
                >
                  {isEs ? 'Quitar' : 'Clear'}
                </button>
              ) : null}
            </div>

            {/* Quick Action: Open in Camera Raw / Canvas */}
            <button
              onClick={() => {
                setShowQuickLook(false);
                handleSendToAlbum(activeAsset);
              }}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold border border-neutral-700 transition flex items-center gap-2"
            >
              <span>🎞️</span>
              <span>{isEs ? 'Abrir en Camera Raw Pro (Enter)' : 'Open in Camera Raw Pro (Enter)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================== KEYBOARD SHORTCUTS CHEAT SHEET MODAL ===================== */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-neutral-900 dark:text-neutral-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⌨️</span>
                <h3 className="text-sm font-bold">
                  {isEs ? 'Atajos de Teclado — Biblioteca Fotográfica' : 'Keyboard Shortcuts — Photo Library'}
                </h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-6 h-6 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-xs text-neutral-400 hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Calificar estrellas' : 'Set Star Rating'}</span>
                <div className="flex gap-1 font-mono font-bold">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-amber-600 dark:text-amber-400">1</kbd>
                  <span>-</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-amber-600 dark:text-amber-400">5</kbd>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Quitar calificación' : 'Clear Rating'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">0</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Navegar fotos' : 'Navigate Photos'}</span>
                <div className="flex gap-1 font-mono font-bold">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">→</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">↓</kbd>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Selección en rango' : 'Range Selection'}</span>
                <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">Shift + Flechas</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Vista Rápida' : 'Quick Look Preview'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">Espacio</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Abrir en Camera Raw / Lienzo' : 'Open in Camera Raw / Canvas'}</span>
                <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">Enter / E / D</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Volver a Biblioteca' : 'Return to Library'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">G</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Antes / Después (Lienzo)' : 'Before / After (Canvas)'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">\ o Y</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Alternar Favorito' : 'Toggle Favorite'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">F</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Seleccionar todo' : 'Select All'}</span>
                <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">⌘/Ctrl + A</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Eliminar del catálogo' : 'Delete from Catalog'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">Del / ⌫</kbd>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-300">{isEs ? 'Cerrar / Deseleccionar' : 'Close / Deselect'}</span>
                <kbd className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-bold">Esc</kbd>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {isEs ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RATING HUD NOTIFICATION ===================== */}
      {ratingHud && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-neutral-950/95 backdrop-blur-md text-white border border-neutral-700/80 rounded-full px-5 py-2 text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          {ratingHud.stars > 0 ? (
            <>
              <span className="text-amber-400 text-base leading-none tracking-wider">
                {'★'.repeat(ratingHud.stars)}{'☆'.repeat(5 - ratingHud.stars)}
              </span>
              <span className="text-neutral-200">
                {isEs ? `${ratingHud.stars} estrella(s)` : `${ratingHud.stars} star(s)`}
                {ratingHud.count > 1 ? ` (${ratingHud.count} fotos)` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="text-neutral-400 font-bold">✕</span>
              <span className="text-neutral-300">
                {isEs ? 'Calificación eliminada' : 'Rating removed'}
                {ratingHud.count > 1 ? ` (${ratingHud.count} fotos)` : ''}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
