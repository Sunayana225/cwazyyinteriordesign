'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { DimInput } from './DimensionInput';
import { STYLE_OPTIONS, WOOD_OPTIONS, dimensionErrors, EMPTY_WARDROBE, FOLDED_PER_DRAWER, formatInches, SHOE_SPACING } from '@/lib/design';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClosetConfiguration, VillaAmenities, WardrobeItems, ShoeCollection,
  ClosetDimensions, RoomDimensions, UserPreferences, ClosetType,
} from '@/types/closet';
import { Calculator, Shirt, Package, Palette, ChevronRight, ChevronLeft, Check, LayoutGrid, Sparkles } from 'lucide-react';

export function PreferencesStep({ config, onUpdate }: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const defaultPrefs: UserPreferences = {
    userType: 'homeowner', stylePreference: 'modern',
    woodFinish: 'medium', drawerPreference: 'mixed', priorityItems: ['hanging']
  };
  const prefs: UserPreferences = { ...defaultPrefs, ...config.userInfo };

  const update = (field: keyof UserPreferences, value: string | boolean | string[]) => {
    const updated = { ...prefs, [field]: value };
    onUpdate({ userInfo: updated });
  };

  const togglePriority = (item: string) => {
    const current = prefs.priorityItems as string[];
    const updated = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
    update('priorityItems', updated);
  };

  const styles = STYLE_OPTIONS;

  const finishes = WOOD_OPTIONS;

  const priorities = [
    { id: 'hanging',     label: 'Hanging clothes', icon: '👗' },
    { id: 'shoes',       label: 'Shoes',           icon: '👠' },
    { id: 'folded',      label: 'Folded items',    icon: '📦' },
    { id: 'accessories', label: 'Accessories',     icon: '👜' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">Style & preferences</h2>
        <p className="text-charcoal-400">This determines the visual finish and layout priorities of your design</p>
      </div>

      {/* Style Selection */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">Design Style</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {styles.map(s => (
            <button
              key={s.id}
              aria-pressed={prefs.stylePreference === s.id} onClick={() => update('stylePreference', s.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                prefs.stylePreference === s.id
                  ? 'border-charcoal-500 ring-2 ring-charcoal-200'
                  : `${s.swatch} hover:border-taupe-400`
              }`}
            >
              <p className="font-medium text-charcoal-600 text-sm">{s.name}</p>
              <p className="text-xs text-charcoal-400 mt-1">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Wood Finish */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">Wood Finish</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {finishes.map(f => (
            <button
              key={f.id}
              aria-pressed={prefs.woodFinish === f.id} onClick={() => update('woodFinish', f.id)}
              className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                prefs.woodFinish === f.id ? 'border-charcoal-500 ring-2 ring-charcoal-200' : 'border-cream-300'
              }`}
            >
              <div className="w-full h-8 rounded-lg mb-2 border border-cream-300" style={{ backgroundColor: f.color }} />
              <p className="text-xs font-medium text-charcoal-600 text-center">{f.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Priority Items */}
      <div>
        <h3 className="font-medium text-charcoal-600 mb-1 uppercase text-xs tracking-widest">Space Priorities</h3>
        <p className="text-xs text-charcoal-400 mb-3">What matters most? We&apos;ll allocate space accordingly</p>
        <div className="grid grid-cols-2 gap-3">
          {priorities.map(p => {
            const isActive = (prefs.priorityItems as string[]).includes(p.id);
            return (
              <button
                key={p.id}
                aria-pressed={isActive} onClick={() => togglePriority(p.id)}
                className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                  isActive ? 'border-charcoal-500 bg-charcoal-50' : 'border-cream-200 bg-cream-50 hover:border-taupe-300'
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span className={`font-medium text-sm ${isActive ? 'text-charcoal-600' : 'text-charcoal-400'}`}>{p.label}</span>
                {isActive && <Check className="w-4 h-4 text-charcoal-500 ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Shape Step ─────────────────────────────────────────────────────────────
// First question in the wizard — determines the entire drawing structure

export function ShapeStep({ config, onUpdate }: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const shapes: {
    type: ClosetType;
    name: string;
    emoji: string;
    tagline: string;
    desc: string;
    minDims: string;
    walls: number;
    badge?: string;
  }[] = [
    {
      type: 'reach-in', name: 'Reach-In', emoji: '🚪', walls: 1,
      tagline: 'Single wall · no entry space',
      desc: 'Classic closet accessed from the room threshold. One fitted wall.',
      minDims: "Min 3' wide × 2' deep",
    },
    {
      type: 'wardrobe-wall', name: 'Wardrobe Wall', emoji: '🏠', walls: 1,
      tagline: 'Full bedroom wall · no separate room',
      desc: "An entire bedroom wall fitted floor-to-ceiling. The wardrobe IS the room feature.",
      minDims: "Min 6' wide",
    },
    {
      type: 'walkin-single', name: 'Single-Wall Walk-In', emoji: '🚶', walls: 1,
      tagline: 'Dedicated room · one fitted wall',
      desc: 'A separate room with one fitted wall and open space to stand and dress.',
      minDims: 'Min 20 sq ft room',
    },
    {
      type: 'walkin-l', name: 'L-Shape Walk-In', emoji: '📐', walls: 2,
      tagline: 'Two walls at 90° · back + one side',
      desc: 'Two adjacent fitted walls meeting at a corner. Highly efficient — the most common true walk-in.',
      minDims: 'Min 25 sq ft room',
    },
    {
      type: 'walkin-u', name: 'U-Shape Walk-In', emoji: '⬜', walls: 3,
      tagline: 'Three walls · the luxury primary suite standard',
      desc: 'Back wall and both side walls fully fitted. Generates 3 elevation drawings (EL-A, EL-B, EL-C).',
      minDims: 'Min 35 sq ft room',
      badge: 'Most Popular',
    },
    {
      type: 'island', name: 'Island Walk-In', emoji: '💎', walls: 4,
      tagline: 'U-shape + central island unit',
      desc: 'A U-shaped walk-in with a freestanding island for drawers and a styling surface.',
      minDims: 'Min 60 sq ft room',
      badge: 'Luxury',
    },
    {
      type: 'corridor', name: 'Corridor Walk-In', emoji: '↔', walls: 2,
      tagline: 'Two facing walls · narrow central aisle',
      desc: 'Long narrow room with fitted units on both sides. Maximum storage in a dressing passage.',
      minDims: "Min 7' wide room",
    },
  ];

  const selected = config.closetType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">What shape is your closet?</h2>
        <p className="text-charcoal-400 text-sm">
          Choose the arrangement that best matches your room. You can change it at any time.
        </p>
      </div>

      <div className="studio-shapes">
        {shapes.map(s=><button key={s.type} type="button" aria-pressed={selected===s.type} className="studio-shape" onClick={()=>onUpdate({closetType:s.type,...(s.type!=='reach-in'&&s.type!=='wardrobe-wall'&&!config.roomDimensions?{roomDimensions:{roomWidth:120,roomDepth:96}}:{})})}>
          <svg viewBox="0 0 80 68" aria-hidden="true" className="studio-shape-diagram"><path d="M8 60V8H72V60" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2"/>
            {!['corridor'].includes(s.type)&&<rect x="10" y="10" width="60" height="10" rx="1" fill="currentColor"/>}
            {['walkin-l','walkin-u','island','corridor'].includes(s.type)&&<rect x="10" y={s.type==='corridor'?10:22} width="10" height={s.type==='corridor'?48:36} rx="1" fill="currentColor"/>}
            {['walkin-u','island','corridor'].includes(s.type)&&<rect x="60" y={s.type==='corridor'?10:22} width="10" height={s.type==='corridor'?48:36} rx="1" fill="currentColor"/>}
            {s.type==='island'&&<rect x="31" y="33" width="18" height="14" rx="2" fill="currentColor"/>}
            {s.type==='reach-in'&&<path d="M10 29H70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>}
            {s.type==='wardrobe-wall'&&<path d="M25 10V20M40 10V20M55 10V20" stroke="white"/>}
          </svg>
          <span className="min-w-0"><span className="studio-shape-name">{s.name}</span><span className="studio-shape-caption">{s.tagline}</span>{selected===s.type&&<span className="studio-shape-description">{s.desc}</span>}</span><span className="studio-choice-check" aria-hidden="true">{selected===s.type?<Check className="w-3 h-3"/>:null}</span>
        </button>)}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="studio-selection-note"
        >
          <Check className="w-4 h-4 text-charcoal-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-charcoal-600">
            <span className="font-semibold">{shapes.find(s => s.type === selected)?.name}</span> selected —
            Alvéo will generate{' '}
            {(shapes.find(s => s.type === selected)?.walls ?? 1) > 1
              ? `${shapes.find(s => s.type === selected)?.walls} elevation drawings`
              : '1 elevation drawing'
            } when the room is large enough. Islands are omitted when aisle clearance is insufficient.
          </p>
        </motion.div>
      )}
    </div>
  );
}