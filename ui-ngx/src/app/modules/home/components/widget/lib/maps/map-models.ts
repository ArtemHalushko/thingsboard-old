export interface MapOptions {
    initCallback?: Function,
    defaultZoomLevel?: number,
    dontFitMapBounds?: boolean,
    disableScrollZooming?: boolean,
    minZoomLevel?: number,
    mapProvider: MapProviders,
    credentials?: string,
    defaultCenterPosition?: L.LatLngExpression,
    markerClusteringSetting?
}

export enum MapProviders {
    google = 'google-map',
    openstreet = 'openstreet-map',
    here = 'here',
    image = 'image-map',
    tencent = 'tencent-map'
}