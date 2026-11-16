import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { projectStorage } from '@/utils/projectStorage';

interface SetupModalProps {
  initialFolder?: string;
  initialCategory?: 'album' | 'studio_print';
  onCancel: () => void;
  onCreate: (
    name: string, 
    type: string, 
    labPresetId: string, 
    albumSize: string,
    projectCategory?: 'album' | 'studio_print',
    dpi?: number,
    orientation?: 'portrait' | 'landscape',
    folder?: string
  ) => void;
}

const ALBUM_SIZES = [
  "Flushmount 5x5", "Flushmount 5x7", "Flushmount 6x6", "Flushmount 7x5",
  "Flushmount 8x8", "Flushmount 8x10", "Flushmount 9x12", "Flushmount 10x8",
  "Flushmount 10x10", "Flushmount 20x8", "Flushmount 11x14", "Flushmount 12x9",
  "Flushmount 12x12", "Flushmount 12x16", "Flushmount 14x11", "Flushmount 16x12", "Flushmount 16x20", "Custom Size"
];

interface StudioStandardPreset {
  id: string;
  wInches: number;
  hInches: number;
  keyLabel: string;
  keyDesc: string;
  cmLabel: string;
}

const STUDIO_STANDARD_SIZES: StudioStandardPreset[] = [
  { id: '4x6', wInches: 4, hInches: 6, keyLabel: 'preset_4x6', keyDesc: 'preset_4x6_desc', cmLabel: '10 x 15 cm' },
  { id: '5x7', wInches: 5, hInches: 7, keyLabel: 'preset_5x7', keyDesc: 'preset_5x7_desc', cmLabel: '13 x 18 cm' },
  { id: '8x10', wInches: 8, hInches: 10, keyLabel: 'preset_8x10', keyDesc: 'preset_8x10_desc', cmLabel: '20 x 25 cm' },
  { id: '11x14', wInches: 11, hInches: 14, keyLabel: 'preset_11x14', keyDesc: 'preset_11x14_desc', cmLabel: '28 x 35 cm' },
  { id: '16x20', wInches: 16, hInches: 20, keyLabel: 'preset_16x20', keyDesc: 'preset_16x20_desc', cmLabel: '40 x 50 cm' },
  { id: '20x24', wInches: 20, hInches: 24, keyLabel: 'preset_20x24', keyDesc: 'preset_20x24_desc', cmLabel: '50 x 60 cm' },
  { id: '24x30', wInches: 24, hInches: 30, keyLabel: 'preset_24x30', keyDesc: 'preset_24x30_desc', cmLabel: '60 x 76 cm' },
];

interface CustomPresetStorage {
  id: string;
  name: string;
  wInches: number;
  hInches: number;
}

export default function SetupModal({ initialFolder, initialCategory, onCancel, onCreate }: SetupModalProps) {
  const t = useTranslations('Editor');
  const tStudio = useTranslations('Studio');

  // Top-level creation mode: Album or Studio Print
  const [creationMode, setCreationMode] = useState<'studio' | 'album'>(
    initialCategory === 'album' ? 'album' : 'studio'
  );

  // --- FOLDERS STATE ---
  const [folders, setFolders] = useState<string[]>([]);
  const [studioFolder, setStudioFolder] = useState<string>(initialFolder || '');
  const [albumFolder, setAlbumFolder] = useState<string>(initialFolder || '');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // --- STUDIO PRINT STATE ---
  const [studioProjectName, setStudioProjectName] = useState<string>('');
  const [studioSelectedPresetId, setStudioSelectedPresetId] = useState<string>('8x10');
  const [studioOrientation, setStudioOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [studioDpi, setStudioDpi] = useState<72 | 150 | 300>(300);
  const [studioCustomW, setStudioCustomW] = useState<string>('12');
  const [studioCustomH, setStudioCustomH] = useState<string>('18');
  const [studioCustomUnit, setStudioCustomUnit] = useState<'inches' | 'cm'>('inches');
  const [studioCustomName, setStudioCustomName] = useState<string>('');
  const [savedCustomPresets, setSavedCustomPresets] = useState<CustomPresetStorage[]>([]);

  useEffect(() => {
    setFolders(projectStorage.getFolders());
    try {
      const raw = localStorage.getItem('rvp_saved_studio_presets');
      if (raw) {
        setSavedCustomPresets(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Could not load custom presets", e);
    }
  }, []);

  const handleCreateNewFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const updated = projectStorage.addFolder(trimmed);
    setFolders(updated);
    if (creationMode === 'studio') {
      setStudioFolder(trimmed);
    } else {
      setAlbumFolder(trimmed);
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const saveCustomPreset = () => {
    const wNum = parseFloat(studioCustomW);
    const hNum = parseFloat(studioCustomH);
    if (!wNum || !hNum || wNum <= 0 || hNum <= 0) return;

    let finalW = wNum;
    let finalH = hNum;
    if (studioCustomUnit === 'cm') {
      finalW = +(wNum / 2.54).toFixed(2);
      finalH = +(hNum / 2.54).toFixed(2);
    }

    const presetName = studioCustomName.trim() || `${finalW}x${finalH} in`;
    const newPreset: CustomPresetStorage = {
      id: `custom_${Date.now()}`,
      name: presetName,
      wInches: finalW,
      hInches: finalH
    };

    const updated = [...savedCustomPresets, newPreset];
    setSavedCustomPresets(updated);
    localStorage.setItem('rvp_saved_studio_presets', JSON.stringify(updated));
    setStudioSelectedPresetId(newPreset.id);
    setStudioCustomName('');
  };

  // Calculate pixel bounds for preview
  const getActiveDimensionsInches = () => {
    if (studioSelectedPresetId === 'custom') {
      const w = parseFloat(studioCustomW) || 8;
      const h = parseFloat(studioCustomH) || 10;
      if (studioCustomUnit === 'cm') {
        return { w: w / 2.54, h: h / 2.54 };
      }
      return { w, h };
    }

    const saved = savedCustomPresets.find(p => p.id === studioSelectedPresetId);
    if (saved) {
      return { w: saved.wInches, h: saved.hInches };
    }

    const std = STUDIO_STANDARD_SIZES.find(s => s.id === studioSelectedPresetId) || STUDIO_STANDARD_SIZES[2]; // default 8x10
    return { w: std.wInches, h: std.hInches };
  };

  const activeDims = getActiveDimensionsInches();
  const widthInches = studioOrientation === 'portrait' ? Math.min(activeDims.w, activeDims.h) : Math.max(activeDims.w, activeDims.h);
  const heightInches = studioOrientation === 'portrait' ? Math.max(activeDims.w, activeDims.h) : Math.min(activeDims.w, activeDims.h);

  const calcPxW = Math.round(widthInches * studioDpi);
  const calcPxH = Math.round(heightInches * studioDpi);

  const handleStudioSubmit = () => {
    const sizeStr = `${widthInches}x${heightInches}in`;
    const finalName = studioProjectName.trim() || `Proyecto Estudio ${widthInches}x${heightInches}`;
    onCreate(
      finalName, 
      'type_studio_print', 
      'studio-lab', 
      sizeStr, 
      'studio_print', 
      studioDpi, 
      studioOrientation,
      studioFolder || undefined
    );
  };

  // --- ALBUM WIZARD STATE ---
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [name, setName] = useState('');
  const [printCompany, setPrintCompany] = useState('pic-pro-lab');
  const [bookLine, setBookLine] = useState('type_album');
  const [albumSize, setAlbumSize] = useState('Flushmount 10x10');
  const [searchSize, setSearchSize] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  const filteredSizes = ALBUM_SIZES.filter(s => s.toLowerCase().includes(searchSize.toLowerCase()));

  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5);
  };
  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
  };
  
  const handleAlbumSubmit = () => {
    let finalSize = albumSize;
    if (albumSize === 'Custom Size') {
      const w = parseFloat(customWidth);
      const h = parseFloat(customHeight);
      if (!w || !h || w <= 0 || h <= 0) {
        alert('Please enter valid width and height numbers greater than 0.');
        setStep(3);
        return;
      }
      finalSize = `Custom ${w}x${h}in`;
    }
    onCreate(
      name.trim() || 'Untitled Album', 
      bookLine, 
      printCompany, 
      finalSize, 
      'album', 
      300, 
      'landscape',
      albumFolder || undefined
    );
  };

  const StepItem = ({ num, label, isActive }: { num: number, label: string, isActive: boolean }) => (
    <div className={`flex items-center gap-4 p-4 ${isActive ? 'bg-neutral-200 dark:bg-neutral-800' : 'opacity-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-blue-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
        {num}
      </div>
      <span className={`font-medium ${isActive ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-neutral-100 dark:bg-neutral-900 w-full max-w-4xl h-[86vh] rounded-3xl border border-neutral-300 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Mode Tabs */}
        <div className="h-16 bg-neutral-900 border-b border-neutral-800 text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-sm">R</span>
              <span className="font-bold text-base tracking-tight text-white hidden sm:inline">RVP Suite</span>
            </div>
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setCreationMode('studio')}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${creationMode === 'studio' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                <span>🖼️</span>
                <span>{tStudio('mode_studio')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('album')}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${creationMode === 'album' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
              >
                <span>📖</span>
                <span>{tStudio('mode_album')}</span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={onCancel} 
            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white text-xl transition"
          >
            &times;
          </button>
        </div>

        {/* ============================================================== */}
        {/* MODE A: STUDIO PRINT / SINGLE CANVAS (PRIMARY)                 */}
        {/* ============================================================== */}
        {creationMode === 'studio' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {/* SECTION 1: PROJECT DETAILS (NAME & FOLDER) */}
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Project Name Field */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                      <span>🏷️</span>
                      <span>{t('form_name_label')}</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input 
                      type="text"
                      value={studioProjectName}
                      onChange={(e) => setStudioProjectName(e.target.value)}
                      placeholder="ej. Quinceañera Lauren - Ampliación Sala"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      autoFocus
                    />
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                      {t('project_name_desc')}
                    </p>
                  </div>

                  {/* Folder / Collection Field */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>📁</span>
                        <span>{t('folder_collection')}</span>
                      </span>
                      {!isCreatingFolder && (
                        <button 
                          type="button" 
                          onClick={() => setIsCreatingFolder(true)}
                          className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-bold"
                        >
                          {t('btn_new_folder')}
                        </button>
                      )}
                    </label>

                    {isCreatingFolder ? (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder={t('folder_name_placeholder')}
                          className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleCreateNewFolder}
                          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow"
                        >
                          {t('save_folder')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingFolder(false)}
                          className="px-2.5 py-2.5 text-neutral-400 hover:text-neutral-200 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={studioFolder}
                        onChange={(e) => setStudioFolder(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                      >
                        <option value="">{t('folder_general')}</option>
                        {folders.map(f => (
                          <option key={f} value={f}>📁 {f}</option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                      {t('folder_desc')}
                    </p>
                  </div>

                </div>
              </div>

              {/* SECTION 2: PRINT SIZE SELECTION */}
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-4 block flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>📐</span>
                    <span>{tStudio('step_print_size')}</span>
                  </span>
                  <span className="text-[11px] font-normal text-neutral-500">
                    Selecciona una medida estándar o define un tamaño personalizado
                  </span>
                </label>

                {/* Grid of sizes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {STUDIO_STANDARD_SIZES.map(preset => {
                    const isSel = studioSelectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setStudioSelectedPresetId(preset.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSel ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-base text-neutral-900 dark:text-white">{tStudio(preset.keyLabel)}</span>
                          {isSel && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{preset.cmLabel}</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-3 font-medium">{tStudio(preset.keyDesc)}</span>
                      </div>
                    );
                  })}

                  {/* Saved Custom Presets */}
                  {savedCustomPresets.map(cp => {
                    const isSel = studioSelectedPresetId === cp.id;
                    return (
                      <div
                        key={cp.id}
                        onClick={() => setStudioSelectedPresetId(cp.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSel ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-base text-neutral-900 dark:text-white truncate">{cp.name}</span>
                          {isSel && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{cp.wInches} x {cp.hInches} in</span>
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 mt-3 font-medium">{tStudio('preset_saved_tag')}</span>
                      </div>
                    );
                  })}

                  {/* Custom Option Card */}
                  <div
                    onClick={() => setStudioSelectedPresetId('custom')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${studioSelectedPresetId === 'custom' ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-base text-neutral-900 dark:text-white">{tStudio('preset_custom')}</span>
                      {studioSelectedPresetId === 'custom' && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                    </div>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">W × H</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-3 font-medium">{tStudio('preset_custom_desc')}</span>
                  </div>
                </div>

                {/* Custom Dimensions Drawer */}
                {studioSelectedPresetId === 'custom' && (
                  <div className="mt-5 p-5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('custom_width')}</label>
                      <input 
                        type="number" step="0.1" min="1" max="100"
                        value={studioCustomW}
                        onChange={(e) => setStudioCustomW(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-neutral-400 font-bold mt-4">×</span>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('custom_height')}</label>
                      <input 
                        type="number" step="0.1" min="1" max="100"
                        value={studioCustomH}
                        onChange={(e) => setStudioCustomH(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('units')}</label>
                      <select 
                        value={studioCustomUnit}
                        onChange={(e) => setStudioCustomUnit(e.target.value as 'inches' | 'cm')}
                        className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                      >
                        <option value="inches">{tStudio('inches')}</option>
                        <option value="cm">{tStudio('cm')}</option>
                      </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('preset_name_optional')}</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder={tStudio('preset_placeholder')}
                          value={studioCustomName}
                          onChange={(e) => setStudioCustomName(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={saveCustomPreset}
                          className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white hover:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold whitespace-nowrap transition"
                        >
                          + {tStudio('btn_save_preset')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: ORIENTATION & RESOLUTION GROUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Orientation Selector */}
                <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-4 block">
                    {tStudio('orientation')}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStudioOrientation('portrait')}
                      className={`flex-1 p-3.5 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${studioOrientation === 'portrait' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold shadow-sm' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
                    >
                      <div className="w-5 h-7 border-2 border-current rounded-sm"></div>
                      <span className="text-sm">{tStudio('orientation_portrait')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioOrientation('landscape')}
                      className={`flex-1 p-3.5 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${studioOrientation === 'landscape' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold shadow-sm' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
                    >
                      <div className="w-7 h-5 border-2 border-current rounded-sm"></div>
                      <span className="text-sm">{tStudio('orientation_landscape')}</span>
                    </button>
                  </div>
                </div>

                {/* Resolution DPI Selector */}
                <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3 block">
                    {tStudio('resolution')}
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { dpi: 300, labelKey: 'dpi_300' },
                      { dpi: 150, labelKey: 'dpi_150' },
                      { dpi: 72, labelKey: 'dpi_72' }
                    ].map(resItem => (
                      <label 
                        key={resItem.dpi}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${studioDpi === resItem.dpi ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 font-bold text-neutral-900 dark:text-white' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
                      >
                        <span>{tStudio(resItem.labelKey)}</span>
                        <input 
                          type="radio" 
                          name="dpi"
                          checked={studioDpi === resItem.dpi}
                          onChange={() => setStudioDpi(resItem.dpi as 72 | 150 | 300)}
                          className="accent-orange-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 4: OUTPUT RESOLUTION & LIVE SUMMARY */}
              <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-bold text-orange-900 dark:text-orange-300 block mb-1">
                    {tStudio('pixels_calculated')}
                  </span>
                  <div className="text-2xl md:text-3xl font-black font-mono text-orange-600 dark:text-orange-400">
                    {calcPxW} × {calcPxH} px <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">(@{studioDpi} DPI)</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    {tStudio('single_sheet_notice')}
                  </p>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-900/80 border border-orange-200 dark:border-orange-900/50 p-3.5 rounded-xl space-y-1 shrink-0">
                  <div><strong>Proyecto:</strong> {studioProjectName.trim() || 'Proyecto Sin Título'}</div>
                  <div><strong>Carpeta:</strong> {studioFolder ? `📁 ${studioFolder}` : '📁 General'}</div>
                  <div><strong>Medida:</strong> {widthInches} × {heightInches} in ({studioOrientation === 'portrait' ? 'Vertical' : 'Horizontal'})</div>
                </div>
              </div>

            </div>

            {/* Studio Footer */}
            <div className="h-20 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-8 flex items-center justify-between shrink-0">
              <button 
                onClick={onCancel} 
                className="px-6 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {t('btn_cancel')}
              </button>
              <button 
                onClick={handleStudioSubmit}
                className="px-8 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-95"
              >
                ➔ {tStudio('btn_create_studio')}
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MODE B: ALBUM WIZARD (5-STEP FLUSHMOUNT ALBUM ENGINE)          */
          /* ============================================================== */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Steps */}
            <div className="w-64 bg-white dark:bg-neutral-950 flex flex-col border-r border-neutral-200 dark:border-neutral-800 shrink-0 py-2">
              <StepItem num={1} label="Print Company" isActive={step === 1} />
              <StepItem num={2} label="Book Line" isActive={step === 2} />
              <StepItem num={3} label="Album Size" isActive={step === 3} />
              <StepItem num={4} label="Folder / Category" isActive={step === 4} />
              <StepItem num={5} label="Review & Create" isActive={step === 5} />
            </div>

            {/* Right Main Content */}
            <div className="flex-1 flex flex-col bg-neutral-100 dark:bg-neutral-900 relative">
              <div className="flex-1 p-8 overflow-y-auto">
                
                {step === 1 && (
                  <div className="flex flex-col gap-4">
                    <div 
                      onClick={() => setPrintCompany('pic-pro-lab')}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${printCompany === 'pic-pro-lab' ? 'border-blue-500 bg-blue-50/30' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                    >
                      <div className="font-semibold text-lg text-black dark:text-white">Pic Pro Lab</div>
                      <div className="text-sm text-neutral-500 mt-1">Default lab integrations</div>
                    </div>
                    <div 
                      onClick={() => setPrintCompany('custom')}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${printCompany === 'custom' ? 'border-blue-500 bg-blue-50/30' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                    >
                      <div className="font-semibold text-lg text-black dark:text-white">Custom Print Company</div>
                      <div className="text-sm text-neutral-500 mt-1">Setup dimensions manually</div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-4">
                    <div 
                      onClick={() => setBookLine('type_album')}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${bookLine === 'type_album' ? 'border-blue-500 bg-blue-50/30' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                    >
                      <div className="font-semibold text-lg text-black dark:text-white">Flushmount Album</div>
                      <div className="text-sm text-neutral-500 mt-1">Thick rigid pages, layflat design</div>
                    </div>
                    <div 
                      onClick={() => setBookLine('type_book')}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${bookLine === 'type_book' ? 'border-blue-500 bg-blue-50/30' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                    >
                      <div className="font-semibold text-lg text-black dark:text-white">Photo Book</div>
                      <div className="text-sm text-neutral-500 mt-1">Flexible pages, magazine style</div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-end mb-4">
                      <div className="relative w-64">
                        <input 
                          type="text" 
                          placeholder="Search" 
                          value={searchSize}
                          onChange={(e) => setSearchSize(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 border rounded-md text-sm bg-white dark:bg-neutral-800 text-black dark:text-white border-neutral-300"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-md p-2 bg-white dark:bg-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-700">
                      {filteredSizes.map(size => (
                        <div 
                          key={size}
                          onClick={() => setAlbumSize(size)}
                          className={`p-3 text-sm cursor-pointer rounded flex items-center justify-between ${albumSize === size ? 'bg-blue-50 dark:bg-neutral-700 font-bold text-blue-600 dark:text-blue-400' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300'}`}
                        >
                          <span>{size}</span>
                          {albumSize === size && <span>✓</span>}
                        </div>
                      ))}
                    </div>

                    {albumSize === 'Custom Size' && (
                      <div className="mt-4 p-4 border rounded-md bg-neutral-50 dark:bg-neutral-800/40">
                        <div className="text-xs font-semibold mb-2 text-neutral-500 uppercase tracking-wider">Custom Album Size (Inches)</div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" step="0.5" min="1" max="50"
                            placeholder="Width"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            className="w-24 p-2 border rounded bg-white dark:bg-neutral-900 border-neutral-300 text-sm"
                          />
                          <span>×</span>
                          <input 
                            type="number" step="0.5" min="1" max="50"
                            placeholder="Height"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            className="w-24 p-2 border rounded bg-white dark:bg-neutral-900 border-neutral-300 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col gap-6 text-black dark:text-white max-w-xl">
                    <h3 className="text-xl font-bold">Organización en Carpeta</h3>
                    <p className="text-sm text-neutral-500">
                      Selecciona una carpeta o crea una nueva para agrupar este álbum.
                    </p>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 block">
                        {t('folder_collection')}
                      </label>
                      <select
                        value={albumFolder}
                        onChange={(e) => setAlbumFolder(e.target.value)}
                        className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold cursor-pointer"
                      >
                        <option value="">{t('folder_general')}</option>
                        {folders.map(f => (
                          <option key={f} value={f}>📁 {f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="flex flex-col gap-6 text-black dark:text-white">
                    <h3 className="text-2xl font-semibold">Review & Create Album</h3>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <label className="text-sm text-neutral-500 mb-2">Album Name</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          placeholder={t('form_name_placeholder') || "My Album Project"}
                          className="p-3 border rounded-xl max-w-md bg-white dark:bg-neutral-800 text-black dark:text-white border-neutral-300 shadow-sm" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm max-w-2xl">
                      <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Company</div>
                        <div className="font-medium text-lg mt-1">{printCompany === 'pic-pro-lab' ? 'Pic Pro Lab' : 'Custom Lab'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Book Line</div>
                        <div className="font-medium text-lg mt-1">{bookLine === 'type_album' ? 'Flushmount Album' : 'Photo Book'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Size</div>
                        <div className="font-medium text-lg mt-1">{albumSize === 'Custom Size' ? `${customWidth || '?'}x${customHeight || '?'}in` : albumSize}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Folder</div>
                        <div className="font-medium text-lg mt-1">{albumFolder ? `📁 ${albumFolder}` : 'General'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Album Wizard Footer Navigation */}
              <div className="p-6 flex items-center justify-between mt-auto shrink-0 bg-neutral-100 dark:bg-neutral-900 h-20 border-t border-neutral-200 dark:border-neutral-800">
                {step > 1 ? (
                  <button onClick={handleBack} className="flex items-center justify-center gap-2 p-2 w-12 h-12 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-colors text-black dark:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                ) : <div></div>}
                
                {step < 5 ? (
                  <button 
                    onClick={handleNext}
                    className="px-10 py-2.5 rounded-full border border-blue-600 text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm tracking-wide"
                  >
                    Next →
                  </button>
                ) : (
                  <button 
                    onClick={handleAlbumSubmit}
                    className="px-10 py-2.5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-sm tracking-wide"
                  >
                    {tStudio('btn_create_album')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
