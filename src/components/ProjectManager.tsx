import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage, ProjectIndexMeta } from '@/utils/projectStorage';

interface ProjectManagerProps {
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
}

export default function ProjectManager({ onOpenProject, onNewProject }: ProjectManagerProps) {
  const t = useTranslations('Editor');
  const [projects, setProjects] = useState<ProjectIndexMeta[]>([]);

  useEffect(() => {
    setProjects(projectStorage.getAllProjects());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    projectStorage.deleteProject(id);
    setProjects(projectStorage.getAllProjects());
  };

  return (
    <div className="h-screen w-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center py-20 overflow-y-auto">
      <div className="max-w-4xl w-full px-6">
        <div className="flex justify-between items-end mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white capitalize">
              {t('myProjects')}
            </h1>
          </div>
          <button 
            onClick={onNewProject}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-full hover:-translate-y-0.5 transition-all shadow-md"
          >
            + {t('newProject')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(proj => (
            <div 
              key={proj.id}
              onClick={() => onOpenProject(proj.id)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all group relative flex flex-col"
            >
               <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2 truncate">
                 {proj.title}
               </h3>
               <p className="text-xs text-neutral-400 mb-6">
                 {t('last_updated')}: {new Date(proj.updatedAt).toLocaleDateString()}
               </p>
               
               <div className="mt-auto flex justify-between items-center">
                 <button 
                   className="text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   {t('open')} →
                 </button>
                 <button 
                   onClick={(e) => handleDelete(proj.id, e)}
                   className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                 >
                   {t('delete')}
                 </button>
               </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center">
              <p className="text-neutral-500">{t('noProjects')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
