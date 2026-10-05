import { describe, expect, it } from 'vitest';
import { validPlanning } from '@/lib/planning';
import { DEFAULT_CONFIG } from '@/lib/design';
import { readBackup } from '@/lib/storage';

const windowEntry={id:'window-a',wall:'back',offset:0,width:24,sill:36,height:36};
const obstacle={id:'column-a',label:'Column',x:0,y:0,width:12,depth:12};

describe('room planning import boundaries',()=>{
  it('accepts absent blocks and valid independent room objects',()=>{
    expect(validPlanning(undefined)).toBe(true);
    expect(validPlanning({})).toBe(true);
    expect(validPlanning({windows:[windowEntry,{...windowEntry,id:'window-b'}],obstacles:[obstacle,{...obstacle,id:'column-b'}]})).toBe(true);
  });
  it('rejects malformed optional objects and collections without throwing',()=>{
    for(const key of ['garmentLengths','shoeHeights','walls','door','windows','obstacles']){
      for(const value of [null,false,0,''])expect(validPlanning({[key]:value}),`${key}: ${String(value)}`).toBe(false);
    }
    for(const key of ['garmentLengths','shoeHeights','walls','door'])expect(validPlanning({[key]:[]})).toBe(false);
    expect(validPlanning({walls:{back:[]}})).toBe(false);
    for(const key of ['windows','obstacles'])for(const value of [null,42,[],{}])expect(validPlanning({[key]:[value]})).toBe(false);
  });
  it('rejects duplicate and blank window or obstacle identities',()=>{
    for(const [key,entry] of [['windows',windowEntry],['obstacles',obstacle]] as const){
      expect(validPlanning({[key]:[entry,{...entry}]})).toBe(false);
      for(const id of ['', '  ', 'x'.repeat(81)])expect(validPlanning({[key]:[{...entry,id}]})).toBe(false);
    }
  });
  it('rejects island windows but accepts all supported room walls',()=>{
    expect(validPlanning({windows:[{...windowEntry,wall:'island-unit'}]})).toBe(false);
    for(const wall of ['back','left','right','corridor-a','corridor-b'])expect(validPlanning({windows:[{...windowEntry,wall}]})).toBe(true);
  });
  it('rejects invalid planning through the actual backup reader before canonicalization',()=>{
    for(const planning of [{windows:[windowEntry,windowEntry]},{obstacles:[obstacle,obstacle]},{door:null},{windows:[null]}]){
      const raw=JSON.stringify({version:1,designs:[{id:'design',name:'Study',savedAt:'2026-09-29T00:00:00Z',config:{...DEFAULT_CONFIG,planning}}]});
      expect(()=>readBackup(raw)).toThrow('invalid design');
    }
  });
});
