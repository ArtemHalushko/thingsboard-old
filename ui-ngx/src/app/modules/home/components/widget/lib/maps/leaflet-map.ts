///
/// Copyright © 2016-2020 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import L from 'leaflet';

import 'leaflet-providers';
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster/dist/leaflet.markercluster'

import { MapSettings, MarkerSettings, FormattedData, UnitedMapSettings, PolygonSettings } from './map-models';
import { Marker } from './markers';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Polyline } from './polyline';
import { Polygon } from './polygon';

export default abstract class LeafletMap {

    markers: Map<string, Marker> = new Map();
    dragMode = true;
    poly: Polyline;
    polygon: Polygon;
    map: L.Map;
    map$: BehaviorSubject<L.Map> = new BehaviorSubject(null);
    ready$: Observable<L.Map> = this.map$.pipe(filter(map => !!map));
    options: UnitedMapSettings;
    isMarketCluster: boolean;
    bounds: L.LatLngBounds;
    newMarker: L.Marker;
    datasources: FormattedData[];

    constructor(public $container: HTMLElement, options: UnitedMapSettings) {
        this.options = options;
    }

    public initSettings(options: MapSettings) {
        const { initCallback,
            disableScrollZooming, }: MapSettings = options;
        if (disableScrollZooming) {
            this.map.scrollWheelZoom.disable();
        }
        if (initCallback) {
            setTimeout(options.initCallback, 0);
        }
    }

    addMarkerControl() {
        if (this.options.draggableMarker) {
            let mousePositionOnMap: L.LatLng;
            let addMarker: L.Control;
            this.map.on('mouseup', (e: L.LeafletMouseEvent) => {
                mousePositionOnMap = e.latlng
            })
            const dragListener = (e: L.DragEndEvent) => {
                if (e.type === 'dragend' && mousePositionOnMap) {
                    const newMarker = L.marker(mousePositionOnMap).addTo(this.map);
                    const datasourcesList = document.createElement('div');
                    const customLatLng = this.convertToCustomFormat(mousePositionOnMap);
                    this.datasources.forEach(ds => {
                        const dsItem = document.createElement('p');
                        dsItem.appendChild(document.createTextNode(ds.entityName));
                        dsItem.setAttribute('style', 'font-size: 14px');
                        dsItem.onclick = () => {
                            const updatedEnttity = { ...ds, ...customLatLng };
                            this.saveMarkerLocation(updatedEnttity);
                            this.map.removeLayer(newMarker);
                            this.deleteMarker(ds.aliasName);
                            this.createMarker(ds.aliasName, updatedEnttity, this.datasources, this.options, false);
                        }
                        datasourcesList.append(dsItem);
                    })
                    const popup = L.popup();
                    popup.setContent(datasourcesList);
                    newMarker.bindPopup(popup).openPopup();

                }
                addMarker.setPosition('topright')
            }
            L.Control.AddMarker = L.Control.extend({
                onAdd(map) {
                    const img = L.DomUtil.create('img') as any;
                    img.src = `assets/add_location.svg`;
                    img.style.width = '32px';
                    img.style.height = '32px';
                    img.onclick = this.dragMarker;
                    img.draggable = true;
                    const draggableImg = new L.Draggable(img);
                    draggableImg.enable();
                    draggableImg.on('dragend', dragListener)
                    return img;
                },
                onRemove(map) {
                },
                dragMarker: this.dragMarker

            } as any);

            L.control.addMarker = (opts) => {
                return new L.Control.AddMarker(opts);
            }

            addMarker = L.control.addMarker({ position: 'topright' }).addTo(this.map);
        }
    }

    public setMap(map: L.Map) {
        this.map = map;
        if (this.options.useDefaultCenterPosition) {
            this.map.panTo(this.options.defaultCenterPosition);
            this.bounds = map.getBounds();
        }
        else this.bounds = new L.LatLngBounds(null, null);
        if (this.options.draggableMarker) {
            this.addMarkerControl();
        }
        this.map$.next(this.map);
    }

    public setDataSources(dataSources) {
        this.datasources = dataSources;
    }

    public saveMarkerLocation(e) {

    }

    createLatLng(lat: number, lng: number): L.LatLng {
        return L.latLng(lat, lng);
    }

    createBounds(): L.LatLngBounds {
        return this.map.getBounds();
    }

    extendBounds(bounds: L.LatLngBounds, polyline: L.Polyline) {
        if (polyline && polyline.getLatLngs() && polyline.getBounds()) {
            bounds.extend(polyline.getBounds());
        }
    }

    invalidateSize() {
        this.map?.invalidateSize(true);
    }

    onResize() {

    }

    getCenter() {
        return this.map.getCenter();
    }

    convertPosition(expression: object): L.LatLng {
        const lat = expression[this.options.latKeyName];
        const lng = expression[this.options.lngKeyName];
        if (isNaN(lat) || isNaN(lng))
            return null;
        else
            return L.latLng(lat, lng) as L.LatLng;
    }

    convertToCustomFormat(position: L.LatLng): object {
        return {
            [this.options.latKeyName]: position.lat,
            [this.options.lngKeyName]: position.lng
        }
    }

    // Markers
    updateMarkers(markersData) {
        markersData.forEach(data => {
            if (this.convertPosition(data)) {
                if (data.rotationAngle) {
                    this.options.icon = L.divIcon({
                        html: `<div class="arrow" style="transform: rotate(${data.rotationAngle}deg)"><div>`
                    })
                }
                else {
                    this.options.icon = null;
                }
                if (this.markers.get(data.aliasName)) {
                    this.updateMarker(data.aliasName, data, markersData, this.options)
                }
                else {
                    this.createMarker(data.aliasName, data, markersData, this.options as MarkerSettings);
                }
            }
        });
    }

    dragMarker = (e, data?) => {
        if (e.type !== 'dragend') return;
        this.saveMarkerLocation({ ...data, ...this.convertToCustomFormat(e.target._latlng) });
    }

    private createMarker(key, data: FormattedData, dataSources: FormattedData[], settings: MarkerSettings, setFocus = true) {
        this.ready$.subscribe(() => {
            const newMarker = new Marker(this.map, this.convertPosition(data), settings, data, dataSources, () => { }, this.dragMarker);
            if (setFocus)
                this.map.fitBounds(this.bounds.extend(newMarker.leafletMarker.getLatLng()));
            this.markers.set(key, newMarker);
        });
    }

    private updateMarker(key, data, dataSources, settings: MarkerSettings) {
        const marker: Marker = this.markers.get(key);
        const location = this.convertPosition(data)
        if (!location.equals(marker.location)) {
            marker.updateMarkerPosition(location);
        }
        if (settings.showTooltip) {
            marker.updateMarkerTooltip(data);
        }
        marker.setDataSources(data, dataSources);
        marker.updateMarkerIcon(settings);
    }

    deleteMarker(key) {
        let marker = this.markers.get(key)?.leafletMarker;
        if (marker) {
            this.map.removeLayer(marker);
            this.markers.delete(key);
            marker = null;
        }
    }

    // Polyline

    updatePolylines(polyData: Array<Array<any>>) {
        polyData.forEach(data => {
            if (data.length) {
                const dataSource = polyData.map(arr => arr[0]);
                if (this.poly) {
                    this.updatePolyline(data, dataSource, this.options);
                }
                else {
                    this.createPolyline(data, dataSource, this.options);
                }
            }
        })
    }

    createPolyline(data: any[], dataSources, settings) {
        if (data.length)
            this.ready$.subscribe(() => {
                this.poly = new Polyline(this.map,
                    data.map(el => this.convertPosition(el)).filter(el => !!el), data, dataSources, settings);
                const bounds = this.bounds.extend(this.poly.leafletPoly.getBounds());
                if (bounds.isValid()) {
                    this.map.fitBounds(bounds);
                    this.bounds = bounds;
                }
            });
    }

    updatePolyline(data, dataSources, settings) {
        this.ready$.subscribe(() => {
            this.poly.updatePolyline(settings, data, dataSources);
        });
    }

    // Polygon

    updatePolygons(polyData: any[]) {
        polyData.forEach((data: any) => {
            if (data.data.length && data.dataKey.name === this.options.polygonKeyName) {
                if (typeof (data?.data[0][1]) === 'string') {
                    data.data = JSON.parse(data.data[0][1]);
                }
                if (this.polygon) {
                    this.updatePolygon(data.data, polyData, this.options);
                }
                else {
                    this.createPolygon(data.data, polyData, this.options);
                }
            }
        });
    }

    createPolygon(data: FormattedData, dataSources: FormattedData[], settings: PolygonSettings) {
        this.ready$.subscribe(() => {
            this.polygon = new Polygon(this.map, data, dataSources, settings);
            const bounds = this.bounds.extend(this.polygon.leafletPoly.getBounds());
            if (bounds.isValid()) {
                this.map.fitBounds(bounds);
                this.bounds = bounds;
            }
        });
    }

    updatePolygon(data, dataSources, settings) {
        this.ready$.subscribe(() => {
            // this.polygon.updatePolygon(settings, data, dataSources);
        });
    }
}