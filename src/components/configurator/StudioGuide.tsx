'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';

export type StudioTool = 'drawers' | 'arrange' | 'style' | 'spatial' | 'floor' | 'fit' | 'room' | 'inventory' | 'library' | 'print';

const TOOLS: { id: StudioTool; title: string; description: string; keywords: string }[] = [
  { id: 'drawers', title: 'Design drawer compartments', description: 'Divide a drawer, choose an organizer template, and size each compartment.', keywords: 'jewelry jewellery tray dividers watches rings' },
  { id: 'arrange', title: 'Rearrange a wall', description: 'Move, resize, or replace storage columns on the selected wall.', keywords: 'shelves hanging layout width' },
  { id: 'style', title: 'Choose finishes & hardware', description: 'Explore wood, handles, design styles, and accent colors.', keywords: 'luxury rustic glam brass walnut material' },
  { id: 'spatial', title: 'Explore the 3D room', description: 'See how the cabinetry sits within your space.', keywords: 'perspective render view' },
  { id: 'floor', title: 'Inspect the floor plan', description: 'Review the room from above and select a wall to edit.', keywords: 'walk in island top view' },
  { id: 'fit', title: 'Check storage fit', description: 'See capacity shortfalls and compare feasible drawer layouts.', keywords: 'capacity allocation alternatives shortage optimization' },
  { id: 'room', title: 'Add doors, windows & obstacles', description: 'Model room openings and adjust clearance and shelf assumptions.', keywords: 'door window column aisle ceiling height geometry' },
  { id: 'inventory', title: 'Plan for your household', description: 'Add household profiles, seasonal items, and reserve capacity.', keywords: 'people wardrobe clothes import csv growth future' },
  { id: 'library', title: 'Manage saved designs', description: 'Save versions, organize favorites, and compare your designs.', keywords: 'library save rename duplicate compare' },
  { id: 'print', title: 'Prepare drawings for export', description: 'Choose paper, measurements, and project details before printing.', keywords: 'pdf download print share' },
];

export function StudioGuide({ onAction, hasLayout, hasDrawers, canEdit, hasFloorPlan }: {
  onAction: (tool: StudioTool) => void; hasLayout: boolean; hasDrawers: boolean; canEdit: boolean; hasFloorPlan: boolean;
}) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [showStarter, setShowStarter] = useState(true);
  useEffect(() => {
    try { setShowStarter(localStorage.getItem('alveo-studio-guide-collapsed') !== 'true'); } catch { /* Guidance remains usable when storage is unavailable. */ }
  }, []);
  const toggleStarter = () => {
    const next = !showStarter;
    setShowStarter(next);
    try { localStorage.setItem('alveo-studio-guide-collapsed', String(!next)); } catch { /* Keep the current session preference. */ }
  };
  const available = TOOLS.filter(tool => tool.id !== 'floor' || hasFloorPlan);
  const matches = available.filter(tool => `${tool.title} ${tool.description} ${tool.keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
  const unavailable = (tool: StudioTool) => tool === 'library' ? '' : !hasLayout ? 'Complete your room and inventory first.' :
    ['drawers', 'arrange', 'style', 'room', 'inventory'].includes(tool) && !canEdit ? 'Editing is unavailable in this preview.' :
    tool === 'drawers' && !hasDrawers ? 'Add folded clothes or jewelry to include drawers.' : '';
  return <section id="studio-guide" className="studio-guide" aria-labelledby="studio-guide-title" tabIndex={-1}>
    <div className="studio-guide-intro"><BookOpen size={18} aria-hidden="true"/><div><h3 id="studio-guide-title">Make this design your own</h3><p>Start with your room and wardrobe, then refine the details.</p></div><button type="button" className="studio-guide-toggle" aria-expanded={showStarter} aria-controls="studio-getting-started" onClick={toggleStarter}>{showStarter ? 'Hide getting started' : 'Show getting started'}</button></div>
    <div id="studio-getting-started" className="studio-guide-start" hidden={!showStarter}>
      <a href="#design-brief" onClick={() => document.getElementById('design-brief')?.focus()}><span>01</span><strong>Set your brief</strong><small>Shape, measurements & inventory</small></a>
      <button type="button" disabled={!!unavailable('drawers')} onClick={() => onAction('drawers')}><span>02</span><strong>Customize a drawer</strong><small>{unavailable('drawers') || 'Try templates, dividers & labels'}</small></button>
      <button type="button" disabled={!!unavailable('fit')} onClick={() => onAction('fit')}><span>03</span><strong>Review what fits</strong><small>Capacity, shortfalls & alternatives</small></button>
    </div>
    <details className="studio-tool-directory">
      <summary>Explore all design tools <span>{available.length} tools</span></summary>
      <label className="studio-tool-search"><Search size={16} aria-hidden="true"/><span className="sr-only">Find a design tool</span><input ref={searchRef} type="search" placeholder="Try “jewelry”, “windows”, or “PDF”" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <p role="status" className="studio-tool-count">{matches.length} {matches.length === 1 ? 'tool' : 'tools'} found</p>
      <div className="studio-tool-results">{matches.map(tool => <button type="button" key={tool.id} disabled={!!unavailable(tool.id)} onClick={() => onAction(tool.id)}><span><strong>{tool.title}</strong><small>{unavailable(tool.id) || tool.description}</small></span><ArrowUpRight size={16} aria-hidden="true"/></button>)}</div>
      {!matches.length && <p className="studio-tool-empty">No matching tools. Try a material, object, or task. <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>Show all tools</button></p>}
    </details>
  </section>;
}
