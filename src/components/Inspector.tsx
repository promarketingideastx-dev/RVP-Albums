"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useEditorStore } from '@/store/useEditorStore';

export default function Inspector() {
  const t = useTranslations('Editor');
  const project = useEditorStore((state) => state.project);
  const activeSpreadId = useEditorStore((state) => state.activeSpreadId);
  const selectedElementId = useEditorStore((state) => state.selectedElementId);
  const updateElement = useEditorStore((state) => state.updateElement);

  const activeSpread = project?.spreads.find(s => s.id === activeSpreadId);
  const element = activeSpread?.elements.find(e => e.id === selectedElementId);

  // Local state acts as a buffer to avoid crashing React node reconciliation on every keystroke
  const [localX, setLocalX] = useState('');
  const [localY, setLocalY] = useState('');
  const [localW, setLocalW] = useState('');
  const [localH, setLocalH] = useState('');
  const [localRot, setLocalRot] = useState('');

  // Sink memory values downward if they are legitimately updated by the canvas/store
  useEffect(() => {
    if (element) {
      setLocalX(element.x_mm.toFixed(2));
      setLocalY(element.y_mm.toFixed(2));
      setLocalW(element.w_mm.toFixed(2));
      setLocalH(element.h_mm.toFixed(2));
      setLocalRot(element.rotation_deg.toFixed(2));
    }
  }, [element?.x_mm, element?.y_mm, element?.w_mm, element?.h_mm, element?.rotation_deg, selectedElementId]);

  if (!element || !activeSpreadId) {
    return (
      <aside className="w-64 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex items-center justify-center text-sm text-neutral-400">
        {t('no_selection')}
      </aside>
    );
  }

  const handleBlurOrEnter = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    updateElement(activeSpreadId, element.id, {
      x_mm: parseFloat(localX) || 0,
      y_mm: parseFloat(localY) || 0,
      w_mm: Math.max(5, parseFloat(localW) || 5), // Constraint to protect mathematical render collapse
      h_mm: Math.max(5, parseFloat(localH) || 5),
      rotation_deg: parseFloat(localRot) || 0
    });
  };

  const InputField = ({ label, value, setter }: { label: string, value: string, setter: (val: string) => void }) => (
    <div className="flex flex-col gap-1 mb-3">
      <label className="text-xs font-semibold text-neutral-500 uppercase">{label}</label>
      <input
        type="number"
        className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
        value={value}
        onChange={(e) => setter(e.target.value)}
        onBlur={handleBlurOrEnter}
        onKeyDown={handleBlurOrEnter}
        step="0.1"
      />
    </div>
  );

  return (
    <aside className="w-64 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-col overflow-y-auto">
      <h2 className="text-sm font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 mb-6 uppercase">{t('properties')}</h2>
      <InputField label={t('x_pos')} value={localX} setter={setLocalX} />
      <InputField label={t('y_pos')} value={localY} setter={setLocalY} />
      <InputField label={t('width')} value={localW} setter={setLocalW} />
      <InputField label={t('height')} value={localH} setter={setLocalH} />
      <InputField label={t('rotation')} value={localRot} setter={setLocalRot} />
    </aside>
  );
}
