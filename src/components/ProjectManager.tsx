import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage, ProjectIndexMeta } from '@/utils/projectStorage';
import { get as idbGet } from 'idb-keyval';

interface ProjectManagerProps {
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
}

// Subcomponent for each project card to handle thumbnail hydration and rich metadata
function ProjectCardItem({ 
  proj, 
  folders,
  onOpen, 
  onDelete,
  onMoveFolder
}: { 
  proj: ProjectIndexMeta;
  folders: string[];
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveFolder: (folderName: string) => void;
}) {
  const t = useTranslations('Editor');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (proj.thumbnailPreviewId) {
      idbGet<Blob>(proj.thumbnailPreviewId).then((blob) => {
        if (active && blob) {
          createdUrl = URL.createObjectURL(blob);
          setThumbUrl(createdUrl);
        }
      }).catch(err => {
        console.warn("Could not load thumbnail for project", proj.id, err);
      });
    }

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [proj.thumbnailPreviewId, proj.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
    }
    if (showFolderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFolderMenu]);

  const isStudio = proj.projectCategory === 'studio_print';
  const dateUpdated = proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : '—';
  const dateCreated = proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : dateUpdated;

  const handleExportRvp = (e: React.MouseEvent) => {
    e.stopPropagation();
    projectStorage.exportProjectFile(proj.id);
  };

  return (
    <div 
      onClick={onOpen}
      className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden cursor-pointer hover:border-neutral-700 hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col justify-between"
    >
      {/* 1. Visual Thumbnail Preview Banner */}
      <div className="relative w-full h-44 bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-neutral-800/80">
        {thumbUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={thumbUrl} 
            alt={proj.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
            <span className="text-4xl mb-2 opacity-50">{isStudio ? '🖼️' : '📖'}</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              {proj.sizeStr || (isStudio ? 'Lienzo de Estudio' : 'Álbum Fotográfico')}
            </span>
            <span className="text-[10px] text-neutral-600 mt-0.5">
              {proj.pixelResolution || (isStudio ? '300 DPI' : 'Multi-pliego')}
            </span>
          </div>
        )}

        {/* Floating Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isStudio ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-orange-950/90 backdrop-blur-md border border-orange-700/80 text-orange-300 flex items-center gap-1.5 shadow-lg">
              <span>🖼️</span>
              <span>{proj.sizeStr || 'Estudio'}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-950/90 backdrop-blur-md border border-blue-700/80 text-blue-300 flex items-center gap-1.5 shadow-lg">
              <span>📖</span>
              <span>Álbum</span>
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-neutral-900/90 backdrop-blur-md border border-neutral-700 text-neutral-300">
            {proj.fileExtension || '.rvp'}
          </span>
        </div>

        {/* Quick Action Buttons on Hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Download .rvp file button */}
          <button
            onClick={handleExportRvp}
            className="w-8 h-8 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 backdrop-blur-md flex items-center justify-center text-xs transition shadow-md"
            title={t('export_rvp_tooltip')}
          >
            💾
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-neutral-900/90 hover:bg-red-950/80 text-neutral-400 hover:text-red-400 border border-neutral-700 backdrop-blur-md flex items-center justify-center text-xs transition shadow-md"
            title={t('delete')}
          >
            🗑️
          </button>
        </div>

        {/* Bottom Folder Tag on Preview */}
        <div className="absolute bottom-2.5 left-3">
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFolderMenu(!showFolderMenu)}
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-black/75 hover:bg-black text-neutral-300 hover:text-white border border-white/10 backdrop-blur-md flex items-center gap-1.5 transition"
            >
              <span>📁</span>
              <span className="truncate max-w-[120px]">{proj.folder || 'Sin Carpeta'}</span>
              <span className="text-[9px] opacity-60">▾</span>
            </button>

            {/* Folder Dropdown Menu */}
            {showFolderMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-44 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] uppercase font-bold text-neutral-500 px-2.5 py-1.5 border-b border-neutral-800">
                  {t('move_to_folder')}
                </div>
                <button
                  onClick={() => {
                    onMoveFolder('none');
                    setShowFolderMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 ${!proj.folder ? 'bg-orange-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-900'}`}
                >
                  <span>📁</span>
                  <span>{t('folder_general')}</span>
                </button>
                {folders.map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      onMoveFolder(f);
                      setShowFolderMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 truncate ${proj.folder === f ? 'bg-orange-600 text-white font-bold' : 'text-neutral-300 hover:bg-neutral-900'}`}
                  >
                    <span>📁</span>
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Project Title */}
          <h3 className="text-base font-bold text-neutral-100 mb-3 truncate group-hover:text-orange-400 transition-colors">
            {proj.title || 'Untitled Project'}
          </h3>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 mb-4">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">{t('metadata_dimensions')}</span>
              <span className="text-neutral-200 font-mono font-semibold">{proj.sizeStr || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">{t('metadata_resolution')}</span>
              <span className="text-neutral-200 font-mono font-semibold">{proj.pixelResolution || '300 DPI'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">{t('metadata_dpi')}</span>
              <span className="text-neutral-200 font-mono font-semibold">{proj.targetDpi || 300} DPI</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">{t('metadata_layers')}</span>
              <span className="text-neutral-200 font-mono font-semibold">{proj.elementCount ?? 0} elementos</span>
            </div>
          </div>
        </div>

        {/* Dates & Action Footer */}
        <div className="border-t border-neutral-800/80 pt-3 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-3">
            <div>
              <span>{t('created_at')}: </span>
              <span className="text-neutral-400 font-mono">{dateCreated}</span>
            </div>
            <span className="text-neutral-700">•</span>
            <div>
              <span>{t('last_updated')}: </span>
              <span className="text-neutral-400 font-mono">{dateUpdated}</span>
            </div>
          </div>

          <span className="text-xs font-bold text-orange-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            {t('open')} →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProjectManager({ onOpenProject, onNewProject }: ProjectManagerProps) {
  const t = useTranslations('Editor');
  const [projects, setProjects] = useState<ProjectIndexMeta[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'album' | 'studio_print'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'alpha'>('recent');

  // New Folder Modal / Input state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // File import ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setProjects(projectStorage.getAllProjects());
    setFolders(projectStorage.getFolders());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete_project'))) {
      projectStorage.deleteProject(id);
      refreshData();
    }
  };

  const handleMoveFolder = (projectId: string, folderName: string) => {
    projectStorage.moveToFolder(projectId, folderName);
    refreshData();
  };

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const updated = projectStorage.addFolder(trimmed);
    setFolders(updated);
    setSelectedFolder(trimmed);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete_folder', { name: folderName }))) {
      const updated = projectStorage.deleteFolder(folderName);
      setFolders(updated);
      if (selectedFolder === folderName) setSelectedFolder('all');
      refreshData();
    }
  };

  // Import .rvp File Handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawStr = event.target?.result as string;
        const parsed = JSON.parse(rawStr);
        if (!parsed.id || !parsed.spreads || !parsed.size) {
          alert(t('import_rvp_error'));
          return;
        }

        // If duplicate ID exists, create unique copy
        const existing = projectStorage.getAllProjects();
        if (existing.some(p => p.id === parsed.id)) {
          parsed.id = `proj_${Date.now()}`;
          parsed.title = `${parsed.title} (Copia)`;
        }

        projectStorage.saveProject(parsed);
        refreshData();
        alert(t('import_rvp_success'));
      } catch (err) {
        console.error("Failed to parse .rvp file", err);
        alert(t('import_rvp_error'));
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Category Counts
  const counts = useMemo(() => {
    const total = projects.length;
    const albums = projects.filter(p => p.projectCategory === 'album' || !p.projectCategory).length;
    const studios = projects.filter(p => p.projectCategory === 'studio_print').length;
    return { total, albums, studios };
  }, [projects]);

  // Folder Counts
  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    folders.forEach(f => {
      map[f] = projects.filter(p => p.folder === f).length;
    });
    map['__general__'] = projects.filter(p => !p.folder).length;
    return map;
  }, [projects, folders]);

  // Filter & Sort
  const filteredAndSortedProjects = useMemo(() => {
    let list = [...projects];

    // Filter by Category
    if (filterCategory !== 'all') {
      list = list.filter(p => {
        if (filterCategory === 'studio_print') return p.projectCategory === 'studio_print';
        return p.projectCategory === 'album' || !p.projectCategory;
      });
    }

    // Filter by Folder
    if (selectedFolder !== 'all') {
      if (selectedFolder === '__general__') {
        list = list.filter(p => !p.folder);
      } else {
        list = list.filter(p => p.folder === selectedFolder);
      }
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.title?.toLowerCase().includes(q) || p.folder?.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      if (sortOrder === 'recent') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt || a.updatedAt).getTime() - new Date(b.createdAt || b.updatedAt).getTime();
      }
      if (sortOrder === 'alpha') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return list;
  }, [projects, filterCategory, selectedFolder, searchQuery, sortOrder]);

  return (
    <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col items-center py-10 px-6 overflow-y-auto">
      {/* Hidden File Input for .rvp Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport}
        accept=".rvp,.json" 
        className="hidden" 
      />

      <div className="max-w-6xl w-full">
        
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-orange-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-600/30">
                R
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white capitalize">
                  {t('myProjects')}
                </h1>
                <p className="text-xs text-neutral-400 mt-0.5">
                  RVP Suite — Álbumes & Estudios de Impresión Fotográfica Profesional
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: New Project & Import .rvp */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-2 shadow"
              title={t('btn_import_rvp')}
            >
              <span>📥</span>
              <span>{t('btn_import_rvp')}</span>
            </button>

            <button 
              onClick={onNewProject}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-orange-600/25 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <span>+</span>
              <span>{t('newProject')}</span>
            </button>
          </div>
        </div>

        {/* FOLDERS & COLLECTIONS BAR */}
        <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-4 mb-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <span>📁</span>
                <span>{t('folder_collection')}</span>
              </span>
            </div>

            {!isCreatingFolder ? (
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="text-xs text-orange-500 hover:text-orange-400 font-semibold flex items-center gap-1 transition"
              >
                <span>+</span> {t('btn_new_folder')}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t('folder_name_placeholder')}
                  className="px-3 py-1 bg-neutral-950 border border-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 outline-none focus:border-orange-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition"
                >
                  {t('save_folder')}
                </button>
                <button
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2 py-1 text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Folder Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All Folders */}
            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${selectedFolder === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'}`}
            >
              <span>{t('filter_all_folders')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-neutral-300 font-mono">{projects.length}</span>
            </button>

            {/* General (No Folder) */}
            <button
              onClick={() => setSelectedFolder('__general__')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${selectedFolder === '__general__' ? 'bg-orange-600 text-white shadow' : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'}`}
            >
              <span>📁 {t('folder_general')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-neutral-300 font-mono">{folderCounts['__general__'] || 0}</span>
            </button>

            {/* Individual Folders */}
            {folders.map(f => {
              const isSel = selectedFolder === f;
              const count = folderCounts[f] || 0;
              return (
                <div key={f} className="relative group shrink-0">
                  <button
                    onClick={() => setSelectedFolder(f)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${isSel ? 'bg-orange-600 text-white shadow' : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'}`}
                  >
                    <span>📁</span>
                    <span>{f}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-neutral-300 font-mono">{count}</span>
                  </button>
                  {/* Delete folder button on hover */}
                  <button
                    onClick={(e) => handleDeleteFolder(f, e)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-800 text-neutral-400 hover:bg-red-600 hover:text-white text-[10px] items-center justify-center hidden group-hover:flex shadow transition"
                    title={t('delete_folder')}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CATEGORY TABS, SEARCH & SORTER BAR */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
          
          {/* Category Tabs */}
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800/80 shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${filterCategory === 'all' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <span>{t('tab_all_projects')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700/60 text-neutral-300 font-mono">{counts.total}</span>
            </button>
            <button
              onClick={() => setFilterCategory('studio_print')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${filterCategory === 'studio_print' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <span>{t('tab_studio_prints')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700/60 text-neutral-300 font-mono">{counts.studios}</span>
            </button>
            <button
              onClick={() => setFilterCategory('album')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${filterCategory === 'album' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <span>{t('tab_albums')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700/60 text-neutral-300 font-mono">{counts.albums}</span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <input 
                type="text"
                placeholder={t('search_projects')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-white placeholder-neutral-500 outline-none focus:border-orange-500 transition"
              />
              <span className="absolute left-3 top-2.5 text-neutral-500 text-xs">🔍</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-neutral-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sorter Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">{t('sort_by')}:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest' | 'alpha')}
                className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="recent">{t('sort_recent')}</option>
                <option value="oldest">{t('sort_oldest')}</option>
                <option value="alpha">{t('sort_az')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* PROJECTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map(proj => (
            <ProjectCardItem 
              key={proj.id}
              proj={proj}
              folders={folders}
              onOpen={() => onOpenProject(proj.id)}
              onDelete={(e) => handleDelete(proj.id, e)}
              onMoveFolder={(folder) => handleMoveFolder(proj.id, folder)}
            />
          ))}

          {/* Empty State */}
          {filteredAndSortedProjects.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-neutral-900/30">
              <span className="text-5xl mb-3">📁</span>
              <p className="text-base font-semibold text-neutral-300 mb-1">{t('noProjects')}</p>
              <p className="text-xs text-neutral-500 mb-6">
                No se encontraron proyectos en esta categoría, carpeta o filtro de búsqueda.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-bold transition shadow"
                >
                  📥 {t('btn_import_rvp')}
                </button>
                <button 
                  onClick={onNewProject}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-lg shadow-orange-600/30"
                >
                  + {t('newProject')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
