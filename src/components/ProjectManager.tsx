import React, { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage, ProjectIndexMeta } from '@/utils/projectStorage';

interface ProjectManagerProps {
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
}

export default function ProjectManager({ onOpenProject, onNewProject }: ProjectManagerProps) {
  const t = useTranslations('Editor');
  const [projects, setProjects] = useState<ProjectIndexMeta[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'album' | 'studio_print'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'alpha'>('recent');

  useEffect(() => {
    setProjects(projectStorage.getAllProjects());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('confirm_delete_project'))) {
      projectStorage.deleteProject(id);
      setProjects(projectStorage.getAllProjects());
    }
  };

  // Counts
  const counts = useMemo(() => {
    const total = projects.length;
    const albums = projects.filter(p => p.projectCategory === 'album' || !p.projectCategory).length;
    const studios = projects.filter(p => p.projectCategory === 'studio_print').length;
    return { total, albums, studios };
  }, [projects]);

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

    // Filter by Search Query
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
  }, [projects, filterCategory, searchQuery, sortOrder]);

  return (
    <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col items-center py-12 px-6 overflow-y-auto">
      <div className="max-w-6xl w-full">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-xl shadow-lg shadow-orange-600/30">
                R
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white capitalize">
                {t('myProjects')}
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1 ml-13">
              RVP Suite — Álbumes & Estudios de Impresión Fotográfica
            </p>
          </div>

          <button 
            onClick={onNewProject}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-600/25 flex items-center gap-2 self-start md:self-auto hover:scale-[1.02] active:scale-95"
          >
            <span>+</span> {t('newProject')}
          </button>
        </div>

        {/* Filters, Search & Sorter Bar */}
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
              onClick={() => setFilterCategory('album')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${filterCategory === 'album' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <span>{t('tab_albums')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700/60 text-neutral-300 font-mono">{counts.albums}</span>
            </button>
            <button
              onClick={() => setFilterCategory('studio_print')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${filterCategory === 'studio_print' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              <span>{t('tab_studio_prints')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700/60 text-neutral-300 font-mono">{counts.studios}</span>
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

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map(proj => {
            const isStudio = proj.projectCategory === 'studio_print';
            const dateUpdated = proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : '—';
            const dateCreated = proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : dateUpdated;

            return (
              <div 
                key={proj.id}
                onClick={() => onOpenProject(proj.id)}
                className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 cursor-pointer hover:border-neutral-600 hover:shadow-2xl hover:scale-[1.01] transition-all group relative flex flex-col justify-between"
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-4">
                  {isStudio ? (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-orange-950/60 border border-orange-800/80 text-orange-400 flex items-center gap-1.5">
                      <span>🖼️</span>
                      <span>{proj.sizeStr || 'Studio Print'}</span>
                      <span className="text-[9px] opacity-75">({proj.targetDpi || 300} DPI)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-950/60 border border-blue-800/80 text-blue-400 flex items-center gap-1.5">
                      <span>📖</span>
                      <span>Álbum de Pliegos</span>
                    </span>
                  )}

                  <button 
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100"
                    title={t('delete')}
                  >
                    🗑️
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-neutral-100 mb-3 truncate group-hover:text-orange-400 transition-colors">
                  {proj.title || 'Untitled Project'}
                </h3>

                {/* Dates & Meta */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500 border-t border-neutral-800/60 pt-3 mt-4">
                  <div>
                    <span>{t('created_at')}: </span>
                    <span className="text-neutral-400 font-mono">{dateCreated}</span>
                  </div>
                  <div>
                    <span>{t('last_updated')}: </span>
                    <span className="text-neutral-400 font-mono">{dateUpdated}</span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 flex justify-end items-center">
                  <span className="text-xs font-bold text-orange-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {t('open')} →
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredAndSortedProjects.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-neutral-900/30">
              <span className="text-4xl mb-3">📁</span>
              <p className="text-base font-semibold text-neutral-400 mb-1">{t('noProjects')}</p>
              <p className="text-xs text-neutral-500 mb-6">No se encontraron proyectos en esta categoría o filtro de búsqueda.</p>
              <button 
                onClick={onNewProject}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition shadow"
              >
                + {t('newProject')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
