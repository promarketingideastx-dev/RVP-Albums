import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SetupModalProps {
  onCancel: () => void;
  onCreate: (
    name: string, 
    type: string, 
    labPresetId: string, 
    albumSize: string,
    projectCategory?: 'album' | 'studio_print',
    dpi?: number,
    orientation?: 'portrait' | 'landscape'
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
];

interface CustomPresetStorage {
  id: string;
  name: string;
  wInches: number;
  hInches: number;
}

export default function SetupModal({ onCancel, onCreate }: SetupModalProps) {
  const t = useTranslations('Editor');
  const tStudio = useTranslations('Studio');

  // Top-level creation mode: Album or Studio Print
  const [creationMode, setCreationMode] = useState<'album' | 'studio'>('album');

  // --- STUDIO PRINT STATE ---
  const [studioSelectedPresetId, setStudioSelectedPresetId] = useState<string>('8x10');
  const [studioOrientation, setStudioOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [studioDpi, setStudioDpi] = useState<72 | 150 | 300>(300);
  const [studioCustomW, setStudioCustomW] = useState<string>('12');
  const [studioCustomH, setStudioCustomH] = useState<string>('18');
  const [studioCustomUnit, setStudioCustomUnit] = useState<'inches' | 'cm'>('inches');
  const [studioCustomName, setStudioCustomName] = useState<string>('');
  const [savedCustomPresets, setSavedCustomPresets] = useState<CustomPresetStorage[]>([]);
  const [studioProjectName, setStudioProjectName] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('rvp_saved_studio_presets');
      if (raw) {
        setSavedCustomPresets(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Could not load custom presets", e);
    }
  }, []);

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
    const finalName = studioProjectName.trim() || `${widthInches}x${heightInches} Print`;
    onCreate(finalName, 'type_studio_print', 'studio-lab', sizeStr, 'studio_print', studioDpi, studioOrientation);
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
  const [coverType, setCoverType] = useState('none');

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
    onCreate(name || 'Untitled Album', bookLine, printCompany, finalSize, 'album', 300, 'landscape');
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
      <div className="bg-neutral-100 dark:bg-neutral-900 w-full max-w-4xl h-[78vh] rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Mode Tabs */}
        <div className="h-14 bg-neutral-900 border-b border-neutral-800 text-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white mr-4">RVP Albums</span>
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700/60 text-xs">
              <button
                type="button"
                onClick={() => setCreationMode('album')}
                className={`px-4 py-1.5 rounded-md font-semibold transition-all ${creationMode === 'album' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                📖 {tStudio('mode_album')}
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('studio')}
                className={`px-4 py-1.5 rounded-md font-semibold transition-all ${creationMode === 'studio' ? 'bg-orange-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                🖼️ {tStudio('mode_studio')}
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
        {/* MODE A: STUDIO / SINGLE LAYERED CANVAS (PHOTOSHOP PRINT STUDIO) */}
        {/* ============================================================== */}
        {creationMode === 'studio' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
            <div className="flex-1 p-8 overflow-y-auto max-w-4xl w-full mx-auto">
              
              {/* Header Info */}
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {tStudio('studio_title')}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {tStudio('mode_studio_desc')}
                </p>
              </div>

              {/* Standard Sizes Grid */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 block">
                  {tStudio('step_print_size')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {STUDIO_STANDARD_SIZES.map(preset => {
                    const isSel = studioSelectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setStudioSelectedPresetId(preset.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSel ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-base text-neutral-900 dark:text-white">{tStudio(preset.keyLabel)}</span>
                          {isSel && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{preset.cmLabel}</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium">{tStudio(preset.keyDesc)}</span>
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
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${isSel ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-base text-neutral-900 dark:text-white truncate">{cp.name}</span>
                          {isSel && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{cp.wInches} x {cp.hInches} in</span>
                        <span className="text-[10px] text-orange-600 dark:text-orange-400 mt-2 font-medium">{tStudio('preset_saved_tag')}</span>
                      </div>
                    );
                  })}

                  {/* Custom Option Card */}
                  <div
                    onClick={() => setStudioSelectedPresetId('custom')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${studioSelectedPresetId === 'custom' ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 shadow-md scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-base text-neutral-900 dark:text-white">{tStudio('preset_custom')}</span>
                      {studioSelectedPresetId === 'custom' && <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>}
                    </div>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">W × H</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium">{tStudio('preset_custom_desc')}</span>
                  </div>
                </div>

                {/* Custom Dimensions Drawer */}
                {studioSelectedPresetId === 'custom' && (
                  <div className="mt-4 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('custom_width')}</label>
                      <input 
                        type="number" step="0.1" min="1" max="100"
                        value={studioCustomW}
                        onChange={(e) => setStudioCustomW(e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-neutral-400 font-bold mt-4">×</span>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('custom_height')}</label>
                      <input 
                        type="number" step="0.1" min="1" max="100"
                        value={studioCustomH}
                        onChange={(e) => setStudioCustomH(e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">{tStudio('units')}</label>
                      <select 
                        value={studioCustomUnit}
                        onChange={(e) => setStudioCustomUnit(e.target.value as 'inches' | 'cm')}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
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
                          className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={saveCustomPreset}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 text-xs font-semibold whitespace-nowrap transition"
                        >
                          + {tStudio('btn_save_preset')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Orientation & Resolution Group */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                
                {/* Orientation Selector */}
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 block">
                    {tStudio('orientation')}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStudioOrientation('portrait')}
                      className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${studioOrientation === 'portrait' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                    >
                      <div className="w-5 h-7 border-2 border-current rounded-sm"></div>
                      <span className="text-sm">{tStudio('orientation_portrait')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioOrientation('landscape')}
                      className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${studioOrientation === 'landscape' ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                    >
                      <div className="w-7 h-5 border-2 border-current rounded-sm"></div>
                      <span className="text-sm">{tStudio('orientation_landscape')}</span>
                    </button>
                  </div>
                </div>

                {/* Resolution DPI Selector */}
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 block">
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
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${studioDpi === resItem.dpi ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 font-bold text-neutral-900 dark:text-white' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
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

              {/* Output Resolution Summary & Project Name */}
              <div className="bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-5 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-bold text-orange-900 dark:text-orange-300 block mb-0.5">
                    {tStudio('pixels_calculated')}
                  </span>
                  <div className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400">
                    {calcPxW} × {calcPxH} px <span className="text-xs font-medium text-neutral-500">(@{studioDpi} DPI)</span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {tStudio('single_sheet_notice')}
                  </p>
                </div>

                <div className="w-full md:w-72">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-300 mb-1 block">
                    {t('form_name_label')}
                  </label>
                  <input 
                    type="text"
                    value={studioProjectName}
                    onChange={(e) => setStudioProjectName(e.target.value)}
                    placeholder={`${widthInches}x${heightInches} Estudio`}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
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
          /* MODE B: ALBUM WIZARD (EXISTING 5-STEP FLUSHMOUNT ALBUM ENGINE) */
          /* ============================================================== */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar Steps */}
            <div className="w-64 bg-white dark:bg-neutral-950 flex flex-col border-r border-neutral-200 dark:border-neutral-800 shrink-0 py-2">
              <StepItem num={1} label="Print Company" isActive={step === 1} />
              <StepItem num={2} label="Book Line" isActive={step === 2} />
              <StepItem num={3} label="Album Size" isActive={step === 3} />
              <StepItem num={4} label="Custom Cover" isActive={step === 4} />
              <StepItem num={5} label="Review" isActive={step === 5} />
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
                          onChange={(e) => {
                              const val = e.target.value;
                              setSearchSize(val);
                              const updatedFiltered = ALBUM_SIZES.filter(s => s.toLowerCase().includes(val.toLowerCase()));
                              if (updatedFiltered.length > 0 && !updatedFiltered.includes(albumSize)) {
                                  setAlbumSize(updatedFiltered[0]);
                              }
                          }}
                          className="w-full pl-3 pr-10 py-2 bg-white rounded-lg border border-neutral-300 focus:outline-none" 
                        />
                        <span className="absolute right-3 top-2.5 text-neutral-400 font-bold text-xl">⚲</span>
                      </div>
                    </div>
                    <div className="flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-xl p-2 overflow-y-auto min-h-[280px]">
                      {filteredSizes.map(size => (
                        <div 
                          key={size}
                          onClick={() => setAlbumSize(size)}
                          className={`p-3 text-neutral-800 dark:text-neutral-200 cursor-pointer rounded-lg text-base tracking-wide ${albumSize === size ? 'bg-blue-600 text-white font-medium' : 'hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}
                        >
                          {size}
                        </div>
                      ))}
                      {albumSize === 'Custom Size' && (
                        <div className="p-4 bg-white dark:bg-neutral-900 mt-2 rounded-xl border border-neutral-300 dark:border-neutral-700">
                          <div className="text-sm font-medium mb-3">Custom Dimensions (Inches)</div>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" min="1" step="0.1"
                              value={customWidth} onChange={e => setCustomWidth(e.target.value)}
                              placeholder="Width" className="p-2 border rounded w-24 bg-white dark:bg-neutral-800" 
                            />
                            <span className="text-neutral-500">×</span>
                            <input 
                              type="number" min="1" step="0.1"
                              value={customHeight} onChange={e => setCustomHeight(e.target.value)}
                              placeholder="Height" className="p-2 border rounded w-24 bg-white dark:bg-neutral-800" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col gap-4 max-w-2xl text-black dark:text-white">
                    <div className="flex items-start gap-4" onClick={() => setCoverType('none')}>
                       <input type="radio" checked={coverType === 'none'} readOnly className="mt-6 w-5 h-5 cursor-pointer accent-blue-600" />
                       <div className={`flex-1 p-4 border bg-neutral-50 dark:bg-neutral-800 cursor-pointer rounded-xl ${coverType === 'none' ? 'border-blue-500 shadow-sm' : 'border-neutral-300'}`}>
                          <div className="text-lg font-medium">No Cover</div>
                          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Design without a custom cover page.</div>
                       </div>
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
