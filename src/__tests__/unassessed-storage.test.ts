import { it,expect } from 'vitest';
import { DEFAULT_CONFIG,EMPTY_WARDROBE } from '@/lib/design';
import { unassessedStorage,storageFit } from '@/lib/storageFit';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';
import { buildPrintDocument } from '@/engine/PDFExporter';
import { DEFAULT_PRINT } from '@/lib/printSettings';

it('discloses only requested categories that have no capacity model',()=>{
  expect(unassessedStorage({})).toBe('');expect(unassessedStorage({wardrobe:{...EMPTY_WARDROBE}})).toBe('');
  expect(unassessedStorage({wardrobe:{...EMPTY_WARDROBE,bags:2,belts:4}})).toBe('');
  const jewelry=unassessedStorage({wardrobe:{...EMPTY_WARDROBE,jewelry:true}});
  expect(jewelry).toContain('Jewelry');expect(jewelry).not.toContain('Ties');
  expect(unassessedStorage({wardrobe:{...EMPTY_WARDROBE,ties:5}})).toContain('Ties');
});

it('does not count unassessed accessories as either covered or a measured shortfall',()=>{
  const config={...structuredClone(DEFAULT_CONFIG),wardrobe:{...EMPTY_WARDROBE,ties:20,jewelry:true},shoes:{boots:0,heels:0,flats:0,sneakers:0}};
  const layout=new ClosetLayoutEngine(config).calculateLayout(),fit=storageFit(layout.capacity);
  expect(fit.total).toBe(0);expect(fit.covered).toBe(0);expect(fit.shortfalls).toEqual([]);
  const report=buildPrintDocument([{layout,config,settings:{...DEFAULT_PRINT,notes:false}}]);
  expect(report).toContain('Not assessed in the fit score: Ties, Jewelry.');
  expect(report).toContain('a drawn tray does not confirm capacity');
});
