import { expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/design';
import { invalidConfigurationField, readBackup, readDesigns, validConfig } from '@/lib/storage';

it.each(['roomDimensions','zoneOverrides','amenities'])('rejects malformed optional %s without silently dropping it',field=>{
  for(const value of [null,false,0,'',[],[true]]){
    const c={...structuredClone(DEFAULT_CONFIG),[field]:value};
    expect(validConfig(c),`${field}=${JSON.stringify(value)}`).toBe(false);
    expect(invalidConfigurationField(c)).toBe(field);
    expect(()=>readBackup(JSON.stringify({version:1,designs:[{id:'a',name:'A',savedAt:'2026-09-29',config:c}]}))).toThrow(`config.${field}`);
  }
});
it('rejects invalid supplied closet types while preserving omitted legacy types',()=>{
  for(const closetType of [null,false,0,'',[],{}]){
    const c={...DEFAULT_CONFIG,closetType};expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('closetType');
  }
  expect(validConfig({...DEFAULT_CONFIG,closetType:undefined})).toBe(true);
});
it('validates supplied drawer-position and appearance enums by presence',()=>{
  for(const value of [null,false,0,'',[],{}]){
    const c={...DEFAULT_CONFIG,zoneOverrides:{drawerPosition:value}};expect(validConfig(c)).toBe(false);expect(invalidConfigurationField(c)).toBe('zoneOverrides.drawerPosition');
    for(const field of ['accentColor','hardwareFinish']){const next={...DEFAULT_CONFIG,userInfo:{...DEFAULT_CONFIG.userInfo,[field]:value}};expect(validConfig(next)).toBe(false);expect(invalidConfigurationField(next)).toBe(`userInfo.${field}`);}
  }
  expect(validConfig({...DEFAULT_CONFIG,zoneOverrides:{},amenities:{vanity:false},roomDimensions:{roomWidth:120,roomDepth:96},userInfo:{...DEFAULT_CONFIG.userInfo,accentColor:'transparent',hardwareFinish:'chrome'}})).toBe(true);
});
it('identifies the record and malformed metadata field without mutating input',()=>{
  const d={id:'a',name:'A',savedAt:'2026-09-29',config:DEFAULT_CONFIG};
  for(const [patch,path] of [[{modifiedAt:'invalid'},'modifiedAt'],[{tags:'bad'},'tags'],[{tags:['valid',42]},'tags[1]']] as const){
    const raw=JSON.stringify({version:1,designs:[d,{...d,id:'b',...patch}]});expect(()=>readDesigns(raw)).toThrow(`designs[1].${path}`);
  }
});
it('round trips legacy arrays through stricter validation',()=>{
  const d={id:'a',name:'A',savedAt:'2026-09-29',config:structuredClone(DEFAULT_CONFIG)};expect(readDesigns(JSON.stringify([d]))[0].config).toEqual(d.config);
});
