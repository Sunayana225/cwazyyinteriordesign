import { describe, expect, it } from 'vitest';
import { copyDesign, designDetails, findDesigns } from '@/lib/designLibrary';
import { DEFAULT_CONFIG } from '@/lib/design';
import { readDesigns, serializeDesigns } from '@/lib/storage';
import { defaultInterior } from '@/lib/drawers';
import type { SavedDesign } from '@/types/closet';

const design = (id: string, name: string, day: number): SavedDesign => ({
  id, name, savedAt: `2026-09-${day}T00:00:00.000Z`, config: structuredClone(DEFAULT_CONFIG),
});

describe('Saved design library', () => {
  it('searches names and configuration terms across whitespace without changing the source', () => {
    const designs = [design('a', 'Bedroom 10', 21), design('b', 'Bedroom 2', 22)];
    designs[1].config.userInfo!.woodFinish = 'dark';
    expect(findDesigns(designs, ' BEDROOM   DARK ', 'newest').map(d => d.id)).toEqual(['b']);
    expect(findDesigns(designs, 'absent', 'newest')).toEqual([]);
    expect(findDesigns(designs, '', 'name').map(d => d.id)).toEqual(['b', 'a']);
    expect(designs.map(d => d.id)).toEqual(['a', 'b']);
  });
  it('sorts by actual timestamps in both directions', () => {
    const designs = [design('a', 'A', 21), design('b', 'B', 22)];
    expect(findDesigns(designs, '  ', 'newest').map(d => d.id)).toEqual(['b', 'a']);
    expect(findDesigns(designs, '', 'oldest').map(d => d.id)).toEqual(['a', 'b']);
  });
  it('creates independent copies, avoiding case-insensitive name collisions', () => {
    const original = design('a', 'Bedroom', 21);
    const copy = copyDesign(original, [original, design('b', 'Bedroom (COPY)', 22)], 'c', '2026-09-25T00:00:00Z');
    expect(copy.name).toBe('Bedroom (copy 2)');
    expect(copy.id).toBe('c');
    copy.config.wardrobe!.shirts++;
    expect(copy.config.wardrobe!.shirts).not.toBe(original.config.wardrobe!.shirts);
  });
  it('keeps long copy names within the existing rename limit', () => {
    const original = design('a', 'x'.repeat(120), 21);
    const first = copyDesign(original, [original], 'b', original.savedAt);
    const second = copyDesign(original, [original, first], 'c', original.savedAt);
    expect(first.name.length).toBe(120);
    expect(second.name.length).toBe(120);
    expect(second.name).not.toBe(first.name);
  });
  it('backs up a complete versioned configuration that the storage reader accepts', () => {
    const designs = [design('a', 'Bedroom <special>', 21)];
    designs[0].config.drawerInteriors = { 'back:0:0': defaultInterior({ width: 24, depth: 22, height: 9, position: 3, purpose: 'folded' }) };
    designs[0].config.drawerInteriors['back:0:0'].cells[0].label = 'Daily rings';
    expect(readDesigns(serializeDesigns(designs))).toEqual(designs);
    expect(JSON.parse(serializeDesigns(designs)).version).toBe(1);
    const copied = copyDesign(designs[0], designs, 'b', designs[0].savedAt);
    copied.config.drawerInteriors!['back:0:0'].cells[0].label = 'New plan';
    expect(designs[0].config.drawerInteriors['back:0:0'].cells[0].label).toBe('Daily rings');
  });
  it('describes configurations and handles absent optional details', () => {
    const original = design('a', 'Bedroom', 21);
    expect(designDetails(original)).toContain(original.config.userInfo!.woodFinish);
    expect(designDetails(original)).toContain('0 drawer organizers');
    expect(designDetails({ ...original, config: {} })).toBe('Closet · 0 drawer organizers');
  });
});
