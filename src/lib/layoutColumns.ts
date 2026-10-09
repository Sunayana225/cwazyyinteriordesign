import { MAX_DIMENSION } from './planning';
import { TOE_KICK, elementFits } from './design';
import type { ClosetWall, LayoutColumn, LayoutColumnType } from '@/types/closet';

/** Element vocabulary offered on the canvas, in palette order. */
export const COLUMN_TYPES: LayoutColumnType[] = ['long-hang','short-hang','drawers','shoe-shelves','top-shelves'];
/** Smallest buildable width per element, in inches. `long-hang`/`short-hang` follow the
 * engine's own COL_HANG_MIN; the rest are the narrowest the renderer still draws cleanly. */
export const COLUMN_MIN_WIDTH: Record<LayoutColumnType,number> = {
  'long-hang': 24, 'short-hang': 24, 'drawers': 15, 'shoe-shelves': 12, 'top-shelves': 12,
};
export const COLUMN_LABEL: Record<LayoutColumnType,string> = {
  'long-hang':'Long hang', 'short-hang':'Double hang', 'drawers':'Drawers', 'shoe-shelves':'Shoe shelves', 'top-shelves':'Shelves & accessories',
};
/** A wall wider than this many columns stops being legible on an elevation. */
export const MAX_COLUMNS = 12;
/** Drag-resize increment in inches, so a dragged edge lands on a buildable dimension. */
export const COLUMN_SNAP = .25;
const close=(a:number,b:number)=>Math.abs(a-b)<.001;

/** The element a generated column represents. Zones stack within one column (a drawer
 * bank under a hang rod), so the column takes the identity of its hanging or primary
 * zone and keeps the drawers implicit, matching how the engine builds it. */
function columnType(types:string[]):LayoutColumnType {
  if(types.includes('long-hang'))return 'long-hang';
  if(types.includes('double-hang'))return 'short-hang';
  if(types.includes('shoe-shelves'))return 'shoe-shelves';
  if(types.includes('drawers'))return 'drawers';
  return 'top-shelves';
}
/** Import a generated wall as an editable column list — the step that turns a produced
 * design into canvas elements. Zones sharing an x span collapse into one column. */
export function columnsFromWall(wall:ClosetWall):LayoutColumn[] {
  const spans:{x:number;width:number;types:string[]}[]=[];
  for(const zone of [...wall.zones].sort((a,b)=>a.x-b.x||a.y-b.y)){
    const span=spans.find(s=>close(s.x,zone.x)&&close(s.width,zone.width));
    if(span)span.types.push(zone.type);else spans.push({x:zone.x,width:zone.width,types:[zone.type]});
  }
  return spans.map((s,i)=>({id:`col-${i}`,type:columnType(s.types),width:s.width}));
}
/** Clamp every column to its minimum and scale the set to fill the wall exactly, so an
 * edited elevation has no gaps or overhang. Drops trailing columns that cannot fit. */
export function normalizeColumns(columns:LayoutColumn[],wallWidth:number):LayoutColumn[] {
  if(!Number.isFinite(wallWidth)||wallWidth<=0)return [];
  let live=columns.slice(0,MAX_COLUMNS);
  // Keep only as many columns as the wall can seat at their minimum widths.
  while(live.length>1&&live.reduce((n,c)=>n+COLUMN_MIN_WIDTH[c.type],0)>wallWidth)live=live.slice(0,-1);
  if(!live.length||COLUMN_MIN_WIDTH[live[0].type]>wallWidth)return [];
  const floor=live.map(c=>COLUMN_MIN_WIDTH[c.type]),slack=wallWidth-floor.reduce((a,b)=>a+b,0);
  if(slack<=0)return live.map((c,i)=>({...c,width:wallWidth*floor[i]/floor.reduce((a,b)=>a+b,0)}));
  // Distribute the wall's spare width in proportion to the requested widths, so a column
  // the user deliberately widened stays proportionally wider.
  const want=live.map((c,i)=>Math.max(0,c.width-floor[i])),total=want.reduce((a,b)=>a+b,0);
  const out=live.map((c,i)=>({...c,width:floor[i]+(total>0?slack*want[i]/total:slack/live.length)}));
  // Absorb float drift into the last column so the widths sum to the wall exactly.
  out[out.length-1].width=wallWidth-out.slice(0,-1).reduce((n,c)=>n+c.width,0);
  return out;
}
export function moveColumn(columns:LayoutColumn[],id:string,toIndex:number):LayoutColumn[] {
  const from=columns.findIndex(c=>c.id===id);if(from<0)return columns;
  const next=columns.slice(),[col]=next.splice(from,1);
  next.splice(Math.max(0,Math.min(next.length,toIndex)),0,col);return next;
}
/** Resize one column, taking the difference from its right-hand neighbour so the wall
 * stays full. The neighbour never shrinks below its own minimum. `snap` rounds the
 * dragged edge to a usable increment so a dragged column reads as a buildable
 * dimension rather than 23.7 in; pass 0 to keep the exact value. */
export function resizeColumn(columns:LayoutColumn[],id:string,width:number,wallWidth:number,snap=0):LayoutColumn[] {
  const i=columns.findIndex(c=>c.id===id);if(i<0||!Number.isFinite(width))return columns;
  const partner=i+1<columns.length?i+1:i-1;if(partner<0)return normalizeColumns(columns,wallWidth);
  const pair=columns[i].width+columns[partner].width;
  const low=COLUMN_MIN_WIDTH[columns[i].type],high=pair-COLUMN_MIN_WIDTH[columns[partner].type];
  if(high<low)return columns;
  // Snap first, then clamp, so snapping can never push a column under its minimum.
  const wanted=snap>0?Math.round(width/snap)*snap:width;
  const w=Math.max(low,Math.min(high,wanted));
  return columns.map((c,n)=>n===i?{...c,width:w}:n===partner?{...c,width:pair-w}:c);
}
/** Change what a column is, keeping its place and width. Widening to meet a larger
 * minimum is handled by `normalizeColumns`. */
export function retypeColumn(columns:LayoutColumn[],id:string,type:LayoutColumnType,wallWidth:number):LayoutColumn[] {
  if(!COLUMN_TYPES.includes(type))return columns;
  return normalizeColumns(columns.map(c=>c.id===id?{...c,type,width:Math.max(c.width,COLUMN_MIN_WIDTH[type])}:c),wallWidth);
}
export function addColumn(columns:LayoutColumn[],type:LayoutColumnType,atIndex:number,wallWidth:number):LayoutColumn[] {
  if(columns.length>=MAX_COLUMNS||!COLUMN_TYPES.includes(type))return columns;
  // Refuse rather than silently squeeze the wall below what the new element needs.
  if(columns.reduce((n,c)=>n+COLUMN_MIN_WIDTH[c.type],0)+COLUMN_MIN_WIDTH[type]>wallWidth)return columns;
  let n=0;const ids=new Set(columns.map(c=>c.id));while(ids.has(`col-new-${n}`))n++;
  const next=columns.slice();
  next.splice(Math.max(0,Math.min(next.length,atIndex)),0,{id:`col-new-${n}`,type,width:COLUMN_MIN_WIDTH[type]});
  return normalizeColumns(next,wallWidth);
}
export function removeColumn(columns:LayoutColumn[],id:string,wallWidth:number):LayoutColumn[] {
  if(columns.length<=1)return columns;
  return normalizeColumns(columns.filter(c=>c.id!==id),wallWidth);
}
/** Re-fit stored columns onto a wall whose width changed under them, the way
 * `resolveOrganizers` re-matches drawer organizers after the layout regenerates.
 * Returns null when nothing is stored for the wall, so the engine keeps its own layout. */
export function resolveColumns(stored:LayoutColumn[]|undefined,wall:{width:number}):LayoutColumn[]|null {
  if(!stored?.length)return null;
  const out=normalizeColumns(stored,wall.width);
  return out;
}
/** Element types this wall can physically take, using the same `ELEMENT_FIT` gate the
 * engine applies, so the canvas never offers a column the engine would drop. */
export function fittedColumnTypes(wall:{height:number;unitDepth:number},allowances:{floorOffset?:number;baseboard?:number}={}):LayoutColumnType[] {
  const clear=Math.max(0,wall.height-TOE_KICK-(allowances.floorOffset??0));
  const depth=Math.max(0,wall.unitDepth-(allowances.baseboard??0));
  return COLUMN_TYPES.filter(type=>elementFits(type,clear,depth));
}
/** Storage types the generated design provided that an edited arrangement no longer
 * has. Lets the editor say so before the user commits, rather than leaving the loss
 * to surface later in the capacity report. */
export function droppedTypes(generated:LayoutColumn[],edited:LayoutColumn[]):LayoutColumnType[] {
  const kept=new Set(edited.map(c=>c.type));
  return [...new Set(generated.map(c=>c.type))].filter(t=>!kept.has(t));
}
/** Field path of the first problem, for import error messages. Mirrors the style of
 * `interiorIssue` in `src/lib/drawers.ts`. */
export function columnsIssue(value:unknown):string|null {
  if(value===undefined)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))return 'zoneOverrides.columns';
  const walls=['back','left','right','corridor-a','corridor-b','island-unit'];
  for(const [wall,list] of Object.entries(value as Record<string,unknown>)){
    const path=`zoneOverrides.columns.${wall}`;
    if(!walls.includes(wall))return path;
    if(!Array.isArray(list)||!list.length||list.length>MAX_COLUMNS)return path;
    const ids=new Set<string>();
    for(let i=0;i<list.length;i++){
      const c=list[i] as Record<string,unknown>,at=`${path}[${i}]`;
      if(!c||typeof c!=='object'||Array.isArray(c))return at;
      if(typeof c.id!=='string'||!c.id||c.id.length>80||ids.has(c.id))return at+'.id';
      ids.add(c.id);
      if(typeof c.type!=='string'||!COLUMN_TYPES.includes(c.type as LayoutColumnType))return at+'.type';
      if(typeof c.width!=='number'||!Number.isFinite(c.width)||c.width<1||c.width>MAX_DIMENSION)return at+'.width';
    }
  }
  return null;
}
export const validColumns=(value:unknown)=>columnsIssue(value)===null;
