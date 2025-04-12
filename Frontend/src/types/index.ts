// Type for ViewState in map
export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  padding?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  transitionDuration?: number;
}

// Type for AQI data point
export interface AQIPoint {
  longitude: number;
  latitude: number;
  aqi: number;
  distance?: number;
}

// Type for GeoJSON feature properties
export interface AQIFeatureProperties {
  aqi: number;
  color: string;
}

// Type for GeoJSON feature
export interface AQIFeature {
  type: 'Feature';
  properties: AQIFeatureProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Type for GeoJSON FeatureCollection
export interface AQIFeatureCollection {
  type: 'FeatureCollection';
  features: AQIFeature[];
}

// Types for API requests
export interface BoundsParams {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  zoom_level: number;
} 