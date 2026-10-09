import { describe, expect, it } from 'vitest';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { DEFAULT_CONFIG, EMPTY_WARDROBE } from '@/lib/design';
import { fittedColumnTypes } from '@/lib/layoutColumns';
import { readDesigns, serializeDesigns, validConfig } from '@/lib/storage';
import type { ClosetConfiguration, ClosetType, DrawerPosition } from '@/types/closet';

function config(depth = 14, height = 48): ClosetConfiguration {
  return { ...structuredClone(DEFAULT_CONFIG), dimensions: { width: 48, depth, height },
    wardrobe: { ...EMPTY_WARDROBE, tShirts: 20 }, shoes: { boots: 0, heels: 0, sneakers: 0, flats: 0 } };
}

describe('small cabinet physical fit', () => {
  it('round-trips small wall overrides without dropping the rest of the planning settings', () => {
    const c=config();
    c.planning={walls:{back:{depth:10,ceilingHeight:36,baseboard:1,floorOffset:2}},upperStorage:false};
    expect(validConfig(c)).toBe(true);
    const saved={id:'small-cabinet',name:'Small cabinet',savedAt:'2026-10-08T00:00:00Z',config:c};
    const [restored]=readDesigns(serializeDesigns([saved]));
    expect(restored.config.planning).toEqual(c.planning);
    const wall=new ClosetLayoutEngine({...c,...restored.config}).calculateLayout().walls[0];
    expect(wall.unitDepth).toBe(10);
    expect(wall.zones.every(z=>!z.rods?.length&&!z.drawers?.length)).toBe(true);
    c.planning.walls!.back!.depth=8.875;
    expect(validConfig(c)).toBe(false);
  });

  it('offers elements using usable depth and height after wall allowances', () => {
    const wall={height:72,unitDepth:24};
    expect(fittedColumnTypes(wall)).toContain('long-hang');
    expect(fittedColumnTypes(wall,{baseboard:5})).not.toContain('short-hang');
    expect(fittedColumnTypes(wall,{floorOffset:6})).not.toContain('long-hang');
    expect(fittedColumnTypes(wall,{floorOffset:6,baseboard:5})).toContain('drawers');
  });

  it('keeps unserved shoes available for a later wall with enough usable depth', () => {
    const c=config(18,96);
    c.closetType='walkin-u';c.roomDimensions={roomWidth:120,roomDepth:120};
    c.wardrobe={...EMPTY_WARDROBE};c.shoes.sneakers=10;
    // Use a 12-inch effective depth for back, then make a later wall deeper.
    c.planning={walls:{back:{depth:18,baseboard:6,priority:'shoes'},right:{depth:24}}};
    const fits=new ClosetLayoutEngine(c).calculateLayout();
    expect(fits.walls.find(w=>w.wallId==='back')!.zones.some(z=>z.type==='shoe-shelves')).toBe(true);
    c.dimensions.depth=10;
    c.planning={walls:{right:{depth:24,priority:'shoes'}}};
    const layout=new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.walls.find(w=>w.wallId==='back')!.zones.some(z=>z.type==='shoe-shelves')).toBe(false);
    expect(layout.walls.find(w=>w.wallId==='right')!.zones.some(z=>z.type==='shoe-shelves')).toBe(true);
    expect(layout.capacity!.find(r=>r.label==='sneakers')!.available).toBeGreaterThanOrEqual(10);
  });

  it('uses shallow folded storage without silently dropping drawers with the hanging column', () => {
    const layout = new ClosetLayoutEngine(config()).calculateLayout();
    expect(layout.totalStorage.drawerCount).toBeGreaterThan(0);
    expect(layout.totalStorage.hangingRods).toBe(0);
  });

  it.each(['bottom', 'middle', 'top'] as DrawerPosition[])('keeps %s drawers inside a short manually arranged cabinet', position => {
    const c = config(24, 30);
    c.zoneOverrides = { drawerPosition: position, columns: { back: [{ id: 'folded', type: 'short-hang', width: 48 }] } };
    const layout = new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.totalStorage.drawerCount).toBeGreaterThan(0);
    for (const z of layout.zones) {
      expect(z.y + z.height).toBeLessThanOrEqual(30);
      for (const d of z.drawers ?? []) expect(d.position + d.height).toBeLessThanOrEqual(30);
    }
  });

  it('does not let saved manual hanging columns bypass the depth constraint', () => {
    const c = config(14, 96);
    c.wardrobe = { ...EMPTY_WARDROBE, longDresses: 10, shirts: 10 };
    c.zoneOverrides = { columns: { back: [{ id: 'long', type: 'long-hang', width: 24 }, { id: 'short', type: 'short-hang', width: 24 }] } };
    const layout = new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.totalStorage.hangingRods).toBe(0);
    expect(layout.capacity!.filter(r => r.unit === 'inches of rod').every(r => r.available === 0)).toBe(true);
    expect(layout.inputWarnings!.some(w => /depth/.test(w))).toBe(true);
  });

  it('keeps shallow shoe shortfalls visible instead of drawing shelves outside the cabinet', () => {
    const c = config(10, 60);
    c.shoes.sneakers = 10;
    const layout = new ClosetLayoutEngine(c).calculateLayout();
    expect(layout.totalStorage.shoeCapacity).toBe(0);
    expect(layout.capacity!.find(r => r.label === 'sneakers')!.available).toBe(0);
    for (const z of layout.zones) for (const shelf of z.shelves ?? []) expect(shelf.depth).toBeLessThanOrEqual(10);
  });

  it('represents each fallback shelf as its own physical board', () => {
    const c = config(9, 60);
    const layout = new ClosetLayoutEngine(c).calculateLayout();
    const shelves = layout.zones.flatMap(z => z.shelves ?? []);
    expect(shelves.length).toBeGreaterThan(1);
    for (const z of layout.zones) for (const shelf of z.shelves ?? []) {
      expect(shelf.height + shelf.spacing + 1).toBeLessThanOrEqual(z.height + 0.001);
    }
  });

  it.each(['reach-in', 'wardrobe-wall', 'walkin-single', 'walkin-l', 'walkin-u', 'corridor', 'island'] as ClosetType[])('checks every %s wall builder across small dimensions', closetType => {
    for (const depth of [9, 10, 12, 14, 19.875, 20, 24]) for (const height of [30, 42, 60]) for (const drawerPosition of ['bottom', 'middle', 'top'] as const) {
      const c = config(depth, height);
      c.closetType = closetType;
      c.roomDimensions = { roomWidth: 180, roomDepth: 180 };
      c.wardrobe = { ...DEFAULT_CONFIG.wardrobe };
      c.shoes = { ...DEFAULT_CONFIG.shoes };
      c.zoneOverrides = { drawerPosition };
      for (const wall of new ClosetLayoutEngine(c).calculateLayout().walls) for (const z of wall.zones) {
        expect(wall.height).toBeLessThanOrEqual(height);
        expect(z.y + z.height, JSON.stringify({ closetType, depth, height, drawerPosition, zone: z.type })).toBeLessThanOrEqual(wall.height + 0.001);
        if (depth < 20) expect(z.rods ?? []).toHaveLength(0);
        if (depth < 12) expect(z.drawers ?? []).toHaveLength(0);
        for (const shelf of z.shelves ?? []) expect(shelf.depth).toBeLessThanOrEqual(depth);
      }
    }
  });
});
