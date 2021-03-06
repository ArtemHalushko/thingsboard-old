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

import L, { LatLngExpression } from 'leaflet';
import { createTooltip } from './maps-utils';
import { PolygonSettings } from './map-models';

export class Polygon {

    leafletPoly: L.Polygon;
    tooltip;

    constructor(public map, coordinates, dataSources, settings: PolygonSettings, onClickListener?) {
        this.leafletPoly = L.polygon(coordinates, {
            fill: true,
            fillColor: settings.polygonColor,
            color: settings.polygonStrokeColor,
            weight: settings.polygonStrokeWeight,
            fillOpacity: settings.polygonOpacity,
            opacity: settings.polygonStrokeOpacity
        }).addTo(this.map);

        if (settings.showTooltip) {
            this.tooltip = createTooltip(this.leafletPoly, settings);
        }
        if (onClickListener) {
            this.leafletPoly.on('click', onClickListener);
        }
    }

    removePolygon() {
        this.map.removeLayer(this.leafletPoly);
    }

    updatePolygonColor(settings) {
        console.log('Polygon -> updatePolygonColor -> settings', settings)
        const style: L.PathOptions = {

            fill: true,
            fillColor: settings.color,
            color: settings.color,
            weight: settings.polygonStrokeWeight,
            fillOpacity: settings.polygonOpacity,
            opacity: settings.polygonStrokeOpacity
        };
        this.leafletPoly.setStyle(style);
    }

    getPolygonLatLngs() {
        return this.leafletPoly.getLatLngs();
    }

    setPolygonLatLngs(latLngs: LatLngExpression[]) {
        this.leafletPoly.setLatLngs(latLngs);
        this.leafletPoly.redraw();
    }
}