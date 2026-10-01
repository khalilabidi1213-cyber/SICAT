// src/app/layout/layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AuthService } from '../auth.service';
import { AppStateService, MilitaryUnit, ToastNotification } from '../services/app-state.service';
import { MilitarySymbolService } from '../services/military-symbol.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUsername: string = 'Commander';
  zuluClock: string = '';
  private clockTimer: any;
  private subs: Subscription[] = [];

  // Sidebar Controls
  sidebarOpen: boolean = true;
  activeTab: 'orbat' | 'deploy' | 'layers' | 'intel' = 'orbat';
  orbatFilter: 'ALL' | 'FRIEND' | 'ENEMY' = 'ALL';
  searchQuery: string = '';

  // Units & Telemetry
  allUnits: MilitaryUnit[] = [];
  filteredUnits: MilitaryUnit[] = [];
  blueForces: MilitaryUnit[] = [];
  redForces: MilitaryUnit[] = [];

  // Global totals & Analytics
  stats = {
    off: 0,
    soff: 0,
    trp: 0,
    ready: 0,
    sick: 0,
    dead: 0,
    missing: 0,
    total: 0,
    readyRate: 0,
    blueTotal: 0,
    redTotal: 0,
    forceRatio: '1.0 : 1'
  };

  // Base map & layer toggles
  activeBaseMap: 'dark' | 'satellite' | 'topo' | 'osm' = 'dark';
  layersConfig = {
    showUnits: true,
    showDrawings: true,
    showRangeRings: true,
    showLabels: true,
    showGraticule: false
  };

  // Unit Deployment Form & Live Symbol Preview
  livePreviewSymbolDataUrl: string = '';
  newUnit: MilitaryUnit = {
    name: '1st Mechanized Brigade',
    diplomacy: 'FRIEND',
    branch: 'INFANTRY',
    echelon: 'BRIGADE',
    lat: 36.8065,
    lng: 10.1815,
    personnel_officers: 80,
    personnel_sous_officers: 310,
    personnel_troupe: 1600,
    personnel_ready: 1850,
    personnel_sick: 75,
    personnel_dead: 15,
    personnel_missing: 10,
    weapons: 'M4A1 (1600), Javelin ATGM (32), 81mm Mortar (12)',
    ammo: '5.56mm NATO (150k), 81mm HE (900)'
  };

  // Table & Dashboard Drawer
  isTableOpen: boolean = false;
  tableDrawerMode: 'half' | 'max' = 'half';
  tableSortColumn: string = 'name';
  tableSortAsc: boolean = true;
  tableFilterForce: 'ALL' | 'FRIEND' | 'ENEMY' = 'ALL';

  // Modals
  editingUnit: MilitaryUnit | null = null;
  unitToDelete: MilitaryUnit | null = null;
  showLogoutModal: boolean = false;

  // Mission Notes
  missionNotes: string = '';

  // Toasts
  toasts: ToastNotification[] = [];

  constructor(
    private authService: AuthService,
    public appState: AppStateService,
    private symbolService: MilitarySymbolService
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.currentUsername = localStorage.getItem('username') || 'Commander';
      this.missionNotes = localStorage.getItem('sicat_mission_notes') || 'Tactical theater: Northern Sector. Sector DEFCON 2. Secure lines of communication along Route National 1.';
    }

    this.startZuluClock();

    // Subscribe to Units
    this.subs.push(
      this.appState.units$.subscribe(units => {
        this.allUnits = units;
        this.blueForces = units.filter(u => u.diplomacy === 'FRIEND');
        this.redForces = units.filter(u => u.diplomacy === 'ENEMY');
        this.calculateStats(units);
        this.applyOrbatFilter();
      })
    );

    // Subscribe to BaseMap
    this.subs.push(
      this.appState.activeBaseMap$.subscribe(bm => {
        this.activeBaseMap = bm;
      })
    );

    // Subscribe to Layer Config
    this.subs.push(
      this.appState.layersConfig$.subscribe(cfg => {
        this.layersConfig = { ...cfg };
      })
    );

    // Subscribe to Picked Coordinates from Map
    this.subs.push(
      this.appState.pickedCoordinates$.subscribe(coords => {
        if (coords) {
          this.newUnit.lat = parseFloat(coords.lat.toFixed(4));
          this.newUnit.lng = parseFloat(coords.lng.toFixed(4));
          this.switchTab('deploy');
        }
      })
    );

    // Subscribe to Toasts
    this.subs.push(
      this.appState.toasts$.subscribe(t => {
        this.toasts = t;
      })
    );

    this.updateLiveSymbolPreview();
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  private startZuluClock(): void {
    const update = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = monthNames[now.getUTCMonth()];
      const year = now.getUTCFullYear();
      this.zuluClock = `${hours}:${mins}:${secs} ZULU // ${day} ${month} ${year}`;
    };

    update();
    this.clockTimer = setInterval(update, 1000);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  switchTab(tab: 'orbat' | 'deploy' | 'layers' | 'intel'): void {
    this.activeTab = tab;
    if (tab === 'deploy') {
      this.updateLiveSymbolPreview();
    }
  }

  setOrbatFilter(filter: 'ALL' | 'FRIEND' | 'ENEMY'): void {
    this.orbatFilter = filter;
    this.applyOrbatFilter();
  }

  applyOrbatFilter(): void {
    let list = this.allUnits;

    if (this.orbatFilter === 'FRIEND') {
      list = list.filter(u => u.diplomacy === 'FRIEND');
    } else if (this.orbatFilter === 'ENEMY') {
      list = list.filter(u => u.diplomacy === 'ENEMY');
    }

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.branch && u.branch.toLowerCase().includes(q)) ||
        (u.echelon && u.echelon.toLowerCase().includes(q)) ||
        (u.weapons && u.weapons.toLowerCase().includes(q))
      );
    }

    this.filteredUnits = list;
  }

  onSearchChange(): void {
    this.applyOrbatFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyOrbatFilter();
  }

  calculateStats(units: MilitaryUnit[]): void {
    const off = units.reduce((sum, u) => sum + (Number(u.personnel_officers) || 0), 0);
    const soff = units.reduce((sum, u) => sum + (Number(u.personnel_sous_officers) || 0), 0);
    const trp = units.reduce((sum, u) => sum + (Number(u.personnel_troupe) || 0), 0);
    const ready = units.reduce((sum, u) => sum + (Number(u.personnel_ready) || 0), 0);
    const sick = units.reduce((sum, u) => sum + (Number(u.personnel_sick) || 0), 0);
    const dead = units.reduce((sum, u) => sum + (Number(u.personnel_dead) || 0), 0);
    const missing = units.reduce((sum, u) => sum + (Number(u.personnel_missing) || 0), 0);
    const total = off + soff + trp;

    const blueTotal = units.filter(u => u.diplomacy === 'FRIEND')
      .reduce((sum, u) => sum + (Number(u.personnel_officers) || 0) + (Number(u.personnel_sous_officers) || 0) + (Number(u.personnel_troupe) || 0), 0);

    const redTotal = units.filter(u => u.diplomacy === 'ENEMY')
      .reduce((sum, u) => sum + (Number(u.personnel_officers) || 0) + (Number(u.personnel_sous_officers) || 0) + (Number(u.personnel_troupe) || 0), 0);

    const readyRate = total > 0 ? Math.min(100, Math.round((ready / total) * 100)) : 100;
    
    let forceRatio = '1.0 : 1';
    if (redTotal > 0) {
      forceRatio = `${(blueTotal / redTotal).toFixed(1)} : 1`;
    }

    this.stats = {
      off, soff, trp, ready, sick, dead, missing,
      total, readyRate, blueTotal, redTotal, forceRatio
    };
  }

  updateLiveSymbolPreview(): void {
    if (typeof window === 'undefined') return;
    try {
      this.livePreviewSymbolDataUrl = this.symbolService.getSymbolDataUrl(
        'FORMATION',
        this.newUnit.branch,
        this.newUnit.diplomacy,
        this.newUnit.echelon,
        this.newUnit.branch,
        100
      );
    } catch {
      this.livePreviewSymbolDataUrl = '';
    }
  }

  quickFillPreset(type: string): void {
    if (type === 'infantry') {
      this.newUnit = {
        name: '4th Marine Infantry Regt',
        diplomacy: 'FRIEND',
        branch: 'INFANTRY',
        echelon: 'REGIMENT',
        lat: 36.8150,
        lng: 10.2200,
        personnel_officers: 55,
        personnel_sous_officers: 210,
        personnel_troupe: 1100,
        personnel_ready: 1320,
        personnel_sick: 30,
        personnel_dead: 10,
        personnel_missing: 5,
        weapons: 'M4A1 (1200), Javelin ATGM (24), Mortar 81mm (12)',
        ammo: '5.56 NATO (120k), 81mm HE (800)'
      };
    } else if (type === 'armor') {
      this.newUnit = {
        name: '2nd Royal Tank Battalion',
        diplomacy: 'FRIEND',
        branch: 'ARMOR',
        echelon: 'BATTALION',
        lat: 36.7820,
        lng: 10.1450,
        personnel_officers: 32,
        personnel_sous_officers: 140,
        personnel_troupe: 450,
        personnel_ready: 590,
        personnel_sick: 20,
        personnel_dead: 8,
        personnel_missing: 4,
        weapons: 'M1A2 SEPv3 (36), Bradley M2A3 (42)',
        ammo: '120mm APFSDS (1100), TOW-2B (120)'
      };
    } else if (type === 'artillery') {
      this.newUnit = {
        name: '8th Field Artillery Battery',
        diplomacy: 'FRIEND',
        branch: 'ARTILLERY',
        echelon: 'COMPANY',
        lat: 36.7150,
        lng: 10.0850,
        personnel_officers: 14,
        personnel_sous_officers: 45,
        personnel_troupe: 160,
        personnel_ready: 210,
        personnel_sick: 6,
        personnel_dead: 2,
        personnel_missing: 1,
        weapons: 'M109A7 Paladin 155mm (8), M777A2 (6)',
        ammo: '155mm HE (2200), Excalibur PG (120)'
      };
    } else if (type === 'recon') {
      this.newUnit = {
        name: '12th Armored Scout Troop',
        diplomacy: 'FRIEND',
        branch: 'RECON',
        echelon: 'COMPANY',
        lat: 36.8520,
        lng: 10.2800,
        personnel_officers: 10,
        personnel_sous_officers: 38,
        personnel_troupe: 95,
        personnel_ready: 138,
        personnel_sick: 4,
        personnel_dead: 0,
        personnel_missing: 1,
        weapons: 'JLTV (18), Puma UAV (4), M110 SASS (12)',
        ammo: '7.62 NATO (45k), 12.7mm (20k)'
      };
    } else if (type === 'enemy_force') {
      this.newUnit = {
        name: 'Red Strike Shock Bn',
        diplomacy: 'ENEMY',
        branch: 'ARMOR',
        echelon: 'BATTALION',
        lat: 36.9600,
        lng: 10.3900,
        personnel_officers: 40,
        personnel_sous_officers: 150,
        personnel_troupe: 580,
        personnel_ready: 710,
        personnel_sick: 35,
        personnel_dead: 15,
        personnel_missing: 10,
        weapons: 'T-90MS (31), BMP-3M (42), Kornet-D (12)',
        ammo: '125mm APFSDS (950), Kornet-EM (80)'
      };
    }
    this.updateLiveSymbolPreview();
  }

  pickCoordsFromMap(): void {
    this.appState.startPickingCoordinates();
  }

  submitDeployUnit(): void {
    const toDeploy: MilitaryUnit = { ...this.newUnit };
    this.appState.addUnit(toDeploy);

    // Shift coordinates slightly for next deploy
    this.newUnit.lat = parseFloat((this.newUnit.lat + 0.025).toFixed(4));
    this.newUnit.lng = parseFloat((this.newUnit.lng + 0.025).toFixed(4));
    this.newUnit.name = 'Unit ' + (this.allUnits.length + 1);
  }

  locateUnit(unit: MilitaryUnit): void {
    this.appState.selectUnit(unit);
  }

  openEditModal(unit: MilitaryUnit): void {
    this.editingUnit = JSON.parse(JSON.stringify(unit));
  }

  closeEditModal(): void {
    this.editingUnit = null;
  }

  saveEditUnit(): void {
    if (!this.editingUnit) return;
    this.appState.updateUnit(this.editingUnit);
    this.editingUnit = null;
  }

  promptDeleteUnit(unit: MilitaryUnit): void {
    this.unitToDelete = unit;
  }

  cancelDelete(): void {
    this.unitToDelete = null;
  }

  confirmDeleteUnit(): void {
    if (!this.unitToDelete || !this.unitToDelete.id) return;
    this.appState.deleteUnit(this.unitToDelete.id);
    this.unitToDelete = null;
  }

  // Base map & layer toggles
  setBaseMap(mode: 'dark' | 'satellite' | 'topo' | 'osm'): void {
    this.appState.setBaseMap(mode);
  }

  toggleLayer(key: 'showUnits' | 'showDrawings' | 'showRangeRings' | 'showLabels' | 'showGraticule'): void {
    this.appState.toggleLayerConfig(key);
  }

  resetScenario(): void {
    this.appState.resetUnitsToDefault();
  }

  // Table & Dashboard Drawer
  toggleTableDrawer(): void {
    this.isTableOpen = !this.isTableOpen;
  }

  setTableDrawerMode(mode: 'half' | 'max'): void {
    this.tableDrawerMode = mode;
  }

  sortTable(column: string): void {
    if (this.tableSortColumn === column) {
      this.tableSortAsc = !this.tableSortAsc;
    } else {
      this.tableSortColumn = column;
      this.tableSortAsc = true;
    }
  }

  get sortedTableUnits(): MilitaryUnit[] {
    let list = [...this.allUnits];

    if (this.tableFilterForce === 'FRIEND') {
      list = list.filter(u => u.diplomacy === 'FRIEND');
    } else if (this.tableFilterForce === 'ENEMY') {
      list = list.filter(u => u.diplomacy === 'ENEMY');
    }

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.branch && u.branch.toLowerCase().includes(q)) ||
        (u.echelon && u.echelon.toLowerCase().includes(q)) ||
        (u.weapons && u.weapons.toLowerCase().includes(q))
      );
    }

    list.sort((a: any, b: any) => {
      let valA = a[this.tableSortColumn];
      let valB = b[this.tableSortColumn];

      if (this.tableSortColumn === 'total') {
        valA = (a.personnel_officers || 0) + (a.personnel_sous_officers || 0) + (a.personnel_troupe || 0);
        valB = (b.personnel_officers || 0) + (b.personnel_sous_officers || 0) + (b.personnel_troupe || 0);
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.tableSortAsc ? -1 : 1;
      if (valA > valB) return this.tableSortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }

  exportCSV(): void {
    if (typeof window === 'undefined') return;
    const headers = ['ID', 'Name', 'Affiliation', 'Branch', 'Echelon', 'Lat', 'Lng', 'Officers', 'Sous-Off', 'Troupe', 'Total', 'Ready', 'Sick', 'Casualties', 'Missing', 'Weapons', 'Ammo'];
    const rows = this.allUnits.map(u => [
      u.id || '',
      `"${(u.name || '').replace(/"/g, '""')}"`,
      u.diplomacy,
      u.branch,
      u.echelon,
      u.lat,
      u.lng,
      u.personnel_officers,
      u.personnel_sous_officers,
      u.personnel_troupe,
      u.personnel_officers + u.personnel_sous_officers + u.personnel_troupe,
      u.personnel_ready,
      u.personnel_sick,
      u.personnel_dead,
      u.personnel_missing,
      `"${(u.weapons || '').replace(/"/g, '""')}"`,
      `"${(u.ammo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SICAT_ORBAT_DEPLOYMENT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.appState.showToast('Export Complete', 'Force deployment CSV exported successfully', 'success');
  }

  exportJSON(): void {
    if (typeof window === 'undefined') return;
    const data = {
      system: 'SICAT C4ISR',
      exportDate: new Date().toISOString(),
      theaterSummary: this.stats,
      units: this.allUnits
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SICAT_MISSION_DATA_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.appState.showToast('Export Complete', 'Mission JSON state exported successfully', 'success');
  }

  printReport(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  saveMissionNotes(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('sicat_mission_notes', this.missionNotes);
      this.appState.showToast('Notes Saved', 'Tactical notes stored to local terminal session', 'info');
    }
  }

  toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  promptLogout(): void {
    this.showLogoutModal = true;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout();
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  calculateUnitReadiness(unit: MilitaryUnit): number {
    const total = unit.personnel_officers + unit.personnel_sous_officers + unit.personnel_troupe;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((unit.personnel_ready / total) * 100));
  }
}