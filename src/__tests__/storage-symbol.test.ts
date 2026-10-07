import {it,expect} from 'vitest';
import {storageSymbol} from '@/renderer/StorageSymbol';
it('fits shelf accessories with uniform scale and rejects invalid bounds',()=>{
 expect(storageSymbol('bags',0,100,64,52)).toContain('translate(0 48) scale(1)');
 expect(storageSymbol('bags',0,100,64,26)).toContain('scale(0.5)');
 expect(storageSymbol('belts',0,100,64,52)).toContain('accessory-box');
 expect(storageSymbol('bags',0,100,64,-1)).toBe('');
});
