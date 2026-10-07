'use client';
import { useEffect, useId, useState } from 'react';
import { formatInches, dimensionRange } from '@/lib/design';
import { measurementFeedback } from '@/lib/measurementPolicy';

export function DimInput({ label, hint, valueInches, onChange, mode, onValidityChange,fieldType }: {
  label: string; hint: string; valueInches: number; onChange: (n: number) => void;
  mode: 'ft-in' | 'inches'; fieldType: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const id = useId();
  const [raw, setRaw] = useState(String(valueInches));
  const [feet, setFeet] = useState(String(Math.floor(valueInches / 12)));
  const [inches, setInches] = useState(String(Number((valueInches % 12).toFixed(3))));
  const [error, setError] = useState('');
  const n = mode === 'inches' ? Number(raw) : Number(feet) * 12 + Number(inches);
  const range=dimensionRange(fieldType);
  const feedback=measurementFeedback(fieldType,n);
  const valid = (mode === 'inches' ? !!raw.trim() : !!feet.trim() && !!inches.trim() && Number(feet)>=0 && Number(inches)>=0) && Number.isFinite(n) && Math.round(n*8)/8>=range.min&&Math.round(n*8)/8<=range.max;
  useEffect(()=>{onValidityChange?.(valid);},[valid,onValidityChange]);
  useEffect(() => {
    setRaw(String(valueInches)); setFeet(String(Math.floor(valueInches / 12)));
    setInches(String(Number((valueInches % 12).toFixed(3))));
    setError('');
  }, [valueInches, mode]);
  const commit = () => {
    if (!valid) {
      setError(mode === 'ft-in' ? `Current generator supports measurements between ${formatInches(range.min)} and ${formatInches(range.max)}.` : `Current generator supports measurements between ${range.min} and ${range.max} inches.`); return;
    }
    const rounded=Math.round(n*8)/8;
    setError(''); onChange(rounded); setRaw(String(rounded));
    setFeet(String(Math.floor(rounded / 12))); setInches(String(Number((rounded % 12).toFixed(3))));
  };
  const common = { type: 'number', min: 0, step: 0.125, onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); },
    'aria-describedby': [id + '-hint', error && id + '-error', feedback && id + '-feedback'].filter(Boolean).join(' '), 'aria-invalid': !!error,
    className: 'min-w-0 w-full p-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-taupe-400' };
  return <div><label htmlFor={id} className="block font-medium mb-2">{label}</label>
    {mode === 'inches' ? <input {...common} id={id} value={raw} onChange={e => setRaw(e.target.value)} /> :
      <div className="flex items-center gap-2"><input {...common} id={id} aria-label={label + ' feet'} value={feet} onChange={e => setFeet(e.target.value)} /><span>ft</span>
        <input {...common} aria-label={label + ' inches'} value={inches} onChange={e => setInches(e.target.value)} /><span>in</span></div>}
    <p id={id + '-hint'} className="text-xs mt-1">{hint} · {formatInches(valueInches)}</p>
    {feedback && !error && <p id={id + '-feedback'} className="text-sm mt-2 text-charcoal-500">{feedback}</p>}
    {error && <p id={id + '-error'} role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
