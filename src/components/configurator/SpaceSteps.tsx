'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { DimInput } from './DimensionInput';
import { STYLE_OPTIONS, WOOD_OPTIONS, dimensionErrors, dimensionRange, EMPTY_WARDROBE, FOLDED_PER_DRAWER, formatInches, SHOE_SPACING, LIMITS } from '@/lib/design';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClosetConfiguration, VillaAmenities, WardrobeItems, ShoeCollection,
  ClosetDimensions, RoomDimensions, UserPreferences, ClosetType,
} from '@/types/closet';
import { Calculator, Shirt, Package, Palette, ChevronRight, ChevronLeft, Check, LayoutGrid, Sparkles } from 'lucide-react';

function getFloorAreaSqFt(w: number, d: number) { return Math.round(w * d / 144); }

export function getVillaFlag(w: number, d: number) { return getFloorAreaSqFt(w, d) >= 150; }

function getSpaceType(sqft: number): string {
  if (sqft < 20)  return 'Reach-in';
  if (sqft < 40)  return 'Walk-in Single Wall';
  if (sqft < 80)  return 'L-Shape Walk-in';
  if (sqft < 150) return 'U-Shape Walk-in';
  if (sqft < 250) return 'U-Shape + Island';
  if (sqft < 500) return 'Full Dressing Suite';
  return 'Bespoke Villa Suite';
}

const toFtInStr = formatInches;

// ─── Smart dimension input with ft+in mode ────────────────────────────────────

interface DimInputProps {
  label: string;
  hint: string;
  valueInches: number;
  onChange: (inches: number) => void;
  mode: 'ft-in' | 'inches';
  fieldType: 'width' | 'height' | 'depth';
}

interface SuspectState {
  visible: boolean;
  field: string;
  raw: number;
}

// Tighter thresholds: width > 20ft, height > 13ft, depth > 4ft
const SUSPECT_THRESHOLDS = { width: 240, height: 156, depth: 48 };

// ─── Villa Badge ──────────────────────────────────────────────────────────────

function VillaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#FDF8ED] border border-[#B8966E] text-[#B8966E] text-xs font-bold tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
      ✦ VILLA MODE ✦
    </span>
  );
}

export function DimensionsStep({ config, onUpdate, userType, onValidityChange }: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
  userType: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [invalidFields,setInvalidFields]=useState<Record<string,boolean>>({});
  const fieldValidity=(field:string)=>(valid:boolean)=>setInvalidFields(previous=>previous[field]===!valid?previous:{...previous,[field]:!valid});
  const editsValid=!Object.values(invalidFields).some(Boolean);
  useEffect(()=>{onValidityChange?.(editsValid);},[editsValid,onValidityChange]);
  const isWalkIn = ['walkin-l', 'walkin-u', 'island', 'corridor', 'walkin-single'].includes(config.closetType ?? '');

  const dimensions = config.dimensions || { width: 96, height: 96, depth: 24 };
  const roomDims = config.roomDimensions || { roomWidth: 120, roomDepth: 96 };

  // ft+in mode persisted in localStorage
  const [mode, setMode] = useState<'ft-in' | 'inches'>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('dim_input_mode') === 'inches' ? 'inches' : 'ft-in'; } catch { return 'ft-in'; }
    }
    return 'ft-in';
  });

  // Suspect detection: { visible, field, raw }
  const [suspect, setSuspect] = useState<SuspectState>({ visible: false, field: '', raw: 0 });

  const toggleMode = () => {
    const next = mode === 'ft-in' ? 'inches' : 'ft-in';
    setMode(next);
    try { localStorage.setItem('dim_input_mode', next); } catch { /* Keep the mode in memory. */ }
  };

  const W = isWalkIn ? roomDims.roomWidth  : dimensions.width;
  const D = isWalkIn ? roomDims.roomDepth  : dimensions.depth;
  const H = dimensions.height;

  const applyWidth  = (v: number) => {
    const next = { ...dimensions, width: v };
    if (isWalkIn) {
      const nextRoom = { ...roomDims, roomWidth: v };
      onUpdate({ dimensions: next, roomDimensions: nextRoom });
    } else {
      onUpdate({ dimensions: next });
    }
  };
  const applyDepth  = (v: number) => {
    if (isWalkIn) {
      const nextRoom = { ...roomDims, roomDepth: v };
      onUpdate({ roomDimensions: nextRoom });
    } else {
      const next = { ...dimensions, depth: v };
      onUpdate({ dimensions: next });
    }
  };
  const applyHeight = (v: number) => {
    const next = { ...dimensions, height: v };
    onUpdate({ dimensions: next });
  };

  // Check for suspect (user likely typed feet into the inches field)
  const checkSuspect = (field: 'width' | 'height' | 'depth', value: number) => {
    const threshold = SUSPECT_THRESHOLDS[field];
    // Flag if above threshold OR if value looks like a round-foot entry
    // (e.g. typing "28" meaning 28 ft when the field expects inches)
    const isRoundFoot = value > 120 && value % 12 === 0;
    if (value > threshold || isRoundFoot) {
      setSuspect({ visible: true, field, raw: value });
    } else {
      setSuspect(s => s.field === field ? { ...s, visible: false } : s);
    }
  };

  const handleChange = (field: 'width' | 'height' | 'depth', v: number) => {
    if (field === 'width')  applyWidth(v);
    if (field === 'depth')  applyDepth(v);
    if (field === 'height') applyHeight(v);
  };

  // When user blurs, run suspect check only in inches mode
  const handleBlur = (field: 'width' | 'height' | 'depth', v: number) => {
    if (mode === 'inches') checkSuspect(field, v);
  };

  // Accept "Did you mean?" — convert raw inches value as feet
  const acceptSuggest = () => {
    const ft = suspect.raw;          // if they typed 40, they meant 40 feet
    const inches = ft * 12;
    const range=dimensionRange(suspect.field==='depth'&&isWalkIn?'roomDepth':suspect.field);
    if(inches<range.min||inches>range.max){setSuspect({visible:false,field:'',raw:0});return;}
    if (suspect.field === 'width')  applyWidth(inches);
    if (suspect.field === 'depth')  applyDepth(inches);
    if (suspect.field === 'height') applyHeight(inches);
    setSuspect({ visible: false, field: '', raw: 0 });
  };
  const keepRaw = () => setSuspect({ visible: false, field: '', raw: 0 });

  // Villa
  const floorSqFt = getFloorAreaSqFt(W, D);
  const villa = getVillaFlag(W, D);
  const spaceType = getSpaceType(floorSqFt);

  const getUserTypeGuidance = () => {
    switch (userType) {
      case 'renter':    return "Measure carefully — we'll design around your existing space constraints";
      case 'homeowner': return 'Planning new construction? We can suggest optimal dimensions too';
      case 'designer':  return "Professional tip: We'll handle all the clearance calculations";
      default:          return "Measure wall-to-wall — we'll account for baseboards and trim";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-charcoal-600 mb-1">
            {isWalkIn ? 'Room dimensions' : 'Wall dimensions'}
          </h2>
          <p className="text-charcoal-400 text-sm">{getUserTypeGuidance()}</p>
        </div>

        {/* Mode toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className="shrink-0 px-4 py-2 rounded-full border border-taupe-300 text-taupe-600 text-xs font-medium hover:bg-taupe-50 transition-colors"
        >
          {mode === 'ft-in' ? 'Switch to inches-only' : 'Switch to ft + in'}
        </button>
      </div>

      <p className="text-sm text-charcoal-400">{isWalkIn ? `Current generator supports rooms up to ${LIMITS.widthMax / 12} by ${LIMITS.roomDepthMax / 12} feet. Cabinet depth is measured separately below.` : `Current generator supports cabinet runs up to ${LIMITS.widthMax / 12} feet. For a whole dressing room, choose a walk-in layout.`}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div onBlur={() => handleBlur('width', W)}>
          <DimInput
            label={isWalkIn ? 'Room Width' : 'Wall Width'}
            hint={isWalkIn ? 'Wall-to-wall across room' : 'Wall to wall measurement'}
            valueInches={W}
            onChange={v => handleChange('width', v)}
            mode={mode}
            fieldType="width"
            onValidityChange={fieldValidity('width')}
          />
        </div>

        <div onBlur={() => handleBlur('depth', D)}>
          <DimInput
            label={isWalkIn ? 'Room Depth' : 'Cabinet Depth'}
            hint={isWalkIn ? 'Door-to-back-wall depth' : 'Cabinet only, not room depth'}
            valueInches={D}
            onChange={v => handleChange('depth', v)}
            mode={mode}
            fieldType={isWalkIn?'roomDepth':'depth'}
            onValidityChange={fieldValidity('depth')}
          />
        </div>

        <div onBlur={() => handleBlur('height', H)}>
          <DimInput
            label="Ceiling Height"
            hint="Floor to ceiling"
            valueInches={H}
            onChange={v => handleChange('height', v)}
            mode={mode}
            fieldType="height"
            onValidityChange={fieldValidity('height')}
          />
        </div>
      </div>

      {isWalkIn && <DimInput label="Cabinet Depth" hint="Cabinet only, not room depth" valueInches={dimensions.depth} mode={mode} fieldType="depth" onValidityChange={fieldValidity('cabinet')} onChange={depth => { const next = { ...dimensions, depth }; onUpdate({ dimensions: next }); }} />}
      <div className="rounded-xl border border-cream-300 p-4 space-y-3">
        <label className="flex items-center gap-2"><input type="checkbox" checked={dimensions.cabinetHeight !== undefined} onChange={e=>{const next={...dimensions};if(e.target.checked)next.cabinetHeight=Math.min(96,dimensions.height);else delete next.cabinetHeight;setInvalidFields(previous=>({...previous,cabinetHeight:false}));onUpdate({dimensions:next});}} />Set cabinet height separately from ceiling</label>
        {dimensions.cabinetHeight !== undefined ? <>
          <DimInput label="Cabinet Height" hint="Floor to top of cabinetry" valueInches={dimensions.cabinetHeight} mode={mode} fieldType="cabinetHeight" onValidityChange={fieldValidity('cabinetHeight')} onChange={cabinetHeight=>onUpdate({dimensions:{...dimensions,cabinetHeight}})} />
          {dimensions.cabinetHeight > dimensions.height ? <p role="alert">Cabinet height exceeds the ceiling. Lower the cabinet height or correct the ceiling measurement.</p> : <p className="text-sm">Space above cabinets: {formatInches(dimensions.height-dimensions.cabinetHeight)}.</p>}
        </> : <p className="text-sm">Cabinet height follows the ceiling. Set it separately to leave space above your cabinetry.</p>}
      </div>
      {/* Suspect "Did you mean?" banner */}
      {suspect.visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">That&apos;s a big space!</p>
            <p className="text-amber-700 text-xs mt-0.5">
              You entered {suspect.raw} inches. Confirm the unit from your measuring tool before continuing.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={acceptSuggest}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
            >
              I measured {suspect.raw} feet
            </button>
            <button
              type="button"
              onClick={keepRaw}
              className="px-4 py-2 border border-amber-400 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              Keep {suspect.raw}&quot;
            </button>
          </div>
        </motion.div>
      )}

      {/* Space Summary */}
      <div className={`rounded-xl p-6 ${villa ? 'bg-[#FDF8ED] border border-[#B8966E]' : 'bg-cream-100'}`}>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-medium text-charcoal-600">Space Summary</h3>
          {villa && <VillaBadge />}
        </div>

        {villa && (
          <p className="text-[#B8966E] text-sm mb-4 font-medium">
            ✦ An Amenities step has been added — configure your island, vanity, seating and more.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {isWalkIn ? (
            <>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Floor area</span>
                <span className="font-semibold text-charcoal-700">{floorSqFt} sq ft</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Space type</span>
                <span className="font-semibold text-charcoal-700">{spaceType}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Width</span>
                <span className="font-semibold text-charcoal-700">{toFtInStr(W)}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Depth</span>
                <span className="font-semibold text-charcoal-700">{toFtInStr(D)}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Width</span>
                <span className="font-semibold text-charcoal-700">{toFtInStr(W)}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Height</span>
                <span className="font-semibold text-charcoal-700">{toFtInStr(H)}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Depth</span>
                <span className="font-semibold text-charcoal-700">{toFtInStr(D)}</span>
              </div>
              <div>
                <span className="text-charcoal-400 block text-xs mb-0.5">Space type</span>
                <span className="font-semibold text-charcoal-700">{spaceType}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Amenities Step (Villa Mode only) ────────────────────────────────────────

export function AmenitiesStep({ config, onUpdate }: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const amenities = config.amenities ?? {};

  const toggle = (key: keyof VillaAmenities) => {
    const next = { ...amenities, [key]: !amenities[key] };
    onUpdate({ amenities: next });
  };

  const items: { key: keyof VillaAmenities; label: string; desc: string; icon: string }[] = [
    { key: 'island',         label: 'Island Unit',          desc: 'Central island with drawers & styling surface', icon: '🗿' },
    { key: 'seating',        label: 'Seating / Ottoman',    desc: 'Built-in bench or upholstered seat',           icon: '🛋️' },
    { key: 'vanity',         label: 'Vanity + Mirror',      desc: 'Dedicated dressing table with lit mirror',     icon: '🪞' },
    { key: 'mirrorWall',     label: 'Mirror Wall',          desc: 'Full floor-to-ceiling mirror panel',           icon: '✨' },
    { key: 'displayShelves', label: 'Display Shelves',      desc: 'Open-front feature shelves for curated pieces',icon: '🏆' },
    { key: 'safe',           label: 'Hidden Safe',          desc: 'Concealed in-unit security safe',              icon: '🔒' },
    { key: 'shoeWall',       label: 'Shoe Display Wall',    desc: 'Angled, backlit shoe showcase',                icon: '👠' },
    { key: 'lighting',       label: 'Feature Lighting',     desc: 'LED accent strips, puck lights, chandelier',   icon: '💡' },
  ];

  const count = Object.values(amenities).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-2xl text-charcoal-600 mb-1">Villa amenities</h2><p className="text-sm">These choices add planning recommendations. Drawings include an island only when Island Walk-In is selected and clearance permits. Other amenities are not drawn.</p>
          <p className="text-charcoal-400 text-sm">Configure the luxury features of your dressing suite</p>
        </div>
        <VillaBadge />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(({ key, label, desc, icon }) => {
          const active = !!amenities[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                active
                  ? 'border-[#B8966E] bg-[#FDF8ED]'
                  : 'border-cream-200 bg-cream-50 hover:border-taupe-300'
              }`}
            >
              <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${active ? 'text-[#7A5C32]' : 'text-charcoal-600'}`}>{label}</p>
                <p className="text-xs text-charcoal-400 mt-0.5 leading-snug">{desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                active ? 'border-[#B8966E] bg-[#B8966E]' : 'border-cream-300'
              }`}>
                {active && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 border border-[#B8966E] bg-[#FDF8ED]"
        >
          <p className="text-[#7A5C32] font-serif text-base">{count} feature{count > 1 ? 's' : ''} selected</p>
          <p className="text-[#B8966E] text-xs mt-1">
            {items.filter(i => amenities[i.key]).map(i => i.label).join(' · ')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── NumberInput (stable module-level component — NOT defined inside render) ──
