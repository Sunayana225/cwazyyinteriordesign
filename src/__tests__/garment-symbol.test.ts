import {it,expect} from 'vitest';
import {garmentSymbol} from '@/renderer/GarmentSymbol';
it('uses curved side-on garment outlines and stable drafting strokes',()=>{
 for(const long of [false,true]){
 const svg=garmentSymbol(40,50,12,100,long,1);
 expect(svg).toContain('data-garment-symbol');expect(svg).toContain('non-scaling-stroke');
 expect(svg).not.toContain('NaN');expect(svg).toContain('stroke-linejoin');
 }
 expect(garmentSymbol(0,0,0,100,true,0)).toBe('');
 expect(garmentSymbol(NaN,0,10,100,true,0)).toBe('');
});

it('scales both axes uniformly instead of stretching clothes to fit a bay',()=>{
 const svg=garmentSymbol(40,50,44,500,true,0);
 expect(svg).toContain('scale(1)');
 const short=garmentSymbol(40,50,88,152,false,0);
 expect(short).toContain('scale(2)');
});

it('provides recognizable coat and dress blocks without introducing extra rods',()=>{
 expect(garmentSymbol(0,0,44,112,true,0)).toContain('trench-coat');
 expect(garmentSymbol(0,0,44,112,true,1)).toContain('pleated-dress');
 expect(garmentSymbol(0,0,44,76,false,0)).toContain('collared-shirt');
});
