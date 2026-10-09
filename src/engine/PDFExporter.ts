'use client';
import type { ClosetConfiguration, ClosetLayout, SavedDesign } from '@/types/closet';
import { ClosetLayoutEngine } from './ClosetLayoutEngine';
import { ClosetSVGRenderer } from '@/renderer/ClosetSVGRenderer';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { capacityReport, escapeHTML as esc, isWalkIn } from '@/lib/design';
import { validConfig } from '@/lib/storage';
import { drawerTargets, cellSize, interiorSVG, interiorWarnings, resolveOrganizers } from '@/lib/drawers';
import { combinedInventory, EMPTY_INVENTORY, INVENTORY_KEYS, inventoryValue, inventoryLabel } from '@/lib/inventoryPlanning';
import { DEFAULT_PRINT, dividerEstimate, configurationChanges } from '@/lib/printSettings';
import type { PrintSettings } from '@/lib/printSettings';
import { wallElevation } from '@/lib/wallElevation';
import { FOLDED_REFERENCE } from '@/lib/design';
import { hangerAssumptions } from '@/lib/fitMeasurements';
import { surveyState } from '@/lib/surveyReview';
import { unassessedStorage } from '@/lib/storageFit';

export interface PDFExportOptions {
  layout: ClosetLayout;
  config: Partial<ClosetConfiguration>;
  fileName?: string;
  showDimensions?: boolean;
  showLabels?: boolean;
  settings?:PrintSettings;
}
function renderDesign({ layout, config, fileName = 'Current design', showDimensions = true, showLabels = true, settings=DEFAULT_PRINT }: PDFExportOptions) {
  const p = config.userInfo;
  const options = { showDimensions, showLabels, style: p?.stylePreference ?? 'modern' as const, woodFinish: p?.woodFinish ?? 'medium' as const, hardwareFinish: p?.hardwareFinish, accentColor: p?.accentColor };
  const drawings = layout.walls.filter(w=>!settings.walls||settings.walls.includes(w.wallId)).map(w => `<section class="drawing"><h2>${esc(w.label)} (${esc(w.elevationRef)})</h2>${new ClosetSVGRenderer(wallElevation(layout,w), options).renderElevation()}</section>`).join('');
  const room = layout.roomDimensions;
  const floor = settings.floorPlan&&isWalkIn(layout.closetType) && room ? `<section class="drawing"><h2>Floor plan</h2>${renderFloorPlan(layout, { ...room, unitDepth: layout.dimensions.depth })}<p>${layout.planning?.door?'Configured door; verify swing clearance on site.':'Door location and 30-inch width are illustrative; confirm on site.'}</p></section>` : '';
  const capacity = layout.capacity ?? (validConfig(config) ? capacityReport(config, layout.walls) : []);
  const table = (rows: string[][], header=true) => `<table>${header&&rows.length?`<thead><tr>${rows[0].map(v=>`<th>${esc(v)}</th>`).join('')}</tr></thead>`:''}<tbody>${rows.slice(header?1:0).map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const warnings = [...(layout.inputWarnings ?? []), ...layout.aisleWarnings, ...layout.layoutWarnings.map(w => w.message + ': ' + w.designerNote)];
  const specs = [
    ['Closet type', layout.closetType], ['Height', layout.dimensions.height + ' in'], ['Cabinet depth', layout.dimensions.depth + ' in'],
    ...(isWalkIn(layout.closetType) && room ? [['Room width', room.roomWidth + ' in'], ['Room depth', room.roomDepth + ' in']] : [['Wall width', layout.dimensions.width + ' in']]),
    ['Total zones', String(layout.walls.reduce((n,w) => n+w.zones.length,0))],
    ['Style / finish', (p?.stylePreference ?? 'modern') + ' / ' + (p?.woodFinish ?? 'medium')],
    ['Hardware / accent', (p?.hardwareFinish ?? 'wood tone') + ' / ' + (p?.accentColor ?? 'none')],
    ['Drawer preference', p?.drawerPreference ?? 'mixed'],
  ];
  const targets=drawerTargets(layout),plans=resolveOrganizers(config.drawerInteriors??{},targets);
  const organizers=(settings.organizers?targets:[]).filter(d=>plans[d.id]).map(d=>{
    const plan=plans[d.id];
    return `<section class="drawing organizer"><h2>Drawer organizer: ${esc(plan.name)}</h2>${settings.notes?`<p>${esc(d.label)} · ${esc(plan.material)} dividers · ${esc(plan.liner)} liner · ${plan.thickness} in dividers · ${plan.clearance} in edge allowance</p>`:''}${interiorSVG(plan,d.drawer,settings.notes,settings.notes)}<p>Top view; front at bottom. ${plan.measured?'Measured':'Estimated'} interior dimensions, not to scale.</p></section><section class="schedule"><h2>Organizer schedule: ${esc(plan.name)}</h2>${table([['Compartment','Contents','Width × depth (in)','Planned items',...(settings.notes?['Notes']:[])],...plan.cells.map(c=>{const s=cellSize(c,d.drawer,plan);return [c.label,c.category,`${s.width.toFixed(2)} × ${s.depth.toFixed(2)}`,String(c.quantity),...(settings.notes?[c.notes??'']:[])];})])}${settings.notes?`<p>${esc(plan.notes)}</p>`:''}${interiorWarnings(plan,d.drawer).map(w=>`<p>${esc(w)}</p>`).join('')}</section>`;
  }).join('');
  const materials=settings.materials?`<section class="schedule"><h2>Estimated organizer materials</h2><p>Planning worksheet only, not a fabrication cut list. Centerline lengths exclude joinery, kerf, waste and intersections. Verify measured interiors and divider height separately.</p>${table([['Organizer','Divider material','Thickness (in)','Continuous segments','Total centerline length (in)','Liner area (sq ft)'],...targets.filter(d=>plans[d.id]).map(d=>{const p=plans[d.id],estimate=dividerEstimate(p,d.drawer);return[p.name,p.material,p.dividerThickness?`H ${p.dividerThickness.horizontal} / V ${p.dividerThickness.vertical}`:String(p.thickness),String(estimate.segments.length),estimate.totalLength.toFixed(2),estimate.linerArea.toFixed(2)];})])}</section>`:'';
  const roomSchedule=settings.roomSchedule?`<section class="schedule"><h2>Room openings and obstacle schedule</h2>${table([['Object','Location','Measurements (in)'],...(layout.planning?.windows??[]).map((w,i)=>[`Window ${i+1}: ${w.label??''}`,w.wall,`Offset ${w.offset}; width ${w.width}; sill ${w.sill}; height ${w.height}`]),...(layout.planning?.obstacles??[]).map((o,i)=>[`Obstacle ${i+1}: ${o.label} (${o.mobility==='movable'?'movable furniture':'fixed structure'})`,`X ${o.x}; Y ${o.y}`,`${o.width} × ${o.depth}`]),...(layout.planning?.door?[[`Door (${layout.planning.door.swing})`,layout.planning.door.wall,`Offset ${layout.planning.door.offset}; width ${layout.planning.door.width}; ${layout.planning.door.hinge} hinge`]]:[])])}</section>`:'';
  const members=config.inventoryPlanning?.members??[];
  const wallSchedule=settings.roomSchedule?`<section class="schedule"><h2>Wall height coordination</h2>${table([['Wall','Survey ceiling (in)','Requested cabinet top (in)','Effective cabinet top (in)','Floor offset (in)'],...layout.walls.map(w=>[w.label,String(layout.planning?.walls?.[w.wallId]?.ceilingHeight??layout.dimensions.height),String(w.wallId==='island-unit'?36:config.dimensions?.cabinetHeight??config.dimensions?.height??layout.dimensions.height),String(w.height),String(layout.planning?.walls?.[w.wallId]?.floorOffset??0)])])}<p>Cabinet tops are above finished floor. Floor offsets consume usable height. Effective tops are constrained by the surveyed ceiling.</p></section>`:'';
  const survey=surveyState(config);
  const surveyNote=settings.notes?`<p>Room survey review: ${survey==='current'?`confirmed for the current geometry on ${esc(config.surveyConfirmation!.confirmedAt.slice(0,10))}`:survey==='stale'?'room geometry changed since confirmation; recheck required':'not confirmed'}. Survey confirmation records a user review, not installation approval.</p>`:'';
  const household=settings.household?`<section class="schedule"><h2>Household and season totals</h2><p>Stored profile totals; these may differ from the active inventory.</p>${table([['Profile','Season','Category','Count'],...members.flatMap(m=>INVENTORY_KEYS.map(k=>[m.name,m.season,inventoryLabel(k),String(inventoryValue(m.inventory,k))])),...(['everyday','seasonal'] as const).flatMap(season=>{const total=combinedInventory(members.filter(m=>m.season===season));return INVENTORY_KEYS.map(k=>['Season total',season,inventoryLabel(k),String(inventoryValue(total,k))]);})])}</section>`:'';
  const reserveNotes=settings.reserveNotes?`<section class="schedule"><h2>Reserve percentages and inventory notes</h2>${table([['Category','Reserve (%)'],...INVENTORY_KEYS.filter(k=>(config.inventoryPlanning?.reserve?.[k]??0)>0).map(k=>[inventoryLabel(k),String(config.inventoryPlanning?.reserve?.[k])])])}${Object.entries(config.inventoryPlanning?.notes??{}).map(([k,v])=>`<p>${esc(k)}: ${esc(v??'')}</p>`).join('')}</section>`:'';
  const changes=settings.comparison?`<section class="schedule"><h2>Changes from ${esc(settings.comparisonName??'reference design')}</h2>${table([['Dimension or quantity','Before','Current'],...configurationChanges(settings.comparison,config)])}</section>`:'';
  return `<article><h1>${esc(settings.project||fileName)}</h1><p>${esc(fileName)} · ${esc(settings.contact)}</p><p>Alvéo · ${esc(new Date().toLocaleDateString())} · Planning layout</p>
    <h2>Space specifications — effective dimensions</h2>${table(specs,false)}${surveyNote}
    <h2>Capacity and fit</h2><p>Utilization: ${layout.utilizationScore}%. A high utilization score does not mean every item fits.</p>
    ${unassessedStorage(config)?`<p>${esc(unassessedStorage(config))}</p>`:''}
    <p>${esc(hangerAssumptions(config.planning))}</p>
    <p>Folded storage uses estimated usable volume relative to a ${FOLDED_REFERENCE.width} × ${FOLDED_REFERENCE.depth} × ${FOLDED_REFERENCE.height} in reference drawer, with ${FOLDED_REFERENCE.edgeClearance} in edge clearance and ${FOLDED_REFERENCE.bottomAllowance} in bottom allowance. Verify actual folded-item dimensions and packing.</p>
    ${table([['Storage', 'Required', 'Provided', 'Shortfall'], ...capacity.map(r => [r.label, r.required.toFixed(1) + ' ' + r.unit, r.available.toFixed(1), Math.max(0,r.required-r.available).toFixed(1)])])}
    <h2>Warnings</h2>${warnings.length ? `<ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p>No calculated warnings.</p>'}
    <h2>Recommendations</h2><ul>${layout.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <h2>Inventory</h2>${table(Object.entries({ ...config.wardrobe, ...config.shoes }).map(([k,v]) => [k.replace(/([A-Z])/g, ' $1'), typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)]),false)}
    ${floor}${drawings}${organizers}${materials}${roomSchedule}${wallSchedule}${household}${reserveNotes}${changes}<footer>Planning purposes only. Not to scale. Verify dimensions, support, door clearance, and installation requirements before construction.</footer></article>`;
}
export function buildPrintDocument(designs: PDFExportOptions[]): string {
  const settings=designs[0]?.settings??DEFAULT_PRINT,paper=settings.paper==='Letter'?'Letter':'A4',orientation=settings.orientation==='landscape'?'landscape':'portrait';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(designs.length === 1 ? designs[0].fileName ?? 'Alvéo current design' : 'Alvéo designs')}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#242424;margin:24px auto;max-width:1000px;padding:16px}h1{font-size:26px}h2{font-size:18px;margin-top:24px}p,li,td,th{font-size:12px;line-height:1.5}td,th{padding:6px;border-bottom:1px solid #bbb}table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{text-align:left}td,th{overflow-wrap:anywhere}svg{width:100%;max-height:220mm;height:auto}footer{font-size:11px;margin-top:24px}article+article{break-before:page}.drawing{break-before:page;break-inside:avoid}.drawing h2{margin-top:0}@page{size:A4 portrait;margin:15mm}@media print{body{margin:0;padding:0}a{color:inherit}}
    .organizer svg{max-height:170mm}tr{break-inside:avoid}.schedule{break-before:page}.print-revision{font-size:9px;color:#444}@page{size:${paper} ${orientation}}${orientation==='landscape'?'svg,.organizer svg{max-height:130mm}':''}@media print{.print-revision{position:fixed;bottom:-10mm;left:0}}
    </style></head><body><div class="print-revision">Alvéo plan v1 · ${esc(new Date().toISOString())} · NOT TO SCALE</div>${designs.map(renderDesign).join('')}</body></html>`;
}
async function printHTML(html: string, target?:Window) {
  const popup = target??window.open('', '_blank');
  if (!popup) throw new Error('Print window was blocked. Allow pop-ups and try again.');
  if(popup.closed)throw new Error('The print window was closed before printing.');
  await new Promise<void>((resolve, reject) => {
    let started = false;
    const timeout = window.setTimeout(() => { popup.close(); reject(new Error('Print preparation timed out. Please try again.')); }, 15000);
    popup.document.open();
    popup.onload = async () => {
      if (started) return;
      started = true;
      try {
        if (popup.document.fonts) await popup.document.fonts.ready;
        if (popup.closed) throw new Error('The print window was closed before printing.');
        window.clearTimeout(timeout);
        popup.focus(); popup.print(); resolve();
      } catch (error) { reject(error); }
      finally { window.clearTimeout(timeout); }
    };
    popup.document.write(html); popup.document.close();
  });
}
export async function exportLayoutToPDF(options: PDFExportOptions, target?:Window) {
  await printHTML(buildPrintDocument([options]),target);
}
export async function exportMultipleDesignsToPDF(designs: SavedDesign[], target?:Window) {
  if (!designs.length) throw new Error('Select at least one saved design.');
  const invalid = designs.filter(d => !validConfig(d.config));
  if (invalid.length) throw new Error('Cannot export invalid designs: ' + invalid.map(d => d.name).join(', '));
  const prepared = designs.map(d => ({ config: d.config, fileName: d.name, layout: new ClosetLayoutEngine(d.config as ClosetConfiguration).calculateLayout() }));
  await printHTML(buildPrintDocument(prepared),target);
}


