'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { DimInput } from './DimensionInput';
import { MAX_INVENTORY } from '@/lib/planning';
import { STYLE_OPTIONS, WOOD_OPTIONS, dimensionErrors, EMPTY_WARDROBE, FOLDED_PER_DRAWER, formatInches, SHOE_SPACING, SHOE_PAIR_WIDTH } from '@/lib/design';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClosetConfiguration, VillaAmenities, WardrobeItems, ShoeCollection,
  ClosetDimensions, RoomDimensions, UserPreferences, ClosetType,
} from '@/types/closet';
import { Calculator, Shirt, Package, Palette, ChevronRight, ChevronLeft, Check, LayoutGrid, Sparkles } from 'lucide-react';

function NumberInput({ label, hint, value, onDecrement, onIncrement, onChange }: {
  label: string; hint: string; value: number;
  onDecrement: () => void; onIncrement: () => void;
  onChange?: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  const id = useId();
  // Keep raw in sync when value changes from outside (e.g. decrement/increment)
  useEffect(() => { setRaw(String(value)); }, [value]);

  const commit = (str: string) => {
    const n = Number(str);
    const safe = !Number.isFinite(n) || n < 0 ? 0 : Math.min(MAX_INVENTORY, Math.floor(n));
    setRaw(String(safe));
    onChange?.(safe);
  };

  return (
    <div className="bg-cream-50 rounded-xl p-5 border border-cream-200">
      <label htmlFor={id} className="block text-charcoal-600 font-medium mb-1 text-sm">{label}</label>
      <p className="text-xs text-charcoal-400 mb-4">{hint} · supported count 0–{MAX_INVENTORY}</p>
      <div className="flex items-center space-x-3">
        <button
          type="button"
          aria-label={"Decrease " + label} onClick={onDecrement}
          className="w-9 h-9 rounded-full bg-charcoal-200 text-charcoal-600 font-bold hover:bg-charcoal-300 transition-colors flex items-center justify-center text-lg leading-none flex-shrink-0"
        >−</button>
        <input
          type="number"
          min={0}
          max={MAX_INVENTORY}
          id={id} value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit(raw)}
          className="w-14 text-center text-xl font-semibold text-charcoal-700 bg-white border border-cream-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-taupe-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={"Increase " + label} disabled={value>=MAX_INVENTORY} onClick={onIncrement}
          className="w-9 h-9 rounded-full bg-charcoal-500 text-white font-bold hover:bg-charcoal-600 transition-colors flex items-center justify-center text-lg leading-none flex-shrink-0"
        >+</button>
      </div>
    </div>
  );
}

// ─── Wardrobe Step ─────────────────────────────────────────────────────────
export function WardrobeStep({ config, onUpdate }: { 
  config: Partial<ClosetConfiguration>; 
  onUpdate: (updates: Partial<ClosetConfiguration>) => void; 
}) {
  const defaultWardrobe: WardrobeItems = {
    longDresses: 8, shortJackets: 5, suits: 4, shirts: 22, pants: 12,
    tShirts: 18, sweaters: 7, jeans: 9, underwear: 24,
    bags: 6, belts: 5, jewelry: true, ties: 8
  };

  const wardrobe = config.wardrobe || defaultWardrobe;

  const updateField = (field: keyof WardrobeItems, value: number | boolean) => {
    const updated = { ...wardrobe, [field]: value };
    onUpdate({ wardrobe: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">Tell us about your wardrobe</h2>
        <p className="text-charcoal-400">Be as accurate as possible — every item gets its perfect place</p>
      </div>

      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">Hanging Items</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="Long Dresses" hint="Floor length, ~50-60 inch hang" value={wardrobe.longDresses} onDecrement={() => updateField('longDresses', Math.max(0, wardrobe.longDresses - 1))} onIncrement={() => updateField('longDresses', wardrobe.longDresses + 1)} onChange={(v) => updateField('longDresses', v)} />
          <NumberInput label="Suits" hint="Full suit sets" value={wardrobe.suits} onDecrement={() => updateField('suits', Math.max(0, wardrobe.suits - 1))} onIncrement={() => updateField('suits', wardrobe.suits + 1)} onChange={(v) => updateField('suits', v)} />
          <NumberInput label="Shirts & Blouses" hint="Button-ups, blouses" value={wardrobe.shirts} onDecrement={() => updateField('shirts', Math.max(0, wardrobe.shirts - 1))} onIncrement={() => updateField('shirts', wardrobe.shirts + 1)} onChange={(v) => updateField('shirts', v)} />
          <NumberInput label="Short Jackets" hint="Blazers, cardigans" value={wardrobe.shortJackets} onDecrement={() => updateField('shortJackets', Math.max(0, wardrobe.shortJackets - 1))} onIncrement={() => updateField('shortJackets', wardrobe.shortJackets + 1)} onChange={(v) => updateField('shortJackets', v)} />
          <NumberInput label="Pants" hint="Trousers, slacks" value={wardrobe.pants} onDecrement={() => updateField('pants', Math.max(0, wardrobe.pants - 1))} onIncrement={() => updateField('pants', wardrobe.pants + 1)} onChange={(v) => updateField('pants', v)} />
          <NumberInput label="Ties" hint="Neckties, bow ties" value={wardrobe.ties} onDecrement={() => updateField('ties', Math.max(0, wardrobe.ties - 1))} onIncrement={() => updateField('ties', wardrobe.ties + 1)} onChange={(v) => updateField('ties', v)} />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-charcoal-600 mb-3 uppercase text-xs tracking-widest">Folded Items (Drawers)</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumberInput label="T-Shirts" hint={"~" + FOLDED_PER_DRAWER.tShirts + " per standard drawer"} value={wardrobe.tShirts} onDecrement={() => updateField('tShirts', Math.max(0, wardrobe.tShirts - 1))} onIncrement={() => updateField('tShirts', wardrobe.tShirts + 1)} onChange={(v) => updateField('tShirts', v)} />
          <NumberInput label="Sweaters" hint={"~" + FOLDED_PER_DRAWER.sweaters + " per standard drawer"} value={wardrobe.sweaters} onDecrement={() => updateField('sweaters', Math.max(0, wardrobe.sweaters - 1))} onIncrement={() => updateField('sweaters', wardrobe.sweaters + 1)} onChange={(v) => updateField('sweaters', v)} />
          <NumberInput label="Jeans" hint="Folded denim" value={wardrobe.jeans} onDecrement={() => updateField('jeans', Math.max(0, wardrobe.jeans - 1))} onIncrement={() => updateField('jeans', wardrobe.jeans + 1)} onChange={(v) => updateField('jeans', v)} />
          <NumberInput label="Underwear" hint="Lingerie, underwear" value={wardrobe.underwear} onDecrement={() => updateField('underwear', Math.max(0, wardrobe.underwear - 1))} onIncrement={() => updateField('underwear', wardrobe.underwear + 1)} onChange={(v) => updateField('underwear', v)} />
          <NumberInput label="Bags" hint="Handbags, purses" value={wardrobe.bags} onDecrement={() => updateField('bags', Math.max(0, wardrobe.bags - 1))} onIncrement={() => updateField('bags', wardrobe.bags + 1)} onChange={(v) => updateField('bags', v)} />
          <NumberInput label="Belts" hint="Belts and sashes" value={wardrobe.belts} onDecrement={() => updateField('belts', Math.max(0, wardrobe.belts - 1))} onIncrement={() => updateField('belts', wardrobe.belts + 1)} onChange={(v) => updateField('belts', v)} />
        </div>
      </div>

      <div className="flex items-center space-x-4 p-5 bg-cream-50 rounded-xl border border-cream-200">
        <button
          type="button"
          aria-label="Jewelry storage" aria-pressed={wardrobe.jewelry} onClick={() => updateField('jewelry', !wardrobe.jewelry)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            wardrobe.jewelry ? 'bg-charcoal-500 text-white' : 'bg-cream-200 text-charcoal-400'
          }`}
        >
          {wardrobe.jewelry ? <Check className="w-5 h-5" /> : '💍'}
        </button>
        <div>
          <p className="font-medium text-charcoal-600">Jewelry & Accessories</p>
          <p className="text-xs text-charcoal-400">Add a dedicated jewelry drawer with velvet lining</p>
        </div>
      </div>
    </div>
  );
}

// ─── Shoes Step ─────────────────────────────────────────────────────────────
export function ShoesStep({ config, onUpdate }: {
  config: Partial<ClosetConfiguration>;
  onUpdate: (updates: Partial<ClosetConfiguration>) => void;
}) {
  const shoes = config.shoes || { sneakers: 0, heels: 0, boots: 0, flats: 0 };

  const updateShoes = (field: keyof ShoeCollection, value: number) => {
    const updated = { ...shoes, [field]: value };
    onUpdate({ shoes: updated });
  };

  const totalPairs = shoes.sneakers + shoes.heels + shoes.boots + shoes.flats;

  const shoeTypes: { field: keyof ShoeCollection; label: string; height: string; icon: string; pairsPerShelf: number }[] = [
    { field: 'sneakers', label: 'Sneakers', height: SHOE_SPACING.sneakers + '" shelf clearance', icon: '👟', pairsPerShelf: Math.floor(20 / SHOE_PAIR_WIDTH.sneakers) },
    { field: 'heels',    label: 'Heels',    height: SHOE_SPACING.heels + '" shelf clearance', icon: '👠', pairsPerShelf: Math.floor(20 / SHOE_PAIR_WIDTH.heels) },
    { field: 'boots',    label: 'Boots',    height: SHOE_SPACING.boots + '" shelf clearance', icon: '🥾', pairsPerShelf: Math.floor(20 / SHOE_PAIR_WIDTH.boots) },
    { field: 'flats',    label: 'Flats',    height: SHOE_SPACING.flats + '" shelf clearance', icon: '🩴', pairsPerShelf: Math.floor(20 / SHOE_PAIR_WIDTH.flats) },
  ];

  const shelvesNeeded = shoeTypes.reduce(
    (sum, t) => sum + Math.ceil(shoes[t.field] / t.pairsPerShelf), 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-charcoal-600 mb-2">Your shoe collection</h2>
        <p className="text-charcoal-400">Each shoe type gets exactly the right shelf height — no more cramming</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shoeTypes.map(({ field, label, height, icon, pairsPerShelf }) => (
          <div key={field} className="bg-cream-50 rounded-xl p-5 border border-cream-200">
            <div className="flex items-center space-x-3 mb-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-medium text-charcoal-600">{label}</p>
                <p className="text-xs text-charcoal-400">{height} · about {pairsPerShelf} pairs on a 24-inch shelf</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                aria-label={"Decrease " + label} onClick={() => updateShoes(field, Math.max(0, shoes[field] - 1))}
                className="w-8 h-8 rounded-full bg-charcoal-200 text-charcoal-600 font-bold hover:bg-charcoal-300 transition-colors flex items-center justify-center flex-shrink-0"
              >−</button>
              <input
                type="number"
                min={0}
                max={MAX_INVENTORY}
                aria-label={label + " pairs"} value={shoes[field]}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  updateShoes(field, !Number.isFinite(n) || n < 0 ? 0 : Math.min(MAX_INVENTORY,Math.floor(n)));
                }}
                className="w-14 text-center text-xl font-medium text-charcoal-600 bg-white border border-cream-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-taupe-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                aria-label={"Increase " + label} disabled={shoes[field]>=MAX_INVENTORY} onClick={() => updateShoes(field, shoes[field] + 1)}
                className="w-8 h-8 rounded-full bg-charcoal-500 text-white font-bold hover:bg-charcoal-600 transition-colors flex items-center justify-center flex-shrink-0"
              >+</button>
              <span className="text-sm text-charcoal-400">pairs</span>
            </div>
            {shoes[field] > 0 && (
              <p className="mt-2 text-xs text-taupe-500 font-medium">
                → {Math.ceil(shoes[field] / pairsPerShelf)} shelf{Math.ceil(shoes[field] / pairsPerShelf) > 1 ? 's' : ''} needed
              </p>
            )}
          </div>
        ))}
      </div>

      {totalPairs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-charcoal-500 text-white rounded-xl p-5"
        >
          <p className="font-serif text-lg mb-1">Your shoe estimate</p>
          <p className="text-cream-200 text-sm">
            {totalPairs} pairs total · approximately {shelvesNeeded} shelves at the example widths above. The preview reports actual capacity.
          </p>
          {(() => {
            const estWidth = Math.max(24, Math.round(totalPairs * 1.5));
            return (
              <p className="text-cream-300 text-xs mt-2">
                📐 Estimated shoe column width: {estWidth}&quot;
                {estWidth > 36 ? ' — consider a dedicated shoe wall for this collection' : ''}
              </p>
            );
          })()}
          {shoes.boots > 0 && (
            <p className="text-cream-300 text-xs mt-2">
              💡 Boot shelves at 25&quot; each will be placed at the bottom for easy access
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Preferences Step ───────────────────────────────────────────────────────
