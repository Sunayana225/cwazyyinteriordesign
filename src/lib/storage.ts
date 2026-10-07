import { validInventoryPlanning, canonicalInventoryPlanning, inventoryPlanningIssue } from './inventoryPlanning';
import { DEFAULT_CONFIG, FINISHES, STYLES, TYPES } from './design';
import type { ClosetConfiguration, SavedDesign } from '@/types/closet';
import { validInteriors, interiorIssue } from './drawers';
import { validPlanning, canonicalPlanning, planningIssues } from './planning';
import { validColumns, columnsIssue } from './layoutColumns';

export const SAVED_KEY = 'alveo-saved-designs';
export const DRAFT_KEY = 'alveo-draft';
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
export const BACKUP_MAX_RECORDS = 200;
// Explicit version-0 → version-1 migration. Unknown future versions fail closed.
export function migrateSavedData(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const envelope = parsed as { version?: number; designs?: unknown } | null;
  if (envelope?.version === 1 && Array.isArray(envelope.designs)) return envelope.designs;
  throw new Error('Saved designs use an unsupported format. Existing data has been left untouched.');
}
export function pickFields<T extends object>(value: T, keys: readonly string[]): T {
  return Object.fromEntries(keys.filter(key => Object.prototype.hasOwnProperty.call(value, key)).map(key => [key, (value as Record<string, unknown>)[key]])) as T;
}
export function canonicalConfig(c: ClosetConfiguration): ClosetConfiguration {
  const next = pickFields(c, ['closetType','dimensions','roomDimensions','userInfo','wardrobe','shoes','amenities','zoneOverrides','drawerInteriors','planning','inventoryPlanning']);
  next.dimensions = pickFields(c.dimensions, ['width','height','depth','cabinetHeight']);
  next.userInfo = pickFields(c.userInfo, ['userType','stylePreference','woodFinish','drawerPreference','priorityItems','hardwareFinish','accentColor']);
  next.wardrobe = pickFields(c.wardrobe, Object.keys(DEFAULT_CONFIG.wardrobe));
  next.shoes = pickFields(c.shoes, Object.keys(DEFAULT_CONFIG.shoes));
  if(c.roomDimensions) next.roomDimensions = pickFields(c.roomDimensions,['roomWidth','roomDepth']);
  if(c.zoneOverrides) next.zoneOverrides = pickFields(c.zoneOverrides,['drawerPosition','columns']);
  if(c.amenities) next.amenities = pickFields(c.amenities,['island','seating','vanity','mirrorWall','displayShelves','safe','shoeWall','lighting']);
  if(c.planning)next.planning=canonicalPlanning(c.planning);
  if(c.inventoryPlanning)next.inventoryPlanning=canonicalInventoryPlanning(c.inventoryPlanning);
  if(c.drawerInteriors) next.drawerInteriors = Object.fromEntries(Object.entries(c.drawerInteriors).map(([id, p]) => [id, {
    ...pickFields(p,['version','name','notes','material','liner','thickness','clearance','measured','identity','dividerThickness','itemMargin','minimumCellWidth','materialDensity','lockedDividers','dividerNames']),
    source: pickFields(p.source,['width','height','depth']),
    ...(p.dividerThickness?{dividerThickness:pickFields(p.dividerThickness,['horizontal','vertical'])}:{}),
    ...(p.lockedDividers?{lockedDividers:{x:[...p.lockedDividers.x],y:[...p.lockedDividers.y]}}:{}),
    ...(p.measured?{measured:pickFields(p.measured,['width','height','depth'])}:{}),
    cells:p.cells.map(cell=>({...pickFields(cell,['id','x','y','w','h','label','category','quantity','color','notes']),...(cell.item?{item:pickFields(cell.item,['width','depth','height','rotate'])}:{})}))
  }]));
  return structuredClone(next);
}
const record = (value: unknown): boolean => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validConfig(value: unknown): value is ClosetConfiguration {
  if (!record(value)) return false;
  const c = value as ClosetConfiguration;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const counts = (actual: object | undefined, expected: object) => record(actual) && Object.keys(expected).every(k => {
    const v = (actual as Record<string, unknown>)[k];
    return k === 'jewelry' ? typeof v === 'boolean' : finite(v) && Number.isInteger(v);
  });
  return (c.dimensions?.cabinetHeight === undefined || (finite(c.dimensions.cabinetHeight) && c.dimensions.cabinetHeight > 0)) && validInventoryPlanning(c.inventoryPlanning) && validPlanning(c.planning) && (c.closetType === undefined || TYPES.includes(c.closetType)) && record(c.dimensions) &&
    Object.keys(DEFAULT_CONFIG.dimensions).every(k => finite(c.dimensions[k as keyof typeof c.dimensions])) &&
    (c.roomDimensions === undefined || (record(c.roomDimensions) && finite(c.roomDimensions.roomWidth) && finite(c.roomDimensions.roomDepth))) &&
    counts(c.wardrobe, DEFAULT_CONFIG.wardrobe) && counts(c.shoes, DEFAULT_CONFIG.shoes) &&
    record(c.userInfo) && ['homeowner', 'renter', 'designer', 'browsing'].includes(c.userInfo.userType) &&
    STYLES.includes(c.userInfo.stylePreference) && FINISHES.includes(c.userInfo.woodFinish) &&
    ['many-small', 'few-large', 'mixed'].includes(c.userInfo.drawerPreference) &&
    Array.isArray(c.userInfo.priorityItems) && c.userInfo.priorityItems.every(p => ['hanging', 'shoes', 'folded', 'accessories'].includes(p)) &&
    (c.zoneOverrides === undefined || (record(c.zoneOverrides) && (c.zoneOverrides.drawerPosition === undefined || ['bottom', 'middle', 'top'].includes(c.zoneOverrides.drawerPosition)) && validColumns(c.zoneOverrides.columns))) &&
    (c.userInfo.accentColor === undefined || (typeof c.userInfo.accentColor === 'string' && (c.userInfo.accentColor === 'transparent' || /^#[0-9a-f]{6}$/i.test(c.userInfo.accentColor)))) &&
    (c.userInfo.hardwareFinish === undefined || ['chrome', 'brass', 'black', 'gold'].includes(c.userInfo.hardwareFinish)) &&
    (c.amenities === undefined || (record(c.amenities) && Object.values(c.amenities).every(v => typeof v === 'boolean'))) && validInteriors(c.drawerInteriors);
}
export function readDesigns(raw: string | null): SavedDesign[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  // Version 0 was a bare array. Read it and migrate on the next user edit.
  const entries = migrateSavedData(parsed) as SavedDesign[];
  entries.forEach((d,index)=>{
    const fail=(field:string)=>{throw new Error(`Saved data contains an invalid design at designs[${index}].${field}. Existing data has been left untouched.`);};
    if(!d||typeof d!=='object')fail('record');
    for(const field of ['id','name','savedAt'] as const)if(typeof d[field]!=='string')fail(field);
    if(!d.id.trim()||d.id.length>200)fail('id');
    if(!d.name.trim()||d.name.length>120)fail('name');
    if(!Number.isFinite(Date.parse(d.savedAt)))fail('savedAt');
    if(!validConfig(d.config))fail('config.'+invalidConfigurationField(d.config));
  });
  if (new Set(entries.map(d => d.id)).size !== entries.length) throw new Error('Saved designs contain duplicate IDs.');
  entries.forEach((d,index)=>{
    const fail=(field:string)=>{throw new Error(`Invalid saved design metadata at designs[${index}].${field}. Existing data has been left untouched.`);};
    if(d.modifiedAt!==undefined&&(typeof d.modifiedAt!=='string'||!Number.isFinite(Date.parse(d.modifiedAt))))fail('modifiedAt');
    if(d.tags!==undefined){
      if(!Array.isArray(d.tags)||d.tags.length>12)fail('tags');
      d.tags.forEach((tag,i)=>{if(typeof tag!=='string'||tag.length>40)fail(`tags[${i}]`);});
    }
  });
  entries.forEach((d,index)=>{
    if(d.folder!==undefined&&(typeof d.folder!=='string'||d.folder.length>80))throw new Error(`Invalid saved design metadata at designs[${index}].folder.`);
    if(d.pinnedOrder!==undefined&&(!Number.isSafeInteger(d.pinnedOrder)||d.pinnedOrder<0))throw new Error(`Invalid saved design metadata at designs[${index}].pinnedOrder.`);
    if(d.revisions!==undefined){
      const fail=(field:string):never=>{throw new Error(`Invalid saved design metadata at designs[${index}].revisions${field}. Existing data has been left untouched.`);};
      if(!Array.isArray(d.revisions)||d.revisions.length>10)fail('');const ids=new Set<string>();
      d.revisions.forEach((v,i)=>{if(!v||typeof v!=='object')fail(`[${i}]`);if(typeof v.id!=='string'||!v.id.trim()||v.id.length>100||ids.has(v.id))fail(`[${i}].id`);ids.add(v.id);if(v.note!==undefined&&(typeof v.note!=='string'||v.note.length>200))fail(`[${i}].note`);if(typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))fail(`[${i}].savedAt`);if(!validConfig(v.config))fail(`[${i}].config.${invalidConfigurationField(v.config)}`);});
    }
  });
  return entries.map(d=>({...pickFields(d,['id','name','savedAt','modifiedAt','tags','folder','pinnedOrder']),config:canonicalConfig(d.config as ClosetConfiguration),...(d.revisions?{revisions:d.revisions.map(({id,savedAt,note,config})=>({id,savedAt,...(note!==undefined?{note}:{}),config:canonicalConfig(config as ClosetConfiguration)}))}:{})}));
}
/** Diagnose rejected data only; acceptance continues to use the shared validators. */
export function invalidConfigurationField(value:unknown):string{
  if(!record(value))return 'record';
  const c=value as Record<string,any>,planning=planningIssues(c.planning);
  if(planning.length)return planning[0];
  if(!validInventoryPlanning(c.inventoryPlanning))return inventoryPlanningIssue(c.inventoryPlanning);
  const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  if(c.closetType!==undefined&&!TYPES.includes(c.closetType))return 'closetType';
  for(const [block,fields]of [['dimensions',['width','height','depth']],['roomDimensions',['roomWidth','roomDepth']]] as const){
    if(block==='roomDimensions'&&c[block]===undefined)continue;
    if(!record(c[block]))return block;
    for(const field of fields)if(!finite(c[block][field]))return `${block}.${field}`;
  }
  if(c.dimensions.cabinetHeight!==undefined&&(!finite(c.dimensions.cabinetHeight)||c.dimensions.cabinetHeight<=0))return 'dimensions.cabinetHeight';
  for(const [block,defaults]of [['wardrobe',DEFAULT_CONFIG.wardrobe],['shoes',DEFAULT_CONFIG.shoes]] as const){
    if(!record(c[block]))return block;
    for(const field of Object.keys(defaults)){const v=c[block][field];if(field==='jewelry'?typeof v!=='boolean':!finite(v)||!Number.isInteger(v))return `${block}.${field}`;}
  }
  if(!record(c.userInfo))return 'userInfo';
  for(const [field,values]of [['userType',['homeowner','renter','designer','browsing']],['stylePreference',STYLES],['woodFinish',FINISHES],['drawerPreference',['many-small','few-large','mixed']]] as const)if(!(values as readonly string[]).includes(c.userInfo[field]))return `userInfo.${field}`;
  if(!Array.isArray(c.userInfo.priorityItems))return 'userInfo.priorityItems';
  const priority=c.userInfo.priorityItems.findIndex((v:unknown)=>!['hanging','shoes','folded','accessories'].includes(v as string));if(priority>=0)return `userInfo.priorityItems[${priority}]`;
  if(c.zoneOverrides!==undefined&&!record(c.zoneOverrides))return 'zoneOverrides';
  if(c.zoneOverrides?.drawerPosition!==undefined&&!['bottom','middle','top'].includes(c.zoneOverrides.drawerPosition))return 'zoneOverrides.drawerPosition';
  {const issue=columnsIssue(c.zoneOverrides?.columns);if(issue)return issue;}
  if(c.userInfo.accentColor!==undefined&&(typeof c.userInfo.accentColor!=='string'||(c.userInfo.accentColor!=='transparent'&&!/^#[0-9a-f]{6}$/i.test(c.userInfo.accentColor))))return 'userInfo.accentColor';
  if(c.userInfo.hardwareFinish!==undefined&&!['chrome','brass','black','gold'].includes(c.userInfo.hardwareFinish))return 'userInfo.hardwareFinish';
  if(c.amenities!==undefined&&!record(c.amenities))return 'amenities';
  if(c.amenities)for(const [field,v]of Object.entries(c.amenities))if(typeof v!=='boolean')return `amenities.${field}`;
  if(c.drawerInteriors&&typeof c.drawerInteriors==='object')for(const [id,plan]of Object.entries(c.drawerInteriors))if(!validInteriors({[id]:plan}))return `drawerInteriors[${JSON.stringify(id)}].${interiorIssue(plan)}`;
  return 'drawerInteriors';
}
export function readBackup(raw: string): SavedDesign[] {
  if (new TextEncoder().encode(raw).byteLength > BACKUP_MAX_BYTES) throw new Error('Backup exceeds the 5 MB limit.');
  const entries = migrateSavedData(JSON.parse(raw));
  if (entries.length > BACKUP_MAX_RECORDS) throw new Error('Backup exceeds the 200-design limit.');
  const designs = readDesigns(raw);
  if (designs.some(d=>!d.id.length||d.id.length>200||!d.name.trim()||d.name.length>120)) throw new Error('Backup names or IDs exceed supported limits.');
  return designs;
}
export const serializeDesigns = (designs: SavedDesign[]) => JSON.stringify({ version: 1, designs });
export const designRevision=(d:SavedDesign)=>JSON.stringify({id:d.id,name:d.name,savedAt:d.savedAt,modifiedAt:d.modifiedAt,tags:d.tags,folder:d.folder,pinnedOrder:d.pinnedOrder,revisions:d.revisions,config:canonicalConfig(d.config as ClosetConfiguration)});
export function nextDesignName(designs: SavedDesign[]) {
  let n = 1;
  while (designs.some(d => d.name === `Design ${n}`)) n++;
  return `Design ${n}`;
}


