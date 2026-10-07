 'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ClosetLayoutEngine} from '@/engine/ClosetLayoutEngine';
import {ClosetSVGRenderer} from '@/renderer/ClosetSVGRenderer';
import {renderSpatial} from '@/renderer/SpatialRenderer';
import {getPreset} from '@/lib/presets';
import {formatInches,isWalkIn,WOOD_OPTIONS} from '@/lib/design';
import {CABINET_STYLES} from '@/lib/cabinetStyle';
import {ArrowRight} from 'lucide-react';
type StyleTag = 'All' | 'Minimal' | 'Glam' | 'Small Space' | 'Luxury' | 'Modern' | 'Rustic';

interface GalleryItem {
  id: number;
  title: string;
  style: StyleTag;
  sqft: string;
  description: string;
  accent: string;
  bg: string;
  svgPattern: 'minimal' | 'glam' | 'compact' | 'luxury' | 'modern' | 'rustic';
}

const items: GalleryItem[] = [
  {
    id: 1,
    title: 'The Clean Slate',
    style: 'Minimal',
    sqft: '8 × 6 ft',
    description: 'Light wood finish with hanging zones, drawers and open shelves on one fitted wall.',
    accent: 'text-charcoal-500',
    bg: 'bg-cream-50',
    svgPattern: 'minimal',
  },
  {
    id: 2,
    title: 'The Glam Suite',
    style: 'Glam',
    sqft: '12 × 10 ft',
    description: 'U-shaped storage with a jewelry drawer and dedicated shoe shelves.',
    accent: 'text-taupe-500',
    bg: 'bg-taupe-50',
    svgPattern: 'glam',
  },
  {
    id: 3,
    title: 'Urban Edit',
    style: 'Small Space',
    sqft: '5 × 2 ft',
    description: 'Compact reach-in with hanging, drawers and shoe shelving fitted to a five-foot wall.',
    accent: 'text-charcoal-400',
    bg: 'bg-cream-100',
    svgPattern: 'compact',
  },
  {
    id: 4,
    title: 'The Grand Reserve',
    style: 'Luxury',
    sqft: '16 × 12 ft',
    description: 'Dark finish, U-shaped storage and a central drawer island where aisle clearance permits.',
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
    svgPattern: 'luxury',
  },
  {
    id: 5,
    title: 'Studio Line',
    style: 'Modern',
    sqft: '10 × 8 ft',
    description: 'Light finish with hanging space, drawers and open shelving on two adjacent walls.',
    accent: 'text-slate-500',
    bg: 'bg-slate-50',
    svgPattern: 'modern',
  },
  {
    id: 6,
    title: 'The Farmhouse',
    style: 'Rustic',
    sqft: '9 × 7 ft',
    description: 'Warm wood finish with open shelving, hanging zones and drawer storage.',
    accent: 'text-orange-800',
    bg: 'bg-orange-50',
    svgPattern: 'rustic',
  },
];


const tags:StyleTag[]=['All','Minimal','Glam','Small Space','Luxury','Modern','Rustic'];
const layoutNames:Record<string,string>={'reach-in':'Reach-in','walkin-single':'Single-wall walk-in','walkin-u':'U-shaped walk-in',island:'Island dressing room','walkin-l':'L-shaped walk-in'};
export default function GalleryPage(){
 const [activeTag,setActiveTag]=useState<StyleTag>('All');
 const [view,setView]=useState<'spatial'|'elevation'>('spatial');
 const designs=useMemo(()=>items.map(item=>{
  const config=getPreset(String(item.id))!;
  const layout=new ClosetLayoutEngine(config).calculateLayout();
  const width=isWalkIn(config.closetType)?config.roomDimensions!.roomWidth:config.dimensions.width;
  const depth=isWalkIn(config.closetType)?config.roomDimensions!.roomDepth:config.dimensions.depth;
  return {...item,config,layout,width,depth,
   spatial:renderSpatial(layout,{style:config.userInfo.stylePreference,woodFinish:config.userInfo.woodFinish,labels:false,angle:-30,elevation:30}),
   elevation:new ClosetSVGRenderer(layout,{idPrefix:`gallery-${item.id}`,showDimensions:true,showLabels:false,style:config.userInfo.stylePreference,woodFinish:config.userInfo.woodFinish}).renderElevation()};
 }),[]);
 const filtered=designs.filter(item=>activeTag==='All'||item.style===activeTag);
 return <main id="main-content" className="gallery-studio">
  <section className="gallery-intro">
   <div><p className="gallery-eyebrow">ALVÉO / THE DESIGN COLLECTION</p><h1>A place for<br/><em>everything you are.</em></h1></div>
   <div className="gallery-intro-note"><p>From a considered wardrobe wall to a dedicated dressing room. Explore six editable designs, then make one your own.</p><Link href="/configure">Start with your own space <ArrowRight size={16}/></Link></div>
  </section>
  <section className="gallery-toolbar" aria-label="Collection controls">
   <div className="gallery-filters" role="group" aria-label="Filter by style">{tags.map(tag=><button key={tag} aria-pressed={activeTag===tag} onClick={()=>setActiveTag(tag)}>{tag}</button>)}</div>
   <div className="gallery-view" role="group" aria-label="Drawing view"><button aria-pressed={view==='spatial'} onClick={()=>setView('spatial')}>3D space</button><button aria-pressed={view==='elevation'} onClick={()=>setView('elevation')}>Elevation</button></div>
  </section>
  <div className="gallery-collection-meta"><p role="status">{filtered.length} {filtered.length===1?'design':'designs'}{activeTag!=='All'?` / ${activeTag}`:''}</p><p>Real layouts. Editable dimensions. Your finish.</p></div>
  <section className="gallery-grid" aria-label="Design collection">
   {filtered.map(item=><article key={item.id} className="gallery-design">
    <div className="gallery-drawing"><div className="gallery-drawing-caption"><span>0{item.id} / {item.style}</span><span>{view==='spatial'?'SPATIAL STUDY':'FRONT ELEVATION'}</span></div><div className="gallery-art" role="img" aria-label={`${item.title} ${view==='spatial'?'3D layout':'front elevation'}`} dangerouslySetInnerHTML={{__html:view==='spatial'?item.spatial:item.elevation}}/><span className="gallery-drawing-foot">{layoutNames[item.config.closetType??'reach-in']}</span></div>
    <div className="gallery-card-body"><div className="gallery-card-title"><h2>{item.title}</h2><span>{WOOD_OPTIONS.find(w=>w.id===item.config.userInfo.woodFinish)?.name}</span></div>
     <p className="gallery-description">{item.description}</p>
     <dl className="gallery-specs"><div><dt>{isWalkIn(item.config.closetType)?'Room footprint':'Cabinet footprint'}</dt><dd>{formatInches(item.width)} × {formatInches(item.depth)}</dd></div><div><dt>Cabinet depth</dt><dd>{formatInches(item.config.dimensions.depth)}</dd></div><div><dt>Layout</dt><dd>{item.layout.walls.length} {item.layout.walls.length===1?'unit':'units'}</dd></div></dl>
     <p className="gallery-style-note">{CABINET_STYLES[item.config.userInfo.stylePreference].description}</p>
     <Link href={`/configure?preset=${item.id}`} className="gallery-open">View and customize layout <ArrowRight size={17}/></Link>
    </div>
   </article>)}
  </section>
  <section className="gallery-closing"><p className="gallery-eyebrow">DESIGNED AROUND YOUR LIFE</p><h2>Your room. Your collection.<br/>Your starting point.</h2><p>Each design opens in the studio with editable dimensions, storage and finishes. Review fit and clearance before finalizing your layout.</p><Link href="/configure">Create your own design <ArrowRight size={18}/></Link></section>
  <p className="gallery-disclaimer">Parametric design studies, not photographs of completed installations. Spatial previews show the generated layout; elevations show its primary wall.</p>
 </main>;
}
