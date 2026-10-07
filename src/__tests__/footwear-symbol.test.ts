import {it,expect} from 'vitest';
import {footwearSymbol} from '@/renderer/FootwearSymbol';
import {faceDetails} from '@/lib/cabinetStyle';
it('draws distinct footwear outlines anchored to a shelf baseline',()=>{
 const symbols=['flats','heels','sneakers','boots'].map(kind=>footwearSymbol(kind,10,100,40,20));
 expect(new Set(symbols).size).toBe(4);
 for(const svg of symbols){expect(svg).toContain('translate(10 80)');expect(svg).not.toContain('<ellipse');expect(svg).toContain('non-scaling-stroke');}
 expect(footwearSymbol('flats',0,0,0,20)).toBe('');
});
it('keeps luxury fluting fine and hardware physically sized on wide fronts',()=>{
 const details=faceDetails('luxury',60,9),pull=details.find(d=>d.metal)!;
 expect(pull.w*60).toBeCloseTo(5);expect(pull.h*9).toBeCloseTo(.22);
 expect(details.filter(d=>!d.metal).every(d=>d.w*60<=.04)).toBe(true);
});
