import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage, ProjectIndexMeta } from '@/utils/projectStorage';
import { get as idbGet } from 'idb-keyval';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

interface ProjectManagerProps {
  onOpenProject: (id: string) => void;
  onNewProject: (defaultFolder?: string, defaultCategory?: 'album' | 'studio_print') => void;
}

// Subcomponent for each Project Card
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

    const loadThumb = async () => {
      try {
        // Priority 1: Check real composition thumbnail generated on save
        let blob = await idbGet<Blob>(`thumb_${proj.id}`);
        // Priority 2: Fall back to registered thumbnail preview ID
        if (!blob && proj.thumbnailPreviewId) {
          blob = await idbGet<Blob>(proj.thumbnailPreviewId);
        }
        if (active && blob) {
          createdUrl = URL.createObjectURL(blob);
          setThumbUrl(createdUrl);
        }
      } catch (err) {
        console.warn("Could not load thumbnail for project", proj.id, err);
      }
    };

    loadThumb();

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
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden cursor-pointer hover:border-orange-500/80 hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col justify-between shadow-sm"
    >
      {/* 1. Visual Thumbnail Preview Container (Real Aspect Ratio) */}
      <div className="relative w-full h-64 p-4 bg-neutral-100/90 dark:bg-neutral-950/80 flex items-center justify-center overflow-hidden border-b border-neutral-200 dark:border-neutral-800">
        {thumbUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={thumbUrl} 
            alt={proj.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-neutral-200/60 dark:border-neutral-800/80 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950 text-neutral-500 dark:text-neutral-400 rounded-xl">
            <span className="text-4xl mb-2 opacity-60">{isStudio ? '🖼️' : '📖'}</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              {proj.sizeStr || (isStudio ? 'Lienzo de Estudio' : 'Álbum Fotográfico')}
            </span>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-1 font-mono">
              {proj.pixelResolution || (isStudio ? '300 DPI' : 'Multi-pliego')}
            </span>
          </div>
        )}

        {/* Floating Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isStudio ? (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-orange-100/90 dark:bg-orange-950/90 backdrop-blur-md border border-orange-300 dark:border-orange-700/80 text-orange-800 dark:text-orange-300 flex items-center gap-1.5 shadow-md">
              <span>🖼️</span>
              <span>{proj.sizeStr || 'Estudio'}</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-100/90 dark:bg-blue-950/90 backdrop-blur-md border border-blue-300 dark:border-blue-700/80 text-blue-800 dark:text-blue-300 flex items-center gap-1.5 shadow-md">
              <span>📖</span>
              <span>Álbum</span>
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 shadow-sm">
            {proj.fileExtension || '.rvp'}
          </span>
        </div>

        {/* Quick Action Buttons on Hover */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* Download .rvp file button */}
          <button
            onClick={handleExportRvp}
            className="w-8 h-8 rounded-xl bg-white/90 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-300 dark:border-neutral-700 backdrop-blur-md flex items-center justify-center text-xs transition shadow-md"
            title={t('export_rvp_tooltip')}
          >
            💾
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-white/90 dark:bg-neutral-900/90 hover:bg-red-50 dark:hover:bg-red-950/80 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 border border-neutral-300 dark:border-neutral-700 backdrop-blur-md flex items-center justify-center text-xs transition shadow-md"
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
              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-neutral-800 dark:text-neutral-300 hover:text-black dark:hover:text-white border border-neutral-300 dark:border-white/10 backdrop-blur-md flex items-center gap-1.5 transition shadow-sm"
            >
              <span>📁</span>
              <span className="truncate max-w-[120px]">{proj.folder || 'Sin Carpeta'}</span>
              <span className="text-[9px] opacity-60">▾</span>
            </button>

            {/* Folder Dropdown Menu */}
            {showFolderMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 px-2.5 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  {t('move_to_folder')}
                </div>
                <button
                  onClick={() => {
                    onMoveFolder('none');
                    setShowFolderMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 ${!proj.folder ? 'bg-orange-600 text-white font-bold' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
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
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 truncate ${proj.folder === f ? 'bg-orange-600 text-white font-bold' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
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
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-3 truncate group-hover:text-orange-500 transition-colors">
            {proj.title || 'Untitled Project'}
          </h3>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 mb-4">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_dimensions')}</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono font-bold text-xs">{proj.sizeStr || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_resolution')}</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono font-bold text-xs">{proj.pixelResolution || '300 DPI'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_dpi')}</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono font-bold text-xs">{proj.targetDpi || 300} DPI</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-semibold tracking-wider">{t('metadata_layers')}</span>
              <span className="text-neutral-800 dark:text-neutral-200 font-mono font-bold text-xs">{proj.elementCount ?? 0} {t('metadata_layers').toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Dates & Action Footer */}
        <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-3 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-3">
            <div>
              <span>{t('created_at')}: </span>
              <span className="font-mono text-neutral-700 dark:text-neutral-400">{dateCreated}</span>
            </div>
            <span>•</span>
            <div>
              <span>{t('updated_at')}: </span>
              <span className="font-mono text-neutral-700 dark:text-neutral-400">{dateUpdated}</span>
            </div>
          </div>

          <span className="font-bold text-orange-600 dark:text-orange-500 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs">
            {t('open_project')} →
          </span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for each Folder Card
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
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 cursor-pointer hover:border-orange-500/80 hover:bg-neutral-50 dark:hover:bg-neutral-900/90 hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col justify-between relative overflow-hidden shadow-sm"
    >
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl group-hover:bg-orange-600/10 transition-colors pointer-events-none" />

      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-orange-500/50 transition-all shadow-sm">
            📁
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300">
              {count} {count === 1 ? 'proyecto' : 'proyectos'}
            </span>

            {!isGeneral && onDelete && (
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                title={t('delete_folder')}
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Folder Name */}
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors flex items-center gap-2">
          <span>{name}</span>
        </h3>

        {/* Folder Metadata ONLY */}
        <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 dark:text-neutral-500">Contenido:</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {count === 0 ? 'Sin archivos' : `${albumCount > 0 ? `${albumCount} Álbumes` : ''} ${albumCount > 0 && studioCount > 0 ? '•' : ''} ${studioCount > 0 ? `${studioCount} Estudios` : ''}`}
            </span>
          </div>

          {latestDate && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-400 dark:text-neutral-500">Última actividad:</span>
              <span className="text-neutral-600 dark:text-neutral-400 font-mono">{latestDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
        <span className="text-neutral-400 dark:text-neutral-500 font-medium group-hover:text-neutral-600 dark:group-hover:text-neutral-400">
          Explorar carpeta
        </span>
        <span className="font-bold text-orange-600 dark:text-orange-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
          {t('view_folder')}
        </span>
      </div>
    </div>
  );
}

export default function ProjectManager({ onOpenProject, onNewProject }: ProjectManagerProps) {
  const t = useTranslations('Editor');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const swapLocale = () => {
    const nextLocale = pathname.startsWith('/es') ? '/en' : '/es';
    window.location.href = nextLocale;
  };

  const [projects, setProjects] = useState<ProjectIndexMeta[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  
  // Navigation State:
  // selectedApp: null = Suite Hub (shows only the 3 apps), 'studio' | 'raw' | 'album' = Inside that specific app
  const [selectedApp, setSelectedApp] = useState<'studio' | 'raw' | 'album' | null>(null);
  // currentFolder: null = App Root, string = Inside that specific folder within the app
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

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

        // If currently inside a folder, assign the imported project to that folder
        if (currentFolder && currentFolder !== '__general__') {
          parsed.folder = currentFolder;
        }

        // Tag category appropriately if imported inside an app
        if (selectedApp === 'studio' || selectedApp === 'raw') {
          parsed.projectCategory = 'studio_print';
        } else if (selectedApp === 'album') {
          parsed.projectCategory = 'album';
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

  // App Metadata Configuration
  const appInfo = useMemo(() => {
    if (selectedApp === 'studio') {
      return {
        name: 'Photo Studio',
        subtitle: 'Retoque, Capas y Lienzos a 300 DPI',
        icon: '🖼️',
        badge: t('module_studio_badge'),
        color: 'orange',
        newProjectBtn: '+ Nuevo Lienzo',
        defaultCategory: 'studio_print' as const,
      };
    }
    if (selectedApp === 'raw') {
      return {
        name: 'Camera Raw Pro',
        subtitle: 'Revelado Fotográfico RAW y Gestión de Color',
        icon: '📸',
        badge: t('module_raw_badge'),
        color: 'emerald',
        newProjectBtn: '+ Revelar Foto',
        defaultCategory: 'studio_print' as const,
      };
    }
    if (selectedApp === 'album') {
      return {
        name: 'Album Designer',
        subtitle: 'Maquetación Profesional de Álbumes Fotográficos',
        icon: '📖',
        badge: t('module_album_badge'),
        color: 'blue',
        newProjectBtn: '+ Nuevo Álbum',
        defaultCategory: 'album' as const,
      };
    }
    return null;
  }, [selectedApp, t]);

  // Projects strictly belonging to the active app
  const appProjects = useMemo(() => {
    if (!selectedApp) return [];
    if (selectedApp === 'album') {
      return projects.filter(p => p.projectCategory === 'album' || !p.projectCategory);
    }
    return projects.filter(p => p.projectCategory === 'studio_print');
  }, [projects, selectedApp]);

  // Filtered & Sorted Projects for App Root View
  const appRecentProjects = useMemo(() => {
    let list = [...appProjects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.title?.toLowerCase().includes(q));
    }

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
  }, [appProjects, searchQuery, sortOrder]);

  // Projects inside the currently selected folder for this app
  const appProjectsInCurrentFolder = useMemo(() => {
    if (!currentFolder) return [];

    let list = appProjects.filter(p => {
      if (currentFolder === '__general__') return !p.folder;
      return p.folder === currentFolder;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => p.title?.toLowerCase().includes(q));
    }

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
  }, [appProjects, currentFolder, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen w-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col items-center py-8 px-6 overflow-y-auto transition-colors duration-200">
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
        {/* LEVEL 0: SUITE HUB (ONLY THE 3 APPS ACCESSIBLE)                */}
        {/* ============================================================== */}
        {selectedApp === null ? (
          <div>
            {/* Top Suite Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-orange-600/30">
                  R
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    RVP Photo Studio & Albums
                  </h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                    Suite 3-en-1 • Photo Studio • Camera Raw Pro • Album Designer
                  </p>
                </div>
              </div>

              {/* Theme & Language Bar */}
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                <button
                  onClick={swapLocale}
                  className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                  title="Cambiar Idioma / Switch Language"
                >
                  <span>🌐</span>
                  <span>{pathname.startsWith('/es') ? 'EN' : 'ES'}</span>
                </button>

                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                  title="Cambiar Tema Día / Noche"
                >
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{theme === 'dark' ? t('theme_day') : t('theme_night')}</span>
                </button>
              </div>
            </div>

            {/* Suite Welcome Hero */}
            <div className="text-center max-w-2xl mx-auto mb-12 pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 text-orange-800 dark:text-orange-300 text-xs font-bold mb-4 shadow-sm">
                <span>✨</span>
                <span>Suite Fotográfica Integral</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-3">
                {t('workspace_modules_title')}
              </h2>
              <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('suite_subtitle')}
              </p>
            </div>

            {/* THE 3 SUITE APPLICATION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* 1. PHOTO STUDIO */}
              <div 
                onClick={() => { setSelectedApp('studio'); setCurrentFolder(null); setSearchQuery(''); }}
                className="bg-white dark:bg-neutral-900 border-2 border-orange-200 dark:border-orange-950/80 hover:border-orange-500 dark:hover:border-orange-500 rounded-3xl p-7 transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 pointer-events-none transition-colors" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                      🖼️
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 uppercase">
                      {t('module_studio_badge')}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 group-hover:text-orange-500 transition-colors">
                    {t('module_studio_title')}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                    {t('module_studio_desc')}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between py-3 border-t border-neutral-100 dark:border-neutral-800/80 mb-4 text-xs text-neutral-500">
                    <span>Proyectos guardados:</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{counts.studios}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApp('studio');
                      setCurrentFolder(null);
                      setSearchQuery('');
                    }}
                    className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    <span>🖼️</span>
                    <span>Entrar a Photo Studio →</span>
                  </button>
                </div>
              </div>

              {/* 2. CAMERA RAW PRO */}
              <div 
                onClick={() => { setSelectedApp('raw'); setCurrentFolder(null); setSearchQuery(''); }}
                className="bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-950/80 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-7 transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 pointer-events-none transition-colors" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                      📸
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 uppercase">
                      {t('module_raw_badge')}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 group-hover:text-emerald-500 transition-colors">
                    {t('module_raw_title')}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                    {t('module_raw_desc')}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between py-3 border-t border-neutral-100 dark:border-neutral-800/80 mb-4 text-xs text-neutral-500">
                    <span>Proyectos guardados:</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{counts.studios}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApp('raw');
                      setCurrentFolder(null);
                      setSearchQuery('');
                    }}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    <span>📸</span>
                    <span>Entrar a Camera Raw Pro →</span>
                  </button>
                </div>
              </div>

              {/* 3. ALBUM DESIGNER */}
              <div 
                onClick={() => { setSelectedApp('album'); setCurrentFolder(null); setSearchQuery(''); }}
                className="bg-white dark:bg-neutral-900 border-2 border-blue-200 dark:border-blue-950/80 hover:border-blue-500 dark:hover:border-blue-500 rounded-3xl p-7 transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-[1.02] flex flex-col justify-between group relative overflow-hidden cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 pointer-events-none transition-colors" />
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                      📖
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 uppercase">
                      {t('module_album_badge')}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 group-hover:text-blue-500 transition-colors">
                    {t('module_album_title')}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                    {t('module_album_desc')}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between py-3 border-t border-neutral-100 dark:border-neutral-800/80 mb-4 text-xs text-neutral-500">
                    <span>Álbumes guardados:</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{counts.albums}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApp('album');
                      setCurrentFolder(null);
                      setSearchQuery('');
                    }}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 group-hover:shadow-lg"
                  >
                    <span>📖</span>
                    <span>Entrar a Album Designer →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* LEVEL 1 & 2: INSIDE SPECIFIC APP WORKSPACE                     */
          /* ============================================================== */
          <div>
            {/* App Workspace Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                {/* Back to Suite Button */}
                <button
                  onClick={() => {
                    setSelectedApp(null);
                    setCurrentFolder(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-95"
                >
                  <span>{t('back_to_suite')}</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-md ${
                    selectedApp === 'studio' ? 'bg-orange-500/10 border border-orange-500/30' :
                    selectedApp === 'raw' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                    'bg-blue-500/10 border border-blue-500/30'
                  }`}>
                    {appInfo?.icon}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2.5">
                      <span>{appInfo?.name}</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {appProjects.length} {selectedApp === 'album' ? 'álbumes' : 'proyectos'}
                      </span>
                    </h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      {appInfo?.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                <button
                  onClick={swapLocale}
                  className="px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                  title="Cambiar Idioma / Switch Language"
                >
                  <span>🌐</span>
                  <span>{pathname.startsWith('/es') ? 'EN' : 'ES'}</span>
                </button>

                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                  title="Cambiar Tema Día / Noche"
                >
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{theme === 'dark' ? t('theme_day') : t('theme_night')}</span>
                </button>

                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>📁</span>
                  <span>{t('btn_new_folder')}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-1.5 shadow-sm"
                  title={t('btn_import_rvp')}
                >
                  <span>📥</span>
                  <span>{t('btn_import_rvp')}</span>
                </button>

                <button 
                  onClick={() => onNewProject(currentFolder === '__general__' ? undefined : currentFolder || undefined, appInfo?.defaultCategory)}
                  className={`px-5 py-2 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5 hover:scale-[1.02] active:scale-95 ${
                    selectedApp === 'studio' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25' :
                    selectedApp === 'raw' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' :
                    'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  }`}
                >
                  <span>+</span>
                  <span>{appInfo?.newProjectBtn || t('newProject')}</span>
                </button>
              </div>
            </div>

            {/* Inline New Folder Creator Modal / Banner */}
            {isCreatingFolder && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-8 shadow-2xl animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>📁</span>
                      <span>Crear Nueva Carpeta / Colección</span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Ingresa el nombre de la carpeta o cliente para organizar tus proyectos en {appInfo?.name}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="ej. Bodas 2026, Retratos Estudio..."
                      className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none focus:border-orange-500 w-64"
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
                      className="px-3 py-2 text-neutral-400 hover:text-black dark:hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentFolder === null ? (
              /* ------------------------------------------------------------ */
              /* APP ROOT: FOLDERS & RECENT PROJECTS FOR THIS APP             */
              /* ------------------------------------------------------------ */
              <div>
                {/* 1. SECCIÓN: CARPETAS Y COLECCIONES DE ESTA APP */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        {t('folders_title')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 font-mono">
                        {folders.length + 1} carpetas
                      </span>
                    </div>

                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                      <span>Total en {appInfo?.name}:</span>
                      <strong className="text-neutral-800 dark:text-neutral-300">{appProjects.length} proyectos</strong>
                    </div>
                  </div>

                  {/* FOLDERS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* General Folder */}
                    <FolderCardItem
                      name={t('folder_general')}
                      isGeneral={true}
                      projects={appProjects.filter(p => !p.folder)}
                      onOpen={() => setCurrentFolder('__general__')}
                    />

                    {/* Custom Folders */}
                    {folders.map(f => (
                      <FolderCardItem
                        key={f}
                        name={f}
                        isGeneral={false}
                        projects={appProjects.filter(p => p.folder === f)}
                        onOpen={() => setCurrentFolder(f)}
                        onDelete={(e) => handleDeleteFolder(f, e)}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. SECCIÓN: PROYECTOS RECIENTES DE ESTA APP */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        {t('recent_projects_title')} ({appInfo?.name})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-400 font-mono">
                        {appRecentProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Search & Sort Filter Bar */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <input 
                        type="text"
                        placeholder={t('search_projects')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-orange-500 transition"
                      />
                      <span className="absolute left-3 top-2.5 text-neutral-400 text-xs">🔍</span>
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2 text-neutral-400 hover:text-black dark:hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Sort Order Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">{t('sort_by')}:</span>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest' | 'alpha')}
                        className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
                      >
                        <option value="recent">{t('sort_recent')}</option>
                        <option value="oldest">{t('sort_oldest')}</option>
                        <option value="alpha">{t('sort_az')}</option>
                      </select>
                    </div>
                  </div>

                  {/* PROJECTS GRID WITH TRUE ASPECT RATIO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {appRecentProjects.map(proj => (
                      <ProjectCardItem 
                        key={proj.id}
                        proj={proj}
                        folders={folders}
                        onOpen={() => onOpenProject(proj.id)}
                        onDelete={(e) => handleDeleteProject(proj.id, e)}
                        onMoveFolder={(folder) => handleMoveFolder(proj.id, folder)}
                      />
                    ))}

                    {appRecentProjects.length === 0 && (
                      <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-neutral-900/30">
                        <span className="text-4xl mb-3 opacity-60">📂</span>
                        <p className="text-base font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                          {searchQuery ? 'No se encontraron proyectos' : `Sin proyectos en ${appInfo?.name}`}
                        </p>
                        <p className="text-xs text-neutral-500 mb-4">
                          {searchQuery ? 'Prueba con otro término de búsqueda o limpia el filtro.' : 'Comienza creando tu primer proyecto en esta aplicación.'}
                        </p>
                        <button 
                          onClick={() => onNewProject(undefined, appInfo?.defaultCategory)}
                          className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md ${
                            selectedApp === 'studio' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30' :
                            selectedApp === 'raw' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' :
                            'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                          }`}
                        >
                          + {appInfo?.newProjectBtn || t('newProject')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ------------------------------------------------------------ */
              /* LEVEL 2: INSIDE A SPECIFIC FOLDER IN THIS APP                */
              /* ------------------------------------------------------------ */
              <div>
                {/* Folder Navigation Header with Back Breadcrumb */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setCurrentFolder(null);
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                    >
                      ← Volver a {appInfo?.name}
                    </button>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">📁</span>
                        <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                          {currentFolder === '__general__' ? t('folder_general') : currentFolder}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-orange-600 dark:text-orange-400">
                          {appProjectsInCurrentFolder.length} proyectos
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 ml-8">
                        Proyectos de {appInfo?.name} almacenados en esta carpeta
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons inside folder */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 transition flex items-center gap-2 shadow-sm"
                    >
                      <span>📥</span>
                      <span>{t('btn_import_rvp')}</span>
                    </button>

                    <button 
                      onClick={() => onNewProject(currentFolder === '__general__' ? undefined : currentFolder, appInfo?.defaultCategory)}
                      className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-95 ${
                        selectedApp === 'studio' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25' :
                        selectedApp === 'raw' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' :
                        'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                      }`}
                    >
                      <span>+</span>
                      <span>{t('new_project_in_folder')}</span>
                    </button>
                  </div>
                </div>

                {/* Inner Search & Sort Bar */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-sm">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <input 
                      type="text"
                      placeholder={t('search_projects')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-3.5 py-2 pl-9 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-orange-500 transition"
                    />
                    <span className="absolute left-3 top-2.5 text-neutral-400 text-xs">🔍</span>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2 text-neutral-400 hover:text-black dark:hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">{t('sort_by')}:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest' | 'alpha')}
                      className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="recent">{t('sort_recent')}</option>
                      <option value="oldest">{t('sort_oldest')}</option>
                      <option value="alpha">{t('sort_az')}</option>
                    </select>
                  </div>
                </div>

                {/* PROJECTS GRID INSIDE FOLDER */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appProjectsInCurrentFolder.map(proj => (
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
                  {appProjectsInCurrentFolder.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-neutral-900/30">
                      <span className="text-5xl mb-3">📁</span>
                      <p className="text-base font-bold text-neutral-700 dark:text-neutral-300 mb-1">{t('folder_empty')}</p>
                      <p className="text-xs text-neutral-500 mb-6">{t('folder_empty_desc')}</p>
                      <button 
                        onClick={() => onNewProject(currentFolder === '__general__' ? undefined : currentFolder, appInfo?.defaultCategory)}
                        className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-lg ${
                          selectedApp === 'studio' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30' :
                          selectedApp === 'raw' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' :
                          'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                        }`}
                      >
                        + {t('new_project_in_folder')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
