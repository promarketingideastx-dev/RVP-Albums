import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage, ProjectIndexMeta } from '@/utils/projectStorage';
import { get as idbGet } from 'idb-keyval';

interface ProjectManagerProps {
  onOpenProject: (id: string) => void;
  onNewProject: (defaultFolder?: string) => void;
}

// Subcomponent for each Project Card inside a folder
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
      className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden cursor-pointer hover:border-neutral-600 hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col justify-between"
    >
      {/* 1. Visual Thumbnail Preview Banner */}
      <div className="relative w-full h-48 bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-neutral-800">
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
            <span className="text-[10px] text-neutral-600 mt-1">
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
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-black/80 hover:bg-black text-neutral-300 hover:text-white border border-white/10 backdrop-blur-md flex items-center gap-1.5 transition"
            >
              <span>📁</span>
              <span className="truncate max-w-[120px]">{proj.folder || 'Sin Carpeta'}</span>
              <span className="text-[9px] opacity-60">▾</span>
            </button>

            {/* Folder Dropdown Menu */}
            {showFolderMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-48 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
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
          <div className="grid grid-cols-2 gap-3 bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800/80 mb-4">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_dimensions')}</span>
              <span className="text-neutral-200 font-mono font-bold text-xs">{proj.sizeStr || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_resolution')}</span>
              <span className="text-neutral-200 font-mono font-bold text-xs">{proj.pixelResolution || '300 DPI'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_dpi')}</span>
              <span className="text-neutral-200 font-mono font-bold text-xs">{proj.targetDpi || 300} DPI</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_layers')}</span>
              <span className="text-neutral-200 font-mono font-bold text-xs">{proj.elementCount ?? 0} elementos</span>
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

// Subcomponent for each Folder Card at the root level
function FolderCardItem({
  name,
  isGeneral,
  projects,
  onOpen,
  onDelete
}: {
  name: string;
  isGeneral: boolean;
  projects: ProjectIndexMeta[];
  onOpen: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const t = useTranslations('Editor');

  const count = projects.length;
  const albumCount = projects.filter(p => p.projectCategory === 'album' || !p.projectCategory).length;
  const studioCount = projects.filter(p => p.projectCategory === 'studio_print').length;

  // Find latest update in this folder
  const latestDate = useMemo(() => {
    if (projects.length === 0) return null;
    const sorted = [...projects].sort((a, b) => 
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    return sorted[0]?.updatedAt ? new Date(sorted[0].updatedAt).toLocaleDateString() : null;
  }, [projects]);

  return (
    <div
      onClick={onOpen}
      className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 cursor-pointer hover:border-orange-500/80 hover:bg-neutral-900/90 hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col justify-between relative overflow-hidden"
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl group-hover:bg-orange-600/10 transition-colors pointer-events-none" />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-orange-500/50 transition-all shadow-md">
            📁
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 text-neutral-300">
              {count} {count === 1 ? 'proyecto' : 'proyectos'}
            </span>

            {!isGeneral && onDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                title={t('delete_folder')}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Folder Name */}
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors flex items-center gap-2">
          <span>{name}</span>
        </h3>

        {/* Folder Metadata ONLY */}
        <div className="space-y-1.5 text-xs text-neutral-400 mt-3 border-t border-neutral-800/80 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Contenido:</span>
            <span className="font-medium text-neutral-300">
              {count === 0 ? 'Sin archivos' : `${albumCount > 0 ? `${albumCount} Álbumes` : ''} ${albumCount > 0 && studioCount > 0 ? '•' : ''} ${studioCount > 0 ? `${studioCount} Estudios` : ''}`}
            </span>
          </div>

          {latestDate && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Última actividad:</span>
              <span className="text-neutral-400 font-mono">{latestDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-6 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
        <span className="text-neutral-500 font-medium group-hover:text-neutral-400">
          Explorar carpeta
        </span>
        <span className="font-bold text-orange-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
          {t('view_folder')}
        </span>
      </div>
    </div>
  );
}

export default function ProjectManager({ onOpenProject, onNewProject }: ProjectManagerProps) {
  const t = useTranslations('Editor');
  const [projects, setProjects] = useState<ProjectIndexMeta[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  
  // Navigation State: null = Root Folders View, string = Inside that specific Folder
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<'all' | 'album' | 'studio_print'>('all');
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

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
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
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete_folder', { name: folderName }))) {
      const updated = projectStorage.deleteFolder(folderName);
      setFolders(updated);
      if (currentFolder === folderName) setCurrentFolder(null);
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

        // If currently inside a folder, assign the imported project to that folder!
        if (currentFolder && currentFolder !== '__general__') {
          parsed.folder = currentFolder;
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Category Counts across all projects
  const counts = useMemo(() => {
    const total = projects.length;
    const albums = projects.filter(p => p.projectCategory === 'album' || !p.projectCategory).length;
    const studios = projects.filter(p => p.projectCategory === 'studio_print').length;
    return { total, albums, studios };
  }, [projects]);

  // Projects inside the currently selected folder
  const projectsInCurrentFolder = useMemo(() => {
    if (!currentFolder) return [];

    let list = projects.filter(p => {
      if (currentFolder === '__general__') return !p.folder;
      return p.folder === currentFolder;
    });

    // Filter by Category inside folder
    if (filterCategory !== 'all') {
      list = list.filter(p => {
        if (filterCategory === 'studio_print') return p.projectCategory === 'studio_print';
        return p.projectCategory === 'album' || !p.projectCategory;
      });
    }

    // Filter by Search Query inside folder
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.title?.toLowerCase().includes(q));
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
  }, [projects, currentFolder, filterCategory, searchQuery, sortOrder]);

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
        
        {/* ============================================================== */}
        {/* LEVEL 1: ROOT FOLDERS DIRECTORY VIEW                            */}
        {/* ============================================================== */}
        {currentFolder === null ? (
          <div>
            {/* Top Header */}
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
                      Directorio de Carpetas y Colecciones Fotográficas
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 self-start md:self-auto">
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-2 shadow"
                >
                  <span>📁</span>
                  <span>{t('btn_new_folder')}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-2 shadow"
                  title={t('btn_import_rvp')}
                >
                  <span>📥</span>
                  <span>{t('btn_import_rvp')}</span>
                </button>

                <button 
                  onClick={() => onNewProject()}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-orange-600/25 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <span>+</span>
                  <span>{t('newProject')}</span>
                </button>
              </div>
            </div>

            {/* Inline New Folder Creator Modal / Banner */}
            {isCreatingFolder && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-8 shadow-2xl animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>📁</span>
                      <span>Crear Nueva Carpeta / Colección</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Ingresa el nombre de la categoría o cliente para organizar tus proyectos.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="ej. Bodas 2026, XV Años..."
                      className="px-4 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-orange-500 w-64"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                      {t('save_folder')}
                    </button>
                    <button
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-3 py-2 text-neutral-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Folder Grid Title & Stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {t('folders_title')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-400 font-mono">
                  {folders.length + 1} carpetas
                </span>
              </div>

              <div className="text-xs text-neutral-500 flex items-center gap-3">
                <span>Total: <strong className="text-neutral-300">{counts.total} proyectos</strong></span>
                <span>•</span>
                <span>{counts.studios} Estudios</span>
                <span>•</span>
                <span>{counts.albums} Álbumes</span>
              </div>
            </div>

            {/* FOLDERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. General Folder (Uncategorized) */}
              <FolderCardItem
                name={t('folder_general')}
                isGeneral={true}
                projects={projects.filter(p => !p.folder)}
                onOpen={() => setCurrentFolder('__general__')}
              />

              {/* 2. Custom Folders */}
              {folders.map(f => (
                <FolderCardItem
                  key={f}
                  name={f}
                  isGeneral={false}
                  projects={projects.filter(p => p.folder === f)}
                  onOpen={() => setCurrentFolder(f)}
                  onDelete={(e) => handleDeleteFolder(f, e)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* LEVEL 2: INSIDE A SPECIFIC FOLDER VIEW                          */
          /* ============================================================== */
          <div>
            {/* Folder Navigation Header with Back Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setCurrentFolder(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
                >
                  {t('back_to_folders')}
                </button>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📁</span>
                    <h2 className="text-2xl font-black text-white">
                      {currentFolder === '__general__' ? t('folder_general') : currentFolder}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-800 text-orange-400">
                      {projectsInCurrentFolder.length} proyectos
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5 ml-8">
                    Proyectos almacenados en esta carpeta
                  </p>
                </div>
              </div>

              {/* Action Buttons inside folder */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-2"
                >
                  <span>📥</span>
                  <span>{t('btn_import_rvp')}</span>
                </button>

                <button 
                  onClick={() => onNewProject(currentFolder === '__general__' ? undefined : currentFolder)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-orange-600/25 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                >
                  <span>+</span>
                  <span>{t('new_project_in_folder')}</span>
                </button>
              </div>
            </div>

            {/* Inner Search & Sort Bar */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
              
              {/* Category Filter */}
              <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800/80 shrink-0">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterCategory === 'all' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {t('tab_all_projects')}
                </button>
                <button
                  onClick={() => setFilterCategory('studio_print')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterCategory === 'studio_print' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {t('tab_studio_prints')}
                </button>
                <button
                  onClick={() => setFilterCategory('album')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterCategory === 'album' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {t('tab_albums')}
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-3 flex-1 justify-end">
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

            {/* PROJECTS GRID INSIDE FOLDER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectsInCurrentFolder.map(proj => (
                <ProjectCardItem 
                  key={proj.id}
                  proj={proj}
                  folders={folders}
                  onOpen={() => onOpenProject(proj.id)}
                  onDelete={(e) => handleDeleteProject(proj.id, e)}
                  onMoveFolder={(folder) => handleMoveFolder(proj.id, folder)}
                />
              ))}

              {/* Empty Folder State */}
              {projectsInCurrentFolder.length === 0 && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-neutral-900/30">
                  <span className="text-5xl mb-3">📁</span>
                  <p className="text-base font-bold text-neutral-300 mb-1">{t('folder_empty')}</p>
                  <p className="text-xs text-neutral-500 mb-6">{t('folder_empty_desc')}</p>
                  <button 
                    onClick={() => onNewProject(currentFolder === '__general__' ? undefined : currentFolder)}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-lg shadow-orange-600/30"
                  >
                    + {t('new_project_in_folder')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
