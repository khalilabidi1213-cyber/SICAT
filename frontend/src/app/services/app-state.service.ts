// src/app/services/app-state.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MilitaryUnit {
  id?: number | string;
  name: string;
  diplomacy: 'FRIEND' | 'ENEMY' | 'NEUTRAL' | string;
  branch: 'INFANTRY' | 'ARMOR' | 'ARTILLERY' | 'RECON' | 'AIR_DEFENSE' | 'AVIATION' | 'ENGINEER' | string;
  echelon: 'ARMY' | 'CORPS' | 'DIVISION' | 'BRIGADE' | 'REGIMENT' | 'BATTALION' | 'COMPANY' | 'PLATOON' | string;
  lat: number;
  lng: number;
  personnel_officers: number;
  personnel_sous_officers: number;
  personnel_troupe: number;
  personnel_ready: number;
  personnel_sick: number;
  personnel_dead: number;
  personnel_missing: number;
  weapons: string;
  ammo: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'danger';
}

const DEFAULT_UNITS: MilitaryUnit[] = [
  {
    id: 1,
    name: '1st Armored Brigade',
    diplomacy: 'FRIEND',
    branch: 'ARMOR',
    echelon: 'BRIGADE',
    lat: 36.8065,
    lng: 10.1815,
    personnel_officers: 120,
    personnel_sous_officers: 450,
    personnel_troupe: 2800,
    personnel_ready: 3200,
    personnel_sick: 110,
    personnel_dead: 35,
    personnel_missing: 25,
    weapons: 'M1A2 Abrams (85), Bradley M2A3 (110), M113 (60)',
    ammo: '120mm APFSDS (2400), 25mm HE (15000), TOW-2B (320)'
  },
  {
    id: 2,
    name: '3rd Mechanized Infantry Bn',
    diplomacy: 'FRIEND',
    branch: 'INFANTRY',
    echelon: 'BATTALION',
    lat: 36.7520,
    lng: 10.2740,
    personnel_officers: 42,
    personnel_sous_officers: 180,
    personnel_troupe: 720,
    personnel_ready: 885,
    personnel_sick: 35,
    personnel_dead: 12,
    personnel_missing: 10,
    weapons: 'M4A1 (850), Javelin ATGM (36), Mortar 81mm (12)',
    ammo: '5.56 NATO (280k), 81mm HE (1400), 7.62mm (90k)'
  },
  {
    id: 3,
    name: '11th Field Artillery Regt',
    diplomacy: 'FRIEND',
    branch: 'ARTILLERY',
    echelon: 'REGIMENT',
    lat: 36.6850,
    lng: 10.0920,
    personnel_officers: 75,
    personnel_sous_officers: 310,
    personnel_troupe: 1400,
    personnel_ready: 1690,
    personnel_sick: 65,
    personnel_dead: 18,
    personnel_missing: 12,
    weapons: 'M109A6 Paladin 155mm (24), M777 Howitzer (18)',
    ammo: '155mm HE (7200), 155mm Excalibur GPS (480)'
  },
  {
    id: 4,
    name: '5th Air Defense Battery',
    diplomacy: 'FRIEND',
    branch: 'AIR_DEFENSE',
    echelon: 'COMPANY',
    lat: 36.8620,
    lng: 10.1250,
    personnel_officers: 16,
    personnel_sous_officers: 48,
    personnel_troupe: 140,
    personnel_ready: 192,
    personnel_sick: 8,
    personnel_dead: 2,
    personnel_missing: 2,
    weapons: 'MIM-104 Patriot (4 Launchers), AN/MPQ-65 Radar',
    ammo: 'PAC-3 MSE Missiles (32)'
  },
  {
    id: 5,
    name: 'Red Guard 4th Armored Regt',
    diplomacy: 'ENEMY',
    branch: 'ARMOR',
    echelon: 'REGIMENT',
    lat: 36.9310,
    lng: 10.3650,
    personnel_officers: 95,
    personnel_sous_officers: 390,
    personnel_troupe: 2150,
    personnel_ready: 2260,
    personnel_sick: 180,
    personnel_dead: 110,
    personnel_missing: 85,
    weapons: 'T-90M (64), BMP-3 (88), BTR-82A (42)',
    ammo: '125mm APFSDS (1900), 30mm HE (22000), Kornet-EM (140)'
  },
  {
    id: 6,
    name: 'Red Vanguard Recon Bn',
    diplomacy: 'ENEMY',
    branch: 'RECON',
    echelon: 'BATTALION',
    lat: 36.8840,
    lng: 10.2310,
    personnel_officers: 28,
    personnel_sous_officers: 115,
    personnel_troupe: 460,
    personnel_ready: 560,
    personnel_sick: 25,
    personnel_dead: 8,
    personnel_missing: 10,
    weapons: 'BRDM-2M (28), Tiger-M (40), UAV Orlan-10 (6)',
    ammo: '7.62x54R (140k), 14.5mm (35k), RPG-30 (80)'
  },
  {
    id: 7,
    name: 'Red 18th Heavy Artillery Bn',
    diplomacy: 'ENEMY',
    branch: 'ARTILLERY',
    echelon: 'BATTALION',
    lat: 36.9850,
    lng: 10.4350,
    personnel_officers: 45,
    personnel_sous_officers: 165,
    personnel_troupe: 670,
    personnel_ready: 790,
    personnel_sick: 45,
    personnel_dead: 25,
    personnel_missing: 20,
    weapons: '2S19 Msta-S 152mm (18), BM-21 Grad (12)',
    ammo: '152mm HE (3400), 122mm Grad Rockets (960)'
  }
];

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private unitsSource = new BehaviorSubject<MilitaryUnit[]>([]);
  units$ = this.unitsSource.asObservable();

  private selectedUnitSource = new BehaviorSubject<MilitaryUnit | null>(null);
  selectedUnit$ = this.selectedUnitSource.asObservable();

  private targetCoordsSource = new BehaviorSubject<{ lat: number; lng: number; zoom?: number } | null>(null);
  targetCoordinates$ = this.targetCoordsSource.asObservable();

  private isPickingCoordsSource = new BehaviorSubject<boolean>(false);
  isPickingCoordinates$ = this.isPickingCoordsSource.asObservable();

  private pickedCoordsSource = new BehaviorSubject<{ lat: number; lng: number } | null>(null);
  pickedCoordinates$ = this.pickedCoordsSource.asObservable();

  private activeBaseMapSource = new BehaviorSubject<'dark' | 'satellite' | 'topo' | 'osm'>('dark');
  activeBaseMap$ = this.activeBaseMapSource.asObservable();

  private layersConfigSource = new BehaviorSubject({
    showUnits: true,
    showDrawings: true,
    showRangeRings: true,
    showLabels: true,
    showGraticule: false
  });
  layersConfig$ = this.layersConfigSource.asObservable();

  private toastsSource = new BehaviorSubject<ToastNotification[]>([]);
  toasts$ = this.toastsSource.asObservable();

  private apiUrl = 'http://localhost:8000/api/operations/units/';

  constructor(private http: HttpClient) {
    this.loadUnits();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getAuthHeaders() {
    let token = '';
    if (this.isBrowser()) {
      token = localStorage.getItem('token') || '';
    }
    return { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) };
  }

  private getCachedUnits(): MilitaryUnit[] {
    if (this.isBrowser()) {
      const cached = localStorage.getItem('sicat_cached_units');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_UNITS;
  }

  private saveToLocalStorage(units: MilitaryUnit[]) {
    if (this.isBrowser()) {
      localStorage.setItem('sicat_cached_units', JSON.stringify(units));
    }
  }

  loadUnits() {
    if (!this.isBrowser()) {
      this.unitsSource.next(DEFAULT_UNITS);
      return;
    }

    // Try fetching from backend first
    this.http.get<MilitaryUnit[]>(this.apiUrl, this.getAuthHeaders()).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.unitsSource.next(data);
          this.saveToLocalStorage(data);
        } else {
          const cached = this.getCachedUnits();
          this.unitsSource.next(cached);
          // If backend has 0 units, seed defaults to backend
          this.seedInitialUnits(cached);
        }
      },
      error: () => {
        // Fallback gracefully to cached or default tactical units
        const cached = this.getCachedUnits();
        this.unitsSource.next(cached);
      }
    });
  }

  private seedInitialUnits(units: MilitaryUnit[]) {
    units.forEach(u => {
      this.http.post<MilitaryUnit>(this.apiUrl, u, this.getAuthHeaders()).subscribe({
        next: () => {},
        error: () => {}
      });
    });
  }

  addUnit(unit: MilitaryUnit) {
    const tempId = unit.id || Date.now();
    const unitToAdd: MilitaryUnit = { ...unit, id: tempId };

    // Optimistic update
    const current = this.unitsSource.getValue();
    const updated = [...current, unitToAdd];
    this.unitsSource.next(updated);
    this.saveToLocalStorage(updated);
    this.showToast('Unit Deployed', `${unit.name} (${unit.echelon}) deployed to theater`, 'success');

    // Sync with backend if available
    this.http.post<MilitaryUnit>(this.apiUrl, unit, this.getAuthHeaders()).subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          const synced = this.unitsSource.getValue().map(u => u.id === tempId ? saved : u);
          this.unitsSource.next(synced);
          this.saveToLocalStorage(synced);
        }
      },
      error: () => {
        // local state remains
      }
    });
  }

  updateUnit(unit: MilitaryUnit) {
    if (!unit.id) return;
    const current = this.unitsSource.getValue();
    const updated = current.map(u => u.id === unit.id ? { ...unit } : u);
    this.unitsSource.next(updated);
    this.saveToLocalStorage(updated);
    this.showToast('Unit Updated', `${unit.name} operational status updated`, 'info');

    // Select updated unit if it was selected
    if (this.selectedUnitSource.getValue()?.id === unit.id) {
      this.selectedUnitSource.next(unit);
    }

    // Try backend
    this.http.put<MilitaryUnit>(`${this.apiUrl}${unit.id}/`, unit, this.getAuthHeaders()).subscribe({
      next: (saved) => {
        const synced = this.unitsSource.getValue().map(u => u.id === unit.id ? saved : u);
        this.unitsSource.next(synced);
        this.saveToLocalStorage(synced);
      },
      error: () => {}
    });
  }

  deleteUnit(unitId: number | string) {
    const current = this.unitsSource.getValue();
    const target = current.find(u => u.id === unitId);
    const updated = current.filter(u => u.id !== unitId);
    this.unitsSource.next(updated);
    this.saveToLocalStorage(updated);

    if (this.selectedUnitSource.getValue()?.id === unitId) {
      this.selectedUnitSource.next(null);
    }

    this.showToast('Unit Removed', `${target ? target.name : 'Unit'} withdrawn from operational grid`, 'warning');

    this.http.delete(`${this.apiUrl}${unitId}/`, this.getAuthHeaders()).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  resetUnitsToDefault() {
    this.unitsSource.next(DEFAULT_UNITS);
    this.saveToLocalStorage(DEFAULT_UNITS);
    this.showToast('Grid Reset', 'Tactical scenario restored to default standard Order of Battle', 'info');
  }

  selectUnit(unit: MilitaryUnit | null) {
    this.selectedUnitSource.next(unit);
    if (unit) {
      this.flyTo(unit.lat, unit.lng, 10);
    }
  }

  flyTo(lat: number, lng: number, zoom: number = 10) {
    this.targetCoordsSource.next({ lat, lng, zoom });
  }

  startPickingCoordinates() {
    this.isPickingCoordsSource.next(true);
    this.showToast('Targeting Mode', 'Click anywhere on the tactical map to lock coordinates', 'info');
  }

  cancelPickingCoordinates() {
    this.isPickingCoordsSource.next(false);
  }

  setPickedCoordinates(coords: { lat: number; lng: number }) {
    this.pickedCoordsSource.next(coords);
    this.isPickingCoordsSource.next(false);
    this.showToast('Coordinates Locked', `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`, 'success');
  }

  setBaseMap(mode: 'dark' | 'satellite' | 'topo' | 'osm') {
    this.activeBaseMapSource.next(mode);
  }

  toggleLayerConfig(key: 'showUnits' | 'showDrawings' | 'showRangeRings' | 'showLabels' | 'showGraticule', value?: boolean) {
    const current = this.layersConfigSource.getValue();
    const updated = {
      ...current,
      [key]: value !== undefined ? value : !current[key]
    };
    this.layersConfigSource.next(updated);
  }

  showToast(title: string, message: string, type: 'success' | 'info' | 'warning' | 'danger' = 'info') {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const toast: ToastNotification = { id, title, message, type };
    const current = this.toastsSource.getValue();
    this.toastsSource.next([...current, toast]);

    setTimeout(() => {
      this.removeToast(id);
    }, 4000);
  }

  removeToast(id: string) {
    const current = this.toastsSource.getValue();
    this.toastsSource.next(current.filter(t => t.id !== id));
  }
}