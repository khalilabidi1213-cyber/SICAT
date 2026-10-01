// src/app/map/map.component.ts
import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Draw from 'ol/interaction/Draw';
import { ScaleLine, defaults as defaultControls } from 'ol/control';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import { getLength } from 'ol/sphere';
import { circular as circularPolygon } from 'ol/geom/Polygon';
import Overlay from 'ol/Overlay';
import { unByKey } from 'ol/Observable';
import { Style, Fill, Stroke, Text } from 'ol/style';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import proj4 from 'proj4';
// @ts-ignore
import * as mgrs from 'mgrs';

import { AppStateService, MilitaryUnit } from '../services/app-state.service';
import { MilitarySymbolService } from '../services/military-symbol.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapElement') mapElement!: ElementRef;
  @ViewChild('popupElement') popupElement!: ElementRef;

  map!: Map;
  popupOverlay!: Overlay;
  selectedPopupUnit: MilitaryUnit | null = null;
  selectedPopupMGRS: string = '';

  // Base layers
  darkBaseLayer = new TileLayer({
    source: new XYZ({
      url: 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      maxZoom: 19
    }),
    visible: true
  });

  satelliteBaseLayer = new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19
    }),
    visible: false
  });

  topoBaseLayer = new TileLayer({
    source: new XYZ({
      url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      maxZoom: 17
    }),
    visible: false
  });

  osmBaseLayer = new TileLayer({
    source: new OSM(),
    visible: false
  });

  // Vector Layers
  vectorSource = new VectorSource();
  vectorLayer = new VectorLayer({
    source: this.vectorSource,
    zIndex: 20
  });

  rangeRingsSource = new VectorSource();
  rangeRingsLayer = new VectorLayer({
    source: this.rangeRingsSource,
    zIndex: 30,
    visible: true
  });

  unitSource = new VectorSource();
  unitLayer = new VectorLayer({
    source: this.unitSource,
    zIndex: 100,
    visible: true
  });

  // Interactions & tools
  drawInteraction: Draw | null = null;
  activeTool: string = 'none';

  // Coordinate converter
  isConverterOpen = false;
  inputLat: number = 36.8065;
  inputLng: number = 10.1815;
  convertedMetric: string = '';
  convertedUTM: string = '';
  convertedMGRS: string = '';

  // Live cursor telemetry
  mouseCoordDisplay: string = '36.8065° N, 10.1815° E';
  mouseMGRSDisplay: string = '32SKF 1815 8065';
  currentZoom: number = 6;

  // Picking mode
  isPickingCoords: boolean = false;

  // Measurement tool
  measureTooltipElement!: HTMLElement;
  measureTooltip!: Overlay;

  private subs: Subscription[] = [];
  private currentUnits: MilitaryUnit[] = [];
  private layersConfigState = {
    showUnits: true,
    showDrawings: true,
    showRangeRings: true,
    showLabels: true,
    showGraticule: false
  };

  constructor(
    public appState: AppStateService,
    private symbolService: MilitarySymbolService
  ) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    this.initMap();
    this.initSubscriptions();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private initMap(): void {
    const scaleLineControl = new ScaleLine({ units: 'metric' });

    this.popupOverlay = new Overlay({
      element: this.popupElement.nativeElement,
      autoPan: {
        animation: {
          duration: 250
        }
      },
      positioning: 'bottom-center',
      offset: [0, -35]
    });

    this.map = new Map({
      target: this.mapElement.nativeElement,
      controls: defaultControls({ zoom: false, attribution: false }).extend([scaleLineControl]),
      layers: [
        this.darkBaseLayer,
        this.satelliteBaseLayer,
        this.topoBaseLayer,
        this.osmBaseLayer,
        this.rangeRingsLayer,
        this.vectorLayer,
        this.unitLayer
      ],
      overlays: [this.popupOverlay],
      view: new View({
        center: fromLonLat([10.1815, 36.8065]),
        zoom: 7,
        maxZoom: 19,
        minZoom: 3
      })
    });

    // View change tracking
    this.map.getView().on('change:resolution', () => {
      const zoom = this.map.getView().getZoom();
      if (zoom !== undefined) {
        this.currentZoom = Math.round(zoom);
      }
      this.refreshUnitSymbols();
    });

    // Mouse move telemetry
    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const coords = toLonLat(evt.coordinate);
      const lat = coords[1];
      const lng = coords[0];

      const latDir = lat >= 0 ? 'N' : 'S';
      const lngDir = lng >= 0 ? 'E' : 'W';
      this.mouseCoordDisplay = `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;

      try {
        this.mouseMGRSDisplay = mgrs.forward([lng, lat]);
      } catch {
        this.mouseMGRSDisplay = '---';
      }
    });

    // Map Click Handler (Selection & Coordinate Picking)
    this.map.on('singleclick', (evt) => {
      // 1. If currently in Coordinate Picking Mode:
      if (this.isPickingCoords) {
        const coords = toLonLat(evt.coordinate);
        this.appState.setPickedCoordinates({ lat: coords[1], lng: coords[0] });
        return;
      }

      // 2. Feature Selection:
      let clickedUnit: MilitaryUnit | null = null;
      let clickedCoord: any = null;

      this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const unitData = feature.get('unitData');
        if (unitData) {
          clickedUnit = unitData;
          clickedCoord = (feature.getGeometry() as Point).getCoordinates();
          return true; // Stop iteration
        }
        return false;
      });

      if (clickedUnit && clickedCoord) {
        this.openUnitPopup(clickedUnit, clickedCoord);
      } else {
        // If clicked on empty space, close popup
        this.closeUnitPopup();
      }
    });
  }

  private initSubscriptions(): void {
    // 1. Units Subscription
    this.subs.push(
      this.appState.units$.subscribe(units => {
        this.currentUnits = units;
        this.renderUnits(units);
        this.renderRangeRings(units);
      })
    );

    // 2. Base Map Subscription
    this.subs.push(
      this.appState.activeBaseMap$.subscribe(mode => {
        this.setBaseMapVisibility(mode);
      })
    );

    // 3. Layers Config Subscription
    this.subs.push(
      this.appState.layersConfig$.subscribe(cfg => {
        this.layersConfigState = cfg;
        this.unitLayer.setVisible(cfg.showUnits);
        this.rangeRingsLayer.setVisible(cfg.showRangeRings);
        this.vectorLayer.setVisible(cfg.showDrawings);
        this.refreshUnitSymbols();
      })
    );

    // 4. Picking Coords Subscription
    this.subs.push(
      this.appState.isPickingCoordinates$.subscribe(isPicking => {
        this.isPickingCoords = isPicking;
        if (this.mapElement) {
          this.mapElement.nativeElement.style.cursor = isPicking ? 'crosshair' : 'default';
        }
      })
    );

    // 5. Target Coordinates (Fly To) Subscription
    this.subs.push(
      this.appState.targetCoordinates$.subscribe(target => {
        if (!target || !this.map) return;
        const projected = fromLonLat([target.lng, target.lat]);
        this.map.getView().animate({
          center: projected,
          zoom: target.zoom || 11,
          duration: 1000
        });

        // Open popup if matching unit exists
        const match = this.currentUnits.find(u => Math.abs(u.lat - target.lat) < 0.001 && Math.abs(u.lng - target.lng) < 0.001);
        if (match) {
          setTimeout(() => {
            this.openUnitPopup(match, projected);
          }, 600);
        }
      })
    );

    // 6. Selected Unit Subscription
    this.subs.push(
      this.appState.selectedUnit$.subscribe(unit => {
        if (unit && this.map) {
          const projected = fromLonLat([unit.lng, unit.lat]);
          this.openUnitPopup(unit, projected);
        }
      })
    );
  }

  private setBaseMapVisibility(mode: 'dark' | 'satellite' | 'topo' | 'osm'): void {
    this.darkBaseLayer.setVisible(mode === 'dark');
    this.satelliteBaseLayer.setVisible(mode === 'satellite');
    this.topoBaseLayer.setVisible(mode === 'topo');
    this.osmBaseLayer.setVisible(mode === 'osm');
  }

  private renderUnits(units: MilitaryUnit[]): void {
    this.unitSource.clear();

    const resolution = this.map ? this.map.getView().getResolution() || 10 : 10;

    units.forEach(unit => {
      const coords = fromLonLat([unit.lng, unit.lat]);
      const feature = new Feature({
        geometry: new Point(coords),
        unitData: unit
      });

      const style = this.createTacticalUnitStyle(unit, resolution);
      feature.setStyle(style);
      this.unitSource.addFeature(feature);
    });
  }

  private createTacticalUnitStyle(unit: MilitaryUnit, resolution: number): Style[] {
    const symbolStyle = this.symbolService.createSymbol(
      'FORMATION',
      unit.branch,
      unit.diplomacy,
      unit.echelon,
      unit.branch,
      '',
      resolution,
      unit.personnel_ready > 0 ? 100 : 0
    );

    const styles: Style[] = [symbolStyle];

    // Tactical Label
    if (this.layersConfigState.showLabels) {
      const labelText = `${unit.name} [${unit.echelon}]`;
      const isFriend = unit.diplomacy === 'FRIEND';
      const textColor = isFriend ? '#38bdf8' : '#f87171';

      styles.push(
        new Style({
          text: new Text({
            text: labelText,
            offsetY: 34,
            font: '600 11px "IBM Plex Mono", monospace',
            fill: new Fill({ color: textColor }),
            stroke: new Stroke({ color: '#04090e', width: 3 }),
            backgroundFill: new Fill({ color: 'rgba(4, 9, 14, 0.85)' }),
            padding: [2, 6, 2, 6]
          })
        })
      );
    }

    return styles;
  }

  private refreshUnitSymbols(): void {
    if (!this.map) return;
    const resolution = this.map.getView().getResolution() || 10;
    const features = this.unitSource.getFeatures();

    features.forEach(f => {
      const unit = f.get('unitData');
      if (unit) {
        f.setStyle(this.createTacticalUnitStyle(unit, resolution));
      }
    });
  }

  private renderRangeRings(units: MilitaryUnit[]): void {
    this.rangeRingsSource.clear();

    units.forEach(unit => {
      let radiusKm = 0;
      const b = (unit.branch || '').toUpperCase();

      if (b.includes('ARTILLERY')) radiusKm = 24; // 24 km Howitzer range
      else if (b.includes('AIR_DEFENSE')) radiusKm = 38; // 38 km Patriot/SAM envelope
      else if (b.includes('RECON')) radiusKm = 12; // 12 km radar/scout zone
      else if (b.includes('ARMOR')) radiusKm = 5; // 5 km tank main gun engagement
      else if (b.includes('INFANTRY')) radiusKm = 3.5; // 3.5 km mortar/anti-armor

      if (radiusKm <= 0) return;

      const isFriend = unit.diplomacy === 'FRIEND';
      const strokeColor = isFriend ? 'rgba(56, 189, 248, 0.65)' : 'rgba(239, 68, 68, 0.65)';
      const fillColor = isFriend ? 'rgba(56, 189, 248, 0.05)' : 'rgba(239, 68, 68, 0.05)';

      const circlePoly = circularPolygon([unit.lng, unit.lat], radiusKm * 1000, 64);
      circlePoly.transform('EPSG:4326', 'EPSG:3857');

      const ringFeature = new Feature({
        geometry: circlePoly
      });

      ringFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: strokeColor,
            width: 1.5,
            lineDash: [6, 4]
          }),
          fill: new Fill({
            color: fillColor
          })
        })
      );

      this.rangeRingsSource.addFeature(ringFeature);
    });
  }

  openUnitPopup(unit: MilitaryUnit, coordinate: any): void {
    this.selectedPopupUnit = unit;
    try {
      this.selectedPopupMGRS = mgrs.forward([unit.lng, unit.lat]);
    } catch {
      this.selectedPopupMGRS = `${unit.lat.toFixed(4)}, ${unit.lng.toFixed(4)}`;
    }
    this.popupOverlay.setPosition(coordinate);
  }

  closeUnitPopup(): void {
    this.selectedPopupUnit = null;
    this.popupOverlay.setPosition(undefined);
  }

  focusPopupUnit(): void {
    if (!this.selectedPopupUnit) return;
    this.appState.flyTo(this.selectedPopupUnit.lat, this.selectedPopupUnit.lng, 12);
  }

  deletePopupUnit(): void {
    if (!this.selectedPopupUnit || !this.selectedPopupUnit.id) return;
    const id = this.selectedPopupUnit.id;
    this.closeUnitPopup();
    this.appState.deleteUnit(id);
  }

  // Tactical Drawing Tools
  activateTool(tool: string): void {
    this.activeTool = tool;
    this.removeInteractions();

    if (tool === 'none') return;

    let type: any = 'Point';
    if (tool === 'LineString' || tool === 'measure') type = 'LineString';
    if (tool === 'Polygon') type = 'Polygon';
    if (tool === 'Circle') type = 'Circle';

    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: type,
      style: new Style({
        fill: new Fill({ color: 'rgba(0, 229, 255, 0.15)' }),
        stroke: new Stroke({ color: '#00e5ff', width: 2, lineDash: [4, 4] }),
        image: new Point([0, 0]) as any
      })
    });

    this.map.addInteraction(this.drawInteraction);

    if (tool === 'measure') {
      this.enableMeasuring();
    }
  }

  enableMeasuring(): void {
    let sketch: any;
    let listener: any;
    this.createMeasureTooltip();

    this.drawInteraction?.on('drawstart', (evt) => {
      sketch = evt.feature;
      let tooltipCoord = (evt.feature.getGeometry() as any).getLastCoordinate();

      listener = sketch.getGeometry().on('change', (e: any) => {
        const geom = e.target;
        const length = getLength(geom);
        let output = length > 1000 
          ? (Math.round((length / 1000) * 100) / 100) + ' km' 
          : (Math.round(length * 100) / 100) + ' m';
        
        tooltipCoord = geom.getLastCoordinate();
        this.measureTooltipElement.innerHTML = output;
        this.measureTooltip.setPosition(tooltipCoord);
      });
    });

    this.drawInteraction?.on('drawend', () => {
      this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static shadow-sm';
      this.measureTooltip.setOffset([0, -7]);
      sketch = null;
      unByKey(listener);
      this.createMeasureTooltip();
    });
  }

  createMeasureTooltip(): void {
    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure shadow';
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
    });
    this.map.addOverlay(this.measureTooltip);
  }

  removeInteractions(): void {
    if (this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }
  }

  clearMapDrawings(): void {
    this.vectorSource.clear();
    const overlays = this.map.getOverlays().getArray();
    const tooltipsToRemove = overlays.filter(o => o !== this.popupOverlay);
    tooltipsToRemove.forEach(o => this.map.removeOverlay(o));
    this.appState.showToast('Drawings Cleared', 'All tactical perimeters and measurements removed', 'info');
  }

  // Coordinate Converter
  toggleConverter(): void {
    this.isConverterOpen = !this.isConverterOpen;
    if (this.isConverterOpen) {
      this.convertCoordinates();
    }
  }

  pickCoordsForConverter(): void {
    this.appState.startPickingCoordinates();
    const sub = this.appState.pickedCoordinates$.subscribe(c => {
      if (c) {
        this.inputLat = parseFloat(c.lat.toFixed(4));
        this.inputLng = parseFloat(c.lng.toFixed(4));
        this.convertCoordinates();
        sub.unsubscribe();
      }
    });
  }

  convertCoordinates(): void {
    const projected = fromLonLat([this.inputLng, this.inputLat]);
    this.convertedMetric = `X: ${projected[0].toFixed(1)}, Y: ${projected[1].toFixed(1)}`;
    
    const zone = Math.floor((this.inputLng + 180) / 6) + 1;
    const utmString = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
    try {
      const utmCoords = proj4('EPSG:4326', utmString, [this.inputLng, this.inputLat]);
      this.convertedUTM = `Zone ${zone}N | E: ${utmCoords[0].toFixed(0)}, N: ${utmCoords[1].toFixed(0)}`;
    } catch {
      this.convertedUTM = '---';
    }

    try {
      this.convertedMGRS = mgrs.forward([this.inputLng, this.inputLat]);
    } catch {
      this.convertedMGRS = '---';
    }

    if (this.map) {
      this.map.getView().animate({ center: projected, zoom: 11, duration: 800 });
    }
  }

  copyMGRS(): void {
    if (this.convertedMGRS && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(this.convertedMGRS);
      this.appState.showToast('Copied', `MGRS ${this.convertedMGRS} copied to clipboard`, 'success');
    }
  }

  // Tactical Camera Controls
  zoomIn(): void {
    if (!this.map) return;
    const view = this.map.getView();
    view.animate({ zoom: (view.getZoom() || 6) + 1, duration: 250 });
  }

  zoomOut(): void {
    if (!this.map) return;
    const view = this.map.getView();
    view.animate({ zoom: (view.getZoom() || 6) - 1, duration: 250 });
  }

  resetTheater(): void {
    if (!this.map) return;
    this.map.getView().animate({
      center: fromLonLat([10.1815, 36.8065]),
      zoom: 7,
      rotation: 0,
      duration: 800
    });
  }

  calculateReadinessPercent(unit: MilitaryUnit): number {
    const total = unit.personnel_officers + unit.personnel_sous_officers + unit.personnel_troupe;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((unit.personnel_ready / total) * 100));
  }
}