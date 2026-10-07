import type {UserPreferences} from '@/types/closet';
export const CABINET_STYLES = {
 minimal: {hardware:'chrome',description:'Flat fronts with a recessed edge grip'},
 modern: {hardware:'chrome',description:'Slab fronts with long linear pulls'},
 glam: {hardware:'gold',description:'Double bordered fronts with paired square pulls'},
 rustic: {hardware:'black',description:'Wide framed fronts with a compact central pull'},
 luxury: {hardware:'brass',description:'Fluted fronts with slender linear pulls'},
} as const;
export interface FaceDetail {x:number;y:number;w:number;h:number;metal:boolean;}
/** Normalized front-face details shared by elevation and spatial drawings. */
export function faceDetails(style:UserPreferences['stylePreference'],width=24,height=9):FaceDetail[]{
 const rect=(x:number,y:number,w:number,h:number,metal=false)=>({x,y,w,h,metal});
 const frame=(inset:number,t:number)=>[rect(inset,inset,1-2*inset,t),rect(inset,1-inset-t,1-2*inset,t),rect(inset,inset,t,1-2*inset),rect(1-inset-t,inset,t,1-2*inset)];
 switch(style){
 case 'minimal':return [rect(.12,.88,.76,.035)];
 case 'modern':{const w=Math.min(.5,6/width),h=Math.min(.07,.3/height);return [rect((1-w)/2,(1-h)/2,w,h,true)];}
 case 'glam':return [...frame(.08,.015),...frame(.13,.015),rect(.3,.43,.045,.14,true),rect(.655,.43,.045,.14,true)];
 case 'rustic':return [...frame(.075,.055),rect(.4,.46,.2,.08,true)];
 case 'luxury':{const count=Math.min(80,Math.max(4,Math.floor(width/.75))),gap=.88/count,w=Math.min(.4,5/width),h=Math.min(.06,.22/height);return [...Array.from({length:count},(_,i)=>rect(.06+i*gap,.06,Math.min(.0025,.04/width),.88)),rect((1-w)/2,(1-h)/2,w,h,true)];}
 }
}
