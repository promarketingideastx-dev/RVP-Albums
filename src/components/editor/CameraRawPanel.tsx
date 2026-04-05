import React, { useState } from 'react';
import { EditorElement, PhotoAdjustments } from '@/types/editor';
import { useEditorStore } from '@/store/useEditorStore';

interface CameraRawPanelProps {
  element: EditorElement;
  activeSpreadId: string;
}

export default function CameraRawPanel({ element, activeSpreadId }: CameraRawPanelProps) {
  const updateElement = useEditorStore((state) => state.updateElement);
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    light: true,
    color: true,
    effects: true,
    colorMixer: true,
    detail: true
  });
  
  const [mixerTab, setMixerTab] = useState<'Hue' | 'Saturation' | 'Luminance' | 'All'>('Saturation');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const currentAdj = element.photoAdjustments || {};

  const handleUpdate = (key: keyof PhotoAdjustments, value: number) => {
    updateElement(activeSpreadId, element.id, {
      photoAdjustments: {
        ...currentAdj,
        [key]: value
      }
    });
  };

  const handleHslUpdate = (color: string, channel: 'h'|'s'|'l', value: number) => {
    const currentHsl = currentAdj.hsl || {
      reds: {h:0,s:0,l:0}, oranges: {h:0,s:0,l:0}, yellows: {h:0,s:0,l:0}, greens: {h:0,s:0,l:0},
      aquas: {h:0,s:0,l:0}, blues: {h:0,s:0,l:0}, purples: {h:0,s:0,l:0}, magentas: {h:0,s:0,l:0}
    };
    
    updateElement(activeSpreadId, element.id, {
      photoAdjustments: {
        ...currentAdj,
        hsl: {
          ...currentHsl,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [color]: { ...(currentHsl as any)[color], [channel]: value }
        }
      }
    });
  };

  const renderSlider = (label: string, key: keyof PhotoAdjustments, min: number, max: number, defaultValue: number = 0, trackGradient?: string) => {
    const value = currentAdj[key] as number ?? defaultValue;
    
    return (
      <div className="mb-3 px-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-medium text-[#d1d1d1]">{label}</span>
          <input 
            type="text" 
            value={value.toFixed(key === 'exposure' ? 2 : 0)} 
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onChange={() => {}}
            className="w-12 bg-[#333333] border border-[#222] text-[#d1d1d1] text-right px-1 py-0.5 text-[10px] rounded focus:outline-none focus:border-[#555]"
          />
        </div>
        <div className="relative h-4 flex items-center group">
          {/* Track */}
          <div 
            className="absolute w-full h-[2px] bg-[#4a4a4a] group-hover:bg-[#555] rounded"
            style={{ background: trackGradient || undefined }}
          />
          {/* Thumb */}
          <input
            type="range"
            min={min}
            max={max}
            step={key === 'exposure' ? 0.01 : 1}
            value={value}
            onChange={(e) => handleUpdate(key, parseFloat(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute w-2 h-3 bg-[#c8c8c8] group-hover:bg-white border border-[#333] shadow-sm transform -translate-x-1/2 pointer-events-none"
            style={{ 
              left: `${((value - min) / (max - min)) * 100}%`,
              clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)'
            }}
          />
        </div>
      </div>
    );
  };
  
  const renderHslSlider = (label: string, colorKey: string, channel: 'h'|'s'|'l', bgGradient: string) => {
    const currentHsl = currentAdj.hsl || {} as Record<string, { h: number, s: number, l: number }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (currentHsl as any)[colorKey]?.[channel] ?? 0;
    
    return (
      <div className="mb-3 px-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-medium text-[#d1d1d1]">{label}</span>
          <input 
            type="text" 
            value={value.toFixed(0)} 
            readOnly
            className="w-12 bg-[#333333] border border-[#222] text-[#d1d1d1] text-right px-1 py-0.5 text-[10px] rounded focus:outline-none"
          />
        </div>
        <div className="relative h-4 flex items-center group">
          <div 
            className="absolute w-full h-[3px] rounded opacity-80"
            style={{ background: bgGradient }}
          />
          <input
            type="range"
            min={-100}
            max={100}
            value={value}
            onChange={(e) => handleHslUpdate(colorKey, channel, parseFloat(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute w-2 h-3 bg-[#c8c8c8] group-hover:bg-white border border-[#333] shadow-sm transform -translate-x-1/2 pointer-events-none"
            style={{ 
              left: `${((value - -100) / (200)) * 100}%`,
              clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#2d2d2d] border border-[#1e1e1e] rounded-md overflow-hidden select-none font-sans text-left mt-4" style={{ color: '#d1d1d1' }}>
      
      {/* Top Profile Strip */}
      <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between">
         <div className="flex items-center gap-4">
           <span className="text-[11px] font-semibold text-[#e1e1e1]">Profile</span>
           <select className="bg-[#383838] border border-[#222] text-[#d1d1d1] text-[10px] px-2 py-0.5 rounded w-32 focus:outline-none">
             <option>Color</option>
             <option>Monochrome</option>
           </select>
         </div>
         <div className="text-[#a1a1a1] cursor-pointer hover:text-white">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/></svg>
         </div>
      </div>

      {/* LIGHT SECTION */}
      <div className="border-b border-[#222]">
        <div 
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('light')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">
            {openSections.light ? '▼' : '▶'}
          </span>
          <span className="text-[12px] font-semibold">Light</span>
          <div className="ml-auto text-[#777]">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </div>
        </div>
        {openSections.light && (
          <div className="pb-2 pt-1 transition-all">
            {renderSlider('Exposure', 'exposure', -5, 5, 0)}
            {renderSlider('Contrast', 'lightContrast', -100, 100, 0)}
            {renderSlider('Highlights', 'highlights', -100, 100, 0)}
            {renderSlider('Shadows', 'shadows', -100, 100, 0)}
            {renderSlider('Whites', 'whites', -100, 100, 0)}
            {renderSlider('Blacks', 'blacks', -100, 100, 0)}
          </div>
        )}
      </div>

      {/* COLOR SECTION */}
      <div className="border-b border-[#222]">
        <div 
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('color')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">{openSections.color ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold">Color</span>
          <div className="ml-auto text-[#777]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </div>
        </div>
        {openSections.color && (
          <div className="pb-2 pt-1">
            <div className="flex items-center gap-2 px-3 mb-4 mt-1">
              <span className="text-[11px] font-medium text-[#d1d1d1] flex-1">White balance</span>
              <select className="bg-[#383838] border border-[#222] text-[#d1d1d1] text-[10px] px-2 py-0.5 rounded w-24 focus:outline-none">
                <option>As Shot</option>
                <option>Auto</option>
                <option>Custom</option>
              </select>
              <div className="w-5 h-5 flex flex-shrink-0 items-center justify-center text-[#a1a1a1] hover:text-white cursor-pointer ml-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z"/></svg>
              </div>
            </div>
            
            {renderSlider('Temperature', 'temperature', -100, 100, 0, 'linear-gradient(to right, #2a52be, #ece8dc, #fcd821)')}
            {renderSlider('Tint', 'tint', -100, 100, 0, 'linear-gradient(to right, #41e755, #ece8dc, #e83fd5)')}
            {renderSlider('Vibrance', 'vibrance', -100, 100, 0)}
            {renderSlider('Saturation', 'saturation', -100, 100, 0, 'linear-gradient(to right, #7a7a7a, #e6b222)')}
          </div>
        )}
      </div>

      {/* EFFECTS SECTION */}
      <div className="border-b border-[#222]">
        <div 
          className="px-3 py-2 flex items-center cursor-pointer hover:bg-[#333]"
          onClick={() => toggleSection('effects')}
        >
          <span className="text-[10px] mr-2 text-[#a1a1a1]">{openSections.effects ? '▼' : '▶'}</span>
          <span className="text-[12px] font-semibold">Effects</span>
          <div className="ml-auto text-[#777]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </div>
        </div>
        {openSections.effects && (
          <div className="pb-2 pt-1">
            {renderSlider('Texture', 'texture', -100, 100, 0)}
            {renderSlider('Clarity', 'clarity', -100, 100, 0)}
            {renderSlider('Dehaze', 'dehaze', -100, 100, 0)}
            {renderSlider('Vignette', 'vignette', -100, 100, 0)}
            {renderSlider('Grain', 'grain', 0, 100, 0)}
          </div>
        )}
      </div>
      

      
    </div>
  );
}
