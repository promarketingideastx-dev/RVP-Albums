import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SetupModalProps {
  onCancel: () => void;
  onCreate: (name: string, type: string, labPresetId: string) => void;
}

export default function SetupModal({ onCancel, onCreate }: SetupModalProps) {
  const t = useTranslations('Editor');
  const [name, setName] = useState('');
  const [type, setType] = useState('type_album');
  const [labPresetId, setLabPresetId] = useState('pic-pro-lab');
  const [albumSize, setAlbumSize] = useState('10x10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), type, labPresetId);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {t('new_project_title')}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('form_name_label')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form_name_placeholder')}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Project Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('form_type_label')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="type_album">{t('type_album')}</option>
              <option value="type_wedding">{t('type_wedding')}</option>
              <option value="type_portrait">{t('type_portrait')}</option>
              <option value="type_custom">{t('type_custom')}</option>
            </select>
          </div>

          {/* Lab Preset */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('form_lab_preset_label')}
            </label>
            <select
              value={labPresetId}
              onChange={(e) => setLabPresetId(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pic-pro-lab">{t('lab_picpro')}</option>
              <option value="custom-lab">{t('lab_custom')}</option>
            </select>
          </div>

          {/* Album Size Placeholder */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Album Size
            </label>
            <select
              value={albumSize}
              onChange={(e) => setAlbumSize(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="8x8">Flushmount 8x8</option>
              <option value="10x10">Flushmount 10x10</option>
              <option value="12x12">Flushmount 12x12</option>
              <option value="11x14">Flushmount 11x14</option>
              <option value="custom">Custom Size</option>
            </select>
          </div>

          {/* Local Save Notice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs leading-relaxed border border-blue-100 dark:border-blue-800">
            {t('local_save_notice') || "This project will be saved locally on this device. Future cloud sync is currently in development."}
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors shadow-sm"
            >
              {t('btn_create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
