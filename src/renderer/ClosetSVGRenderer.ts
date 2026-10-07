import { storageSymbol } from './StorageSymbol';
import { dimensionColumns, rightHeightChain } from '@/lib/elevationDimensions';
import { footwearSymbol } from './FootwearSymbol';
import { garmentSymbol } from './GarmentSymbol';
import { faceDetails, CABINET_STYLES } from '@/lib/cabinetStyle';
import { formatInches, HARDWARE } from '@/lib/design';
import { drawerKey } from '@/lib/drawers';
﻿import { ClosetLayout, ClosetZone, UserPreferences } from '@/types/closet';

interface RenderOptions {
  idPrefix?: string;
  interactiveDrawers?: boolean;
  hardwareFinish?: string;
  accentColor?: string;
  showDimensions: boolean;
  showLabels: boolean;
  style: UserPreferences['stylePreference'];
  woodFinish: UserPreferences['woodFinish'];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert total inches → architectural feet-inches string: 96 → 8'-0"  · 66 → 5'-6" */
const toFtIn = formatInches;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ─── Main Renderer ──────────────────────────────────────────────────────────

export class ClosetSVGRenderer {
  private static nextDrawingId = 0;
  private layout: ClosetLayout;
  private options: RenderOptions;

  // Canvas margins (px)
  private readonly ML = 110;  // left  – 3-column zone: zoneChain(-40) | overallDim(-56) | intHt(-84)
  private readonly MR = 150;   // right – AFF annotations
  private MT         = 66;   // top  — increased when a void zone above the unit is present
  private readonly MB = 132;   // bottom – dim lines + title block

  private scale: number;
  /** Effective drawing height — the topmost rendered content (not the raw room ceiling).
   *  For typical closets this equals the room height.  For very tall rooms (e.g. 600")
   *  where the storage unit only reaches ~107" AFF, this is ~107" so the unit fills the frame. */
  private drawH: number;

  constructor(layout: ClosetLayout, options: RenderOptions) {
    this.layout  = layout;
    this.options = options;
    this.drawH   = this.calcDrawHeight();
    this.scale   = this.calcScale();
    // Extend top margin to give the void zone band enough room to render.
    // The void is the clear space from the top of the unit to the room ceiling.
    // We allocate up to 90px extra (scaled proportionally) so the band is visible.
    const _roomH  = layout.dimensions.height;
    const _voidIn = _roomH - this.drawH;
    if (_voidIn > 24) {
      this.MT = 66 + clamp(Math.round(_voidIn * this.scale * 0.5), 36, 90);
    }
  }

  // ── Effective draw height ────────────────────────────────────────────────

  /** Find the highest rendered element across all zones.
   *  This gives us the "content height" — the unit top — which is used as the
   *  drawing frame height so the storage system fills the canvas. */
  private calcDrawHeight(): number {
    if (this.layout.dimensions.cabinetHeight !== undefined) return this.layout.dimensions.cabinetHeight;
    const roomH = this.layout.dimensions.height;
    let maxH = 0;

    for (const zone of this.layout.zones ?? []) {
      // Hanging zones: highest content is the rod shelf (rod + 1.5")
      if (zone.rods?.length) {
        for (const rod of zone.rods) {
          maxH = Math.max(maxH, rod.height + 2);
        }
      }
      // Shelf zones: use actual shelf heights (relative to zone.y)
      if (zone.shelves?.length) {
        for (const shelf of zone.shelves) {
          // shelf.height is relative to zone.y in shoe/shelf zones
          maxH = Math.max(maxH, zone.y + shelf.height + shelf.spacing + 1);
        }
      }
      // Drawer zones: topmost drawer face
      if (zone.drawers?.length) {
        for (const drawer of zone.drawers) {
          maxH = Math.max(maxH, drawer.position + drawer.height + 2);
        }
      }
      // NOTE: deliberately NOT using zone.y + zone.height —
      // zones are sized to the full room height by the engine,
      // but actual content (rods, shelves, drawers) sits in the lower portion.
    }

    // No content found — fall back to room height
    if (maxH < 12) return roomH;

    // Add 8" breathing margin above highest element so the top panel
    // and top-shelf area are visible.  Never exceed actual room ceiling.
    return Math.min(maxH + 8, roomH);
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** Closet-space X (inches from left) → SVG X */
  private cx(in_: number): number { return this.ML + in_ * this.scale; }

  /** Closet-space Y (inches from floor, 0=floor) → SVG Y (0=canvas top).
   *  Uses drawH (effective unit height) so content fills the frame. */
  private cy(in_: number): number {
    return this.MT + (this.drawH - in_) * this.scale;
  }

  private get cW()     { return this.layout.dimensions.width * this.scale; }
  private get cH()     { return this.drawH * this.scale; }
  private get totalW() { return this.ML + this.cW + this.MR; }
  private get totalH() { return this.MT + this.cH + this.MB; }

  private calcScale(): number {
    const sx = 760 / Math.max(this.layout.dimensions.width, 1);
    const sy = 520 / Math.max(this.drawH, 1);
    // Both axes — drawing always fits.  Floor 0.5 prevents sub-pixel lines.
    return clamp(Math.min(sx, sy), 0.5, 8);
  }

  // ── Wood palette ──────────────────────────────────────────────────────────

  private get wood() {
    const p: Record<string, { bg: string; panel: string; edge: string; dark: string }> = {
      light:  { bg: '#f5f1eb', panel: '#ede5d8', edge: '#c4b096', dark: '#a8916b' },
      medium: { bg: '#ede3d5', panel: '#d8cbb8', edge: '#b5977a', dark: '#9c7d5e' },
      dark:   { bg: '#d4c2a8', panel: '#bfa882', edge: '#8d6e63', dark: '#6d4f40' },
      white:  { bg: '#f8f8f8', panel: '#eeeeee', edge: '#c8c8c8', dark: '#aaaaaa' },
    };
    const palette = p[this.options.woodFinish] ?? p.medium;
    const accent = this.options.accentColor;
    return { ...palette, edge: '#655e57', dark: '#403c38', bg: accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : palette.bg };
  }

  private get hardware() {
    const defaults = Object.fromEntries(Object.entries(CABINET_STYLES).map(([key,value])=>[key,value.hardware]));
    return HARDWARE[(this.options.hardwareFinish ?? defaults[this.options.style]) as keyof typeof HARDWARE] ?? this.wood.dark;
  }

  // ── Public entry ─────────────────────────────────────────────────────────

  public renderElevation(): string {
    if (!this.layout.zones || this.layout.zones.length === 0) {
      return this.renderPlaceholder();
    }

    const prefix = this.options.idPrefix ? `${this.options.idPrefix.replace(/[^a-zA-Z0-9_-]/g,'-')}-` : `closet-${++ClosetSVGRenderer.nextDrawingId}-`;
    return [
      `<svg viewBox="0 0 ${this.totalW} ${this.totalH}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet"`,
      `     data-ruler-width="${this.layout.dimensions.width}" data-ruler-origin="${this.ML}" data-ruler-scale="${this.scale}" style="width:100%;height:auto;display:block;background:#ffffff;font-family:'Inter',Arial,sans-serif;">`,
      // Rule 3.2 — xMinYMin meet: drawing origin always top-left, letterbox at right/bottom
      `<title>Closet elevation</title><desc>Planning drawing with storage zones, shelves, rods and drawers. Dimensions are labeled; not to scale.</desc>`,
      `<defs>`,
      this.defs(),
      `</defs>`,
      `<rect width="${this.totalW}" height="${this.totalH}" fill="#f8f4ef"/>`,
      this.renderShell(),
      this.renderZoneContents(),
      this.renderTopShelf(),
      this.renderDimensions(),
      this.renderLabels(),
      this.renderTitleBlock(),
      this.renderDrawerTargets(),
      this.options.interactiveDrawers?this.layout.zones.map((z,i)=>`<rect data-zone-index="${i}" x="${this.cx(z.x)}" y="${this.cy(z.y+z.height)}" width="${z.width*this.scale}" height="${z.height*this.scale}" fill="none" stroke="none" pointer-events="none"/>`).join(''):'',
      `</svg>`,
    ].join('\n').replace(/id="(wp|df|sh|tick|tsp|void-hatch)"/g, `id="${prefix}$1"`)
      .replace(/url\(#(wp|df|sh|tick|tsp|void-hatch)\)/g, `url(#${prefix}$1)`);
  }

  // ── SVG defs (patterns + filter) ─────────────────────────────────────────
  private renderDrawerTargets(): string {
    if (!this.options.interactiveDrawers) return '';
    return this.layout.zones.flatMap((zone,zi)=>(zone.drawers??[]).map((drawer,di)=>{
      const pad=Math.max(this.scale*.75,3),x=this.cx(zone.x)+pad,y=this.cy(drawer.position+drawer.height)+1.5;
      const id=drawerKey(this.layout.walls[0]?.wallId??'back',zi,di);
      return `<rect data-drawer-id="${id}" role="button" tabindex="0" aria-label="Design drawer ${di+1} compartments" x="${x}" y="${y}" width="${zone.width*this.scale-2*pad}" height="${drawer.height*this.scale-3}" fill="transparent" style="cursor:pointer"><title>Click to design drawer compartments</title></rect>`;
    })).join('');
  }

  private defs(): string {
    const w = this.wood;
    return `
  <pattern id="wp" patternUnits="userSpaceOnUse" width="36" height="7">
    <rect width="36" height="7" fill="${w.panel}"/>
  </pattern>
  <pattern id="df" patternUnits="userSpaceOnUse" width="36" height="7">
    <rect width="36" height="7" fill="${w.bg}"/>
  </pattern>
  <!-- Rule 3.5: shadow on outer boundary only — dx=2, dy=2, stdDeviation=3, flood-opacity=0.12 -->
  <filter id="sh" x="-8%" y="-8%" width="120%" height="120%">
    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0"/>
  </filter>
  <!-- Tick mark terminators for dimension lines (45° slash) -->
  <marker id="tick" viewBox="-4 -4 8 8" markerWidth="4" markerHeight="4"
          orient="auto" markerUnits="strokeWidth">
    <line x1="-3" y1="-3" x2="3" y2="3" stroke="#222" stroke-width="1.8" stroke-linecap="round"/>
  </marker>
  <!-- Top-shelf light fill pattern -->
  <pattern id="tsp" patternUnits="userSpaceOnUse" width="8" height="8">
    <rect width="8" height="8" fill="#f0ebe0"/>
    <line x1="0" y1="0" x2="8" y2="8" stroke="#ddd5c8" stroke-width="0.5" opacity="0.6"/>
  </pattern>
  <!-- Void-zone 45° crosshatch (space above unit to room ceiling) -->
  <pattern id="void-hatch" patternUnits="userSpaceOnUse" width="10" height="10">
    <rect width="10" height="10" fill="#f7f7f7"/>
    <line x1="0" y1="10" x2="10" y2="0" stroke="#d0ccc6" stroke-width="0.9"/>
    <line x1="-1" y1="1"  x2="1"  y2="-1" stroke="#d0ccc6" stroke-width="0.9"/>
    <line x1="9" y1="11" x2="11" y2="9"  stroke="#d0ccc6" stroke-width="0.9"/>
  </pattern>`;
  }

  // ── Structural shell ──────────────────────────────────────────────────────

  private renderShell(): string {
    const x0     = this.cx(0);
    const x1     = this.cx(this.layout.dimensions.width);
    const yTop   = this.cy(this.drawH);          // top of unit (= top of frame)
    const yFloor = this.cy(0);
    // Panel thickness — 3/4" in drawing units
    const ph = Math.max(this.scale * 0.75, 4);
    const TOE_KICK_IN = 3; // inches
    const yToe = this.cy(TOE_KICK_IN);

    const roomH = this.layout.dimensions.height;
    const isTruncated = roomH > this.drawH + 1; // room is taller than drawn unit

    // ── VOID ZONE: space between top of unit and room ceiling ───────────────
    // When the unit height < room ceiling height, a void zone (crosshatch band) fills
    // the gap with a professional label and a dimension annotation.
    let continuationLine = '';
    if (isTruncated) {
      const yPanelTop  = yTop - ph;          // SVG Y of unit top surface
      const yVoidTop   = 14;                 // SVG Y just inside the outer border
      const voidBandH  = yPanelTop - yVoidTop;
      const voidMidY   = yVoidTop + voidBandH / 2;
      const voidGapIn  = roomH - this.drawH; // actual void in inches
      const dimX       = x1 + 6;            // small dim arrow on right edge of void

      continuationLine = `
  <!-- ═══ VOID ZONE (room ceiling > unit height) ═══ -->
  <!-- Crosshatch fill -->
  ${
      voidGapIn < 12
        // ── SMALL VOID (< 12") — installation tolerance: light treatment only
        ? `<rect x="${x0}" y="${yVoidTop}" width="${this.cW}" height="${voidBandH}"
        fill="#f0ece8" stroke="#d4cec8" stroke-width="0.5"/>
  <line x1="${x0 - 12}" y1="${yVoidTop}" x2="${x1 + 12}" y2="${yVoidTop}"
        stroke="#bbb" stroke-width="0.8" stroke-dasharray="6,3"/>
  <text x="${x0 + 8}" y="${yVoidTop + Math.max(voidBandH * 0.55, 7)}"
        font-size="6" fill="#b8b0a8" letter-spacing="0.8"
        font-family="'Helvetica Neue',Arial,sans-serif">INSTAL. TOLER. ${toFtIn(voidGapIn)}</text>`
        // ── LARGE VOID (≥ 12") — deliberate space: full crosshatch + centred label + dim arrow
        : `<rect x="${x0}" y="${yVoidTop}" width="${this.cW}" height="${voidBandH}"
        fill="url(#void-hatch)" stroke="#c0bab2" stroke-width="0.8"/>
  <line x1="${x0 - 12}" y1="${yVoidTop}" x2="${x1 + 12}" y2="${yVoidTop}"
        stroke="#888" stroke-width="1.2" stroke-dasharray="8,4"/>
  <line x1="${x0 - 12}" y1="${yPanelTop}" x2="${x1 + 12}" y2="${yPanelTop}"
        stroke="#666" stroke-width="1"/>
  <text x="${(x0 + x1) / 2}" y="${voidMidY - 6}" text-anchor="middle"
        font-size="7.5" fill="#aaa" letter-spacing="1.5"
        font-family="'Helvetica Neue',Arial,sans-serif">VOID — ABOVE UNIT HEIGHT</text>
  <text x="${(x0 + x1) / 2}" y="${voidMidY + 7}" text-anchor="middle"
        font-size="6.5" fill="#bbb"
        font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(voidGapIn)} ABOVE T.O. UNIT</text>
  <line x1="${dimX + 7}" y1="${yVoidTop + 3}" x2="${dimX + 7}" y2="${yPanelTop - 3}"
        stroke="#aaa" stroke-width="0.8"/>
  <line x1="${dimX + 4}" y1="${yVoidTop + 3}"  x2="${dimX + 10}" y2="${yVoidTop + 3}"  stroke="#aaa" stroke-width="0.8"/>
  <line x1="${dimX + 4}" y1="${yPanelTop - 3}" x2="${dimX + 10}" y2="${yPanelTop - 3}" stroke="#aaa" stroke-width="0.8"/>
  <text x="${dimX + 14}" y="${voidMidY}" dominant-baseline="central"
        font-size="7" fill="#aaa"
        font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(voidGapIn)}</text>`
    }`
    }

    return `
  <!-- ═══ STRUCTURAL SHELL ═══ -->
  ${continuationLine}
  <!-- Back interior fill — Rule 1.8: unit fill #F5F0EB (warm, reads as figure vs #F8F4EF bg) -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${this.cH}"
        fill="#f5f0eb" stroke="none"/>
  <!-- Top panel — Rule 3.5: shadow on outer boundary only, not interior panels -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${this.cW + 2 * ph}" height="${ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.4}"/>
  <!-- Left side panel — Rule 1.1: secondary profile #2A2520 for structural shell -->
  <rect x="${x0 - ph}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Right side panel -->
  <rect x="${x1}" y="${yTop - ph}" width="${ph}" height="${this.cH + ph}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="${ph * 0.3}"/>
  <!-- Toe kick base (slightly recessed darker zone) -->
  <rect x="${x0}" y="${yToe}" width="${this.cW}" height="${yFloor - yToe}"
        fill="${this.wood.dark}" fill-opacity="0.55" stroke="none"/>
  <!-- Toe kick face line -->
  <line x1="${x0}" y1="${yToe}" x2="${x1}" y2="${yToe}"
        stroke="${this.wood.edge}" stroke-width="1.2"/>
  <!-- Floor plinth bar -->
  <rect x="${x0 - ph}" y="${yFloor}" width="${this.cW + 2 * ph}" height="5"
        fill="${this.hardware}" stroke="${this.hardware}" stroke-width="1"/>
  <!-- OUTER BOUNDING BOX — thickest line, architectural standard -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${this.cH}"
        fill="none" stroke="#1A1512" stroke-width="3.5" filter="url(#sh)"/>`;
  }

  // ── Full-width top shelf ──────────────────────────────────────────────────

  private renderTopShelf(): string {
    const x0   = this.cx(0);
    const yTop = this.cy(this.drawH);  // top of unit frame
    // 3/4" shelf thickness rendered as a filled panel rect
    const sh = Math.max(this.scale * 0.75, 3);

    return `
  <!-- ═══ TOP SHELF ═══ -->
  <rect x="${x0}" y="${yTop}" width="${this.cW}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${x0}" y="${yTop + sh}" width="${this.cW}" height="3" fill="rgba(0,0,0,0.07)"/>`;
  }

  // ── Zone dispatch ────────────────────────────────────────────────────────

  private renderZoneContents(): string {
    const zones = this.layout.zones;
    if (!zones.length) return '';

    let out = '\n  <!-- ═══ ZONES ═══ -->';

    // Inter-column vertical dividers — 3/4" thick filled panels (structural elements)
    const seenX = new Set<number>();
    const dvThick = Math.max(this.scale * 0.75, 3.5); // 3/4" drawn thick
    for (const zone of zones) {
      if (zone.x <= 0 || seenX.has(zone.x)) continue;
      seenX.add(zone.x);
      const dvX = this.cx(zone.x);
      // Rule 1.1: secondary profile #2A2520 for zone dividers; Rule 3.5: no shadow on interior
      out += `
  <rect x="${dvX - dvThick / 2}" y="${this.cy(this.drawH)}" width="${dvThick}" height="${this.cH}"
        fill="${this.wood.panel}" stroke="#2A2520" stroke-width="1.2"/>
  <rect x="${dvX - dvThick / 2 + dvThick}" y="${this.cy(this.drawH)}" width="2" height="${this.cH}"
        fill="rgba(0,0,0,0.05)" stroke="none"/>`;
    }

    for (const zone of zones) {
      const zx = this.cx(zone.x);
      const zw = zone.width * this.scale;

      switch (zone.type) {
        case 'long-hang':
        case 'double-hang':
          out += this.renderHangZone(zone, zx, zw);
          break;
        case 'drawers':
          out += this.renderDrawerZone(zone, zx, zw);
          break;
        case 'shoe-shelves':
          out += this.renderShoeZone(zone, zx, zw);
          break;
        case 'top-shelves':
          out += this.renderShelfZone(zone, zx, zw);
          break;
      }
      for (const offset of zone.supports ?? []) out += '<rect x="' + this.cx(zone.x + offset) + '" y="' + this.cy(Math.min(zone.y + zone.height, this.drawH)) + '" width="' + Math.max(this.scale, 1) + '" height="' + Math.min(zone.height, this.drawH - zone.y) * this.scale + '" fill="' + this.wood.edge + '"><title>Shelf support divider</title></rect>';
    }

    return out;
  }

  // ── Hanging zone ─────────────────────────────────────────────────────────

  private renderHangZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.rods?.length) return '';

    // 3/4" shelf thickness
    const sh  = Math.max(this.scale * 0.75, 3);
    let out   = `\n  <!-- hang: ${zone.type} x=${zone.x} -->`;

    // Sort rods bottom → top so we can compute space between them
    const rods = [...zone.rods].sort((a, b) => a.height - b.height);
    const zoneTop = zone.y + zone.height; // top of zone in inches

    for (let ri = 0; ri < rods.length; ri++) {
      const rod    = rods[ri];
      const rodAFF = rod.height;
      const rodY   = this.cy(rodAFF);
      const pad    = clamp(zw * 0.06, 6, 14);

      // The space above this rod shelf up to the next rod shelf (or drawH — the unit top).
      // Use this.drawH as the ceiling so we never add more shelves than the drawn unit height.
      const rodShelfTop = rodAFF + 1.5; // shelf sits 1.5" above rod centre
      const upperBound  = ri + 1 < rods.length
        ? rods[ri + 1].height + 1.5
        : Math.min(zoneTop, this.drawH); // cap at drawn unit height, not raw room height
      const openSpaceIn = upperBound - rodShelfTop; // inches of open space above this rod's shelf

      // ── shelf panel directly above rod ────────────────────────────────────
      const shelfY = this.cy(rodShelfTop);
      out += `
  <rect x="${zx}" y="${shelfY}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${shelfY + sh}" width="${zw}" height="3" fill="rgba(0,0,0,0.06)"/>`;

      // Render only storage specified by the layout; do not invent shelves here.

      // ── rod — Rule 1.2: dashed hidden line (rod is behind garment plane in elevation) ─────
      // Tertiary weight #4A4540, bracket circles at each end at tertiary weight
      const rodStroke = clamp(this.scale * 0.18, 1.2, 2.2);
      out += `
  <line x1="${zx + pad}" y1="${rodY}" x2="${zx + zw - pad}" y2="${rodY}"
        stroke="#4A4540" stroke-width="${rodStroke}" stroke-linecap="round"
        stroke-dasharray="8,5"/>
  <circle cx="${zx + pad}"      cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>
  <circle cx="${zx + zw - pad}" cy="${rodY}" r="${clamp(rodStroke + 0.3, 1.5, 2.8)}" fill="#4A4540" stroke="none"/>`;

      // Sparse side-on symbols leave the cabinet geometry legible.
      const isLong = zone.type === 'long-hang';
      const zoneFloor = ri === 0 ? zone.y : rods[ri - 1].height + 1.5;
      const available = Math.max(0,(rodAFF-zoneFloor-8)*this.scale);
      const garmentHeight = Math.min((isLong?46:27)*this.scale,available);
      const usable = Math.max(0,zw-2*pad);
      const count = Math.min(isLong?2:3,Math.floor(usable/Math.max(24,this.scale*7)));
      const spacing = usable/(count+1);
      const symbolWidth = Math.min(this.scale*18,usable*.72);
      for(let i=0;i<count;i++)out+=garmentSymbol(zx+pad+symbolWidth/2+(count>1?i*(usable-symbolWidth)/(count-1):0),rodY+2,symbolWidth,garmentHeight,isLong,i);

    }

    return out;
  }

  // ── Drawer zone ───────────────────────────────────────────────────────────

  private renderDrawerZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.drawers?.length) return '';

    let out = `\n  <!-- drawers x=${zone.x} -->`;
    // 3/4" gap between drawer face edge and column panel
    const pad = Math.max(this.scale * 0.75, 3);

    for (const drawer of zone.drawers) {
      const svgTop  = this.cy(drawer.position + drawer.height);
      const svgBot  = this.cy(drawer.position);
      const drawerH = svgBot - svgTop;
      const midY    = svgTop + drawerH / 2;
      const midX    = zx + zw / 2;

      // Drawer face — filled rect with wood pattern, clear gap top & sides
      out += `
  <rect x="${zx + pad}" y="${svgTop + 1.5}" width="${zw - 2 * pad}" height="${drawerH - 3}"
        fill="url(#df)" stroke="${this.wood.edge}" stroke-width=".85" rx=".5"/>
  <!-- Drawer gap line at top of each face -->
  <line x1="${zx}" y1="${svgTop}" x2="${zx + zw}" y2="${svgTop}"
        stroke="${this.wood.edge}" stroke-width="1"/>`;

      for(const detail of faceDetails(this.options.style,zone.width,drawer.height)) {
        out += `<rect data-style-detail="${this.options.style}" x="${zx+pad+detail.x*(zw-2*pad)}" y="${svgTop+1.5+(1-detail.y-detail.h)*(drawerH-3)}" width="${detail.w*(zw-2*pad)}" height="${detail.h*(drawerH-3)}" fill="${detail.metal?this.hardware:this.wood.edge}" opacity="${detail.metal?1:.22}"/>`;
      }

      // Purpose label
      if (this.options.showLabels && drawer.purpose !== 'folded' && drawerH > 30) {
        out += `\n  <text x="${midX}" y="${svgTop + clamp(drawerH * 0.25, 8, 14)}" text-anchor="middle" font-size="6" fill="${this.wood.dark}" opacity="0.65" letter-spacing="0.9" font-family="'Helvetica Neue',Arial,sans-serif">${drawer.purpose.toUpperCase()}</text>`;
      }
    }

    // ── EQ labels between consecutive equal-height drawers (TC-10 / Task 14) ─
    const sortedDrawers = [...zone.drawers].sort((a, b) => a.position - b.position);
    for (let i = 0; i < sortedDrawers.length - 1; i++) {
      const curr = sortedDrawers[i];
      const next = sortedDrawers[i + 1];
      if (Math.abs(curr.height - next.height) < 1) {
        const eqSvgY = this.cy(curr.position + curr.height); // the gap / divider line
        const eqX    = zx + zw / 2;
        out += `
  <rect x="${eqX - 7}" y="${eqSvgY - 4.5}" width="14" height="7" fill="#fafaf5" rx="2"/>
  <text x="${eqX}" y="${eqSvgY - 1}" text-anchor="middle" dominant-baseline="central"
        font-size="5" fill="${this.wood.dark}" opacity="0.55" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif">EQ</text>`;
      }
    }

    return out;
  }

  // ── Shoe-shelf zone ──────────────────────────────────────────────────────

  private renderShoeZone(zone: ClosetZone, zx: number, zw: number): string {
    if (!zone.shelves?.length) return '';

    let out = `\n  <!-- shoes x=${zone.x} -->`;
    // Shelf thickness — 3/4"
    const sh = Math.max(this.scale * 0.75, 3);

    // Bay fill colours per shoe type
    const bayFill: Record<string, string> = {
      boots:    'rgba(180,160,130,0.07)',
      heels:    'rgba(160,140,120,0.06)',
      sneakers: 'rgba(140,160,140,0.06)',
      flats:    'rgba(140,140,160,0.05)',
    };

    for (let i = 0; i < zone.shelves.length; i++) {
      const shelf   = zone.shelves[i];
      const shelfY  = this.cy(zone.y + shelf.height);
      const bayTopY = this.cy(zone.y + shelf.height + shelf.spacing);  // top of bay = bottom of shelf board
      // Bay bottom = top of next shelf, or zone bottom
      const nextShelfH = zone.shelves[i + 1]?.height ?? zone.height;
      const bayBotY = shelfY;
      const bayH       = bayBotY - bayTopY;

      // ── Bay fill (light background tint for the clear space) ──────────────
      if (bayH > 1) {
        out += `
  <rect x="${zx}" y="${bayTopY}" width="${zw}" height="${bayH}"
        fill="${bayFill[shelf.purpose] ?? 'rgba(160,150,130,0.05)'}" stroke="none"/>`;
      }

      // Front elevation keeps level shelf edges horizontal.
      const tilt = 0; // No unmodeled lateral slope.
      out += `
  <polygon
    points="${zx},${shelfY + tilt + sh}  ${zx + zw},${shelfY + sh}  ${zx + zw},${shelfY}  ${zx},${shelfY + tilt}"
    fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.2"/>
  <polygon
    points="${zx},${shelfY + tilt + sh + 2.5}  ${zx + zw},${shelfY + sh + 2.5}  ${zx + zw},${shelfY + sh}  ${zx},${shelfY + tilt + sh}"
    fill="rgba(0,0,0,0.05)" stroke="none"/>`;

      // A few legible side profiles sit on the actual shelf surface.
      const count=Math.min(shelf.count,3,Math.floor((zw-12)/(this.scale*9)));
      const slot=(zw-12)/Math.max(1,count);
      const shoeWidth=Math.min(this.scale*9,slot*.8);
      const targetHeight={boots:18,heels:5,sneakers:4,flats:2.5}[shelf.purpose]??3;
      const shoeHeight=Math.min(targetHeight*this.scale,Math.max(0,bayH-15));
      for(let p=0;p<count;p++)out+=footwearSymbol(shelf.purpose,zx+6+p*slot+(slot-shoeWidth)/2,shelfY-.8,shoeWidth,shoeHeight);
      if(this.options.showLabels&&bayH>26)out+=`<text x="${zx+zw/2}" y="${bayTopY+11}" text-anchor="middle" font-size="7" fill="#666159" letter-spacing=".4">${shelf.purpose.toUpperCase()}</text>`;

    }

    return out;
  }

  // ── Generic shelf zone ────────────────────────────────────────────────────

  private renderShelfZone(zone: ClosetZone, zx: number, zw: number): string {
    const zoneTopY  = this.cy(Math.min(zone.y + zone.height, this.drawH));
    const zoneBotY  = this.cy(zone.y);
    const sh = Math.max(this.scale * 0.75, 3);

    let out = `\n  <!-- shelves x=${zone.x} -->`;

    // Light fill for the entire top-shelf zone
    out += `
  <rect x="${zx}" y="${zoneTopY}" width="${zw}" height="${zoneBotY - zoneTopY}"
        fill="#f1ede5" stroke="none" opacity="0.35"/>`;

    if (!zone.shelves?.length) return out;

    for (const shelf of zone.shelves) {
      const sy = this.cy(zone.y + shelf.height);
      const nextLevel = Math.min(zone.y+zone.height,...zone.shelves.filter(other=>other.height>shelf.height).map(other=>zone.y+other.height));
      const clearHeight=Math.max(0,sy-this.cy(nextLevel)-12);
      if(shelf.count>0&&clearHeight>16){
        const symbolW=Math.min(zw*.7,this.scale*12);
        out+=storageSymbol(shelf.purpose,zx+(zw-symbolW)/2,sy,symbolW,Math.min(clearHeight,this.scale*12));
      }
      out += `
  <rect x="${zx}" y="${sy}" width="${zw}" height="${sh}"
        fill="${this.wood.panel}" stroke="${this.wood.edge}" stroke-width="1.5"/>
  <rect x="${zx}" y="${sy + sh}" width="${zw}" height="2" fill="rgba(0,0,0,0.05)"/>`;
    }

    return out;
  }

  // ── Dimension lines ───────────────────────────────────────────────────────

  private renderDimensions(): string {
    if (!this.options.showDimensions) return '';

    const W      = this.layout.dimensions.width;
    const H      = this.drawH;                          // draw height (unit height)
    const roomH  = this.layout.dimensions.height;       // actual room ceiling (may be larger)
    const x0     = this.cx(0);
    const x1     = this.cx(W);
    const yTop   = this.cy(H);
    const yFloor = this.cy(0);

    let out = '\n  <!-- ═══ DIMENSIONS ═══ -->';

    // ── Overall height — left vertical chain ──────────────────────────────
    const vdX = x0 - 46;
    // Extension lines with gap and overshoot
    out += this.extLine('v', yTop, x0 - 2,   vdX + 5, 3);
    out += this.extLine('v', yFloor, x0 - 2, vdX + 5, 3);
    out += this.dimLineV(vdX, yTop, yFloor, toFtIn(H));

    // Usable interior height note — sits in its own outermost column (left of the
    // overall-height dim line at vdX = x0-46) to eliminate label/dim collision.
    const TOE_DIM_H = 3;
    const yToeNote  = this.cy(TOE_DIM_H);
    const noteX     = x0 - 62;
    const noteMid   = (yTop + yToeNote) / 2;
    out += `
  <text x="${noteX}" y="${noteMid}" text-anchor="middle" dominant-baseline="central"
        font-size="5.5" fill="#c8c0b8" letter-spacing="1"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 ${noteX} ${noteMid})">INT. HT. ${toFtIn(H - TOE_DIM_H)}</text>`;

    // One rightmost-column height chain, never overlapping chains from all bays.
    const vdRX = x1 + 120;
    const chainPairs=rightHeightChain(this.layout.zones,H).map(({top,bottom})=>({za:this.cy(top),zb:this.cy(bottom),hi:top-bottom}));
    // Stagger alternate labels when there are > 2 zones to prevent text collisions
    chainPairs.forEach(({ za, zb, hi }, i) => {
      const sOff = chainPairs.length > 2 && i % 2 === 1 ? 14 : 0;
      out += this.extLine('v', za, x1 + 2, vdRX - 5 + sOff, 3);
      out += this.extLine('v', zb, x1 + 2, vdRX - 5 + sOff, 3);
      out += this.dimLineV(vdRX + sOff, za, zb, toFtIn(hi));
    });

    // ── Overall width (bottom outer) ──────────────────────────────────────
    const hdY_outer = yFloor + 54;
    out += this.extLine('h', x0, yFloor + 2, hdY_outer + 5, 3);
    out += this.extLine('h', x1, yFloor + 2, hdY_outer + 5, 3);
    out += this.dimLineH(x0, x1, hdY_outer, toFtIn(W));

    // ── Per-zone widths (bottom inner) ────────────────────────────────────
    const hdY_inner = yFloor + 24;
    const seenZX = new Set<number>();
    for (const zone of dimensionColumns(this.layout.zones)) {
      const za = this.cx(zone.x);
      const zb = this.cx(zone.x + zone.width);
      out += this.dimLineH(za, zb, hdY_inner, toFtIn(zone.width));
      if (zone.x > 0 && !seenZX.has(zone.x)) {
        seenZX.add(zone.x);
        out += this.extLine('h', za, yFloor + 2, hdY_inner + 5, 3);
      }
    }
    // Left and right edges for inner chain
    out += this.extLine('h', x0, yFloor + 2, hdY_inner + 5, 3);
    out += this.extLine('h', x1, yFloor + 2, hdY_inner + 5, 3);

    // ── AFF annotations (right side — leader style) ───────────────────────
    const rx = x1 + 12;
    // When room is taller than unit, label unit top as T.O. UNIT — ceiling is noted separately
    const isTruncated = roomH > H + 1;
    if (isTruncated) {
      // TC-21: compact right-margin leader at the top of the void band (y ≈ 14)
      const yCeiling = 14;
      out += `
  <line x1="${rx - 6}" y1="${yCeiling}" x2="${rx + 4}" y2="${yCeiling}" stroke="#888" stroke-width="0.9"/>
  <text x="${rx + 6}" y="${yCeiling + 9}" font-size="7" font-weight="500" fill="#666"
        font-family="'Helvetica Neue',Arial,sans-serif">+${toFtIn(roomH)} A.F. ROOM CLG.</text>
  <text x="${rx + 6}" y="${yCeiling + 20}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif">UNIT HT. ${toFtIn(H)}</text>`;
      out += this.affAnnotation(rx, yTop, `+${toFtIn(H)} A.F.F.`, 'T.O. UNIT', true);
    } else {
      out += this.affAnnotation(rx, yTop,   `+${toFtIn(H)} A.F.F.`,  'T.O. CEILING',  true);
    }
    out += this.affAnnotation(rx, yFloor, `+0'-0" A.F.F.`,          'FINISH FLOOR',  false);

    // Toe kick at 3" AFF — use above=true so text rises into the toe kick zone
    // rather than colliding downward with the FINISH FLOOR label (Issue 08).
    const TOE_KICK_IN = 3;
    const yToe = this.cy(TOE_KICK_IN);
    out += this.affAnnotation(rx, yToe, `+3" A.F.F.`, 'TOE KICK', true);

    // Rod heights — label each unique rod with AFF leader
    const seenRod = new Set<number>();
    for (const zone of this.layout.zones) {
      if (!zone.rods) continue;
      for (const rod of zone.rods) {
        const k = Math.round(rod.height);
        if (seenRod.has(k)) continue;
        seenRod.add(k);
        const rodLabel = rod.purpose.includes('lower') ? `${toFtIn(k)} A.F.F.` : `${toFtIn(k)} A.F.F.`;
        out += this.affAnnotation(rx, this.cy(rod.height), rodLabel, rod.purpose.toUpperCase(), false);
      }
    }

    // ── Shoe shelf spacing — small internal dims inside shoe section ───────
    for (const zone of this.layout.zones) {
      if (zone.type !== 'shoe-shelves' || !zone.shelves?.length) continue;
      const shoeRX = this.cx(zone.x + zone.width) + 4;
      for (let i = 0; i < zone.shelves.length; i++) {
        const shelf = zone.shelves[i];
        const nextH = Math.min(shelf.height + shelf.spacing, zone.height);
        const bayHin = nextH - shelf.height;
        if (bayHin <= 0) continue;
        const sy1 = this.cy(zone.y + shelf.height);
        const sy2 = this.cy(zone.y + nextH);
        if (sy1 - sy2 > 12) {
          out += `
  <line x1="${shoeRX}" y1="${sy1}" x2="${shoeRX + 16}" y2="${sy1}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX}" y1="${sy2}" x2="${shoeRX + 16}" y2="${sy2}" stroke="#bbb" stroke-width="0.5"/>
  <line x1="${shoeRX + 8}" y1="${sy1}" x2="${shoeRX + 8}" y2="${sy2}" stroke="#999" stroke-width="0.6"/>
  <text x="${shoeRX + 10}" y="${(sy1 + sy2) / 2}" dominant-baseline="central"
        font-size="6" fill="#888" font-family="'Helvetica Neue',Arial,sans-serif">${toFtIn(bayHin)}</text>`;
        }
      }
    }

    return out;
  }

  /** Extension line — either horizontal or vertical, with gap and overshoot */
  private extLine(dir: 'h' | 'v', fromCoord: number, perpCoord: number, toCoord: number, overshoot: number): string {
    const gap = 3;
    if (dir === 'h') {
      // horizontal extension: fromCoord=x of element, perpCoord=y, toCoord=y of dim line
      const y1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const y2 = toCoord + (toCoord > perpCoord ? overshoot : -overshoot);
      // Rule 1.1: extension lines — dimension/notation tier #5A5550 @ 0.6px
      return `\n  <line x1="${fromCoord}" y1="${y1}" x2="${fromCoord}" y2="${y2}" stroke="#5A5550" stroke-width="0.6"/>`;
    } else {
      // vertical extension: fromCoord=y of element, perpCoord=x, toCoord=x of dim line
      const x1 = perpCoord + (toCoord > perpCoord ? gap : -gap);
      const x2 = toCoord + (toCoord > perpCoord ? overshoot : -overshoot);
      return `\n  <line x1="${x1}" y1="${fromCoord}" x2="${x2}" y2="${fromCoord}" stroke="#5A5550" stroke-width="0.6"/>`;
    }
  }

  private dimLineH(x1: number, x2: number, y: number, text: string): string {
    const mx   = (x1 + x2) / 2;
    const tw   = text.length * 5 + 8;
    // 45° tick marks at each end (architectural standard)
    const tk   = 4.5;
    // Rule 1.1: dim lines #5A5550 @ 0.6px; Rule 1.3: tick marks 0.8px (tertiary)
    return `
  <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#5A5550" stroke-width="0.6"/>
  <line x1="${x1 - tk}" y1="${y + tk}" x2="${x1 + tk}" y2="${y - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="${x2 - tk}" y1="${y + tk}" x2="${x2 + tk}" y2="${y - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <rect x="${mx - tw / 2}" y="${y - 8}" width="${tw}" height="10.5" fill="#f8f4ef"/>
  <text x="${mx}" y="${y - 2}" text-anchor="middle" dominant-baseline="central"
        font-size="8" font-weight="400" fill="#5A5550" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif">${text}</text>`;
  }

  private dimLineV(x: number, y1: number, y2: number, text: string): string {
    const my = (y1 + y2) / 2;
    const th = text.length * 4.5 + 8;
    const tk = 4.5;
    // Rule 1.1: dim lines #5A5550 @ 0.6px; Rule 1.3: ticks 0.8px; Rule 1.4: rotate(-90) ✅
    return `
  <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#5A5550" stroke-width="0.6"/>
  <line x1="${x - tk}" y1="${y1 + tk}" x2="${x + tk}" y2="${y1 - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <line x1="${x - tk}" y1="${y2 + tk}" x2="${x + tk}" y2="${y2 - tk}" stroke="#5A5550" stroke-width="0.8" stroke-linecap="round"/>
  <rect x="${x - 5.5}" y="${my - th / 2}" width="11" height="${th}" fill="#f8f4ef"/>
  <text x="${x}" y="${my}" text-anchor="middle" dominant-baseline="central"
        font-size="8" font-weight="400" fill="#5A5550" letter-spacing="0.3"
        font-family="'Helvetica Neue',Arial,sans-serif"
        transform="rotate(-90 ${x} ${my})">${text}</text>`;
  }

  private affAnnotation(x: number, svgY: number, main: string, sub: string, above: boolean): string {
    const ty = above ? svgY - 5 : svgY - 3;
    const sy = above ? svgY - 14 : svgY + 9;
    // Rule 3.4: all 5 SVG text attrs explicit; Rule 1.1: leader + text use dim notation weight
    return `
  <line x1="${x - 6}" y1="${svgY}" x2="${x + 4}" y2="${svgY}" stroke="#5A5550" stroke-width="0.6"/>
  <text x="${x + 6}" y="${ty}" font-size="8" font-weight="600" fill="#5A5550"
        font-family="'Helvetica Neue',Arial,sans-serif" dominant-baseline="auto">${main}</text>
  ${sub ? `<text x="${x + 6}" y="${sy}" font-size="6.5" fill="#888"
        font-family="'Helvetica Neue',Arial,sans-serif" dominant-baseline="auto">${sub}</text>` : ''}`;
  }

  // ── Zone labels ───────────────────────────────────────────────────────────

  private renderLabels(): string {
    if (!this.options.showLabels) return '';

    const MAIN: Record<string, string> = {
      'double-hang':  'DOUBLE HANG',
      'long-hang':    'LONG HANG',
      'shoe-shelves': 'SHOE SHELVES',
      'drawers':      'DRAWERS',
      'top-shelves':  'SHELF',
      'accessories':  'ACCESSORIES',
    };

    let out = '\n  <!-- ═══ LABELS ═══ -->';

    for (const zone of this.layout.zones) {
      // Skip top-shelves — they get labelled by renderShelfZone
      if (zone.type === 'top-shelves' || zone.type === 'shoe-shelves' || zone.type === 'drawers' || zone.type === 'accessories') continue;

      const zcx = this.cx(zone.x + zone.width / 2);
      const zw  = zone.width * this.scale;
      // Clamp zone boundaries to the effective drawing canvas (0..drawH).
      // Zone heights in the engine span the full room height; raw zone.y+zone.height
      // can exceed drawH, yielding negative SVG y-coordinates and off-canvas labels.
      const clampedTop = Math.min(zone.y + zone.height, this.drawH);
      const clampedBot = Math.max(zone.y, 0);
      const zTopY  = this.cy(clampedTop);
      const zBotY  = this.cy(clampedBot);
      const zoneH  = zBotY - zTopY;

      // Issue 05 — For hanging zones, centre the label within the *actual hanging area*
      // (between floor/lower-rod and the top rod), not the full zone box which spans
      // floor-to-unit-top and causes the label to float above the garment silhouettes.
      let labelY = zTopY + zoneH / 2;
      if ((zone.type === 'long-hang' || zone.type === 'double-hang') && zone.rods?.length) {
        const sortedRods = [...zone.rods].sort((a, b) => a.height - b.height);
        if (zone.type === 'long-hang') {
          // Centre between floor and the single rod
          labelY = this.cy(clampedBot + 4);
        } else {
          // double-hang: centre between lower rod and upper rod
          const lowerRod = sortedRods[0].height;
          const upperRod = sortedRods[sortedRods.length - 1].height;
          labelY = this.cy((sortedRods.length === 1 ? clampedBot : lowerRod + 1.5) + 4);
        }
      }

      const mainLabel = zone.type === 'double-hang' && zone.rods?.length === 1 ? 'SINGLE HANG' : MAIN[zone.type] ?? zone.type.toUpperCase();
      // Font size scales with zone width but capped at 10px
      const fsMain = clamp(Math.min(zw / (mainLabel.length * 1.1), 10), 6.5, 10);

      // Rule 1.9: ALL CAPS ✅, letter-spacing ≥ 0.15em, color #3D2B1F inside zones
      out += `
  <text x="${zcx}" y="${labelY}" text-anchor="middle" dominant-baseline="central"
        textLength="${Math.min(zw - 6, mainLabel.length * (fsMain * .65 + 1.2))}" lengthAdjust="spacingAndGlyphs" font-size="${fsMain}" font-weight="400" fill="#3D2B1F" letter-spacing="0.06em"
        font-family="'Helvetica Neue','Arial Narrow',Arial,sans-serif">${mainLabel}</text>`;


    }

    return out;
  }

  // ── Title block ───────────────────────────────────────────────────────────

  private renderTitleBlock(): string {
    const y = this.MT + this.cH + 84;
    const center = this.totalW / 2;
    const wall = this.layout.walls[0];
    const d = this.layout.dimensions;
    return '<g fill="#333" font-family="Arial,sans-serif" text-anchor="middle">' +
      '<text x="' + center + '" y="' + y + '" font-size="12" font-weight="bold">' + (wall?.elevationRef ?? 'EL-A') + ' — ' + (wall?.label ?? 'BACK WALL') + '</text>' +
      '<text x="' + center + '" y="' + (y + 14) + '" font-size="8">' + formatInches(d.width) + ' wide · ' + formatInches(d.height) + ' ceiling · ' + d.depth + ' in cabinet depth</text>' +
      '<text x="' + center + '" y="' + (y + 27) + '" font-size="8">ALVÉO · PLANNING DRAWING · NOT TO SCALE</text></g>';
  }

  private closetTypeLabel(): string {
    const map: Record<string, string> = {
      'reach-in':      'REACH-IN CLOSET',
      'wardrobe-wall': 'WARDROBE WALL',
      'walkin-single': 'SINGLE-WALL WALK-IN',
      'walkin-l':      'L-SHAPE WALK-IN',
      'walkin-u':      'U-SHAPE WALK-IN',
      'island':        'ISLAND WALK-IN',
      'corridor':      'CORRIDOR WALK-IN',
    };
    return map[this.layout.closetType ?? ''] ?? 'CLOSET ELEVATION';
  }

  // ── Placeholder (no zones yet) ────────────────────────────────────────────

  private renderPlaceholder(): string {
    return `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:auto;display:block;background:#fafaf5;font-family:'Inter',Arial,sans-serif;">
  <rect x="60" y="40" width="580" height="300" fill="none" stroke="#d4c2a8"
        stroke-width="1.5" stroke-dasharray="6,4"/>
  <text x="350" y="186" text-anchor="middle" font-size="13" fill="#b5977a"
        font-weight="600" letter-spacing="2">COMPLETE ALL STEPS</text>
  <text x="350" y="204" text-anchor="middle" font-size="9" fill="#aaa">
    Your elevation drawing will appear here</text>
</svg>`;
  }
}
