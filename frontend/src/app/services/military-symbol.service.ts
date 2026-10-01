import { Injectable } from '@angular/core';
import { Style, Icon } from 'ol/style';

@Injectable({
  providedIn: 'root'
})
export class MilitarySymbolService {

  constructor() { }

  createSymbol(
      type: string, 
      branch: string, 
      diplomacy: string, 
      echelon: string, 
      templateName: string,
      parent: string, 
      resolution: number, 
      health: number = 100
  ): Style {
    const canvas = this.renderSymbolCanvas(type, branch, diplomacy, echelon, templateName, health);
    if (!canvas) return new Style({});

    let scale = 0.8;
    if (resolution > 100) scale = 0.4;
    else if (resolution > 20) scale = 0.6;

    return new Style({
      image: new Icon({
        img: canvas,
        scale: scale,
        anchor: [0.5, 0.5] 
      })
    });
  }

  getSymbolDataUrl(type: string, branch: string, diplomacy: string, echelon: string, templateName: string = '', health: number = 100): string {
    const canvas = this.renderSymbolCanvas(type, branch, diplomacy, echelon, templateName, health);
    if (!canvas) return '';
    try {
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  renderSymbolCanvas(
      type: string, 
      branch: string, 
      diplomacy: string, 
      echelon: string, 
      templateName: string,
      health: number = 100
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = 100;
    const height = 120; 
    canvas.width = width;
    canvas.height = height;
    
    const cx = width / 2;
    const cy = height / 2;
    const rectWidth = 70;
    const rectHeight = 50;

    // --- 1. DETERMINE COLOR ---
    // Strict Diplomacy Color (Never Grey)
    let color = '#0000ff'; // Blue
    if (diplomacy === 'ENEMY') color = '#ff0000'; // Red
    else if (diplomacy === 'NEUTRAL') color = '#00ff00'; // Green
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillStyle = color;

    // --- 2. DRAW FRAME ---
    let topY = cy - (rectHeight / 2); 
    ctx.beginPath();

    if (type === 'CAMP' || type.includes('BASE')) {
        ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
        topY = cy - 20;
    } 
    else if (diplomacy === 'ENEMY') {
        // Diamond
        ctx.moveTo(cx, cy - 35); 
        ctx.lineTo(cx + 35, cy); 
        ctx.lineTo(cx, cy + 35); 
        ctx.lineTo(cx - 35, cy); 
        ctx.lineTo(cx, cy - 35); 
        topY = cy - 35;
    }
    else if (diplomacy === 'NEUTRAL') {
        // Square
        ctx.rect(cx - 25, cy - 25, 50, 50);
        topY = cy - 25;
    }
    else {
        // Rectangle
        ctx.rect(cx - (rectWidth/2), cy - (rectHeight/2), rectWidth, rectHeight);
    }
    ctx.stroke();

    // --- 3. DRAW FLAG (HQ INDICATOR) ---
    if (type === 'FORMATION' || type === 'CAMP' || type.includes('BASE')) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color; 
        ctx.fillStyle = color;

        let startX = 0;
        let startY = 0;
        const poleLength = 35;

        if (type === 'CAMP' || type.includes('BASE')) { startX = cx - 20; startY = cy; } 
        else if (diplomacy === 'ENEMY') { startX = cx - 35; startY = cy; } 
        else if (diplomacy === 'NEUTRAL') { startX = cx - 25; startY = cy + 25; }
        else { startX = cx - (rectWidth/2); startY = cy + (rectHeight/2); }

        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, startY + poleLength);
        ctx.stroke();
        ctx.fill(); 
    }

    // --- 4. DRAW INTERNAL ICON ---
    ctx.beginPath();
    ctx.lineWidth = 2;
    // Reset color to Unit Color
    ctx.strokeStyle = color; 
    ctx.fillStyle = color;

    const n = templateName ? templateName.toUpperCase() : '';
    
    // --- A. SPECIALISTS ---
    
    if (n.includes('AIR DEFENSE') || n.includes('ANTI-AIRCRAFT') || n.includes('AAA') || n.includes('CHAPARRAL') || n.includes('RBS') || n.includes('ANTI-AÉRIEN') || n.includes('SOL-AIR') || n.includes('TRITUBE') || n.includes('BITUBE') || n.includes('GIRAFFE')) {
        const bottomY = cy + 25; 
        ctx.beginPath();
        ctx.arc(cx, bottomY, 20, Math.PI, 2 * Math.PI);
        ctx.stroke();
    }
    else if (n.includes('ENGINEER') || n.includes('GENIE') || n.includes('Génie') ) {
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 5); ctx.lineTo(cx + 15, cy - 5); 
        ctx.moveTo(cx - 15, cy - 5); ctx.lineTo(cx - 15, cy + 15); 
        ctx.moveTo(cx + 15, cy - 5); ctx.lineTo(cx + 15, cy + 15); 
        ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 15);
        ctx.stroke();
    }
    else if (n.includes('SIGNAL') || n.includes('TRANSMISSION')) {
        ctx.moveTo(cx - 5, cy - 15); ctx.lineTo(cx + 5, cy - 5);
        ctx.lineTo(cx - 5, cy + 5); ctx.lineTo(cx + 5, cy + 15);
        ctx.stroke();
    }
    else if (n.includes('MAINTENANCE') || n.includes('REPAIR') || n.includes('RECOVERY')) {
        ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx + 10, cy + 10);
        ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx - 10, cy + 10);
        ctx.stroke();
    }
    else if (n.includes('MEDICAL') || n.includes('AMBULANCE')) {
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
        ctx.stroke();
    }
    // 1. RESTORE TRANSPORT WHEEL
    else if (n.includes('LOGISTICS') || n.includes('SUPPLY') || n.includes('TRUCK') || n.includes('TRANSPORT')) {
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
        const off = 8.5;
        ctx.moveTo(cx - off, cy - off); ctx.lineTo(cx + off, cy + off);
        ctx.moveTo(cx + off, cy - off); ctx.lineTo(cx - off, cy + off);
        ctx.stroke();
    }
    // 2. ADD NEW SOUTIEN BLOCK
    else if (n.includes('SOUT') || n.includes('SOUTIEN') || n.includes('106') || n.includes('JEEP') || n.includes('ECLAIRAGE')) {
        ctx.font = 'bold 26px Arial'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SOUT', cx, cy + 2);
    }
    else if (n.includes('SPECIAL FORCES') || n.includes('COMMANDO') || n.includes('PARA') || n.includes('GFS')) {
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SF', cx, cy + 5);
    }

    // --- B. AIR / NAVY ---
    else if (n.includes('TRANSPORT') || n.includes('C-130') || n.includes('21ST')) {
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', cx, cy - 10);
        ctx.beginPath();
        const midY = cy + 12; const wingLen = 12; const wingH = 6;
        ctx.moveTo(cx, midY); ctx.lineTo(cx + wingLen, midY - wingH); ctx.lineTo(cx + wingLen, midY + wingH);
        ctx.moveTo(cx, midY); ctx.lineTo(cx - wingLen, midY - wingH); ctx.lineTo(cx - wingLen, midY + wingH);
        ctx.fill(); 
    }
    // ADDED: 'HIND', 'MI-24', 'HELO'
    else if (n.includes('HELICOPTER') || n.includes('ROTOR') || n.includes('OH-58') || n.includes('UH-60') || n.includes('AB-205') || n.includes('HIND') || n.includes('MI-24') || n.includes('HELO')) {
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', cx, cy - 10);
        ctx.beginPath();
        const midY = cy + 12; const wingLen = 12; const wingH = 6;
        ctx.moveTo(cx, midY); ctx.lineTo(cx + wingLen, midY - wingH); ctx.lineTo(cx + wingLen, midY + wingH);
        ctx.moveTo(cx, midY); ctx.lineTo(cx - wingLen, midY - wingH); ctx.lineTo(cx - wingLen, midY + wingH);
        ctx.fill(); 
    }
    // ADDED: 'MOHAJER'
    else if (n.includes('UAV') || n.includes('DRONE') || n.includes('ANKA') || n.includes('ISR') || n.includes('MOHAJER')) {
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('D', cx, cy - 10);
        ctx.beginPath();
        const midY = cy + 12; const wingLen = 12; const wingH = 6;
        ctx.moveTo(cx, midY); ctx.lineTo(cx + wingLen, midY - wingH); ctx.lineTo(cx + wingLen, midY + wingH);
        ctx.moveTo(cx, midY); ctx.lineTo(cx - wingLen, midY - wingH); ctx.lineTo(cx - wingLen, midY + wingH);
        ctx.fill(); 
    }
    // ADDED: 'SU-', 'MIG-', 'CAS', 'JET', 'SQDN', 'WING'
    else if (n.includes('AIR') || n.includes('FIGHTER') || n.includes('NORTHROP') || n.includes('SU-') || n.includes('MIG-') || n.includes('CAS') || n.includes('JET') || n.includes('SQDN') || n.includes('WING')) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.bezierCurveTo(cx-15, cy-15, cx-30, cy-15, cx-30, cy);
        ctx.bezierCurveTo(cx-30, cy+15, cx-15, cy+15, cx, cy);
        ctx.bezierCurveTo(cx+15, cy-15, cx+30, cy-15, cx+30, cy);
        ctx.bezierCurveTo(cx+30, cy+15, cx+15, cy+15, cx, cy);
        ctx.stroke();
    }
    // ADDED: 'FREGATE', 'FRÉGATE', 'CORVETTE', 'VEDETTE', 'BÂTIMENT', 'SUBMARINE', 'PLM', 'VRI', 'ISLAND', 'FLEET'
    else if (
  n.includes('NAVY') ||
  n.includes('SHIP') ||
  n.includes('PATROL') ||
  n.includes('SEA') ||
  n.includes('32ND') ||
  n.includes('31ST') ||
  n.includes('COMBATTANTE') ||
  n.includes('ALBATROS') ||
  n.includes('OPV') ||
  n.includes('FREGATE') ||
  n.includes('FRÉGATE') ||
  n.includes('CORVETTE') ||
  n.includes('VEDETTE') ||
  n.includes('BÂTIMENT') ||
  n.includes('SUBMARINE') ||
  n.includes('PLM') ||
  n.includes('VRI') ||
  n.includes('ISLAND') ||
  n.includes('FLEET') ||
  n.includes('NAVAL') ||
  n.includes('MARITIME') ||
  n.includes('BOAT') ||
  n.includes('VESSEL') ||
  n.includes('FRIGATE') ||
  n.includes('CRAFT') ||
  n.includes('DESTROYER') ||
  n.includes('CARRIER') ||
  n.includes('CRUISER') ||
  n.includes('AMPHIBIOUS') ||
  n.includes('LANDING') ||
  n.includes('MINESWEEPER') ||
  n.includes('FLOTILLA') ||
  n.includes('HIMILCON') ||
  n.includes('JUGURTHA') ||
  n.includes('SYPHAX') ||
  n.includes('HANNON') ||
  n.includes('SOPHONISBE') ||
  n.includes('GALITE') ||
  n.includes('CARTHAGE') ||
  n.includes('HAMILCAR') ||
  n.includes('HANOUN') ||
  n.includes('HANNIBAL') ||
  n.includes('HASDRUBAL') ||
  n.includes('GISCON') ||
  n.includes('ISTIKLAL') ||
  n.includes('UTIQUE') ||
  n.includes('KERKOUANE') ||
  n.includes('DOUGGA') ||
  n.includes('PR ') ||
  n.includes('P305') ||
  n.includes('P30') ||
  n.includes('P20') ||
  n.includes('P10') ||
  n.includes('V10') ||
  n.includes('PATROUILLE') ||
  n.includes('PATROUILLEUR') ||
  n.includes('LANCE-MISSILES') ||
  n.includes('LANCE') ||
  n.includes('MISSILE') ||
  n.includes('MISSILES') ||
  n.includes('INTERVENTION') ||
  n.includes('RAPIDE') ||
  n.includes('DEBARQUEMENT') ||
  n.includes('DÉBARQUEMENT') ||
  n.includes('ESCORTE') ||
  n.includes('TORPILLE') ||
  n.includes('HAUTE-MER') ||
  n.includes('COTIERE') ||
  n.includes('CÔTIERE') ||
  n.includes('FAST ATTACK') ||
  n.includes('PATROL') ||
  n.includes('HIGH SEAS PATROL')
) {
        const numWaves = 5; const spacing = 10; const waveHeight = 12;
        const startX = cx - ((numWaves - 1) * spacing) / 2;
        ctx.beginPath();
        for (let i = 0; i < numWaves; i++) {
            const wx = startX + i * spacing;
            ctx.moveTo(wx, cy - waveHeight);
            ctx.bezierCurveTo(wx + 5, cy - 5, wx - 5, cy + 5, wx, cy + waveHeight);
        }
        ctx.stroke();
    }

    // --- C. COMBAT ARMS ---
    else if (n.includes('MECH')) {
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        ctx.moveTo(cx - w, cy - h); ctx.lineTo(cx + w, cy + h);
        ctx.moveTo(cx + w, cy - h); ctx.lineTo(cx - w, cy + h);
        ctx.stroke();
        ctx.beginPath();
        // The Oval representing Tracks (Mechanized)
        ctx.ellipse(cx, cy, 15, 8, 0, 0, 2 * Math.PI);
        ctx.stroke();
    }
    // 1. MILAN / TOW (Guided Missile Arch)
    else if (n.includes('MILAN') || n.includes('TOW')) {
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        
        ctx.beginPath();
        // Inverted V
        ctx.moveTo(cx - w, cy + h); 
        ctx.lineTo(cx, cy); 
        ctx.lineTo(cx + w, cy + h);
        
        // The Missile Arch (Half Ellipse from 180 deg to 360 deg)
        ctx.moveTo(cx + 10, cy + h);
        ctx.ellipse(cx, cy + h, 10, 15, 0, 0, Math.PI, true); 
        
        // The Vertical Line
        ctx.moveTo(cx, cy + h);
        ctx.lineTo(cx, cy + h - 15);
        ctx.stroke();
    }
    else if (n.includes('ANTI-TANK') || n.includes('ANTI-CHAR') || n.includes('ATGM')) {
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        // Draws from bottom-left to center to bottom-right
        ctx.moveTo(cx - w, cy + h); 
        ctx.lineTo(cx, cy); 
        ctx.lineTo(cx + w, cy + h);
        ctx.stroke();
    }
    else if (n.includes('MOTORIZED') || n.includes('MOTORIS') || n.includes('LIGHT INFANTRY')) {
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        
        // 1. Draw standard Infantry 'X'
        ctx.moveTo(cx - w, cy - h); ctx.lineTo(cx + w, cy + h);
        ctx.moveTo(cx + w, cy - h); ctx.lineTo(cx - w, cy + h);
        ctx.stroke();
        
        // 2. Draw the 3 Wheels (Circles) horizontally across the middle
        const radius = 6;
        const spacing = 15;
        
        ctx.beginPath();
        ctx.arc(cx - spacing, cy, radius, 0, 2 * Math.PI); // Left Wheel
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI); // Center Wheel
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx + spacing, cy, radius, 0, 2 * Math.PI); // Right Wheel
        ctx.stroke();
    }
    else if (n.includes('TANK') || n.includes('ARMOR') || n.includes('CHAR') || n.includes('M60') ) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 8, 0, 0, 2 * Math.PI);
        ctx.stroke();
    }
    // 1. HEAVY MORTAR (120mm / Lourd)
    else if (n.includes('120MM') || n.includes('LOURD') || n.includes('HEAVY MORTAR')) {
        ctx.beginPath();
        // Dome Baseplate (Flat bottom, curved top)
        ctx.moveTo(cx - 8, cy + 12);
        ctx.lineTo(cx + 8, cy + 12);
        ctx.arc(cx, cy + 12, 8, 0, Math.PI, true); // true = counter-clockwise arch
        ctx.closePath();
        ctx.stroke();
        
        ctx.beginPath();
        // Vertical Shaft
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx, cy - 15);
        
        // Double Horizontal Crossbars
        ctx.moveTo(cx - 10, cy - 2);
        ctx.lineTo(cx + 10, cy - 2);
        ctx.moveTo(cx - 10, cy + 4);
        ctx.lineTo(cx + 10, cy + 4);
        
        // Arrowhead
        ctx.moveTo(cx - 5, cy - 8);
        ctx.lineTo(cx, cy - 15);
        ctx.lineTo(cx + 5, cy - 8);
        ctx.stroke();
    }
    // NEW: MORTAR
    else if (n.includes('MORTAR') || n.includes('MORTI') || n.includes('81MM') || n.includes('120MM')) {
        ctx.beginPath();
        ctx.arc(cx, cy + 12, 6, 0, 2 * Math.PI); // Baseplate Circle
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(cx, cy + 6);   // Shaft Start
        ctx.lineTo(cx, cy - 15);  // Shaft End
        
        ctx.moveTo(cx - 10, cy - 2); // Crossbar Left
        ctx.lineTo(cx + 10, cy - 2); // Crossbar Right
        
        ctx.moveTo(cx - 5, cy - 8);  // Arrowhead Left
        ctx.lineTo(cx, cy - 15);     // Arrowhead Tip
        ctx.lineTo(cx + 5, cy - 8);  // Arrowhead Right
        ctx.stroke();
    }
    else if (n.includes('ARTILLERY') || n.includes('BATTERY') || n.includes('MORTAR') || n.includes('M198')) {
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
    // NEW: Soutien / Logistique (Draws the "SOUT" text inside the box)
    else if (n.includes('SOUTIEN') || n.includes('SOUT') || n.includes('LOGISTIQUE')) {
        ctx.font = 'bold 26px Arial'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SOUT', cx, cy + 2);
    }
    // UPDATED: Added 'ECLAIRAGE' to trigger the diagonal Recon slash
    else if (n.includes('RECON') || n.includes('SCOUT') || n.includes('ECLAIRAGE')) {
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        ctx.moveTo(cx - w, cy + h); ctx.lineTo(cx + w, cy - h);
        ctx.stroke();
    }
    else {
        // Default Infantry
        const w = (diplomacy==='NEUTRAL' ? 25 : 35);
        const h = 25;
        ctx.moveTo(cx - w, cy - h); ctx.lineTo(cx + w, cy + h);
        ctx.moveTo(cx + w, cy - h); ctx.lineTo(cx - w, cy + h);
        ctx.stroke();
    }

    // --- 5. DRAW ECHELON ---
    if (echelon) {
        let symbol = '';
        if (n.includes('BRIGADE')) symbol = 'X';
        else if (n.includes('REGIMENT')) symbol = '|||';
        else if (n.includes('BATTALION') || n.includes('BATAILLON')) symbol = '||';
        else if (n.includes('COMPANY') || n.includes('COMPAGNIE') || n.includes('ESCADRON')) symbol = '|';
        
        // Platoon / Section / Peloton = 3 Dots
        else if (n.includes('PLATOON') || n.includes('SECTION') || n.includes('PELOTON')) symbol = '●●●';
        
        // Squad / Groupe = 2 Dots
        else if (n.includes('SQUAD') || n.includes('GROUPE')) symbol = '●●';
        
        // Team / Equipe = 1 Dot
        else if (n.includes('TEAM') || n.includes('EQUIPE')) symbol = '●';
        
        else if (n.includes('GPT') || n.includes('GROUPEMENT')) symbol = '||';

        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = color; 
        const yPos = topY - 5;
        ctx.fillText(symbol, cx, yPos);

        // GT Hat
        if (n.includes('GPT') || n.includes('GROUPEMENT')) {
            ctx.beginPath(); ctx.lineWidth = 2;
            const hatW = 26; const hatH = 14; const hatY = topY;
            ctx.moveTo(cx - hatW/2, hatY);
            ctx.lineTo(cx - hatW/2, hatY - hatH);
            ctx.lineTo(cx + hatW/2, hatY - hatH);
            ctx.lineTo(cx + hatW/2, hatY);
            ctx.stroke();
        }
    }

    // ========================================================
    // === 6. THE FIX: SKULL OVERLAY (Using Text Variant) ===
    // ========================================================
    if (health <= 0) {
        // Use a large font size
        ctx.font = '45px Arial'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 1. Draw WHITE Outline (Stroke) so it pops against the blue/red lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        
        // Use the Text Variation Selector \uFE0E to force text rendering
        ctx.strokeText('\uD83D\uDC80\uFE0E', cx, cy + 5); 

        // 2. Draw BLACK Fill (The Skull itself)
        ctx.fillStyle = '#000000';
        ctx.fillText('\uD83D\uDC80\uFE0E', cx, cy + 5);
    }

    return canvas;
  }
  // Helper to match your Python script's naming convention
  private mapBranchToFilename(code: string): string {
      const c = code.toUpperCase();
      
      if (c === 'INFANTRY') return 'infantry';
      if (c.includes('MOTORIZED') || c.includes('MOTORIS') || c.includes('LIGHT')) return 'motorized_infantry';
      if (c === 'MECH') return 'mechinized_infantry'; // Note: Python script had 'mechinized' typo?
      if (c === 'ARMOR' || c === 'TANK') return 'armor';
      if (c === 'RECON' || c === 'SCOUT') return 'recon';
      if (c === 'ARTILLERY') return 'artillery';
      if (c === 'AIR_DEFENSE') return 'anti_aircraft';
      if (c === 'ENGINEER') return 'engineer';
      if (c === 'SIGNALS') return 'signal';
      if (c === 'TRANSPORT' || c === 'LOGISTICS') return 'transport';
      if (c === 'MAINTENANCE') return 'transport'; // Fallback if no maint icon
      if (c === 'MEDICAL') return 'transport';     // Fallback
      if (c === 'MP') return 'military_police';
      if (c === 'SOF') return 'special_force';
      
      // Air
      if (c === 'HELICOPTER') return 'helicopter';
      if (c === 'UAV' || c === 'DRONE') return 'drone_uav';
      if (c === 'AIR') return 'air_unit';
      if (c === 'NAVY') return 'naval_unit';

      return 'infantry'; // Default Fallback
  }
   getDeterminedBranch(data: any): string {
    let branch = 'INFANTRY';
    const isFormation = data.hasOwnProperty('units') || (data.children && data.children.length > 0); 
    const template = data.template_used || {};

    // 0. ROBUST NAVY CHECK (Template / Icon)
    // If the unit comes from the Seed Script, it has branch="NAVY" or icon_path="assets/navy/..."
    if (template.branch === 'NAVY') return 'NAVY';
    if (template.type === 'NAVAL_VESSEL') return 'NAVY';
    if (template.branch === 'AIR_FORCE' || template.branch === 'AIR') return 'AIR';
    if (template.icon_path && template.icon_path.toLowerCase().includes('navy')) return 'NAVY';

    // 1. Direct Domain (Unit)
    if (data.domain === 'SEA') branch = 'NAVY';
    else if (data.domain === 'AIR') branch = 'AIR';
    
    // 2. Child Inspection (Formation) — check template branch first, then domain, then name
    else if (isFormation && data.units && data.units.length > 0) {
        const firstUnit = data.units[0];
        const firstTemplate = (firstUnit && firstUnit.template_used) ? firstUnit.template_used : {};

        // 2a. Child unit's template branch — most reliable, works regardless of domain field
        if (firstTemplate.branch === 'NAVY') return 'NAVY';
        if (firstTemplate.type === 'NAVAL_VESSEL') return 'NAVY';
        if (firstTemplate.branch === 'AIR_FORCE' || firstTemplate.branch === 'AIR') return 'AIR';
        if (firstTemplate.icon_path && firstTemplate.icon_path.toLowerCase().includes('navy')) return 'NAVY';

        // 2b. Child unit domain (fallback)
        const firstDom = firstUnit.domain;
        if (firstDom === 'SEA') branch = 'NAVY';
        else if (firstDom === 'AIR') branch = 'AIR';
        else branch = this.getBranchFromName(data.name);
    }
    
    // 3. Name Fallback
    else branch = this.getBranchFromName(data.name);
    
    return branch;
  }
  getBranchFromName(n: string): string {
      const name = n ? n.toUpperCase() : '';
      
      // 1. AIR CHECK
      const airKeys = [
          'AIR', 'HELO', 'HELICOPTER', 'FIGHTER', 'UAV', 'DRONE', 'JET', 
          'SU-', 'MIG-', 'MI-', 'MOHAJER', 'CAS', 'ANKA', 'NORTHROP', 
          'SQDN', 'WING', 'AVIATION', 'UH-60', 'C-130', 'AWACS', 'HIND'
      ];
      if (airKeys.some(k => name.includes(k))) return 'AIR';

      // 2. NAVY CHECK
      const navyKeys = [
          'NAVY','FLEET','SHIP','PATROL','FREGATE','FRÉGATE','CORVETTE','VEDETTE','BÂTIMENT',
          'SUBMARINE','OPV','COMBATTANTE','ALBATROS','ISLAND','VRI','NAVAL','MARITIME',
          'BOAT','VESSEL','FRIGATE','CRAFT','DESTROYER','CARRIER','CRUISER','AMPHIBIOUS',
          'LANDING','MINESWEEPER','FLOTILLA','HIMILCON','JUGURTHA','SYPHAX','HANNON',
          'SOPHONISBE','GALITE','CARTHAGE','HAMILCAR','HANOUN','HANNIBAL','HASDRUBAL',
          'GISCON','ISTIKLAL','UTIQUE','KERKOUANE','DOUGGA','PLM','PR','P305','LANCE-MISSILES',
          'PATROUILLEUR','P30','P20','P10','V10','INTERVENTION','RAPIDE','DEBARQUEMENT','DÉBARQUEMENT',
          'LANCE','MISSILE','MISSILES','ESCORTE','TORPILLE','HAUTE-MER','COTIERE','CÔTIERE',
          'FAST ATTACK','PATROL','HIGH SEAS PATROL'
      ];
      if (navyKeys.some(k => name.includes(k))) return 'NAVY';

      // 3. AIR DEFENSE CHECK
      const airDefKeys = [
          'AIR DEFENSE', 'ANTI-AÉRIEN', 'SOL-AIR', 'AAA', 'RBS', 
          'TRITUBE', 'BITUBE', 'GIRAFFE', 'SAM', 'ANTI-AIRCRAFT', 'CHAPARRAL'
      ];
      if (airDefKeys.some(k => name.includes(k))) return 'AIR_DEFENSE';

      // 4. GROUND CHECKS
      if (name.includes('ENGINEER') || name.includes('GENIE')) return 'ENGINEER';
      if (name.includes('SIGNAL') || name.includes('TRANSMISSION')) return 'SIGNALS';
      if (name.includes('MAINTENANCE') || name.includes('REPAIR')) return 'MAINTENANCE';
      if (name.includes('MEDICAL') || name.includes('AMBULANCE')) return 'MEDICAL';
      if (name.includes('TRANSPORT') || name.includes('LOGISTICS') || name.includes('SUPPLY') || name.includes('TRUCK')) return 'TRANSPORT';
      if (name.includes('SPECIAL FORCES') || name.includes('COMMANDO') || name.includes('PARA') || name.includes('GFS')) return 'SOF';
      if (name.includes('MECH') || name.includes('MOTORIZED')) return 'MECH'; 
      if (name.includes('TANK') || name.includes('ARMOR') || name.includes('CHAR') || name.includes('M60')) return 'ARMOR';
      if (name.includes('ARTILLERY') || name.includes('BATTERY') || name.includes('MORTAR') || name.includes('MORTI')) return 'ARTILLERY';
      if (name.includes('RECON') || name.includes('SCOUT') || name.includes('CAVALRY') || name.includes('ECLAIRAGE') || name.includes('PEI')) return 'RECON';
      
      return 'INFANTRY'; // Fallback
  }
}