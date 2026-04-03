import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listProjectsFromDB, deleteProjectFromDB, ProjectMetadata, saveProjectToDB } from '@/utils/persistence';
import { importProjectFromFile } from '@/utils/exportImport';
import { useRef } from 'react';

interface ProjectPickerProps {
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
}

export default function ProjectPicker({ onOpenProject, onNewProject }: ProjectPickerProps) {
  const t = useTranslations('Editor');
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    try {
      const list = await listProjectsFromDB();
      // Sort by updatedAt descending
      setProjects(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteProjectFromDB(id);
      fetchProjects();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const importedProject = await importProjectFromFile(file);
      if (importedProject) {
        // Regenerate an ID to avoid conflicts if they import the same project multiple times? 
        // For now safely save and open. The ID within .rvp stays the same so it acts as an overwrite/restore.
        await saveProjectToDB(importedProject);
        fetchProjects();
        onOpenProject(importedProject.id);
      } else {
        alert('Failed to load project file. It may be corrupted or invalid.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
        {t('initializing')}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center py-20 px-4 overflow-y-auto">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
          {t('projects_title')}
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Import .rvp
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".rvp,.json" 
            className="hidden" 
            onChange={handleImport} 
          />
          <button
            onClick={onNewProject}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            {t('btn_new_project')}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center shadow-sm">
          <p className="text-neutral-500 dark:text-neutral-400 text-lg mb-6">
            {t('no_projects_found')}
          </p>
          <button
            onClick={onNewProject}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
          >
            {t('btn_new_project')}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div key={p.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <h3 className="text-xl font-medium text-neutral-900 dark:text-white mb-1 truncate" title={p.title}>
                {p.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {t('last_updated')}: {new Date(p.updatedAt).toLocaleDateString()}
              </p>
              
              <div className="mt-auto space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('form_type_label')}:</span>
                  <span className="font-medium text-neutral-900 dark:text-white truncate max-w-[120px]">{t(p.type) || p.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('form_lab_preset_label')}:</span>
                  <span className="font-medium text-neutral-900 dark:text-white truncate max-w-[120px]">{p.labPresetName}</span>
                </div>
              </div>

              <div className="flex space-x-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => onOpenProject(p.id)}
                  className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  {t('btn_open')}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-lg transition-colors"
                >
                  {t('btn_delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
