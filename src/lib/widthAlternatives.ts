import type {ClosetConfiguration,ClosetLayout} from '@/types/closet';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {columnsFromWall,resizeColumn} from './layoutColumns';
import {alternativeIssues} from './roomGeometry';
import {shortfallScore,type DrawerAlternative} from './layoutAlternatives';

export interface WidthSearchResult {alternatives:DrawerAlternative[];examined:number;rejected:number;skipped:string[];stopped:'complete'|'time limit'|'evaluation limit'|'cancelled';}
/** Bounded local search, not a global optimizer. Move one adjacent column boundary
 * by 2, 4 or 8 inches. Edited walls and reserved spans are deliberately preserved. */
export async function searchWidthAlternatives(config:ClosetConfiguration,current:ClosetLayout,options:{signal?:AbortSignal;maxEvaluations?:number;budgetMs?:number}={}):Promise<WidthSearchResult>{
  const max=Number.isFinite(options.maxEvaluations)?Math.min(60,Math.max(0,Math.floor(options.maxEvaluations!))):24;
  const budget=Number.isFinite(options.budgetMs)?Math.min(1000,Math.max(0,options.budgetMs!)):250;
  const deadline=performance.now()+budget,result:WidthSearchResult={alternatives:[],examined:0,rejected:0,skipped:[],stopped:'complete'};
  const seen=new Set<string>([JSON.stringify(current.walls)]),recipes=new Set<string>();
  search:for(const wall of current.walls){
    if(wall.wallId==='island-unit'){result.skipped.push(`${wall.label}: island proportions are preserved.`);continue;}
    if(config.zoneOverrides?.columns?.[wall.wallId]?.length){result.skipped.push(`${wall.label}: manually edited columns are preserved. Reset that wall to explore automatic widths.`);continue;}
    const columns=columnsFromWall(wall);
    if(wall.reservations?.length||Math.abs(columns.reduce((n,c)=>n+c.width,0)-wall.width)>.001){result.skipped.push(`${wall.label}: reservations or unused spans need separate editing.`);continue;}
    if(columns.length<2){result.skipped.push(`${wall.label}: two columns are needed to redistribute width.`);continue;}
    for(let i=0;i<columns.length-1;i++)for(const delta of [2,-2,4,-4,8,-8]){
      if(options.signal?.aborted){result.stopped='cancelled';break search;}
      if(result.examined>=max){result.stopped='evaluation limit';break search;}
      if(performance.now()>=deadline){result.stopped='time limit';break search;}
      const edited=resizeColumn(columns,columns[i].id,columns[i].width+delta,wall.width),change=edited[i].width-columns[i].width;
      if(Math.abs(change)<.001)continue;
      // Exact measured widths identify recipes independently of ranking or run time.
      const id=JSON.stringify([wall.wallId,...edited.map(c=>[c.type,c.width])]);if(recipes.has(id))continue;recipes.add(id);
      const patch={zoneOverrides:{...config.zoneOverrides,columns:{...config.zoneOverrides?.columns,[wall.wallId]:edited}}};
      const layout=new ClosetLayoutEngine({...config,...patch}).calculateLayout();result.examined++;
      const issues=alternativeIssues(layout),geometry=JSON.stringify(layout.walls);
      if(issues.length)result.rejected++;
      else if(!seen.has(geometry)){
        seen.add(geometry);
        result.alternatives.push({id,title:`${wall.label}: column ${i+1} ${change>0?'+':''}${change.toFixed(2)} in`,description:`Column ${i+1}: ${columns[i].width.toFixed(2)} → ${edited[i].width.toFixed(2)} in; column ${i+2}: ${columns[i+1].width.toFixed(2)} → ${edited[i+1].width.toFixed(2)} in. Other automatic allocations can also change.`,patch,preference:config.userInfo.drawerPreference,equivalentPreferences:[],layout,score:shortfallScore(layout,config.userInfo.priorityItems),changes:(layout.capacity??[]).map(r=>({label:r.label,unit:r.unit,delta:r.available-(current.capacity?.find(c=>c.label===r.label)?.available??0)})).filter(r=>Math.abs(r.delta)>.01)});
      }
      // Yield between generations so input changes and Stop can abort the search.
      await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
  }
  if(options.signal?.aborted)result.stopped='cancelled';
  result.alternatives.sort((a,b)=>a.score-b.score||(a.id??'').localeCompare(b.id??''));
  result.alternatives=result.alternatives.slice(0,6);
  return result;
}
