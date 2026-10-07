import { expect, it } from 'vitest';
import { remainingInventory } from '@/lib/inventoryBudget';
import { DEFAULT_CONFIG, EMPTY_WARDROBE, TYPES } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import type { ClosetZone } from '@/types/closet';

it('spends actual capacity and keeps unmet demand and the input intact', () => {
  const inventory = { wardrobe: { ...EMPTY_WARDROBE, shirts: 10, suits: 2, tShirts: 20, bags: 5, jewelry: true, ties: 4 }, shoes: { boots: 10, heels: 0, sneakers: 0, flats: 0 } };
  const original = structuredClone(inventory);
  const zones: ClosetZone[] = [{ type: 'double-hang', x: 0, y: 3, width: 24, height: 81,
    rods: [{ height: 70, length: 9, depth: 22, purpose: 'upper rod' }],
    shelves: [{ height: 2, spacing: 25, count: 3, depth: 20, purpose: 'boots' }, { height: 30, spacing: 14, count: 2, depth: 16, purpose: 'bags' }],
    drawers: [{ position: 5, height: 9, width: 20, depth: 18, purpose: 'folded' }, { position: 15, height: 3, width: 20, depth: 18, purpose: 'jewelry' }],
  }];
  const remaining = remainingInventory(inventory, zones);
  expect(remaining.shoes.boots).toBe(7);
  expect(remaining.wardrobe).toMatchObject({ bags: 3, tShirts: 10, jewelry: false, ties: 4 });
  expect(remaining.wardrobe.shirts + remaining.wardrobe.suits * 2).toBe(9);
  for (const value of Object.values(remaining.wardrobe)) if (typeof value === 'number') expect(Number.isInteger(value) && value >= 0).toBe(true);
  expect(inventory).toEqual(original);
});

it('does not split a suit between two insufficient allocations', () => {
  const inventory = { wardrobe: { ...EMPTY_WARDROBE, suits: 1 }, shoes: { boots: 0, heels: 0, sneakers: 0, flats: 0 } };
  const zone: ClosetZone = { type: 'double-hang', x: 0, y: 3, width: 24, height: 81, rods: [{ height: 70, length: 1.8, depth: 22, purpose: 'upper rod' }] };
  expect(remainingInventory(inventory, [zone]).wardrobe.suits).toBe(1);
  zone.rods![0].length = 3.6;
  expect(remainingInventory(inventory, [zone]).wardrobe.suits).toBe(0);
});

it('does not repeat the full shoe and bag collection across window-separated spans', () => {
  const c = structuredClone(DEFAULT_CONFIG);
  c.dimensions.width = 240;
  c.wardrobe = { ...EMPTY_WARDROBE, bags: 2 };
  c.shoes = { boots: 0, heels: 0, sneakers: 4, flats: 0 };
  c.planning = { windows: [{ id: 'w', wall: 'back', offset: 108, width: 24, sill: 24, height: 36 }] };
  const layout = new ClosetLayoutEngine(c).calculateLayout();
  expect(layout.zones.filter(z => z.type === 'shoe-shelves')).toHaveLength(1);
  expect(layout.zones.filter(z => z.x >= 132).flatMap(z => z.shelves ?? []).every(s => !['bags', 'sneakers'].includes(s.purpose ?? ''))).toBe(true);
  expect(layout.zones.some(z => z.x >= 132 && z.contentLabel === 'Spare adjustable storage')).toBe(true);
  expect(layout.capacity?.find(r => r.label === 'sneakers')?.required).toBe(4);
  expect(layout.capacity?.find(r => r.label === 'Bags')?.required).toBe(2);
});

it('carries shoe shortfall into the next span rather than dropping it', () => {
  const c = structuredClone(DEFAULT_CONFIG);
  c.dimensions.width = 108;
  c.wardrobe = { ...EMPTY_WARDROBE };
  c.shoes = { boots: 40, heels: 0, sneakers: 0, flats: 0 };
  c.planning = { windows: [{ id: 'w', wall: 'back', offset: 48, width: 12, sill: 24, height: 36 }] };
  const layout = new ClosetLayoutEngine(c).calculateLayout();
  expect(layout.zones.filter(z => z.type === 'shoe-shelves')).toHaveLength(2);
  expect(layout.capacity?.find(r => r.label === 'boots')).toMatchObject({ required: 40, available: 36 });
});

it('honors a later wall priority before using spare spans on the back wall', () => {
  const c = structuredClone(DEFAULT_CONFIG); c.closetType = 'walkin-u';
  c.roomDimensions = { roomWidth: 180, roomDepth: 144 };
  c.planning = { walls: { left: { priority: 'shoes' }, right: { priority: 'shoes' } } };
  const layout = new ClosetLayoutEngine(c).calculateLayout();
  expect(layout.walls.map(w => w.wallId)).toEqual(['back', 'left', 'right']);
  expect(layout.walls[1].zones.some(z => z.type === 'shoe-shelves')).toBe(true);
  expect(layout.walls[2].zones.some(z => z.type === 'shoe-shelves')).toBe(false);
});

it('keeps explicitly requested duplicate columns and accounts for them before automatic walls', () => {
  const c = structuredClone(DEFAULT_CONFIG); c.closetType = 'walkin-u';
  c.roomDimensions = { roomWidth: 144, roomDepth: 144 };
  c.zoneOverrides = { columns: { left: [{ id: 'a', type: 'shoe-shelves', width: 120 }], right: [{ id: 'b', type: 'shoe-shelves', width: 120 }] } };
  const layout = new ClosetLayoutEngine(c).calculateLayout();
  expect(layout.walls[1].zones.some(z => z.type === 'shoe-shelves')).toBe(true);
  expect(layout.walls[2].zones.some(z => z.type === 'shoe-shelves')).toBe(true);
});

it('resets the shared budget on every calculation across all closet shapes', () => {
  for (const type of TYPES) {
    const c = structuredClone(DEFAULT_CONFIG); c.closetType = type;
    c.roomDimensions = { roomWidth: 240, roomDepth: 240 };
    const engine = new ClosetLayoutEngine(c), first = engine.calculateLayout();
    expect(engine.calculateLayout()).toEqual(first);
    expect(c.wardrobe).toEqual(DEFAULT_CONFIG.wardrobe);
    expect(first.capacity?.find(r => r.label === 'Bags')?.required).toBe(DEFAULT_CONFIG.wardrobe.bags);
    if (type === 'island') expect(first.walls.flatMap(w => w.zones).flatMap(z => z.drawers ?? []).filter(d => d.purpose === 'jewelry')).toHaveLength(1);
  }
});
