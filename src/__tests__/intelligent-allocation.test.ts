import {expect,it} from 'vitest';
import {hangingWidths} from '@/lib/hangingAllocation';
import {withUpperStorage} from '@/lib/upperStorage';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {DEFAULT_CONFIG,EMPTY_WARDROBE} from '@/lib/design';
import {canonicalConfig,validConfig} from '@/lib/storage';
import {drawerTargets} from '@/lib/drawers';
import {spatialParts} from '@/renderer/SpatialRenderer';
import {storageFit} from '@/lib/storageFit';
import {dimensionColumns,rightHeightChain} from '@/lib/elevationDimensions';

it('balances fulfilled demand using actual rod count and retains column minima',()=>{
 const [long,short]=hangingWidths(120,80,160,2);
 expect(long).toBe(60);expect(short).toBe(60);
 const single=hangingWidths(120,80,160,1);
 expect(single[1]).toBeGreaterThan(short);
 expect((single[0]-4)/80).toBeCloseTo((single[1]-4)/160);
 expect(hangingWidths(120,1,1000,2)).toEqual([24,96]);
 for(const width of [36,48,83.125,120,600,1200]){
  const parts=hangingWidths(width,500,17,2);
  expect(parts.reduce((a,b)=>a+b,0)).toBeCloseTo(width);
  expect(Math.min(...parts)).toBeGreaterThanOrEqual(Math.min(24,width/2));
 }
});
it('changes actual hanging allocations when the wardrobe mix changes',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=144;
 c.wardrobe={...EMPTY_WARDROBE,longDresses:30,shirts:10};
 c.shoes={boots:0,heels:0,sneakers:0,flats:0};
 const dresses=new ClosetLayoutEngine(c).calculateLayout();
 c.wardrobe={...EMPTY_WARDROBE,longDresses:3,shirts:100};
 const shirts=new ClosetLayoutEngine(c).calculateLayout();
 expect(dresses.zones.find(z=>z.type==='long-hang')!.width).toBeGreaterThan(shirts.zones.find(z=>z.type==='long-hang')!.width);
});
it('allows more short-hang width when drawers leave room for only one rod',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=144;
 c.wardrobe={...EMPTY_WARDROBE,longDresses:30,shirts:50};c.shoes={boots:0,heels:0,sneakers:0,flats:0};
 const double=new ClosetLayoutEngine(c).calculateLayout().zones.find(z=>z.type==='double-hang')!;
 c.wardrobe.tShirts=40;
 const single=new ClosetLayoutEngine(c).calculateLayout().zones.find(z=>z.type==='double-hang')!;
 expect(double.rods).toHaveLength(2);expect(single.rods).toHaveLength(1);
 expect(single.width).toBeGreaterThan(double.width);
});
it('fills only real upper space and keeps clear openings, floors, and rods intact',()=>{
 for(const height of [84,96,144,300,600])for(const opening of [8,14,24,36]){
  const c=structuredClone(DEFAULT_CONFIG);c.dimensions.height=height;
  c.planning={upperStorage:false,accessoryShelfOpening:opening,walls:{back:{floorOffset:4}}};
  const before=new ClosetLayoutEngine(c).calculateLayout();c.planning.upperStorage=true;
  const after=new ClosetLayoutEngine(c).calculateLayout();
  expect(after.totalStorage.hangingRods).toBe(before.totalStorage.hangingRods);
  expect(after.totalStorage.shoeCapacity).toBe(before.totalStorage.shoeCapacity);
  expect(drawerTargets(after).map(t=>t.id)).toEqual(drawerTargets(before).map(t=>t.id));
  for(const z of after.zones.filter(z=>z.contentLabel==='Upper storage for seasonal items')){
   expect(z.y+z.height).toBeLessThanOrEqual(height+.001);
   for(const s of z.shelves!){expect(s.spacing).toBeGreaterThanOrEqual(opening-.001);expect(s.height+s.spacing+1).toBeLessThanOrEqual(z.height+.001);}
   for(const other of after.zones.filter(other=>other!==z)){
    const intersectsX=z.x<other.x+other.width-.001&&z.x+z.width>other.x+.001;
    const intersectsY=z.y<other.y+other.height-.001&&z.y+z.height>other.y+.001;
    expect(intersectsX&&intersectsY).toBe(false);
   }
  }
  expect(spatialParts(after).filter(p=>p.kind==='shelf').length).toBe(after.zones.reduce((n,z)=>n+(z.shelves?.length??0),0));
 }
});
it('does not create a shelf in a space below the minimum opening',()=>{
 const zones=[{type:'long-hang' as const,x:0,y:3,width:24,height:77,rods:[{height:70,depth:22,length:20,purpose:'long hang'}]}];
 expect(withUpperStorage(zones,24,14)).toEqual(zones);
});
it('preserves drawer identities on both sides of a window when upper storage changes',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.dimensions.width=240;c.wardrobe.tShirts=200;
 c.planning={upperStorage:false,windows:[{id:'window',wall:'back',offset:108,width:24,sill:24,height:36}]};
 const before=new ClosetLayoutEngine(c).calculateLayout();c.planning.upperStorage=true;
 const after=new ClosetLayoutEngine(c).calculateLayout();
 expect(drawerTargets(before).length).toBeGreaterThan(5);
 expect(drawerTargets(after)).toEqual(drawerTargets(before));
 expect(after.zones.filter(z=>z.contentLabel==='Upper storage for seasonal items').length).toBeGreaterThan(0);
});
it('persists the upper storage preference and rejects malformed values',()=>{
 const c={...structuredClone(DEFAULT_CONFIG),planning:{upperStorage:false}};
 expect(validConfig(c)).toBe(true);expect(canonicalConfig(c).planning?.upperStorage).toBe(false);
 expect(validConfig({...c,planning:{upperStorage:'false'}})).toBe(false);
});
it('reusing an engine returns stable warnings without changing earlier results',()=>{
 const c=structuredClone(DEFAULT_CONFIG);c.planning={windows:[{id:'w',wall:'back',offset:0,width:24,sill:24,height:36}]};
 const engine=new ClosetLayoutEngine(c),first=engine.calculateLayout(),snapshot=JSON.stringify(first);
 expect(engine.calculateLayout()).toEqual(first);expect(JSON.stringify(first)).toBe(snapshot);
});
it('does not describe an overloaded or empty closet as fully fitted',()=>{
 expect(storageFit([])).toMatchObject({total:0,covered:0,percent:0});
 const rows=[{label:'Hanging',required:100,available:10,unit:'inches'},{label:'Bags',required:2,available:2,unit:'bags'},{label:'Boots',required:0,available:4,unit:'pairs'}];
 expect(storageFit(rows)).toMatchObject({total:2,covered:1,percent:50});
 expect(storageFit(rows).shortfalls.map(row=>row.label)).toEqual(['Hanging']);
});
it('dimensions each column once and keeps the right-side chain free of unrelated spans',()=>{
 const layout=new ClosetLayoutEngine(structuredClone(DEFAULT_CONFIG)).calculateLayout();
 expect(dimensionColumns(layout.zones)).toEqual([{x:0,width:24},{x:24,width:24},{x:48,width:24},{x:72,width:24}]);
 expect(rightHeightChain(layout.zones,96)).toEqual([{bottom:3,top:96}]);
 const onlyShoes=layout.zones.filter(z=>z.x===48);
 const chain=rightHeightChain(onlyShoes,96);
 expect(chain).toHaveLength(2);expect(chain[0].top).toBe(chain[1].bottom);
 expect(rightHeightChain([],96)).toEqual([]);
});
