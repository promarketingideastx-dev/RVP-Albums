import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SetupModalProps {
  onCancel: () => void;
  onCreate: (name: string, type: string, labPresetId: string, albumSize: string) => void;
}

const ALBUM_SIZES = [
  "Flushmount 5x5", "Flushmount 5x7", "Flushmount 6x6", "Flushmount 7x5",
  "Flushmount 8x8", "Flushmount 8x10", "Flushmount 9x12", "Flushmount 10x8",
  "Flushmount 10x10", "Flushmount 20x8", "Flushmount 11x14", "Flushmount 12x9",
  "Flushmount 12x12", "Flushmount 12x16", "Flushmount 14x11", "Flushmount 16x12", "Flushmount 16x20", "Custom Size"
];

export default function SetupModal({ onCancel, onCreate }: SetupModalProps) {
  const t = useTranslations('Editor');
  
  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [name, setName] = useState('');
  
  // Data State
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
  
  const handleSubmit = () => {
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
    onCreate(name || 'Untitled Album', bookLine, printCompany, finalSize);
  };

  const StepItem = ({ num, label, isActive }: { num: number, label: string, isActive: boolean }) => (
    <div className={`flex items-center gap-4 p-4 ${isActive ? 'bg-neutral-300 dark:bg-neutral-800' : 'opacity-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive ? 'bg-teal-500 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
        {num}
      </div>
      <span className={`font-medium ${isActive ? 'text-black dark:text-white' : 'text-neutral-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-100 dark:bg-neutral-900 w-full max-w-4xl h-[70vh] rounded-lg border border-neutral-300 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-12 bg-neutral-800 text-white flex items-center justify-between px-4 shrink-0">
          <div className="w-8"></div>
          <h2 className="font-medium text-lg tracking-wide">Album Options</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-700 rounded text-xl">&times;</button>
        </div>

        {/* Body Container */}
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
                  <div className="flex justify-end relative w-full mb-4">
                     <div className="relative w-64">
                       <input type="text" placeholder="Search" className="w-full pl-3 pr-10 py-2 bg-white rounded border border-neutral-300 focus:outline-none" />
                       <span className="absolute right-3 top-2.5 text-neutral-400 font-bold">Q</span>
                     </div>
                  </div>
                  <div 
                    onClick={() => setPrintCompany('pic-pro-lab')}
                    className={`p-4 border-2 rounded cursor-pointer transition-colors ${printCompany === 'pic-pro-lab' ? 'border-teal-500 bg-teal-50/50' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                  >
                    <div className="font-semibold text-lg text-black dark:text-white">Pic Pro Lab</div>
                    <div className="text-sm text-neutral-500 mt-1">Default lab integrations</div>
                  </div>
                  <div 
                    onClick={() => setPrintCompany('custom')}
                    className={`p-4 border-2 rounded cursor-pointer transition-colors ${printCompany === 'custom' ? 'border-teal-500 bg-teal-50/50' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                  >
                    <div className="font-semibold text-lg text-black dark:text-white">Custom Print Company</div>
                    <div className="text-sm text-neutral-500 mt-1">Setup dimensions manually</div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end relative w-full mb-4">
                     <div className="relative w-64">
                       <input type="text" placeholder="Search" className="w-full pl-3 pr-10 py-2 bg-white rounded border border-neutral-300 focus:outline-none" />
                       <span className="absolute right-3 top-2.5 text-neutral-400 font-bold">Q</span>
                     </div>
                  </div>
                  <div 
                    onClick={() => setBookLine('type_album')}
                    className={`p-4 border-2 rounded cursor-pointer transition-colors ${bookLine === 'type_album' ? 'border-teal-500 bg-teal-50/50' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
                  >
                    <div className="font-semibold text-lg text-black dark:text-white">Flushmount Album</div>
                    <div className="text-sm text-neutral-500 mt-1">Thick rigid pages, layflat design</div>
                  </div>
                  <div 
                    onClick={() => setBookLine('type_book')}
                    className={`p-4 border-2 rounded cursor-pointer transition-colors ${bookLine === 'type_book' ? 'border-teal-500 bg-teal-50/50' : 'border-neutral-300 hover:border-neutral-400'} bg-white dark:bg-neutral-800`}
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
                        className="w-full pl-3 pr-10 py-2 bg-white rounded border border-neutral-300 focus:outline-none" 
                      />
                      <span className="absolute right-3 top-2.5 text-neutral-400 font-bold text-xl">⚲</span>
                    </div>
                  </div>
                  <div className="flex-1 bg-neutral-300 dark:bg-neutral-800 rounded p-1 overflow-y-auto min-h-[300px]">
                    {filteredSizes.map(size => (
                      <div 
                        key={size}
                        onClick={() => setAlbumSize(size)}
                        className={`p-4 text-neutral-800 dark:text-neutral-200 cursor-pointer text-lg tracking-wide ${albumSize === size ? 'bg-neutral-400 dark:bg-neutral-700 font-medium' : 'hover:bg-neutral-400/50 dark:hover:bg-neutral-700/50'}`}
                      >
                        {size}
                      </div>
                    ))}
                    {albumSize === 'Custom Size' && (
                      <div className="p-4 bg-white dark:bg-neutral-900 mt-2 rounded border border-neutral-300 dark:border-neutral-700">
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
                  {/* Option 1 */}
                  <div className="flex items-start gap-4" onClick={() => setCoverType('none')}>
                     <input type="radio" checked={coverType === 'none'} readOnly className="mt-6 w-5 h-5 cursor-pointer accent-neutral-600" />
                     <div className={`flex-1 p-4 border bg-neutral-50 dark:bg-neutral-800 cursor-pointer ${coverType === 'none' ? 'border-neutral-500 shadow-sm' : 'border-neutral-300'}`}>
                        <div className="text-lg font-medium">No Cover</div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Select this option if you do not plan on designating a cover for your album.</div>
                     </div>
                  </div>

                  {/* Option 2 */}
                  <div className="flex items-start gap-4" onClick={() => setCoverType('custom')}>
                     <input type="radio" checked={coverType === 'custom'} readOnly className="mt-6 w-5 h-5 cursor-pointer accent-neutral-600" />
                     <div className={`flex-1 p-4 border bg-neutral-50 dark:bg-neutral-800 cursor-pointer ${coverType === 'custom' ? 'border-neutral-500 shadow-sm' : 'border-neutral-300'}`}>
                        <div className="flex items-center gap-3">
                           <div className="text-lg font-medium">Custom Cover Size</div>
                           <div className="text-xs text-neutral-500 uppercase tracking-wide">In Inches</div>
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 mb-3">Enter the width, height, and DPI of your custom cover.</div>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                           <input type="text" placeholder="Width" disabled={coverType !== 'custom'} className="w-16 p-1 border rounded bg-white" /> X
                           <input type="text" placeholder="Height" disabled={coverType !== 'custom'} className="w-16 p-1 border rounded bg-white" /> @
                           <input type="text" placeholder="DPI" disabled={coverType !== 'custom'} className="w-16 p-1 border rounded bg-white" />
                        </div>
                     </div>
                  </div>

                  {/* Option 3 */}
                  <div className="flex items-start gap-4" onClick={() => setCoverType('template')}>
                     <input type="radio" checked={coverType === 'template'} readOnly className="mt-6 w-5 h-5 cursor-pointer accent-neutral-600" />
                     <div className={`flex-1 p-4 border bg-neutral-50 dark:bg-neutral-800 cursor-pointer ${coverType === 'template' ? 'border-neutral-500 shadow-sm' : 'border-neutral-300'}`}>
                        <div className="flex items-center gap-3">
                           <div className="text-lg font-medium">Cover Template</div>
                           <div className="text-xs text-neutral-500 uppercase tracking-wide">( JPEG, PNG )</div>
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 mb-4">Select a template file from your computer to use as your cover to design on.</div>
                        <button disabled={coverType !== 'template'} className="text-orange-500 text-sm font-medium disabled:opacity-50">Select File</button>
                     </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex flex-col gap-6 text-black dark:text-white">
                  <h3 className="text-2xl font-semibold">Review & Create</h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <label className="text-sm text-neutral-500 mb-2">Project Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder={t('form_name_placeholder') || "My Album Project"}
                        className="p-3 border rounded-lg max-w-md bg-white dark:bg-neutral-800 text-black dark:text-white border-neutral-300 shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm max-w-2xl">
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
                      <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">Cover</div>
                      <div className="font-medium text-lg mt-1 capitalize">{coverType}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm leading-relaxed border border-blue-100 dark:border-blue-800 max-w-2xl flex items-start gap-4">
                     <span className="text-2xl">ℹ️</span>
                     <div>
                        <strong>Local Save Notice</strong><br/>
                        This project will be saved locally in this browser. Future cloud sync is currently in development.
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="p-6 flex items-center justify-between mt-auto shrink-0 bg-neutral-100 dark:bg-neutral-900 h-24">
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
                  className="px-12 py-2 rounded-full border border-orange-500 text-orange-500 font-medium hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors bg-neutral-100 dark:bg-neutral-900 text-sm tracking-wide"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  className="px-12 py-2 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors shadow shadow-orange-500/20 text-sm tracking-wide"
                >
                  Create Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
